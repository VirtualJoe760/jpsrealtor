---
title: Review queue — bugs and inconsistencies awaiting Joseph's decision
status: current
last_verified: 2026-10-24
related: [../tech-debt.md, ../AGENTS.md, ../chatrealty-api/external-site.md]
---

# Review queue

**TL;DR** — Things found while working that need a decision, not a silent fix.
Each item: what's wrong, the evidence, and a suggested fix. Fixed items move to
the log at the bottom with the commit that fixed them. Started 2026-10-17 by the
overnight documentation verification (doc-vs-code audit of every file under
`docs/`, including the 268 files moved wholesale into `docs/archive/` on
2026-05-21).

Severity: **high** = users/compliance/security affected now · **med** = breaks
on a plausible path · **low** = drift or cleanup. ✔ = re-checked in code (or
on prod) by the coordinator; unmarked items carry the auditing agent's
file:line evidence and were not independently re-run.

## Verification status (2026-10-17)

| Area | Status | Commit |
|---|---|---|
| Multi-tenant (8 current docs + domain/tenant archive) | ✅ verified; 2 docs restored from 8 archived | `5fab4a67` |
| Admin dashboard, auth, agent identity/onboarding, billing | ✅ verified; `docs/admin/` created, agent-profile restored | `86804d47` |
| MCP / site building (23 docs + 3 package READMEs) | ✅ verified; `docs/mcp/site-building.md` created | `38f87288` |
| Index files (ARCHITECTURE, README, archive/README) | ✅ updated for the above | this commit |
| CRM, campaigns, integrations, SMS | ✅ verified (current docs) | `e90c4d9c` |
| Chat / CHAP / AI | ✅ verified (`chat/README.md`, `TOOLS_INDEX.md`) | `54844d72` |
| Map, listings, photos, CMA, mobile, PWA | ✅ verified in `listings/README.md` (no separate docs exist for these) | `54844d72` |
| Platform root, CMS, SEO, theming, routing, testing | ✅ verified: root indexes + testing `54844d72`; routing, CMS, SEO, theming `13b9615b` + `be02ee51`. No deployment doc exists. `testing/agents/tom/*` skipped (large uncommitted edits in the main checkout) | `54844d72`, `13b9615b` |
| Content templates | ✅ verified (`auto-posting.md`'s dated log kept as history) | `653d8d21` |
| `docs/archive/` for the areas above | ⏳ not re-read (optional) | — |

Findings from these areas are under "Doc audit, remaining areas" below.

## Open

### R0 · HIGH · Any signed-in account can write protected profile fields — incl. its own API keys and a custom domain *(re-checked in code)*
`PUT /api/user/profile` (`src/app/api/user/profile/route.ts`) checks only that a
session exists (line 137 — end users included, not just agents), then
deep-merges whatever `agentProfile` object it receives into the user
(lines 249–298) with no allowlist. Writable that way:
- `aiIntegrations.apiTokens` — skill auth accepts any `crt_live_…` string
  (`src/lib/skill-auth.ts:89`) and looks it up by hash, so a user can store the
  sha256 of a value they chose with **any scopes** (`campaigns:send`,
  `social:post`, …), skipping the free-tier preset limit in
  `src/app/api/integrations/api-tokens/route.ts`.
- `customDomain` — `resolveDomainOwner` checks `agentProfile.customDomain`
  before the domain registry (`src/lib/resolveDomainOwner.ts:80-91`), so a user
  can claim a domain that exists only in the registry and have it render their
  profile.
- `subdomain` (skips the reserved-name/format checks), `siteForceActive`.
- Line 223 also logs the entire existing `agentProfile` (token hashes included)
  on every save.
**Suggested fix:** an allowlist of the editable profile keys; reject or strip
`aiIntegrations`, `customDomain`, `subdomain`, `siteForceActive`,
`externalSite`, `tracking` from this route (they have their own routes); drop
the line-223 log. Then check prod for token rows with no matching mint
(`createdAt` but no name from the UI) to see if it was ever used. Same item as
the "profile-route lockdown" follow-up proposed 2026-10-16.

### R1 · high · The site tools are invisible to Claude keys — `connect_site`, `set_site_live`, `site_status`
No Claude-access preset carries `site:manage` — `content_drafting`,
`lead_aware`, `full_workspace`, `client_research` in `src/lib/skill-scopes.ts`;
only the Website preset has it, and `full_workspace`'s description excludes it
on purpose. The hosted MCP lists a tool only when the key holds its scope
(`toolAllowed`, `src/lib/mcp-tool-bridge.ts`), so a typical agent's Claude
cannot see the tools that connect and launch the site it just built — the last
two steps of the build guide. (Joseph's own hosted connector shows
`get_tracking` but none of the three.) `get_site_claim_code` had the same
problem and was moved to `listings:read` with a scope cap (commit `2ccb7839`).
**Suggested fix:** decide whether site launch belongs to the Claude key. Either
add `site:manage` to `content_drafting`/`full_workspace` (connect is
preview-only and go-live is license-gated, so the blast radius is small), or
keep it out and have the build guide tell the agent to add it under Custom.
Existing keys keep their scopes either way.

### R2 · high · Footer removal took the sitewide compliance text with it (2026-10-17, requested)
Hidden on request (commit `45d8b534`). What went with it, on every page:
the **server-rendered** agent DRE# + responsible-broker line, the IDX sentence
("provided for consumers' personal, non-commercial use … deemed reliable but
not guaranteed") and "Equal Housing Opportunity", and the Data Deletion /
Neighborhoods / Buying / Selling links. Still present: agent sites show
name · DRE# · brokerage in the sidebar's agency line, but that is
client-rendered (crawlers no longer see a broker on every page), and the
platform host (chatrealty.io) shows "Signed in as" there instead. California
DRE rules require the license number and responsible broker on advertising,
and MLS IDX rules usually require the disclaimer where listings display.
**Suggested fix:** keep the footer hidden but render the agency line + IDX
sentence in small text on listing pages (`/mls-listings/*`, search, map), or
server-render the sidebar agency line. `SiteFooter` is kept unmounted —
restoring it is one line in `src/app/layout.tsx`. The Meta app's data-deletion
URL lives in the Meta app settings, so losing the link is SEO/UX only.

### R3 · med · Committed `dist/` requires files git doesn't have
`packages/mcp-server/.gitignore` ignores `dist/`, yet 86 dist files are
force-tracked (commit `5607b4c8`, "so Vercel resolves the package"). Six newer
compiled tools were never added: `site_tools.js`, `create_carousel_slide.js`,
`plan_listing_carousel.js`, `report_bug.js`, `give_feedback.js`,
`report_data_issue.js` — and the tracked `dist/tools/index.js` `require`s all
six. Production is fine (the root `prebuild` runs `build:mcp-server` on every
Vercel build), but a fresh clone that runs `next dev` without building the
package loads a hosted MCP that crashes on import.
**Suggested fix:** pick one: (a) stop tracking `dist/` (`git rm -r --cached`)
and add `build:mcp-server` to `predev`, or (b) force-add the six files and
keep committing dist with every package change.

### R4 · med · stdio MCP users run the old build guide
`get_site_claim_code`, `whoami.database` and the new build-guide steps are live
on the **hosted** MCP (compiled from source each deploy). npm has
`@chatrealty/mcp-server@0.25.5`; the repo is at **unpublished 0.26.0**, which
already contains all of it — so no further bump is needed, just a publish. The
npm publish token expired 2026-10-08, so nothing ships to npm until a new
granular token is entered (via `~/.claude/tools/secure-input.js`, never chat).
The rewritten package READMEs reach npmjs.com on the same publish.
**Suggested fix:** publish 0.26.0 with a fresh bypass-2FA token.

### R5 · low · Two agent subdomains don't serve
`dianamarsh.chatrealty.io` has an expired certificate and DNS that no longer
points at Vercel; `josephsardella1.chatrealty.io` returns
`DNS_HOSTNAME_RESOLVED_PRIVATE`. Real agent subdomains checked fine
(2026-10-16). **Suggested fix:** fix or remove those two DNS records.

### R6 · med · Local `main` holds five unpushed commits of raw MLS data
The main checkout's local `main` is diverged from `origin/main` by five
`docs(daily-carousel)` commits (`033aa2de` … `81a7d6d4`) carrying pool
snapshots — raw listing data. The GitHub repo is public. **Suggested fix:**
don't push them; move the snapshots out of the repo (Cloudinary or the
content-storage path) and reset local `main` to `origin/main` once anything
worth keeping is saved elsewhere.

### R7 · HIGH · The Gemini project is denied access — the carousel pipeline cannot run at all
Every `generateContent` call on `GEMINI_API_KEY` (`.env.local`) returns
`403 PERMISSION_DENIED — "Your project has been denied access. Please contact
support."` Reproduced on `gemini-2.5-flash` and `gemini-flash-latest`, on a
vision call and on a bare text prompt, repeatedly on 2026-10-24. The key still
authenticates (`GET /v1beta/models` returns the full catalogue), so this is
project-level authorisation, not an expired key. No fallback key exists:
production and development have no `GEMINI_API_KEY` and preview's is an empty
string (checked with the stored `VERCEL_API_TOKEN`).

Photo reading, selection, staging and verification are all Gemini, so the daily
carousel produced **no build on 2026-10-24** and will keep producing none.
**Suggested fix:** Joseph to appeal/restore the blocked project in Google AI
Studio, or mint a key on a different project and set it with
`~/.claude/tools/ask-secret.sh "Gemini API key" --env GEMINI_API_KEY
/f/web-clients/joseph-sardella/jpsrealtor/.env.local`. Only the account owner
can do this; it is not fixable from here.

### R8 · med · `selectStagingPhotos` reports an API outage as "not stageable"
`assessOne` ends `catch { return null }`
(`src/lib/content/select-staging-photos.ts:189`) and `selectStagingPhotos`
`.filter(Boolean)`s the results (line 216), so a frame that **failed to assess**
disappears from `assessed` entirely while a frame the model **refused** appears
with `stageable: false`. Nothing downstream can tell them apart, and
`tmp-selector-dump.ts` prints only the stageable subset.

This is not theoretical: on 2026-10-24 the first dump of 17 Lugo Drive returned
4 stageable frames out of 35 — which reads as a thin listing worth striking —
and the next call returned `assessed=0` because R7 had landed mid-run. Strikes
are durable by policy (`auto-posting.md` §"Rules"), so an outage during a run
can permanently strike a good listing for a transient reason.
**Suggested fix:** have `assessOne` return a distinct error marker rather than
`null`, count and log failures in `selectStagingPhotos`, and fail loudly when
the failure rate is high instead of returning a short shortlist. Interim
mitigation is committed: `scripts/tmp-dump-why.ts` prints
`urls= / assessed= / stageable=` so the gap is visible, and
`scripts/tmp-gemini-probe.ts` surfaces the swallowed error for one photo.

<!-- Documentation-verification findings are appended below by area. -->

### Multi-tenant (doc audit 2026-10-17)

- **M1 · HIGH · Session theft through an agent's external site — FIXED
  2026-10-17** (see the Fixed log). Was: the external-site `/api` rewrite
  forwarded `/api/auth/receive?token=…` to the agent's deployment, and normal
  hand-off tokens weren't host-bound.
- **M2 · HIGH · Agents with a live external site couldn't use their portal —
  FIXED 2026-10-17** (see the Fixed log). They now work on www.
- **M1a · low · "Log in as" isn't available for an agent whose subdomain serves
  their own site.** Since the M1 fix the platform won't create a session on a
  host where the agent's code runs, and impersonation sessions live on the
  agent's subdomain, so `/api/auth/impersonate` answers 409 `external_site` for
  those agents (only `josephsardella1` today). *Fix when needed:* a www-hosted
  impersonation mode (impersonation session on a separate platform host, e.g.
  `admin.chatrealty.io`, so it doesn't overwrite the admin's www session).
- **M3 · HIGH · Domain purchases are paid for in the browser.**
  `/api/domains/purchase` buys on ChatRealty's Vercel account with no server
  debit or price cap (`src/app/api/domains/purchase/route.ts:43-92`); the
  settings step debits credits in a separate call first (labelled
  `channel:"direct_mail"`) and nothing refunds a failed purchase
  (`DomainSeoStep.tsx:262-280`). Real money. *Fix:* price check + debit +
  purchase server-side in one step, refund on failure.
- **M4 · partly disproved ✔ · Agent subdomain identity.** The auditor suspected
  server code resolves Joseph on agent subdomains. Checked prod: Gene's `/`,
  `/about`, `/privacy-policy` render Gene, no Joseph DRE#. What IS true: an
  agent with no tracking tag set loads the platform default GA4
  (`G-613BBEB2FS`), which is **Joseph's own property** — agent-site traffic
  lands in Joseph's analytics. *Decide:* give the platform its own GA4, or
  accept it.
- **M5 · med · Admin-approved custom domains don't resolve.** The model writes
  collection `domain_registry`; resolvers read `domainregistries`
  (`src/lib/resolveDomainOwner.ts:102` vs `src/models/DomainRegistry.ts:285`).
  Already in tech-debt, still open.
- **M6 · med · `agentProfile.domainOnboarding` isn't in the User schema** —
  strict mode drops every onboarding result (`domain-onboarding.ts:169`).
- **M7 · med · Self-serve provisioning applies drizzle `0000` + `0004`, not
  `0001_init.sql`** — tenants miss 16 property indexes (GiST, trigram)
  (`provision.ts:61-68`), contradicting `src/lib/db/migrations/README.md`.
- **M8 · med · Two "coming soon" rules.** The edge gate checks only the profile
  checklist — ignores `siteForceActive`, active subscriptions, owner/admin
  bypass (`site-config/route.ts:56-60`); `/api/agent/public:199` uses another
  rule.
- **M9 · med · `tenant/provision` returns the raw pooled + direct DB URLs** to
  any token the owner holds, including scope-capped website keys.
- **M10 · med · No rate limit on `from-signup` and `end-users/*`**
  (ship-strategy B2).
- **M11 · med · City/subdivision domain targets are stored but never applied**
  — `AGENT_DOMAIN_MAP` is empty; `/api/internal/domain-lookup` has no callers.
- **M12 · low · `/api/agents/directory` builds `new RegExp` from raw input**
  (`route.ts:40-54`) — ReDoS / error on special characters. *Fix:* escape.
- **M13 · low · Stale comments / orphans:** `auth.ts:24-25, 298-302` still
  describe a `.chatrealty.io` cookie; `DomainRegistry.ts:3` points at a deleted
  doc; nothing calls `evictAdapter` (stale tenant connection up to 10 min after
  re-provisioning); `no_data_source` message mentions only the CLI, not hosted
  seeding (`skill-auth.ts:368-378`); `/agent-site` and `DomainSearchCard`
  unused.

### MCP / site building (doc audit 2026-10-17)

- **P1 · med · The hosted bridge applies no tier filter.** `tierFromScopes` is
  never called, so a client `research:read` token sees agent tools
  (`my_agent_profile`, `my_stats`, tracking) on the hosted MCP
  (`packages/mcp-server/src/tiers.ts:117-123` vs `src/lib/mcp-tool-bridge.ts`).
  The routes still refuse on scope, so it's visibility, not access. *Fix:* also
  apply `isToolAllowedForTier(name, tierFromScopes(scopes))` in the bridge.
- **P2 · low · `TOOL_SCOPE` lacks `get_tracking`, `set_tracking`,
  `show_listing_board`** — advertised to every token; routes need
  `site:manage` / `listings:read` (`site/tracking/route.ts:48,62`).
- **P3 · low · stdio server reports `PKG_VERSION = "0.21.0"`** (hard-coded in
  `packages/mcp-server/src/index.ts`); package is 0.26.0.
- **P4 · low · Hosted doesn't serve the `guide://` resources** `prompts.ts:10`
  says it does (`mcp-tool-bridge.ts:157-162` serves only the listing board).
- **P5 · low · Bridge `LEGACY_SCOPES` (`mcp-tool-bridge.ts:85-91`) differs from
  `LEGACY_DEFAULT_SCOPES` (`skill-scopes.ts:196-203`)** — no `site:manage`.
- **P6 · low · The KV rate limiter is unused** — `skillRateLimit`
  (`skill-auth.ts:328-337`) is in-memory per instance, keyed by token last4 +
  name; open requirement before free signups.
- **P7 · low · Postgres CHAP search is dead code** — `src/lib/chap/search-pg.ts`
  and `area-stats.ts` have no callers outside tests.
- **P8 · low · `get_build_guide` description omits `design-your-site`,
  `wire-your-blog`, `go-live`** (`get_build_guide.ts:22,29`).
- **P9 · process · Merge-conflict risk:** the main checkout
  (`feat/mls-feed-key`) has uncommitted edits to `docs/mcp/tools.md`,
  `instagram-posting.md`, `instagram-finish-setup-prompt.md`,
  `packages/mcp-server/README.md` and `packages/mcp-server/package.json` — all
  rewritten on `main` tonight.

### Admin dashboard, auth, billing (doc audit 2026-10-17)
Items marked ✔ were re-checked in code by the coordinator; the rest carry the
auditing agent's evidence and were not independently re-run.

- **A1 · med ✔ · Two definitions of "admin".** `verifyAdmin()`
  (`src/lib/admin-auth.ts:20`) accepts the hard-coded owner email or
  `roles: "admin"` and never reads `isAdmin`; the admin page gate, middleware
  and the Users / Teams / Loop routes use `isAdmin`. A second admin with only
  one of the two gets 403 on half the dashboard. *Fix:* one helper, one rule.
- **A2 · med ✔ · Overview "Pending Applications" is always 0.**
  `src/app/api/admin/stats/route.ts:34` counts phase `"pending"`; live phases are
  `inquiry_pending` … (`src/models/User.ts:503-512`). Partner count is
  `Promise.resolve(0)` (line 36). *Fix:* count `inquiry_pending`; real partner
  query.
- **A3 · med ✔ · `/api/domains/list` is session-only.** Any signed-in user can
  list every domain on the Vercel project with verification records, and each
  call hits the Vercel API (`src/app/api/domains/list/route.ts:11-12`). *Fix:*
  `verifyAdmin()`.
- **A4 · med · Joseph is the fallback agent everywhere.** `useAgentProfile()`
  renders Joseph's name, phone, DRE#, bio and stats on any agent's site until the
  fetch resolves — permanently if it fails (`src/app/hooks/useAgentProfile.ts:35`).
  *Fix:* empty defaults.
- **A5 · med · Brokerage resolvers disagree.** `/api/agent/public` never reads
  `agentProfile.brokerage.name`; `/api/agent-branding` prefers it
  (`src/app/api/agent/public/route.ts:104`). *Fix:* one precedence order.
- **A6 · med · Tenant approval gate is unwired.** `approveTenant` /
  `rejectTenant` in `src/lib/tenant/provisioning-gate.ts` have no caller outside
  their unit test; nothing sets `PlatformConfig.moderation.tenantAutoApprove`
  and no admin page exposes it. *Fix:* decide whether hosted seeding (which
  provisions on its own) replaced it; wire it or delete it.
- **A7 · low · Approving an agent recomputes their subdomain from the current
  name** (`src/app/api/admin/applications/agents/route.ts:96`) — a renamed agent
  loses their URL. *Fix:* keep an existing subdomain.
- **A8 · low · Stale comments/messages:** wildcard-DNS claims (agents route
  `:107`, `users/[id]/route.ts:141`) — the wildcard is DNS-only, each subdomain
  must be registered on Vercel; approval email still says "active after
  subscription" (`:119`).
- **A9 · low · Deleting a user is a hard delete with no cleanup**
  (`src/app/api/admin/users/route.ts:169`) — subscriptions, credit ledgers and
  domain records are orphaned.
- **A10 · low · Users "Live" badge reads legacy `User.subscriptionTier`**; the
  real site gate reads an active `AgentSubscription`.
- **A11 · low · Middleware passes impersonation sessions to `/api/admin`**
  (`src/proxy.ts:171`); each route still rejects them — loose, not open.
- **A12 · low · Dead code:** homepage-builder fields still on `PlatformConfig`;
  `/admin/cms` linked from nowhere; `Transaction` and `AgentMatch` models have
  no importers.
- **A13 · low · Top-ups read the tier from the credit ledger's `tier`**, not
  `AgentSubscription.tier`; a gifted-credit ledger defaults to "beginner",
  changing the top-up markup.

### Doc audit, remaining areas (2026-10-17)
CRM, campaigns, integrations, SMS, chat, listings, platform root, CMS, SEO,
theming, routing, testing, content templates. ✔ = re-checked in code (or on
prod) in the session that wrote this section.

- **D1 · HIGH ✔ · Cloudinary API secret hard-coded in a public repo.**
  `src/lib/cloudinary.ts:10` falls back to a literal secret when
  `CLOUDINARY_API_SECRET` is unset. It has been on `origin/main` since
  `36d5e626` (2025-11-29). *Fix:* rotate the key in Cloudinary **first** (the old
  value is public whatever happens to the code), then delete the fallback so a
  missing env var fails loudly.
- **D2 · HIGH · The lead forms rejected logged-out visitors — FIXED
  2026-10-17** (see the Fixed log). Was: the buy, sell and contact routes were in
  no public list in `src/proxy.ts`, so the `/api` gate answered 401 before
  Turnstile or the route ran.
- **D3 · med ✔ · OAuth `state` signing fails open.** `src/lib/oauth-state.ts:16`
  uses `'fallback-secret'` when `NEXTAUTH_SECRET` is unset. *Fix:* throw.
- **D4 · med ✔ · Two contact creators violate the Contact enums, so the contacts
  are lost.** The Google import writes `source: 'google_import'`, `status: 'new'`
  (`crm/contacts/import/google/route.ts:147-148`); the inbound-SMS webhook writes
  `'inbound_sms'` / `'lead'` (`crm/sms/webhook/route.ts:156-157`). None is in
  `src/models/Contact.ts:320,325`, so every Google contact errors (and the user
  is redirected to `/admin/crm`, which does not exist), and a text from an
  unknown number is answered 200 and not stored. *Fix:* use valid values
  (`google_contacts`, `uncontacted`, …) or extend the enums.
- **D5 · med ✔ · Voicemail and direct mail ignore opt-outs.**
  `campaigns/[id]/send`, `send-simple`, `send-mail` and `api/dropcowboy/campaign`
  never check `doNotContact`; `voicemailOptOut` and `Contact.unsubscribedAt` are
  never read. Only the pickers filter. TCPA exposure on a paid channel. *Fix:*
  filter at send time.
- **D6 · med ✔ · "Sold" chat queries read Active listings.** The parser sets
  dataset `closed` and `closedSinceDays`, but `src/lib/chat-search/preview.ts:470,474`
  call `computeAreaStats` / `buildListingQuery(scope, filters)` with no options,
  so `src/lib/chat-v2/listing-query.ts:83-87` defaults to `active`. *Fix:* pass
  the dataset through.
- **D7 · med ✔ · Unescaped user input in `new RegExp`:**
  `src/app/api/mls-listings/route.ts:49,145,150`,
  `src/lib/chat-search/nearby-pois.ts:71,82,211`,
  `src/app/api/chat/community-facts/route.ts:26-34`. *Fix:* `escapeRegex` from
  `@/lib/security`.
- **D8 · med · `searchHomes` likely returns zero rows for house/condo/townhouse**
  (moderate confidence): it copies the word into `propertySubType`, which the
  query matches exactly (`src/lib/chat-v2/tool-executors.ts:187-191`,
  `listing-query.ts:458-460`).
- **D9 · med ✔ · The Google Ads Standard Access application describes more than
  is built:** account creation (`CreateCustomerClient`), campaign management
  (pause/enable/budget), a credit cap on spend, and encrypted tokens
  (`adAccounts.google.refreshToken` is plaintext). Table in
  `campaigns/google-ads-standard-access-design.md`. *Fix:* amend the text or
  build the pieces before submitting or demoing.
- **D10 · med ✔ · Email activation can bill twice.** `POST /api/agent/email` only
  refuses `verified` (`route.ts:65`); a repeat while `provisioning` debits
  `EMAIL_SETUP_CREDITS` again and creates a second Resend domain. No disconnect
  route exists.
- **D11 · med ✔ · Co-marketing approval is unreachable.** The approval email links
  to `/agent/campaigns?funding=<id>` (`src/lib/co-marketing/notify.ts:35`), which
  never reads the param; the respond route needs a session; no UI calls `fund`
  or `respond`.
- **D12 · med · Where the test repairer runs (Mac or Windows) is unreconciled**
  between `testing/README.md` and `testing/repairer.md`. Needs Joseph's answer.
- **D13 · low-med · `chat-v3` takes `body.userId` from anonymous callers**, but
  user-analytics looks users up by email and the widget sends the literal
  `"demo-user"` (`src/app/api/chat-v3/route.ts:47-53`).
- **D14 · low-med · "Ask chat" on insights pushes `/chap?chat=…`**, which nothing
  reads (`HomeClient.tsx:232`).
- **D15 · low ✔ · Post alerts are never sent.** `notifyPostsReady`,
  `notifyPostSlotDue` and `notifyPostPublished`
  (`src/lib/messaging/notify-agent-posts.ts`) have no caller.
- **D16 · low · Subdivision hierarchy fields** (`parentSubdivision`,
  `hierarchyLevel`, …) are read in 3 routes but missing from
  `src/models/subdivisions.ts`, so strict mode drops any write. (The main checkout
  has uncommitted edits to that model; check them first.)
- **D17 · low · Drift and dead code:** `crontab.vps` references 4 scripts not in
  the repo; `chatv3:toast` has no listener; chat mode `contact_import` posts to a
  missing route; stray `.backup` files in `src/`; `mapbox-gl` and `react-map-gl`
  are unused dependencies.
- **D18 · low · Hard-coded `F:/` env path** in `scripts/agent-feedback.mjs:22` and
  `scripts/test-accounts.ts:54`.
- **D19 · low ✔ · The daily-carousel skill depends on untracked scripts:**
  `reband-pending-post.ts`, `recover-pending-post.ts`, `tmp-cover-preview.ts`,
  `tmp-watermark-strip.py`, `tmp-corner-strip.py` (and the superseded
  `tmp-pool-check.js`) exist only in the main checkout. *Fix:* commit them, or
  record that a fresh clone cannot run the skill.

## Fixed (log)

| Date | Item | Commit |
|---|---|---|
| 2026-10-17 | A seeded agent's own MCP key read `dataSource: "none"` (Settings keys were never bound to the owner's tenant) | `f991b21c` |
| 2026-10-17 | Revoking a key in Settings left its hash in `Tenant.tokenHashes` | `f991b21c` |
| 2026-10-17 | `get_site_claim_code` gated on a scope no Claude preset has | `2ccb7839` |
| 2026-10-17 | `whoami` tool dropped the `database` block the build guide reads | `c8ee639b` |
| 2026-10-17 | A client `research:read` key could mint a website key that outlives it | `c8ee639b` |
| 2026-10-17 | Stale `Domain=.chatrealty.io` cookie claims in docs/auth, index drift in ARCHITECTURE/README | `8692d02e` |
| 2026-10-17 | **M1** hand-off token leak via an external site's `/api` rewrite: hand-off tokens host-bound (`handoffHost`); `transfer`/`receive`/`impersonate`/`signout-chain` platform-pinned on every host; on a serving external-site host `receive`/`impersonate` → 403; transfer won't launder an impersonation session | this commit |
| 2026-10-17 | **M2** external-site agents' portal: www sends an agent home only if their subdomain serves no external site (fail-closed); platform pages on a serving subdomain go to www via the host's transfer | this commit |
| 2026-10-17 | **D2** buy, sell and contact lead forms 401'd logged-out visitors at the `/api` gate: `/api/leads/buy-intake`, `/api/leads/sell-intake`, `/api/contact` added to `PUBLIC_API_EXACT`. Re-tested cookie-less on local dev: empty POSTs now get the routes' own `400` (validation / "Missing CAPTCHA token"); a gated route still gets `401`. Not yet deployed — re-test on production after the push | this commit |
