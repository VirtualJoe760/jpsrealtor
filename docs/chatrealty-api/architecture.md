---
title: ChatRealty API — Target Architecture
status: current
last_verified: 2026-06-24
related: [./research.md, ../mcp/README.md, ../mcp/hosting.md, ../mcp/scopes-and-safety.md, ../listings/README.md]
---

# ChatRealty API — Target Architecture

> **This is a target design, not yet-built code.** It turns today's single-tenant
> `/api/skill/*` + MCP surface into a **managed, database-per-tenant, RESO-aligned
> real-estate backend** sold as a product. Decisions here are settled in
> [research.md](./research.md) and the 2026-06-24 design session (see §0). Where it
> references existing files, those are real and reused.

## 0. Settled decisions

| # | Decision | Choice |
|---|---|---|
| Tenancy | One database **per tenant** (structural isolation) | ✅ |
| DB platform | **Neon (serverless Postgres)** — DB-per-tenant via Neon API, scale-to-zero | ✅ |
| Pricing | **Free for now**; metering plumbing built, dollars deferred | ✅ |
| Sync cadence | **Daily** | ✅ |
| Sync ownership | **Free:** the customer runs the cron on **their own computer**. **Paid:** ChatRealty runs it on a **VPS**. | ✅ |
| Seeding/sync compute | Runs on the **customer's machine** (their MLS key never touches our servers) | ✅ |
| AI inference | **BYOK** — customer's Anthropic key | ✅ |
| Neighborhoods | **Included** — Region→County→City (universal) + **optional** Subdivision (not all MLSs carry it; Claude-derivable per area, stamped `source`) + POIs, ported to per-tenant Postgres+PostGIS (build_plan §8.2) | ✅ |
| Listing attribution | **HARD invariant** — `listAgentName` + `listOfficeName` accompany ALL listing data, everywhere it is served/rendered (IDX rule; build_plan §3.8) | ✅ |
| Documentation | **LLM-first** — docs are a product surface, served via MCP `guide://` resources (build_plan §3.9) | ✅ |
| Lead capture | End-user signup **auto-upserts a deduped Contact** into the agent's CRM (port of `linkUserToAgent`); anchors the favorites/saved-search loop (build_plan §8.3) | ✅ |

## Migration posture (legacy app)

**Do not migrate `jpsrealtor.com` to Postgres to launch the product.** The product
is built greenfield on Neon; the **legacy site stays on its current MongoDB** —
which is **self-hosted on the DigitalOcean VPS** (Atlas is used only as a viewer);
that DO box hosts **both** the database and the ingestion crons. Rationale: a live
Mongo→Postgres migration means rewriting every Mongoose query/aggregation (CMA,
subdivisions, market stats, hundreds of routes) and moving 76k listings / 2.1M
photos — months of work, high risk. Credentials and business keys port fine; the
**queries** are the hard part. Instead, **dogfood**: make Joseph **tenant zero** on
Neon, prove the Postgres engine on his own data, and only consider migrating the
legacy site later if the product engine earns it. The DigitalOcean VPS becomes the
prototype for the **paid-tier managed-sync box**.

## TL;DR

A customer (agent or IDX/web-dev shop) signs up, is approved (license check), and
gets **API + MCP access for free**. They bring their own **MLS key** and
**Anthropic key**. On *their own computer*, a Claude-scaffolded **daily cron**
fetches their MLS data, maps it to our **RESO-aligned schema**, and writes it to
**their own Neon Postgres database** that we provisioned for them. Our engine (CHAP
chat+map, contacts, CMS, dashboard) runs stateless on Vercel and connects to *that
tenant's* Neon database per request. We make money later by running that sync
reliably on a **VPS** for customers who'd rather not babysit a cron — and by
managed/team tiers. The framework + MCP build-guide is the free funnel.

**Architectural keystone:** every request resolves a **tenant → its own Neon
database**. That single indirection makes us multi-tenant, kills cross-tenant leaks
structurally, and keeps each customer's data in its own isolated store — without us
hand-building the provisioning platform (Neon is that platform).

