---
title: ChatRealty API — Productization Research
status: current
last_verified: 2026-06-24
related: [../mcp/README.md, ../mcp/hosting.md, ../mcp/scopes-and-safety.md, ../listings/README.md]
---

# ChatRealty API — Productization Research

> **What this is.** Research feeding the next doc (`architecture.md`) for turning
> ChatRealty's internal `/api/skill/*` + MCP surface into a **sold product**: a
> managed, RESO-aligned, database-agnostic **real-estate backend** — "Payload for
> real estate." Customers bring their own MLS key and Claude seeds their data into
> our schema; we provide the hard backend (CHAP chat+map engine, contacts, CMS,
> dashboard) as an API + MCP build-guide. This version supersedes all earlier
> drafts and folds in the monetization model.

## TL;DR — the model

ChatRealty is a **real-estate backend-as-a-service**. Two layers, one funnel:

| Layer | What it is | Role | Price |
|---|---|---|---|
| **Adoption wedge** | The schema (RESO-aligned Data Dictionary) + REST/OData API + **MCP build-guide** Claude reads to scaffold a site. DB-agnostic — bring any DB, bring your own MLS key. | Frictionless on-ramp. Get customers building on the ChatRealty MCP. | **Free dev tier** |
| **Monetization** | **Managed hosting** — we host + operate + sync the backend (engine + a provisioned data tier) for them. | Recurring revenue + centralized maintenance (one engine we run, not N installs). | **Per-tenant SaaS tiers** |

The customer brings their MLS key (**BYOD**) and their Anthropic key (**BYOK**), so
our marginal cost per tenant is hosting + sync only — never data licensing, never
inference. **Managed hosting is the business; the framework is the funnel.** This
is the proven BaaS open-core playbook (Supabase / Appwrite / Payload Cloud).

> **One posture note, not a rabbit hole:** in the managed tier we *store* the
> customer's licensed MLS data on their behalf — that makes us a **data
> processor/host, not a reseller** (same posture as Supabase hosting your data).
> Validate-later: some MLS data agreements may need to *name* the hosting vendor.
> Not a launch blocker; flagged for legal review before the managed tier GA.

---

## Research findings

### 1. API style — MCP-first, REST+OData underneath (not GraphQL-first)

