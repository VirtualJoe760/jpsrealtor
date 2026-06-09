---
title: Multi-tenant scoping (resolveDomainOwner)
status: current
last_verified: 2026-06-08
related: [../routing/README.md, ../auth/README.md]
supersedes: docs/multi-tenant/index.md
---

# Multi-tenant scoping

## TL;DR

ChatRealty is a multi-tenant platform: one Next.js deployment serves multiple
branded sites. Every public-facing endpoint that displays content scoped to
"this site" MUST resolve **the domain owner** (which agent owns this hostname?)
and filter by that — not by `session.user.id`. The helper that does this is
`src/lib/resolveDomainOwner.ts`. Forgetting this rule is the single most
common bug in this codebase.

## The rule

> **Public endpoints scoping content MUST use `resolveDomainOwner(request)`,
> NOT `session.user.id`.**

The visitor (`session.user.id`) is whoever is signed in right now. The domain
owner is whichever agent owns the hostname being visited. Those are usually
different people. Examples of the failure mode:

- Unauthenticated visitor on `jpsrealtor.com`: `session.user.id` is undefined → filter is dropped → every agent's content shows. (This was the Bethany-Klier-article-on-jpsrealtor bug.)
- Bethany signed in on `jpsrealtor.com`: `session.user.id` is Bethany's → filter shows Bethany's content even though she's on Joseph's site.
- Joseph signed in on `jpsrealtor.com`: works for the wrong reason.

Correct behavior in all three cases: show **Joseph's** content because the *site* is his.

## How `resolveDomainOwner` works

`src/lib/resolveDomainOwner.ts` takes a `Request`, walks the chain below, and returns the owner's `_id`:

| Order | Source | Lookup |
|---|---|---|
| 1 | `?subdomain=` query param or `x-agent-subdomain` header (proxy-set) | `User.findOne({ "agentProfile.subdomain": subdomain })` |
| 2 | Host header → `agentProfile.customDomain` | `User.findOne({ "agentProfile.customDomain": host })` |
| 3 | Host header → `DomainRegistry` collection (`status: active`) | `db.collection("domainregistries").findOne(...)` |
| 4 | Fallback | `User.findOne({ email: process.env.PRIMARY_AGENT_EMAIL })` (defaults to `josephsardella@gmail.com`) |

Return shape:

```ts
{
  ownerId: string | null,                                // Mongo _id as string
  source: "subdomain" | "customDomain" | "domainRegistry" | "primaryAgentFallback" | null,
  host: string,
  subdomain: string | null,
}
```

The helper calls `await dbConnect()` itself so callers don't need to. It returns just the id — callers that need the full User document run their own `.findById(ownerId).select(...).lean()` query with their own projection.

## Domain ownership model

Every agent has a `User` document with an `agentProfile` subdocument. Ownership facets:

| Where the owner is recorded | Field | Example |
|---|---|---|
| Agent's chatrealty subdomain | `agentProfile.subdomain` | `bethanyklier` (resolves `bethanyklier.chatrealty.io`) |
| Agent's custom domain | `agentProfile.customDomain` | `janesmith.com` |
| Mapped via registry | `domainregistries.{domain, ownerId, status}` | Joseph's jpsrealtor.com is here (or could be) |
| Primary platform owner | `process.env.PRIMARY_AGENT_EMAIL` | `josephsardella@gmail.com` |

## Endpoints currently using `resolveDomainOwner`

