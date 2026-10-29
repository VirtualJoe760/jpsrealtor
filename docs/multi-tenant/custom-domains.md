---
title: Custom domains — purchase, mapping requests, registry, provisioning
status: current
last_verified: 2026-10-28
related: [./README.md, ./domain-owner-scoping.md, ../integrations/README.md, ../seo/README.md, ../commerce/free-tier-gating.md, ../chatrealty-api/external-site.md]
supersedes: docs/archive/DOMAIN_REGISTRY.md
---

# Custom domains

## TL;DR

Rebuilt 2026-10-28. An agent on Basic gets a domain onto their site two ways,
both self-serve and both landing in the same place (`domainregistries` +
`agentProfile.customDomain`, which every host→owner resolver reads):

1. **Buy one** — Stripe charges registrar price **+ $10/year**, as a yearly
   subscription. Only after payment clears does the server buy it on
   ChatRealty's Vercel account in the agent's name and point it at their site.
   A failed purchase is refunded automatically.
2. **Connect one they own** — free with Basic, no admin approval. The agent
   adds two DNS records at their registrar; the domain goes live when DNS
   points here **and** Vercel has verified this project may serve it.

City/subdivision mappings still go through admin approval (Path 3). Agent
subdomains (`{slug}.chatrealty.io`) are a separate, automatic system — see
[README.md](./README.md#agent-subdomains).

## Gotchas

- **Vercel's old domain API is gone.** `/v4/domains/status|price` and
  `/v5/domains/buy` were sunset 2025-11-09 and return 400; search and purchase
  were silently broken until 2026-10-28. Use `src/lib/domains/registrar.ts`
  (`/v1/registrar/...`). `purchaseDomain`/`getDomainPrice`/
  `checkDomainAvailability` in `src/lib/vercel-domains.ts` are dead.
- **Purchases are asynchronous.** `buy` returns an orderId; the order goes
  draft → purchasing → completed | failed. The webhook polls ~8 s, the settings
  page polls while open, and `/api/cron/domain-orders` (every 10 min) finishes
  anything left — including a checkout whose webhook died before the buy.
- **A test-mode payment never buys a domain.** `startDomainOrder()` refuses to
  call the registrar unless the Stripe event is live; the order is marked
  `needs_attention` instead.
- **DNS pointing at Vercel is NOT proof of ownership.** Vercel lets any project
  attach any domain (attaching `vercel.com` succeeded in testing); it just
  won't serve one another Vercel account owns until a TXT challenge is met. A
  connected domain goes live only when `/v6/domains/{d}/config` says it's
  configured AND `/v9/projects/{id}/domains/{d}` says `verified`. When Vercel
  wants proof, the TXT record (`_vercel`) is shown with the others.
- **Domain subscriptions must not look like a plan.** The Stripe webhook's
  `customer.subscription.deleted` handler drops a user to Free when the
  subscription carries `userId`. Domain subscriptions carry `domainUserId` and
  `type: "domain_registration"`, and the webhook routes them to
  `src/lib/domains/fulfill.ts` before the plan handlers run.
- **`domain_registry` vs `domainregistries`.** The `DomainRegistry` model writes
  `domain_registry`, which no resolver reads — admin-approved *community*
  mappings still don't resolve (tracked in `../tech-debt.md`). Self-serve
  domains are written to the legacy `domainregistries` collection via
  `src/lib/domains/point.ts`, which also sets `agentProfile.customDomain` only
  when the agent has none (never overwrites a domain they use).
- **Community/landing-page targets are dead at serve time.** `AGENT_DOMAIN_MAP`
  in `src/proxy.ts` is empty, and `GET /api/internal/domain-lookup` has no
  callers. A mapped vanity domain serves the normal homepage.
- **Onboarding status is never saved.** `runDomainOnboarding()` writes
  `agentProfile.domainOnboarding`, which `src/models/User.ts` does not declare.
- **External sites are subdomain-only.** The proxy's external-site rewrite
  keys on `{slug}.chatrealty.io`.

## Path 1 — buy a domain (Settings → Domain & SEO → Search & Buy)

| Step | Code |
|---|---|
| Search + price | `POST /api/domains/check` → registrar availability + price; returns `firstYearCharge` / `yearlyCharge` (`src/config/domain-pricing.ts`: +$10, TLD allow-list, premium cap $60) |
| Pay | `POST /api/domains/checkout` → Stripe Checkout, `mode: subscription`, yearly `price_data` = renewal + $10 (a one-time line item or one-time coupon covers a different first-year price); collects billing address + phone for the ICANN registrant. Re-quotes server-side; refuses a domain already paid for |
| Buy + point | webhook `checkout.session.completed` → `startDomainOrder()`: `DomainOrder` (unique `checkoutSessionId`) → registrar `buy` with `expectedPrice` and `autoRenew: true` → poll → attach apex + www to the project → `pointDomainAtAgent()` → `DomainMapping` (`purchasedViaVercel`) → onboarding |
| Failure | `refundAndCancel()`: refunds the first invoice's payment, cancels the subscription; if the refund fails the order is `needs_attention` |
| Renewal | Vercel auto-renews on ChatRealty's bill; the agent's Stripe subscription charges them yearly. When it ends (`customer.subscription.deleted`), `endDomainRenewal()` turns Vercel auto-renew off |
| Status | `GET /api/domains/orders` (agent; advances `purchasing` orders) |

Removing a purchased domain from the site is refused — it's cancelled from
Billing → Manage billing, which stops the renewal.

## Path 2 — connect a domain the agent owns (free with Basic)

`POST /api/agent/domains` with `targetType: "agent_landing"` →
`connectExistingDomain()` (`src/lib/domains/connect.ts`): refuses platform
hosts and domains another agent owns, attaches apex + www, creates a
`DomainMapping` (`pending_dns`) with the records to add (Vercel's rank-1 A
records for `@`, CNAME for `www`, plus a `_vercel` TXT when ownership must be
proven). `POST /api/agent/domains/verify` ("Check DNS") →
`checkConnectedDomain()` → live when configured + verified. `DELETE
/api/agent/domains/[id]` unpoints it and detaches apex + www.

## Path 3 — city/subdivision page mapping, admin approves

1. **Request** — `POST /api/agent/domains` with `targetType: "community_page"`
   (`/neighborhoods/{cityId}[/{subdivisionSlug}]`, subdivision validated).
   Creates `DomainMapping` `status: "pending_approval"`.
2. **Review** — `/admin/domains` → `PATCH /api/admin/domains`
   `{ domainId, action: approve | reject | suspend }`.
3. **Approve** creates (or reuses) a `DomainRegistry` record and runs
   `provisionDomain()` (`src/lib/domain-registry/provision.ts`): Vercel attach
   and `provisionCloudflareForDomain()` in parallel.
4. **Cloudflare** (`src/lib/domain-registry/cloudflare-provision.ts`) — zone,
   DNS, cache/page rules, worker routes; returns nameservers for the admin to
   set at the registrar. Retry from the admin Registry tab. Needs an
   account-scoped token with Zone:Create — see `../integrations/README.md`.
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
