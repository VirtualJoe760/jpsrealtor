---
title: Custom domains — purchase, mapping requests, registry, provisioning
status: current
last_verified: 2026-10-17
related: [./README.md, ./domain-owner-scoping.md, ../integrations/README.md, ../seo/README.md, ../commerce/free-tier-gating.md, ../chatrealty-api/external-site.md]
supersedes: docs/archive/DOMAIN_REGISTRY.md
---

# Custom domains

## TL;DR

An agent can get a domain onto the platform two ways, and they land in
different places. **Buying** through Settings (`/api/domains/purchase`) buys it
on ChatRealty's Vercel account, attaches it to the project and writes
`agentProfile.customDomain` — that domain resolves to the agent. **Requesting a
mapping** (`/api/agent/domains`) creates a `DomainMapping` that an admin
approves, which creates a `DomainRegistry` record and provisions Vercel +
Cloudflare — but the host→owner resolvers read a different, legacy collection,
so an approved-only domain falls back to the primary agent. Mapping targets
other than the homepage (city/subdivision pages) are stored and never applied
at request time. Agent subdomains (`{slug}.chatrealty.io`) are a separate,
automatic system — see [README.md](./README.md#agent-subdomains).

Restored 2026-10-17 from the archived `DOMAIN_REGISTRY.md`,
`DOMAIN_STRATEGY.md`, `SUBDOMAIN_PROVISIONING.md`,
`chatrealty/DOMAIN_{PROVISIONING,ONBOARDING,MANAGEMENT_UI}.md` and
`multi-tenant/domain-mapping.md`, rewritten against the code.

## Gotchas

- **Purchase is charged in the browser, not the server.** `DomainSeoStep.tsx`
  debits credits with a separate `POST /api/points` (amount computed
  client-side, `channel: "direct_mail"`) and *then* calls
  `/api/domains/purchase`, which never charges. A direct call to the purchase
  route — or `DomainSearchCard.tsx`, which calls it with no debit at all
  (currently imported nowhere) — buys a domain on ChatRealty's Vercel bill. A purchase that fails after the debit
  is not refunded. **Spends real money; do not call it to test.**
- **Approved mappings don't resolve.** `DomainRegistry` model →
  `collection: "domain_registry"`; `resolveDomainOwner`, `/api/agent/public`,
  `/api/agent-branding`, `domain-utils.ts`, `signup-origin.ts` and
  `sitemap-generator.ts` read `domainregistries`. Approval does not set
  `agentProfile.customDomain`. Tracked in `../tech-debt.md`.
- **Community/landing-page targets are dead at serve time.** `AGENT_DOMAIN_MAP`
  in `src/proxy.ts` is empty, and `GET /api/internal/domain-lookup` (the
  intended edge lookup) has no callers and is not on the API allowlist, so it
  401s anonymously. A mapped vanity domain serves the normal homepage.
- **Onboarding status is never saved.** `runDomainOnboarding()` writes
  `agentProfile.domainOnboarding`, which `src/models/User.ts` does not declare —
  Mongoose strict mode drops it, so `GET /api/domains/onboarding` always reports
  no run.
- **External sites are subdomain-only.** The proxy's external-site rewrite
  keys on `{slug}.chatrealty.io`; an agent's custom domain renders the
  platform site even when their external site is live.

## Path 1 — buy a domain (Settings → Domain & SEO)

| Step | Code |
|---|---|
| Availability + price | `POST /api/domains/check` → `src/lib/vercel-domains.ts` (`/v4/domains/status`, `/v4/domains/price`). Session required. |
| Purchase | `POST /api/domains/purchase`: agent/admin role, `isFreeTier` 403 (admins exempt), `purchaseDomain()` (`/v5/domains/buy`), `addDomainToProject()` (`/v10/projects/{id}/domains`), `$set agentProfile.customDomain` |
| Onboarding (non-blocking, raced against 5 s) | `src/lib/domain-onboarding.ts`: domain-live HEAD check → GSC add site → GSC sitemap submit → GBP announcement post (if the agent has GBP) → save status (dropped, see Gotchas). Status/retry: `GET`/`POST /api/domains/onboarding` |
| List project domains | `GET /api/domains/list` — any signed-in user sees every domain on the project |

UI: `src/app/agent/settings/components/steps/DomainSeoStep.tsx`
(`src/app/components/settings/DomainSearchCard.tsx` exists but is unused).

## Path 2 — request a mapping, admin approves

1. **Request** — `POST /api/agent/domains` (paid plan; admins exempt).
   `targetType` `agent_landing` (`targetPath "/"`) or `community_page`
   (`/neighborhoods/{cityId}[/{subdivisionSlug}]`, subdivision validated). Domain
   normalized (protocol, `www.`, path stripped), unique across
   `domain_mappings`. Creates `DomainMapping` `status: "pending_approval"`.
   List/delete/verify: `GET /api/agent/domains`, `DELETE
   /api/agent/domains/[domainId]`, `POST /api/agent/domains/verify`.
   UI: DomainSeoStep "Point a domain", `/agent/dashboard/domains`.
2. **Review** — `/admin/domains` → `PATCH /api/admin/domains`
   `{ domainId, action: approve | reject | suspend }`.
3. **Approve** creates (or reuses) a `DomainRegistry` record —
   `type` `agent_custom` or `community`, `ownerId`, `target`, approval stamp,
   `domainMappingId` — and runs `provisionDomain()`
   (`src/lib/domain-registry/provision.ts`): Vercel attach and
   `provisionCloudflareForDomain()` in parallel. Vercel success →
   registry `active`; mapping becomes `active`, `pending_dns` or stays
   `approved`. Provisioning errors still approve the mapping.
4. **Cloudflare** (`src/lib/domain-registry/cloudflare-provision.ts`) — zone,
   DNS, cache rules, page rules, worker routes; returns nameservers for the
   admin to set at the registrar. Failures persist on
   `DomainRegistry.cloudflare.{status:"failed", lastError, lastAttemptAt}` with a
   Retry in the admin Registry tab (`POST
   /api/domains/registry/cloudflare-provision`). Needs an account-scoped token
   with Zone:Create — see `../integrations/README.md`. The domain can go live on
   the Vercel CNAME alone; Cloudflare is the cache layer.
5. **Suspend** sets the mapping and its registry record `suspended`.

## The two models

| | `DomainMapping` (`src/models/DomainMapping.ts`) | `DomainRegistry` (`src/models/DomainRegistry.ts`) |
|---|---|---|
| Collection | `domain_mappings` | `domain_registry` (resolvers read legacy `domainregistries`) |
| Holds | The agent's request + workflow | The provisioned domain across services |
| Status | pending_approval, approved, pending_dns, pending_verification, active, rejected, failed, suspended | active, pending, suspended, decommissioned |
| Type | `mappingType` agent_landing / community_page / custom | `type` platform / agent_subdomain / agent_custom / community |
| Extras | targetPath, SEO fields, Vercel/DNS flags | vercel, cloudflare, gsc, analytics, googleAds, metaAds, seo, purchase blocks (GSC/GA4/Ads provisioning not implemented — `provisionDomain` returns "Not yet implemented") |

Admin registry API (admin-gated by the proxy's `/api/domains/registry` prefix):
`GET/POST/PUT /api/domains/registry`, `POST .../check-nameservers`,
`POST .../seed` (imports the Vercel project's domains, incl. agent subdomains,
into `domain_registry`).

## The primary domains

`jpsrealtor.com` is Joseph's primary (the indexed SEO asset);
`josephsardella.com` is supplementary — canonicals point at jpsrealtor.com via
`SUPPLEMENTARY_DOMAIN_CANONICALS` in `src/lib/domain-utils.ts`. Both are
hard-coded in `OWNER_HOSTNAMES` in `src/proxy.ts`. See `../seo/README.md`.