| Endpoint | Purpose |
|---|---|
| `/api/agent/public` | Full agent profile for the current site (hero, bio, photos) |
| `/api/agent-branding` | Sidebar branding (DRE#, brokerage, contact buttons) |
| `/api/articles/list` | Insights/blog scoped to domain owner's authored articles |

## Endpoints that probably SHOULD use it but don't

Pending audit. Candidates from the grep done earlier:

- `/api/cms/*` (landing pages, blog drafts that surface publicly)
- Any "agent's listings" feed / featured-listings endpoint
- Any sitemap-by-agent generator
- CRM endpoints are **agent-private** so they correctly scope by `session.user.id` — different category, don't migrate.

The systematic fix is to grep every API route for `session.user.id`, classify each as agent-private vs. public-facing, and migrate the public-facing ones to `resolveDomainOwner`.

## Special domains

| Domain | Role | Owner resolution |
|---|---|---|
| `chatrealty.io` / `www.chatrealty.io` | Platform marketing | Falls back to PRIMARY_AGENT_EMAIL (Joseph). `/` rewrites to `/chat-landing` so resolution rarely runs. |
| `agent.chatrealty.io` | Admin-only owner preview | Treated as Joseph's site by content; admin gate is in the proxy. |
| `jpsrealtor.com` / `www.jpsrealtor.com` | Joseph's apex | PRIMARY_AGENT_EMAIL fallback returns Joseph. |
| `josephsardella.com` / `www.josephsardella.com` | Joseph's apex (alt) | Same as above. |
| `{slug}.chatrealty.io` | Agent subdomain | `agentProfile.subdomain` lookup. |
| Custom agent domains | Agent's branded site | `agentProfile.customDomain` then `DomainRegistry` lookup. |

## Gotchas

- **`session.user.id` is for agent-private endpoints only.** "Show me my CRM contacts" → `session.user.id`. "Show me the articles on this site" → `resolveDomainOwner`. Don't mix these up.
- **The fallback returns Joseph.** If `PRIMARY_AGENT_EMAIL` is misconfigured (or that user doesn't exist), the resolver returns `null` and the caller has to handle that defensively. Look at `/api/articles/list`'s handling: if `ownerId` is null AND admin-bypass isn't set, return empty rather than leaking the whole network.
- **Mongoose casts the string id to ObjectId** when you pass `filters.authorId = ownerId` and the schema field is ObjectId. So you don't need to wrap in `new mongoose.Types.ObjectId(...)` unless using raw Mongo collection access.
- **`AGENT_DOMAIN_MAP` in `proxy.ts` is empty.** Custom-domain agents get resolved by content endpoints via the chain above, but the proxy doesn't know about them. If a custom domain ever needs URL rewriting (`/` → `/agent/{id}`), that gap matters.
- **`DomainRegistry` lookup uses raw mongo — AND reads the WRONG collection.** `src/lib/resolveDomainOwner.ts:100` queries `mongoose.connection.db.collection("domainregistries")`, but the `DomainRegistry` Mongoose model (`src/models/DomainRegistry.ts:285`) is bound to `collection: "domain_registry"`. So the admin approval/provisioning flow writes a custom domain into `domain_registry` while this resolver reads `domainregistries` — they're two different collections (1 vs 4 docs as of 2026-06-08). A newly-approved custom domain may not resolve to its agent here; it only works if `agentProfile.customDomain` (the earlier resolver step) is also set. Tracked in `../tech-debt.md`. Fix = unify on one collection for both the model and the resolver, then migrate the legacy docs.

## Reference implementation

Look at `F:\web-clients\joseph-sardella\jpsrealtor\src\app\api\articles\list\route.ts` for the canonical pattern:

```ts
const { ownerId, source } = await resolveDomainOwner(request);
const isAdmin = !!session?.user?.isAdmin && !isImpersonating;
const showAll = searchParams.get("all") === "true";

const filters: any = {};
if (!(isAdmin && showAll)) {
  if (!ownerId) {
    return NextResponse.json({ success: true, articles: [], total: 0 });
  }
  filters.authorId = ownerId;
}
```

Three things to note: admin `?all=true` bypass, defensive empty-result on null owner, single filter set from the resolved id.

## Related models

- `User` (`src/models/User.ts`) — `agentProfile.subdomain`, `agentProfile.customDomain`
- `DomainRegistry` — raw collection, not modeled in src/models/ but documented in `docs/DOMAIN_REGISTRY.md` (legacy — verify)
