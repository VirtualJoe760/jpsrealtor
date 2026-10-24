---
title: ChatRealty API — Tenancy Architecture
status: current
last_verified: 2026-10-17
related: [./research.md, ./control-plane.md, ./connection-resolver.md, ./neon-setup.md, ./data-tiers.md, ./external-site.md, ../multi-tenant/README.md, ../mcp/README.md, ../mcp/scopes-and-safety.md, ../listings/README.md]
---

# ChatRealty API — Tenancy Architecture

> Written 2026-06-24 as a target design; re-verified 2026-10-17. The keystone
> (control plane → per-tenant Neon database → adapter) is **built and live**.
> §9 marks each piece built or open. Where a decision changed since the design
> session, the row says so — the code is the truth.

## TL;DR

A customer (agent or web shop) gets API + MCP access with a `crt_live_` token.
They bring their own **MLS key** and **AI key**. Their listings land in
**their own Neon Postgres database**, provisioned self-serve and seeded either
by the `@chatrealty/sync` CLI on their machine/VPS or by the platform itself
from Settings (hosted seeding, 2026-10-16). The engine (`/api/skill/*`, the
hosted MCP, CHAP) is stateless on Vercel and connects to *that tenant's*
database per request. Token → tenant → database is the single indirection that
makes the product multi-tenant and keeps tenants structurally isolated.

## 0. Settled decisions

| # | Decision | Choice (status 2026-10-17) |
|---|---|---|
| Tenancy | One isolated store **per tenant** | ✅ built — in practice one **Neon project** per tenant (`src/lib/tenant/provision.ts`) |
| DB platform | **Neon (serverless Postgres)**, scale-to-zero | ✅ built |
| Pricing | Free for now; metering deferred | Storage allowances per subscription tier exist (`src/lib/data-tiers.ts`, see [data-tiers.md](./data-tiers.md)); dollars and metering still deferred |
| Sync cadence | Daily | ✅ CLI: customer's cron. Hosted: nightly during the 3 AM Pacific hour |
| Sync ownership / compute | Was: customer's machine only, MLS key never touches our servers | **Changed 2026-10-16:** both paths exist. CLI keeps the key on the customer's machine; hosted seeding stores the key AES-256-GCM-encrypted on `User.mlsFeed` and runs the pull on Vercel (`src/lib/mls-seed.ts`) — the processor posture §7 flagged for legal review |
| AI inference | BYOK | ✅ |
| Neighborhoods | Region→County→City + optional Subdivision + POIs on per-tenant Postgres | Partial — `src/lib/db/neighborhoods-repo.ts`, `0003_neighborhoods.sql` |
| Listing attribution | HARD invariant — `listAgentName` + `listOfficeName` on all listing data | ✅ enforced in `src/lib/db/to-dto.ts` ([db-adapter.md](./db-adapter.md)) |
| Documentation | LLM-first, served via MCP | ✅ MCP build guide (`packages/mcp-server`) |
| Lead capture | End-user signup auto-upserts a deduped Contact | ✅ `contacts/from-signup`, `end-users/*`; mirrored into the agent's Mongo CRM (`src/lib/crm/mirror-to-owner.ts`) |
| Docs site | docs.chatrealty.io (Fumadocs) | Open (ship-strategy Phase F) |

## Migration posture (legacy app)

**Do not migrate `jpsrealtor.com` to Postgres to launch the product.** The
legacy site stays on the shared MongoDB (`unifiedlistings`,
`unified_closed_listings`, self-hosted with the ingestion crons). Rewriting
every Mongoose query/aggregation (CMA, subdivisions, market stats) is months of
risk; credentials port, queries don't. The owner's dataset is the **dogfood**
path — admin tokens only (`dataSource: "dogfood"`); it is never served to
another agent's token.

## 1. The two planes