---

## 1. The two planes

| Plane | What lives here | Hosting |
|---|---|---|
| **Control plane** | Tenant registry, signup/approval, token issuance, **Neon project/DB provisioning** + connection routing, metering, the customer's encrypted secrets (Neon conn string, Anthropic key) | One shared **control DB** (ChatRealty-owned) |
| **Data plane** | Each tenant's **own Neon Postgres DB**: listings, contacts, articles, saved searches, custom-field registry — written by *their* cron from *their* MLS feed | **Neon, database-per-tenant**, scale-to-zero |

The **engine** (CHAP, CRM, CMS, dashboard, `/api/skill/*` + MCP) is **stateless
compute** that reads the control plane to find a tenant, then connects to that
tenant's Neon database.

```
 Customer's computer                     Customer's Claude / app
   (daily cron, their MLS key)              │  MCP (build + run) / REST+OData
        │ fetch→flatten→map                 ▼
        │                          ┌──────────────────────────────────┐
        │ write listings           │ ChatRealty engine (stateless,     │
        ▼                          │  Vercel)                          │
   tenant_A Neon DB  ◄─────────────┤  token ─► resolveTenant() ─► conn │◄─ control DB
   (Postgres+PostGIS)              └──────────────────────────────────┘   (tenants, secrets)
        ▲                                     │
        └─────── engine reads per request ◄───┘
   tenant_B Neon DB, tenant_C Neon DB, …  (scale-to-zero when idle)
```

## 2. Tenancy — Neon database-per-tenant (the keystone)

**Every tenant gets their own Neon Postgres database**, provisioned via the Neon
API at signup. Isolation is structural; idle tenants cost ~nothing (scale-to-zero).

### Why Neon (vs. building it on Atlas ourselves)
- Neon provisions an isolated Postgres DB per customer **via API**, with
  **scale-to-zero** — purpose-built for database-per-tenant SaaS. We consume it; we
  don't build per-tenant provisioning, scaling, or a management dashboard.
- **Postgres fit:** `PostGIS` for map/geo radius + polygon search; `JSONB` for
  agent-defined custom fields; relational tables map cleanly to the RESO Data
  Dictionary (typed fields + enums).
- **No data migration:** legacy `jpsrealtor.com` stays on Mongo; each product tenant
  seeds fresh from its own feed. Joseph is tenant zero.

### The connection resolver — the single most important new component
Every `/api/skill/*` and MCP call goes through it:
1. Authenticate the bearer/OAuth token → resolve to a **`tenantId`** (control DB).
2. Look up the tenant's **Neon connection string**, decrypt it (`src/lib/secrets.ts`).
3. Return a **pooled** Postgres client scoped to that tenant's DB.
4. The handler queries *that* client — never a global one.

> **Gotcha — serverless + Postgres connections.** Vercel functions × many tenants
> can exhaust Postgres connection limits. Use **Neon's pooled connection endpoint /
> serverless driver** (HTTP/WebSocket), short-lived clients, and an LRU client
> cache. Load-test this first.

> **Gotcha — cold starts.** Scale-to-zero means an idle tenant's first query pays a
> wake-up latency. Fine for dashboards; note it for any latency-sensitive path.

### What this retires
The `resolveDomainOwner` / `session.user.id` scoping split (and its documented bug
class in `tech-debt.md`) **is irrelevant for the product API** — there is no shared
store to mis-scope. A token maps to exactly one database.

## 3. Identity, tokens & approval

Reuses the existing model, re-pointed at tenants.

| Concern | Today | Product |
|---|---|---|
| Token | `crt_live_*`, sha256, scoped (`src/lib/skill-auth.ts`) | Same format; resolves to a **`tenantId`**. |
| Hosted auth | OAuth 2.1 (DCR+PKCE) (`src/lib/mcp-oauth.ts`, `src/models/McpOAuth.ts`) | Unchanged — right shape for external connectors. |
| Approval | Partner/agent gate (status + admin + 24h cron) | Repurposed as **license verification** before a tenant DB is provisioned. |
| Scopes | 12 scopes, 4 presets (`docs/mcp/scopes-and-safety.md`) | Same **+ new `research:read`** for the client tier (§6). Campaigns scopes excluded. |