For AI-agent consumers, **MCP is becoming the standard tool interface** — "a REST
API for AI agents" with a discovery layer for zero-config tool use
([Atlan](https://atlan.com/know/when-to-use-mcp-vs-api/),
[openreplay](https://blog.openreplay.com/mcp-rest-graphql-llm-first-apis/)). The
broad guidance: **REST** for stable/cacheable APIs, **GraphQL** for flexible
client-shaped queries, **MCP** when the consumer is an AI agent
([Fordel](https://fordelstudios.com/research/graphql-vs-rest-2026-honest-take)).
GraphQL and MCP are converging on the same idea — let the client ask for exactly
what it needs — which matters when every response burns agent tokens
([ChatForest](https://chatforest.com/guides/mcp-graphql-integration/)).

**Decision for ChatRealty:** our consumers are *both* — Claude (build-time +
run-time, via MCP) and the customer's app frontend (run-time, via API). So:

- **MCP is the headline interface** — already built (stdio + hosted OAuth 2.1).
- **Underneath, REST + OData-style query** (`$select`/`$filter`/`$orderby`) is the
  base, because it is **cacheable**, it is **exactly what RESO Web API uses**, and
  OData gives most of GraphQL's field-selection flexibility (incl. custom fields)
  without operating a GraphQL layer. GraphQL stays optional/later.

### 2. Database-agnosticism — the adapter pattern (Payload model)

Payload is DB-agnostic via a **Database Adapter**: a thin layer translating the
framework's internal data structures into the database's native structures, with
official adapters for **MongoDB, Postgres (Drizzle), SQLite**; swapping DBs needs
no core logic change ([Payload docs](https://payloadcms.com/docs/database/overview),
[Payload 2.0](https://payloadcms.com/posts/blog/payload-2-0)).

**Decision:** define an internal data model + an adapter interface; ship a **Mongo
adapter first** (we're on Atlas today) and a **Postgres adapter** next. The
managed tier provisions the DB; the adapter is what lets enterprise/self-host
customers bring their own.

### 3. Custom fields — JSONB/subdoc + a per-tenant field registry

Three standard patterns for user-defined fields
([Leapcell](https://leapcell.io/blog/storing-dynamic-attributes-sparse-columns-eav-and-jsonb-explained),
[razsamuel](https://www.razsamuel.com/postgresql-jsonb-vs-eav-dynamic-data/),
[Fowler](https://martinfowler.com/bliki/UserDefinedField.html)):

| Pattern | Fit |
|---|---|
| **EAV** (attribute-per-row) | Unlimited dynamic attrs, but poor query perf (self-joins/pivots). Avoid. |
| **JSONB / subdocument** | Whole attribute set in one column/subdoc; best when **end-users define fields**; good perf; no schema migration. **← choose this.** |
| **Dynamic ALTER TABLE** | Real indexable columns, but DDL-per-field is operationally heavy at multi-tenant scale. |

**Decision:** agent-defined fields (e.g. `waterfront`) live in an **`extras` blob**
(native subdoc in Mongo, JSONB in Postgres). A per-tenant **custom-field registry**
(`{ name, type, searchable, label }`) records what exists, so the **MCP search
tools advertise and honor those fields**. This is the mechanism behind the
**Claude-driven field-discovery prompt**: Claude interviews the agent ("do buyers
search by waterfront?"), writes a registry entry, and search starts supporting it.

### 4. RESO standards — vendor-certifiable; design for it now, certify later

Certification is open to **independent MLSs, brokers, AND technology vendors**; the
process is automated between RESO and the vendor using the vendor's own
credentials ([RESO Certification](https://www.reso.org/certification/)). Current
standards: **Web API Core 2.0.0, Data Dictionary 2.0, RESO Common Format**
([Council of MLS](https://members.councilofmls.org/news/539433/RESO-Approves-Updated-Standards-Opens-for-Certification.htm)).
Minimum technical bar: a Web API server **MUST expose at least one of Property /
Member / Office / Media / InternetTracking** Data-Dictionary resources and **MUST
support OAuth2 tokens OR client credentials**
([RESO Web API Core spec](https://transport.reso.org/proposals/web-api-core.html)).

**Decision:** model the **listings resource as RESO Property (Data Dictionary
2.0)**, serve it **OData-style over OAuth2** (the hosted MCP already does OAuth2).
Built this way, certification later is a conformance run, not a rewrite — and it
doubles as the published, versioned schema customers seed against.

### 5. Monetization — managed hosting, predictable per-tenant pricing

The BaaS market monetizes open/free frameworks via **managed hosting**, and the
pricing lesson is sharp: **predictable, resource-based tiers beat unpredictable
per-operation billing.** Supabase (open-core) runs **Free → $25/project Pro → $599
Team → Enterprise**, typically 30–50% cheaper than Firebase's pay-as-you-go for
comparable usage, precisely because the fixed base price is legible
([getmonetizely](https://www.getmonetizely.com/articles/supabase-vs-firebase-which-baas-pricing-model-actually-saves-you-money),
[Automation Atlas](https://automationatlas.io/answers/supabase-pricing-explained-2026/)).
Self-hosting saves customers 30–50% but transfers the ops burden — the reason
managed tiers convert ([Supabase pricing](https://supabase.com/pricing)). Appwrite
shows the same shape: one open platform, **managed cloud or self-host**
([Appwrite](https://appwrite.io/blog/post/backend-as-a-service)).

**Decision:** mirror it. **Free dev tier** (build on the MCP, bring your own
DB/key) → **flat per-tenant monthly** (we host engine + provisioned DB + MLS sync)
→ **Team/Enterprise** (own-DB adapter, SLA, multi-seat). Flat-per-tenant fits us
because BYOK removes inference cost and BYOD removes data cost — hosting + sync is
the only thing that scales, and it's coverable by a predictable base price.

---

## Recommended architecture direction (for architecture.md)

1. **Engine** = the hosted backend (CHAP chat+map, contacts, CMS, dashboard),
   reading through a **DB adapter** (Mongo first, Postgres next).
2. **API** = REST + OData query semantics, modeled on the **RESO Property Data
   Dictionary**, OAuth2-secured — the published schema + the cacheable read layer.
3. **MCP** = the AI front door over that API, for both build-time (docs + schema +
   scaffolding guide) and run-time (CHAP/CRM/CMS tools). Two token tiers
   (agent / `research:read` client) per the earlier scope work.
4. **Custom fields** = `extras` blob + per-tenant registry; MCP tools read the
   registry so agent-defined fields are searchable.
5. **Tenancy** = managed tier provisions a **DB per tenant** (structural isolation,
   sidesteps the shared-DB scoping bug class); adapter serves bring-your-own-DB.
6. **Seeding** = a documented (and/or MCP-tool-assisted) Claude flow: MLS key →
   fetch → flatten → map to the Data Dictionary → seed the tenant DB.

## Open decisions / build-first order

**Decide (architecture.md):**
1. **Runtime topology of the managed tier** — hosted engine reads a tenant DB we
   provision (recommended) vs. a self-host package. Recommend: **provision per
   tenant** as the default paid product; adapter covers self-host.
2. **Pricing numbers** — the tier breakpoints (this doc validates the *shape*, not
   the dollars).

**Build first (de-risking order):**
1. **Publish the schema as a RESO-aligned Data Dictionary** (productize the
   existing `unified-listing.ts` / `Contact.ts` / `subdivisions.ts` / `Article.ts`).
2. **DB adapter interface + Mongo adapter** (decouple the engine from "Joseph's DB").
3. **Custom-field registry + `extras`**, wired into the MCP search tools.
4. **The Claude seeding + field-discovery flow** (the activation moment).
5. **Managed-hosting provisioning** (per-tenant DB spin-up + sync) — the billable layer.

**Out of scope for this package:** campaigns / marketing send tools (ship with the
campaigns product), domain provisioning, billing admin.

---

## Sources

- API style: [Atlan — MCP vs API](https://atlan.com/know/when-to-use-mcp-vs-api/) · [openreplay — LLM-first APIs](https://blog.openreplay.com/mcp-rest-graphql-llm-first-apis/) · [Fordel — GraphQL vs REST 2026](https://fordelstudios.com/research/graphql-vs-rest-2026-honest-take) · [ChatForest — MCP + GraphQL](https://chatforest.com/guides/mcp-graphql-integration/)
- DB-agnostic: [Payload — Database overview](https://payloadcms.com/docs/database/overview) · [Payload 2.0 announcement](https://payloadcms.com/posts/blog/payload-2-0)
- Custom fields: [Leapcell — sparse/EAV/JSONB](https://leapcell.io/blog/storing-dynamic-attributes-sparse-columns-eav-and-jsonb-explained) · [razsamuel — JSONB vs EAV](https://www.razsamuel.com/postgresql-jsonb-vs-eav-dynamic-data/) · [Martin Fowler — User Defined Field](https://martinfowler.com/bliki/UserDefinedField.html)
- RESO: [RESO Certification](https://www.reso.org/certification/) · [RESO Web API Core spec](https://transport.reso.org/proposals/web-api-core.html) · [Council of MLS — updated standards](https://members.councilofmls.org/news/539433/RESO-Approves-Updated-Standards-Opens-for-Certification.htm)
- Monetization: [getmonetizely — Supabase vs Firebase pricing](https://www.getmonetizely.com/articles/supabase-vs-firebase-which-baas-pricing-model-actually-saves-you-money) · [Supabase pricing](https://supabase.com/pricing) · [Automation Atlas — Supabase pricing 2026](https://automationatlas.io/answers/supabase-pricing-explained-2026/) · [Appwrite — BaaS](https://appwrite.io/blog/post/backend-as-a-service)
- Internal: `docs/mcp/README.md`, `docs/mcp/hosting.md`, `docs/mcp/scopes-and-safety.md`, `docs/mcp/tools.md`, `docs/listings/README.md`
</content>