| Plane | What lives here | Hosting |
|---|---|---|
| **Control plane** | `Tenant` registry (`src/models/control/Tenant.ts`): status, Neon ids, encrypted pooled/direct conn strings, `tokenHashes[]` + `tenant_tokens[]` | The existing shared MongoDB ([control-plane.md](./control-plane.md)) |
| **Data plane** | Each tenant's own Neon Postgres: `property`/`media`/`member`/`office`, `contact`, `end_user`, `saved_search`, custom-field registry, sync state | Neon, one project per tenant |

```
 Customer machine / VPS          Platform (Vercel)                     Agent's site / Claude
  @chatrealty/sync ──┐    ┌─ Settings → MLS Data Feed (hosted seed,     │ MCP / REST
   (CHATREALTY_DB_URL)│    │   cron /api/cron/mls-sync every 5 min)     ▼
                      ▼    ▼                                ┌──────────────────────────┐
               tenant_A Neon DB ◄───── per request ─────────┤ /api/skill/* + hosted MCP │
               tenant_B Neon DB                             │ token → Tenant → adapter  │◄─ Mongo
               …                                            └──────────────────────────┘   (Tenant, User)
```

## 2. The connection resolver (the keystone)

Every tenant-aware `/api/skill/*` route resolves its data through it:

