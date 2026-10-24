---
title: Agent profile — from User.agentProfile to the page
status: current
last_verified: 2026-10-17
related: [README.md, ../multi-tenant/README.md, ../commerce/free-tier-gating.md, ../admin/README.md]
supersedes: docs/archive/agent-profile/README.md
---

# Agent profile: DB → `/api/agent/public` → `useAgentProfile()`

## TL;DR

An agent's public face (name, phone, license, photos, colours, bio, headline,
value props, stats, service areas) lives on `User.agentProfile`. Public pages
get it from **`GET /api/agent/public`**, which works out which agent owns the
current host. On the client, **`useAgentProfile()`** flattens that response
into an `AgentProfile` object and fills gaps from a hard-coded fallback. Agents
edit the data in `/agent/settings`, which saves through **`PUT /api/user/profile`**
(a deep merge). Logos, wordmark, brokerage and team have their own resolver,
`/api/agent-branding` — see [README.md](./README.md).

Restored 2026-10-17 from `docs/archive/agent-profile/` (six files from April
2026), rewritten against today's code.

## Gotchas

- **The fallback is Joseph.** `FALLBACK` in `src/app/hooks/useAgentProfile.ts`
  holds Joseph's name, email, phone, DRE number, hero photo, bio, stats and
  socials. It renders on **every** agent's site until the fetch resolves, and
  stays if the fetch fails or 404s. The brokerage was blanked for exactly this
  reason in October 2026; the other fields were not.
- **Two brokerage resolvers disagree.** `/api/agent/public` sets
  `brokerageName = agentProfile.brokerageName || User.brokerageName` and never
  reads `agentProfile.brokerage.name`, which `/api/agent-branding` treats as
  the source of truth. It does forward the raw `agentProfile.brokerage` object,
  but the hook ignores it. An agent who filled in only the Identity brokerage
  fields gets no brokerage name on the buy/sell pages.
- **The envelope.** The route returns `{ profile, subscription,
  hasActiveSubscription, siteReadiness }`. The hook reads `raw.profile || raw`,
  then `profile.agentProfile`. Forgetting that unwrap made every field show its
  fallback (the 2026-04-07 bug these docs were first written for).
- **Saves show up late.** The route is served `public, max-age=300,
  stale-while-revalidate=60`, and the hook keeps a module-level `cachedProfile`
  for the life of the tab. Expect up to ~5 minutes, or a reload.
- **The PUT has no allowlist.** `src/app/api/user/profile/route.ts` deep-merges
  whatever `agentProfile` object it receives, for any signed-in user. Declared
  fields persist; undeclared ones are dropped by Mongoose strict mode (AGENTS.md
  rule 5). Arrays are replaced wholesale. That also means a user can write
  protected paths such as `subdomain`, `customDomain`, `siteForceActive` and
  `aiIntegrations.apiTokens` — reported as a bug 2026-10-17.
- **Replacing a photo deletes the old one.** For the fields in
  `CLOUDINARY_PHOTO_FIELDS` the PUT fires a Cloudinary delete for the old URL
  (fire-and-forget).

## Which agent: resolution order in `/api/agent/public`

1. Subdomain: the `?subdomain=` query, else the `x-agent-subdomain` header set by
   `src/proxy.ts`, else the subdomain parsed from the host (`parseOgSubdomain`).
   The host fallback exists because a direct call on an agent subdomain once
   returned Joseph's name and DRE number.
2. `agentProfile.customDomain` equal to the host (with or without `www.`).
3. An active `domainregistries` record for the host → its `ownerId`.
4. `PRIMARY_AGENT_EMAIL` (defaults to Joseph).

The same response carries the site-live decision: `hasActiveSubscription` is
true when the go-live checklist is complete (`getSiteReadiness`), **or** there is
an active/trialing `AgentSubscription`, **or** `agentProfile.siteForceActive`
is set. See [free-tier-gating.md](../commerce/free-tier-gating.md).

## Field mapping (the ones that trip people)

| DB (`User.agentProfile…`) | Route (`profile.agentProfile…`) | Hook (`agent…`) |
|---|---|---|
| `brandColors.primary` / `.secondary` | `brandColor` / `secondaryColor` | `brandColor` / `secondaryColor` |
| `headline` | `heroHeadline` and `headline` | `headline` |
| `socialMedia.instagram` etc. | flattened: `instagram`, `facebook`, `linkedin`, `twitter`, `youtube`, `tiktok` | `socialMedia.*` (TikTok is dropped) |
| `cellPhone` → `officePhone` → `User.phone` | `phone` | `phone` |
| `serviceAreas[]` (objects or strings) | `serviceAreas` | `serviceAreas` (names only) |

## Who reads it

- **The hook** (`useAgentProfile()`): `src/app/buy/BuyHubClient.tsx`,
  `src/app/sell/SellHubClient.tsx`, `src/app/components/pages/Subdivision{Buy,Sell}PageClient.tsx`,
  `src/app/neighborhoods/[cityId]/CityBuySellSections.tsx`,
  `src/app/components/chat/ListingDetailCard.tsx`, `src/app/components/cma/CMAReport.tsx`.
  The buy/sell heroes, value props and CTAs under `src/app/components/{buy,sell}/`
  receive the result as an `agent` prop (they import only the type).
- **`fetchAgentPublic()`** (same file; de-duplicates in-flight requests per URL):
  `src/app/HomeClient.tsx`, `src/app/about/AboutClient.tsx`,
  `BuyIntakeCTA.tsx`, `SellIntakeCTA.tsx`.
- **Direct `fetch('/api/agent/public')`**: `src/app/components/heroes/heroShared.tsx`,
  `src/app/lp/[slug]/LandingPageClient.tsx`, `src/app/lp/LandingPageFooter.tsx`,
  `src/app/campaign/[slug]/CampaignPageClient.tsx`, `src/app/book-appointment/page.tsx`.
- `src/app/agent-site/[[...slug]]/page.tsx` applies the same go-live rule
  itself; it does not call the route.

## Adding a field

1. Declare it on the `agentProfile` subdocument in `src/models/User.ts` — before
   anything writes it.
2. Add the input to the relevant step under `src/app/agent/settings/components/`;
   it saves through `PUT /api/user/profile` with no further change.
3. Forward it in the `publicProfile.agentProfile` whitelist in
   `src/app/api/agent/public/route.ts`. Never forward private data
   (`aiIntegrations`, `mlsFeed`, tokens, integration settings).
4. If client components need it through the hook, add it to the `AgentProfile`
   interface and the mapping in `useAgentProfile.ts`. Give it a neutral
   fallback, not Joseph's value.
5. Check `/api/agent/public` on an agent subdomain actually returns it.

## Rendering tips that still apply

- Guard images: render the `<Image>` and its wrapper only when `agent.headshot`
  is non-empty; an empty `src` throws.
- Transparent headshots want `object-contain`, not `object-cover`.
- The Google Voice browser extension rewrites `tel:` links and causes hydration
  warnings; add `suppressHydrationWarning` to the anchor.
