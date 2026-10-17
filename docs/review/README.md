---
title: Review queue — bugs and inconsistencies awaiting Joseph's decision
status: current
last_verified: 2026-10-17
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
| CRM, campaigns, integrations, SMS (+ their archive) | ⏳ **not verified** | — |
| Chat / CHAP / AI (+ archive chat, chat-v2, chat-production) | ⏳ **not verified** | — |
| Map, listings, photos, CMA, mobile, PWA (+ archive) | ⏳ **not verified** | — |
| Platform root, CMS, SEO, theming, routing, testing, deployment (+ archive) | ⏳ **not verified** | — |

The four unverified areas were briefed and paused: the account's usage limit
stopped all seven auditing agents ~01:30–04:00, and the 04:10 checkpoint said
not to start new areas. Their briefs are ready to resume.

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

<!-- Documentation-verification findings are appended below by area. -->

### Multi-tenant (doc audit 2026-10-17)

- **M1 · HIGH ✔ · Session theft through an agent's external site.**
  `/api/auth/transfer` accepts any `*.chatrealty.io` target
  (`src/app/api/auth/transfer/route.ts:23-41`) and sends the 30-second hand-off
  token to `{target}/api/auth/receive?token=…`. On a subdomain whose external
  site is live, `src/proxy.ts:276-294` rewrites **every** `/api/*` request —
  query string included — to the agent's own deployment, which can then redeem
  the token on www: receive binds only impersonation hand-offs to a host, not
  normal ones (`src/app/api/auth/receive/route.ts`, "A normal session moving
  hosts"). A crafted `transfer?target=https://<agent>.chatrealty.io/x` link
  clicked by anyone signed in on www (Joseph included) hands that agent a
  30-day session. **Exposure today: none** — the only live external site is
  `josephsardella1` (read-only count, 2026-10-17). It becomes exploitable when
  any other agent goes live. *Fix:* never rewrite `/api/auth/*` to an external
  deployment; bind every hand-off token to its target host (as impersonation
  already is).
- **M2 · HIGH ✔ · Agents with a live external site can't use their portal.**
  Since 2026-10-16 agents are sent to their own subdomain
  (`src/lib/agent-host.ts`), where the same rewrite sends `/api/*` — NextAuth
  included — to their deployment. Same exposure (none today). *Fix:* keep
  platform API paths (`/api/auth`, `/api/agent`, `/api/integrations`, …) on the
  platform, or don't send external-site agents home.
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

## Fixed (log)

| Date | Item | Commit |
|---|---|---|
| 2026-10-17 | A seeded agent's own MCP key read `dataSource: "none"` (Settings keys were never bound to the owner's tenant) | `f991b21c` |
| 2026-10-17 | Revoking a key in Settings left its hash in `Tenant.tokenHashes` | `f991b21c` |
| 2026-10-17 | `get_site_claim_code` gated on a scope no Claude preset has | `2ccb7839` |
| 2026-10-17 | `whoami` tool dropped the `database` block the build guide reads | `c8ee639b` |
| 2026-10-17 | A client `research:read` key could mint a website key that outlives it | `c8ee639b` |
| 2026-10-17 | Stale `Domain=.chatrealty.io` cookie claims in docs/auth, index drift in ARCHITECTURE/README | this commit |
