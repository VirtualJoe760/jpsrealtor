---
title: Site platform — decisions and build plan (hosting, SEO, custom sites)
status: partial
last_verified: 2026-11-02
related: [./README.md, ./custom-domains.md, ../seo/README.md, ../chatrealty-api/external-site.md, ../mcp/site-building.md, ../commerce/README.md]
---

# Site platform — decisions and build plan

> **Plan, not a map of the code.** Sections marked *Decided* record choices
> Joseph made on 2026-11-02. *Today* describes the code as checked that day.
> The build plan is unstarted. When a phase ships, move its facts into the area
> doc it touches and strike it here.

## TL;DR

ChatRealty is the agent-facing product; jpsrealtor.com stays the consumer
search site for now. Every agent site — the profile-based **standard** site and
the Claude-built **custom** site — will be **hosted by ChatRealty**, and SEO
(sitemap, robots, canonicals, OG images, Search Console verification and
sitemap submission) becomes **automatic when a domain is linked**. Claude,
through the MCP, can run every ChatRealty feature, and Joseph sells a **$300
custom-site setup** to paying subscribers, built with that same MCP.

## Decisions (2026-11-02)

| # | Decision | Replaces |
|---|---|---|
| D1 | **chatrealty.io ranks as a product site** — target agent searches ("IDX website for real estate agents", "AI real estate website", "real estate MCP"). jpsrealtor.com stays primary for consumer search. **No jpsrealtor → chatrealty migration is planned.** Long term chatrealty.io becomes the consumer portal once more data feeds land; that move is out of scope here. | chatrealty.io as a copy of jpsrealtor.com |
| D2 | **Two site types, one platform.** *Standard*: profile-based, ChatRealty design, edited in Settings. *Custom*: built and updated with Claude via the MCP. | — |
| D3 | **ChatRealty hosts custom sites.** The agent needs no Vercel or GitHub account. | "Point, don't host" ([external-site.md](../chatrealty-api/external-site.md)) |
| D4 | **Claude can run the whole account.** Site, blog, landing pages, leads — every feature reachable through the MCP. Both site types read content from the platform API, so a post Claude writes appears on either. | — |
| D5 | **SEO is platform-owned on both site types.** Custom sites take sitemap, robots and canonical/OG data from the platform, so a design edit cannot break indexing. | Custom sites' own code deciding SEO |
| D6 | **Auto-SEO on domain link**: Search Console verification + sitemap submission, IndexNow ping, per-agent default OG image. | `provisionDomain()` GSC stub |
| D7 | **$300 custom-site setup**, one-time, **active subscribers only**. Joseph builds the site with Claude acting on the agent's account. | — |

## Today (checked 2026-11-02)

**chatrealty.io indexing** — not blocked, nearly empty:

- Sitemap declares 6 URLs (`generatePlatformSitemap`,
  `F:\web-clients\joseph-sardella\jpsrealtor\src\lib\sitemap-generator.ts`).
  `/about` 308s to `/` and `/agents` 307s to sign-in — two declared redirects.
  `/privacy-policy` and `/terms-of-service` carry the homepage's title,
  description and `og:url`, with no canonical.
- Homepage: ~109 server-rendered words, buyer-facing copy.
- `/neighborhoods/*` is served on chatrealty.io with a **self-canonical**, and
  its text is identical to jpsrealtor.com's (Indio: 3,056 words, 100% match).
  Google keeps one copy.