## 4. The schema (the product) — RESO-aligned + extensible

The schema *is* the product. Publish it as a **versioned Data Dictionary** the
customer's cron maps to.

- **Core tables** modeled on **RESO Data Dictionary 2.0**: `Property` (listings),
  `Member`/`Office` (agent), `Media` (photos). Port the existing models'
  field semantics: `src/models/unified-listing.ts`, `Contact.ts`,
  `subdivisions.ts`, `Article.ts`.
- **Geo:** `PostGIS` geometry column on `Property` for map-bounds + radius search.
- **Optional resources** the schema tolerates being absent (e.g. subdivisions — not
  every market has them). Engine degrades gracefully.
- **Custom fields** (agent-defined, e.g. `waterfront`):
  - Stored in a **`JSONB extras` column** on the record.
  - Declared in a per-tenant **custom-field registry**:
    `{ name, type, label, searchable, enumValues? }`.
  - The MCP search tools **read the registry** to advertise + filter those fields —
    the runtime behind the **Claude field-discovery flow** (§7).
- **RESO certification path:** `Property` is Data-Dictionary-shaped and served over
  OData + OAuth2, so certified-vendor status later is a conformance run, not a
  rewrite (research.md §4).

## 5. The API surface — REST + OData, MCP on top, DB-agnostic adapter

- **Base layer:** REST with **OData-style query** (`$select`/`$filter`/`$orderby`/
  `$top`/`$skip`) over `/api/skill/*`. Cacheable, RESO-native, field-flexible (incl.
  custom fields) without a GraphQL runtime.
- **DB-agnostic adapter** (Payload pattern): a thin `DbAdapter` interface. **Neon/
  Postgres adapter is the managed default**; a **Mongo adapter** covers
  legacy/self-host. The CHAP/search query layer (Mongoose today) gets a Postgres
  implementation behind this interface — the main re-platforming work.
- **MCP is the headline interface** over the same REST surface (thin-adapter design
  from `docs/mcp/` preserved). **Build-time:** Claude reads schema + docs, scaffolds
  the UI and the sync cron. **Run-time:** CHAP/CRM/CMS tools operate the tenant DB.

## 6. CHAP-as-API + the lead loop

- Expose `src/lib/chat-search/` (CHAP: chat-over-listings + map data) as
  tenant-scoped endpoints + MCP tools. **The map + grounded chat is the moat.**
- **Favorites / favorite communities** already exist in the user model + CHAP.
- **Saved lists + saved searches are net-new** and complete the lead loop. Build the
  write path **once**; it serves the CHAP UI *and* the **client-tier
  (`research:read`) MCP token** — agent-branded buyer/seller research that drops a
  lead signal back into the owning tenant. No PII, no writes except that one
  saved-search signal; hard-bound to one tenant.

## 7. Seeding & sync — on the customer's machine, daily

The activation moment, and the free/paid line.

1. Agent pastes their **MLS RESO Web API** credentials into a **Claude-scaffolded
   sync script that runs on their own computer** (their key never reaches us).
2. The script **fetches** (OData/replication), **flattens**, **maps** to the
   ChatRealty Data Dictionary, and **writes to their Neon DB**.
3. First run = full **seed**; thereafter a **daily cron** does incremental pulls.
4. During setup Claude **interviews** the agent on valuable custom fields ("do your
   buyers search by waterfront / casita / RV parking?") → writes **custom-field
   registry** entries → search honors them.

- **Free tier:** the cron runs on the agent's machine. Fragile by nature (laptop
  off → stale listings) — which is the **upgrade hook**.
- **Paid tier:** ChatRealty runs the same sync on a **VPS**, reliably.
- **Open detail (§10):** does the cron write **straight to Neon** (scoped conn
  string handed to the agent) or **POST to a ChatRealty ingest endpoint**?
  Direct-to-Neon keeps it fully off our infra; ingest endpoint keeps Neon creds
  server-side. Lean: direct-to-Neon for free, ingest endpoint for the VPS tier.