1. `authenticateSkillRequest` finds the token on a `User` (sha256), then binds a
   tenant by `Tenant.tokenHashes` (non-admin Settings keys auto-bind to the
   owner's active tenant on first use) and reports `dataSource`.
2. `requireScope` refuses data scopes for `dataSource: "none"`.
3. Tenant-bound requests go through `resolveAdapter(tenantId)` /
   `getTenantSql(tenantId)` (`src/lib/tenant/resolve-connection.ts`): decrypt
   the pooled conn string, LRU-cached adapter. Unbound admin requests take the
   legacy Mongo path.

Details: [connection-resolver.md](./connection-resolver.md). Serverless
connection limits are handled by the Neon pooled endpoint + HTTP driver for
reads and a lazily opened WebSocket pool; scale-to-zero means an idle tenant's
first query pays a wake-up.

**What this retires (for the product API only):** the `resolveDomainOwner` /
`session.user.id` scoping split — a token maps to exactly one database. The
platform-rendered sites still need it ([../multi-tenant/domain-owner-scoping.md](../multi-tenant/domain-owner-scoping.md)).

## 3. Identity, tokens & approval

| Concern | Today |
|---|---|
| Token | `crt_live_*`, sha256, scoped (`src/lib/skill-auth.ts`, `src/lib/skill-scopes.ts`). Must exist on the User (`agentProfile.aiIntegrations.apiTokens`); the Tenant mirror is the routing index |
| Hosted auth | OAuth 2.1 DCR + PKCE (`src/lib/mcp-oauth.ts`, `src/models/McpOAuth.ts`); hosted bridge filters tools by scope (`src/lib/mcp-tool-bridge.ts`) |
| Provisioning gate | **Self-serve:** any valid non-admin token → `POST /api/skill/tenant/provision`. The admin approval gate (`provisioning-gate.ts`, license verify) exists but is not the live path; the license gate sits at site go-live (`set_site_live` → 409 `license_required`) |
| Scopes | Presets incl. `client_research` (`research:read`) and the Website preset (`site:manage`) |

## 4. The schema — RESO-aligned + extensible

- Core tables follow the RESO Data Dictionary: `property`, `member`, `office`,
  `media` ([data-dictionary.md](./data-dictionary.md),
  `src/lib/reso/data-dictionary.ts`).
- `geom geometry(Point,4326)` on `property` for bbox/radius search.
- Custom fields in a JSONB `extras` column, declared in the per-tenant
  `custom_field_registry` (`src/lib/tenant/custom-fields.ts`).
- `property_type` is read tolerantly (bucket code or raw RESO label) —
  [db-adapter.md](./db-adapter.md).
- Two DDL sources exist and differ — see [neon-setup.md](./neon-setup.md)
  "Which migration a tenant gets".

## 5. The API surface

REST over `/api/skill/*` (route table in [README.md](./README.md)); an OData
parser exists (`src/lib/skill-api/odata/parse.ts`). A thin `DbAdapter`
interface (`src/lib/db/adapter.ts`) with Postgres (tenant) and Mongo (legacy)
implementations. MCP is the headline interface over the same surface.

## 6. CHAP-as-API + the lead loop

CHAP on tenant Postgres is **partial** (area stats + glue:
[chap-search-pg.md](./chap-search-pg.md)); the full chat+map engine still runs
on the legacy Mongo for the platform's own sites. Favorites/saved searches for
tenant-site visitors live in the tenant DB (`end-users/*`).

## 7. Seeding & sync

- **CLI** (`@chatrealty/sync`): `init` provisions and writes
  `CHATREALTY_DB_URL` (the tenant's pooled conn string, handed to the customer
  by the provision route); `run` seeds then pulls incrementally **straight to
  Neon** — this settled the old "direct-to-Neon vs ingest endpoint" question.
- **Hosted** (Settings → Integrations → MLS Data Feed): stored key, scope
  picker (property types, closed lookback), size check against the tier
  allowance, chunked serverless seed, nightly update that also deletes what
  left scope. [data-tiers.md](./data-tiers.md).

## 8. Provisioning & billing

Self-serve provisioning: Neon project → PostGIS + pg_trgm → schema → verify
`property` + `end_user` → `Tenant` with encrypted conn strings + token binding;
idempotent per owner; failed provisions delete the project; a vanished project
is rebuilt in place. Metering, billing and storage enforcement beyond the seed
preflight are open. Rate limiting is still in-memory ([rate-limiting.md](./rate-limiting.md)).

## 9. Linchpin files

| File | Role | State |
|---|---|---|
| `src/lib/skill-auth.ts` | Token auth, tenant binding, `dataSource` | built |
| `src/lib/secrets.ts` | AES-256-GCM, `hashToken` | built |
| `src/models/control/Tenant.ts`, `src/lib/control/store.ts` | Control plane | built |
| `src/lib/tenant/resolve-tenant.ts`, `resolve-connection.ts` | Resolve + keystone | built |
| `src/lib/tenant/provision.ts` | Self-serve provisioning (live path) | built |
| `src/lib/tenant/provisioning-gate.ts`, `provision-service.ts` | Approval-gated provisioning | built, not the live path |
| `src/lib/neon/client.ts` | Neon Management API | built |
| `src/lib/db/adapter.ts`, `postgres-adapter.ts`, `mongo-adapter.ts`, `to-dto.ts` | DB-agnostic adapter | built |
| `src/lib/tenant/custom-fields.ts` | Custom-field registry + `extras` | built |
| `packages/chatrealty-sync/` | Customer-side sync CLI | built, published |
| `src/lib/mls-seed.ts`, `src/lib/mls-feed.ts` | Hosted seeding | built |
| `src/lib/chat-search/` | CHAP engine | legacy Mongo; tenant port partial |
| Metering / billing | — | open |

## 10. Open decisions

1. **Pricing dollars** and platform-side storage enforcement.
2. **How much of CHAP** to re-implement on SQL/PostGIS.
3. **Legal review** of the hosted-seeding processor posture before paid GA.

## 11. Build order — status

1. Control plane + resolver — **done**. 2. Postgres adapter, tenant read paths —
**done** for listings/market/CRM/end-user routes. 3. RESO Data Dictionary +
`extras` + registry — **done**. 4. `@chatrealty/sync` — **done**. 5.
Provisioning + free tier — **done** (self-serve; rate limiting still
in-memory). 6. CHAP-as-API + saved searches + `research:read` client tier —
**partial**. 7. Paid tier / metering / billing — **open**.

**Out of scope:** campaigns, domain provisioning
([../multi-tenant/custom-domains.md](../multi-tenant/custom-domains.md)),
billing admin.