- `/developers` (API/MCP docs) is live at 200 and absent from the sitemap.
- `/book-appointment` on chatrealty.io is titled "Joseph Sardella".
- Platform robots.txt does not disallow `/chap` (agent hosts do).
- The 404 page emits two robots metas (`noindex` and `index, follow`).
- Apex → www is now a 308 (the SEO doc's "307" pending item is resolved).

**Agent SEO** — per-host robots, sitemap index, canonicals, RealEstateAgent
JSON-LD and `/api/og/place` cards already work for standard sites. Nothing
tells Google a new domain exists: `provisionDomain()` returns
`gsc: "Not yet implemented"`, and
`F:\web-clients\joseph-sardella\jpsrealtor\src\lib\gsc-api.ts` runs on one
OAuth refresh token (`GBP_*`) and cannot verify a site.

**Search Console for agents** — an agent who *connected* their own domain can
verify it at their registrar. One who *bought* through ChatRealty, or uses a
`{slug}.chatrealty.io` subdomain, cannot: DNS is ours and there is no
per-tenant verification tag. One Google verification file
(`public/googleaf52734edd45146d.html`) is served on every host.

**Custom sites** — scaffolded locally, deployed to the agent's own Vercel,
proxied at `{slug}.chatrealty.io` via `connect_site` → `set_site_live`. Their
own code decides robots/sitemap/canonical; the same build is also reachable at
its `*.vercel.app` URL. We cannot patch them.

## Build plan

Phases are ordered by dependency; P1 and P2 are independent of each other.

### P1 — chatrealty.io as a product site (D1)

| Step | Change | Files |
|---|---|---|
| 1.1 | Sitemap: drop `/about`, `/agents`; add `/developers` and its sub-pages | `src/lib/sitemap-generator.ts` |
| 1.2 | Own title/description/canonical on `/privacy-policy`, `/terms-of-service` | those pages' `generateMetadata` |
| 1.3 | On platform hosts, consumer catalog pages (`/neighborhoods/*`, `/mls-listings/*`) canonical to jpsrealtor.com | `src/lib/domain-utils.ts` (`getBaseUrl` alias, like `SUPPLEMENTARY_DOMAIN_CANONICALS`) |
| 1.4 | Platform robots: disallow `/chap`, `/map` | `src/app/robots.ts` |
| 1.5 | Fix the double robots meta on 404 | `src/app/not-found.tsx` / root layout |
| 1.6 | Agent-facing pages: homepage rewrite, `/for-agents` (IDX website), AI features, comparisons (Showcase IDX, iHomefinder, kvCORE), jpsrealtor.com case study. **Copy drafted for Joseph's approval** | new routes under `src/app/` |
| 1.7 | Verify `sc-domain:chatrealty.io` in Search Console, submit sitemap | dashboard + `gsc-api.ts` |

Done when: every sitemap URL returns 200 with its own title and canonical,
and chatrealty.io's catalog pages canonical to jpsrealtor.com.

**Status 2026-11-02: 1.1–1.5 built, verified on local dev as chatrealty.localhost
(not deployed).**
- 1.1 sitemap: 14 URLs — `/`, `/pricing`, `/ai-classes`, `/developers` + 5
  sub-pages, `/mission`, `/join`, `/invest`, legal. All 200.
- 1.2 privacy/terms `generateMetadata`; also every `/developers/*` page got its
  own title (they shared the layout's) and every company page a
  `https://www.chatrealty.io/…` canonical, to meet the done-when bar.
- 1.3 `getCatalogBaseUrlFromHeaders()` in `src/lib/domain-utils.ts`, used by the
  9 `/mls-listings` + `/neighborhoods` pages that build canonicals
  (`/neighborhoods/indio` → `https://jpsrealtor.com/neighborhoods/indio`).
- 1.4 platform robots uses the shared `DISALLOW_ALL_CRAWLERS` list (adds
  `/chap`, `/map`) and `isPlatformDomain()` (so the localhost preview matches).
- 1.5 `src/app/not-found.tsx` is now a server wrapper declaring
  `noindex, follow`; body moved to `NotFoundClient.tsx`. Next still emits its
  own bare `noindex` meta, so there are two robots metas — but they no longer
  contradict.
- Left: **1.6** (agent-facing copy — needs Joseph's approval) and **1.7**
  (verify `sc-domain:chatrealty.io`, submit sitemap) after deploy.

### P2 — Auto-SEO on domain link (D6)

| Step | Change |
|---|---|
| 2.1 | Platform Google service account with `siteverification` + `webmasters` scopes, replacing the `GBP_*` refresh token for Search Console work |
| 2.2 | `verifySite()` in `gsc-api.ts` via the Site Verification API: DNS TXT for domains in our Cloudflare zone, META tag otherwise. Per-tenant verification token stored on the domain record and rendered in `<head>` for that host only |
| 2.3 | `provisionDomain()` runs verify → add property → submit `/sitemap.xml` → IndexNow ping; persists to `DomainRegistry.gsc` (fields exist). Retries via the existing `/api/cron/domain-orders` pattern |
| 2.4 | Same hook on subdomain mint (`ensureSubdomainRegistered`) |
| 2.5 | Per-agent default OG image (headshot, logo, brand colours) at `/api/og/agent`; fallback for pages without their own |
| 2.6 | Search data in the agent dashboard (Search Analytics API, per property) |

Gotcha to design for: a Google account holds about **1,000** Search Console
properties (unverified figure) — shard across service accounts. GSC has **no
API for adding users**, so agent access to Search Console itself is manual;
the dashboard (2.6) is the scalable path.

### P3 — ChatRealty-hosted custom sites (D3, D5)

| Step | Change |
|---|---|
| 3.1 | Separate Vercel team for agent sites — they run code we did not write; none of the platform's env vars or secrets |
| 3.2 | `deploy_site` MCP tool + `POST /api/skill/site/deploy`: upload built files, create/update one Vercel project per site via the API, set its env (site key, `CHATREALTY_API_BASE`) server-side. Returns preview URL; then the existing `connect_site` / `set_site_live` flow |
| 3.3 | Source storage per site so it can be edited later (open question O1) |
| 3.4 | Template takes SEO from the platform: `robots.txt`, `sitemap.xml`, canonical/OG metadata fetched from `/api/skill/site/seo` and not meant to be edited by the design pass. `create-chatrealty-site` release + build guide update |
| 3.5 | Block indexing of the `*.vercel.app` origin (`X-Robots-Tag: noindex` unless the request came through the proxy) |
| 3.6 | Custom domains for custom sites resolve through the same `domainregistries` path |
| 3.7 | Agent-owned deployments keep working during transition; migrate them on next deploy |

Prerequisite: `site:manage` is in no Claude-access preset (only `website`), so
`connect_site`/`set_site_live` — and `deploy_site` — are hidden from a typical
agent's Claude. Decide which preset carries it (O3).

### P4 — Claude runs the whole account (D4)

Audit every Settings/dashboard feature against the MCP tool list in
[`../mcp/tools.md`](../mcp/tools.md) and close the gaps, standard-site settings
first (profile, brand, service areas, tracking already exist as
`get_tracking`/`set_tracking`). Output: a coverage table in `mcp/tools.md`.

### P5 — $300 custom-site setup (D7)

| Step | Change |
|---|---|
| 5.1 | Stripe one-time product; checkout only for an active Basic subscription (`docs/commerce/`) |
| 5.2 | Intake form after payment: style, service areas, logo, example sites |
| 5.3 | **Agent-approved build grant** so Joseph's Claude acts on the agent's account (their data, subdomain, leads) without holding the agent's key. Time-boxed, revocable, logged |
| 5.4 | Admin queue of paid setups with status; handoff email when live |

Depends on P3 (hosting) and 5.3.

### P6 — Affiliates (partners section)

Added 2026-11-02 at Joseph's request. Recruit affiliates who earn **recurring
income on the subscriptions of agents they sign up**. Lives in the partners
section as a new partner type, next to service partners.

**Today:** partners are RESPA cost-sharing service providers (`Partnership`,
`docs/commerce/transactions-and-partnerships.md`) with an apply → admin
approve → email flow (`/service-partner`, `sendPartnerApprovalEmail`).
`AgentSubscription` already declares `referredBy` and `referralCredits`, but
**nothing writes them**. Nothing pays money *out*; Stripe only charges.

| Step | Change |
|---|---|
| 6.1 | **Affiliate partner type**: apply in the partners section → existing admin approval queue → approval email with their code and link (`chatrealty.io/?ref=CODE`) |
| 6.2 | **Attribution**: `?ref=` → first-party cookie for the attribution window → stored on the `User` at signup → copied to `AgentSubscription.referredBy` (field exists). First click or last click (A4) |
| 6.3 | **Commission ledger**: new `AffiliateCommission` model (schema first — strict mode). Stripe `invoice.paid` on an attributed subscription → `pending` row; becomes `payable` after the refund window; refunds and chargebacks reverse it |
| 6.4 | **Payouts via Stripe Connect Express**: affiliate onboards in Stripe (identity, bank, W-9), monthly transfer of the payable balance above a minimum. Stripe files the 1099-NEC |
| 6.5 | **Affiliate dashboard** in the partners section: link + code, clicks, signups, active paying agents, earned / pending / paid, payout history |
| 6.6 | **Admin**: affiliate list, per-affiliate rate override, pause/terminate, commission ledger |
| 6.7 | **Affiliate terms page** + FTC disclosure requirement (affiliates must disclose they're paid) |

**Decided 2026-11-02 — commission tiers.** A flat monthly amount per agent the
affiliate signed up, paid **every month the agent keeps paying**. The rate rises
with the affiliate's count:

| Agents signed up | Per agent, per month |
|---:|---:|
| 1–9 | $5 |
| 10–24 | $8 |
| 25–49 | $12 |
| 50–99 | $15 |
| 100–199 | $20 |
| 200+ | $25 (20% of the $125 Basic plan) |

Also decided: **anyone can apply, Joseph approves**; **subscriptions only** (no
commission on credit top-ups or marketing spend).

Decided (A7): the count is
**currently paying** agents, not everyone ever referred, so churned agents drop
the affiliate's tier. Decided (A8): the tier rate applies to **all** of that
affiliate's agents (reaching 10 lifts all ten to $8), not only to the ones
above the threshold. Tier and amounts live in one config file, not in code.

Depends on Stripe live billing (live since 2026-10-28, Basic $125/mo). Independent of P1–P5.

Compliance guard: commissions are paid **only on ChatRealty subscription
revenue** — never tied to a real estate transaction, lead or closing. Paying an
unlicensed person for a real estate referral is a DRE problem, and tying pay to
settlement-service business is a RESPA §8 problem; a SaaS revenue share is
neither, as long as it stays one. Worth a counsel check before launch,
especially for affiliates who are themselves lenders or title reps.

### Separate track — off-market listing pages

Not part of the site platform; queued here so it isn't lost. Full plan in
[`../listings/off-market-pages.md`](../listings/off-market-pages.md).

**Built 2026-11-02** as an off-market *notice* page (no property data — IDX
rules forbid showing expired/withdrawn listings): nearby active listings, the
community, and a contact CTA. Possible later: full pages for pending listings
and one-photo pages for sold, which needs the sync to keep those rows.

## Open questions

| # | Question |
|---|---|
| O1 | Source storage for custom sites: private repo per site in a ChatRealty GitHub org, or a source bundle in blob storage? |
| O2 | Hosting cost per custom site, and whether Basic ($125/mo) absorbs it |
| O3 | Which presets carry `site:manage` |
| O4 | Agent search data: dashboard only, or also direct Search Console access? |
| O5 | Can an agent switch between standard and custom, and what carries over? |
| A1 | ~~Commission amount~~ — decided: tiered flat $/agent/month (P6) |
| A2 | ~~Duration~~ — decided: as long as the agent keeps paying |
| A3 | ~~Who can join~~ — decided: anyone, after approval |
| A4 | Attribution window (cookie length) and first vs last click |
| A5 | ~~Credits too?~~ — decided: subscriptions only |
| A6 | Payout minimum and schedule; refund window before a commission is payable |
| A7 | ~~Tier count~~ — decided 2026-11-02: **currently paying** agents only; churn lowers the tier |
| A8 | ~~Tier scope~~ — decided 2026-11-02: the tier rate applies to **all** of the affiliate's paying agents |