> We never hold an MLS data license and never sit in the feed path on the free tier.
> On the paid/VPS tier we run the pull on the customer's behalf (processor posture)
> — flag for legal review before paid-GA.

## 8. Provisioning & billing

- **Signup → approve (license check) → provision:** create the tenant record, call
  the **Neon API** to spin up the tenant's DB, store the encrypted conn string, mint
  a token, hand back the connector URL + the sync-script setup.
- **Pricing — free for now.** Build the **metering plumbing** (API calls, stored
  row/photo volume, sync runs) but don't charge yet. Paid tiers later: VPS-managed
  sync, higher limits, own-DB/self-host, SLA, multi-seat.
- **Rate limiting** must move off in-memory to **KV-backed** before free signups
  open (already acute in `tech-debt.md`).

## 9. Linchpin files

| File | Role | State |
|---|---|---|
| `F:\web-clients\joseph-sardella\jpsrealtor\src\lib\skill-auth.ts` | Token auth | **exists** — extend to resolve `tenantId` |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\lib\secrets.ts` | AES-256-GCM | **exists** — encrypt per-tenant Neon conn string + Anthropic key |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\lib\mcp-oauth.ts`, `src\models\McpOAuth.ts` | Hosted MCP OAuth | **exists** — reused |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\app\api\skill\*` | Product API routes | **exists** — inject tenant connection; add OData query |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\lib\chat-search\` | CHAP engine | **exists** — Postgres path via adapter; expose as API |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\models\unified-listing.ts` | Listing schema | **exists** — publish as RESO `Property` Data Dictionary |
| `src\lib\tenant\resolve-connection.ts` | **Tenant → Neon connection resolver** | **to build — the keystone (§2)** |
| `src\models\control\Tenant.ts` | Control-plane tenant registry | **to build** |
| `src\lib\db\adapter.ts` + `postgres-adapter.ts` (+ `mongo-adapter.ts`) | DB-agnostic adapter | **to build** |
| `src\lib\tenant\custom-fields.ts` | Custom-field registry + `extras` | **to build** |
| `src\lib\neon\provision.ts` | Neon API: create/destroy per-tenant DB | **to build** |
| `packages\chatrealty-sync\` | The customer-side sync script Claude scaffolds | **to build** |
| `packages\mcp-server\` | MCP transport + build-guide | **exists** — add seeding/field-discovery tools |

## 10. Open decisions (carry into build)

1. **Cron write path** — direct-to-Neon (free) vs. ChatRealty ingest endpoint (VPS).
   Lean: both, by tier (§7).
2. **Pricing dollars** — when paid tiers turn on (shape settled; numbers deferred).
3. **Scope of the Postgres re-implementation of CHAP search** — how much of
   `chat-search/` is reused vs. rewritten for SQL/PostGIS. Spike this early.

## 11. Build order (de-risking)

1. **Control plane + tenant resolver** (`Tenant` model, `resolve-connection.ts`,
   `neon/provision.ts`, token→tenant). The keystone.
2. **Postgres adapter + de-globalize the engine** — every `/api/skill/*` +
   `chat-search` path queries the per-tenant Neon client; ban global connections.
   (Spike the CHAP-search-on-PostGIS port here — decision §10.3.)
3. **Publish the RESO-aligned Data Dictionary** + `JSONB extras` + custom-field registry.
4. **`packages/chatrealty-sync`** — the customer-side daily cron + the Claude
   seeding/field-discovery flow (the activation moment).
5. **Provisioning + free tier** (signup → approve → Neon spin-up → token) with KV
   rate limiting.
6. **CHAP-as-API + saved searches** + the `research:read` client tier.
7. **Paid tier** — VPS-managed sync, metering→billing, dedicated/self-host options.

**Out of scope (ships with other products):** campaigns/marketing send, domain
provisioning, billing admin.
</content>
