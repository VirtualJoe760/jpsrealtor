---
title: ChatRealty Ship Strategy — v1 Agent Sites
status: current
last_verified: 2026-07-23
related: [./architecture.md, ./build_plan.md, ./create-site-scaffolder.md, ../chat/TOOLS_INDEX.md, ./lead-capture.md]
---

# Ship Strategy & v1 Agent-Site Build Plan

**TL;DR:** ChatRealty ships **thin open clients on a fat closed platform** (Stripe's
boundary, Payload's DX — not Payload's give-away-the-engine model). The funnel:
agents come for **listings on their own site**, get wowed by **CHAP search**, get
tethered by **end-user auth that runs through ChatRealty** (client behavior accrues
in the agent's ChatRealty CRM), and pay for **actions on that data** (campaigns,
client-facing MCP research, done-for-you listing treatment). Updates reach shipped
sites via a three-layer model: server-side brain (zero-touch), npm-package organs
(`npm update`), scaffolded shell (customer-owned). Phase A is runnable **today**
with the published `create-chatrealty-site@0.1.0`.

Decided with Joseph (2026-07 sessions; finalized 2026-07-23). This doc is the map
every build session executes against; it does not re-litigate strategy.

## Gotchas (read before building)

- **`/api/skill/contacts/from-signup` has NO scope check and NO rate limit** — it
  uses the minimal `withSkill` wrapper (`src/lib/skill-api/with-skill.ts:154-189`),
  which does bearer auth + tenant binding only. Fine at current volume; **Phase B
  must add a rate tier** before shipping auth to many sites (workstream B2).
- **The hosted MCP bridge does not enforce tiers.** `src/lib/mcp-tool-bridge.ts`
  lists `ALL_TOOLS` with zero references to `tiers.ts` — tier filtering is
  stdio-only today. This is a **hard blocker (D0)** for client-facing MCP: a buyer
  token on the hosted bridge would see agent tools.
- **Don't invent identity fields — they exist.** `User.ts` already carries
  `agentRelationship` (User.ts:1005), `representationAgreement` (User.ts:361-369),
  `signupOrigin` (User.ts:610-616), and `Contact.linkedUserId` (Contact.ts:153).
  Phase B/D reuse these.
- **CHAP production is already Groq** (`openai/gpt-oss-120b` agent loop,
  `llama-3.1-8b-instant` narrator — `src/lib/chat-v2/reasoning-routing.ts:20`,
  `src/lib/chat-search/narrate.ts:385`). BYOK-Groq for agent sites is the proven
  stack, not an experiment.
- **npm publishes** need the bypass-2FA granular token (account `jsardella`,
  expires **2026-10-08**; see the create-site-scaffolder doc). `@chatrealty/*`
  packages publish scoped under the `chatrealty` org (mcp-server and
  install-skill already live there); only the scaffolder stays unscoped for the
  `npm create` convention.

## 1. The business model

**Boundary principle: everything we publish is a client of the platform —
genuinely excellent, MIT, complete, and worthless without a ChatRealty account.**
The moat is not code; it is the compliance rails + per-tenant data
infrastructure + aggregated analytics + the campaign/lead services + the
network. Code that computes value stays server-side forever.

**Data model (CORRECTED 2026-07-23 — supersedes the "hosted data" framing this
doc originally shipped with): ChatRealty is PURELY BRING-YOUR-OWN-DATA.** Each
agent's own MLS feed seeds their own tenant database. The platform owner's
dogfood dataset serves ADMIN ACCOUNTS ONLY — the owner's MLS license does not
permit redistributing that feed to other agents' sites, so there is no shared
listing pool, no "covered market" tier, and no hosted-data fallback. Unbound
tokens report `dataSource: "none"` and every listing/market read + tenant
write refuses with `no_data_source` (enforced centrally in
`src/lib/skill-auth.ts` `requireScope` + the `withSkill` wrapper).

| Funnel stage | What | Mechanism |
|---|---|---|
| Acquire | Listings on the agent's own site in 5 minutes | `npx create-chatrealty-site` (free) |
| Wow | CHAP — search nobody else gives them | `@chatrealty/ui` widget → platform engine |
| Hook | End-user auth runs through ChatRealty | Every signup = a Contact in the agent's CRM |
| Return | Client behavior (favorites, dislikes, saved searches) visible only on chatrealty.io | Dashboard "Client Activity" |
| Pay | Actions on that data | Campaigns (credits), client MCP, listing treatment |

**The free tier generates its own sales pitch**: behavioral data flows in free;
acting on it costs money. Never create upgrade pressure by crippling the free
site — the free site must stay a complete website.

**Two tracks, one backend (2026-07-23):**

| Track | Who | What |
|---|---|---|
| **Tenant site** (`{slug}.chatrealty.io`) | Agents who don't use Claude | Turnkey hosted site, live on profile completion |
| **MCP / own-site** (scaffolder or hand-built) | Agents building their own brand | Their site on the ChatRealty backend (listings, CHAP, auth, CMS) |

An agent is on ONE track: MCP-path agents don't run a tenant site — their
subdomain eventually **redirects to their own site**. The tenant site is the
no-Claude on-ramp; the MCP is the own-brand path; both feed the same CRM/tether.

**What NEVER ships as code:** CHAP engine internals (parse/preview/tool
executors), cmaStats + aggregation builders, control plane/tenancy, campaign
integrations (Twilio/DropCowboy/Meta/Google), listing-treatment computation, the
dogfood app.

**Naming rules (customer-facing surfaces — 2026-07-23, from live-test failures):**

1. **No infrastructure vendor names.** It is a **"ChatRealty database"** — never
   "Neon" — in every package README, CLI string, env-var name, error message,
   guide prompt, and email. Vendor names live in code comments and internal
   docs only. (Env var: `CHATREALTY_DB_URL`, not `TENANT_NEON_CONN_URI`.)
2. **No "contact/ask ChatRealty" steps in the FINAL product.** Every launch
   path is self-serve; a flow that ends in "ask ChatRealty" marks a missing API,
   not an answer. INTERIM (pre-launch testing, while the owner is the only
   customer): routing a step through ChatRealty is acceptable scaffolding — each
   such step is a named launch blocker (today: tenant/database provisioning →
   Phase P).
3. **Product voice, not plumbing.** No token fragments, HTTP status codes, or
   internal field names in anything an agent-customer reads.

## 2. Locked decisions

1. **Thin clients / fat platform** — Stripe boundary, Payload DX. Self-hostable
   ChatRealty is explicitly a non-goal.
2. **LLM is BYOK** (agent's Groq/Anthropic/other key), provider-agnostic chat
   route (Vercel AI SDK pattern). No ChatRealty credits meter on CHAP v1.
3. **End-user auth is passwordless magic-link** — name + email only, never a
   password. Verified email (not raw capture) so CRM data is trustworthy.
4. **Identity ladder is per-tenant first**: guest (localStorage) → site account
   (per-tenant) → **claimed** platform account (explicit opt-in). Platform-side
   email dedup enables later network reconciliation.
5. **Client-facing MCP is gated by an agent-attested representation agreement**
   (BRBC for buyers, listing agreement for sellers — generic field name). The
   agent confirms; ChatRealty never verifies legal documents. Hard gate — the
   nudge to sign is the feature.
6. **Three-layer updates**: brain server-side (zero-touch), organs as versioned
   npm packages, shell scaffolded. CHAP tool definitions are **served by the
   API**, not hardcoded in shipped packages — new tools appear on every site
   without an npm update.
7. **Tenant provisioning + `@chatrealty/sync` are ON THE CRITICAL PATH**
   (corrected 2026-07-23 — previously "holstered"). Because the platform is
   purely BYOD, no outside agent gets any value until their tenant DB exists
   and the sync CLI is publishable (build_plan Phases 1-3 provisioning; sync =
   Phase 4, Agent 24). Publishing sync before provisioning exists is still
   forbidden (vaporware rule) — which is exactly why provisioning is now the
   top build priority, not a someday item.
8. **BYOD always** (2026-07-23): the dogfood dataset is admin-only; unbound
   tokens see `dataSource: "none"` and data reads/writes refuse loudly. Never
   re-introduce a hosted/shared listing pool — it is a data-license violation,
   not a product option.

## 3. Three-layer update architecture & package lineup

| Layer | Lives | Update path | Examples |
|---|---|---|---|
| Brain | Platform (`/api/skill/*`) | zero-touch, improves for all sites instantly | search ranking, market stats, CMA, listing treatment, CHAP tool defs |
| Organs | npm `@chatrealty/*` | `npm update` | CHAP widget, auth flows, listing card/detail (attribution compliance lives here) |
| Shell | scaffolded, customer-owned | never needs us | pages, layout, branding, copy |

| Package | Status | Contents |
|---|---|---|
| `create-chatrealty-site` (unscoped — `npm create` convention) | **v0.1.0 published** | scaffolder + all-shell template |
| `@chatrealty/auth` | Phase B | end-user identity client: React hooks + route helpers for magic-link + session |
| `@chatrealty/ui` | Phase C | CHAP chat widget, listing card/detail/grid, favorites UI — attribution enforced in-package |
| `@chatrealty/mcp-server` | exists | agent + (Phase D) client research tiers |
| `@chatrealty/sync` | holstered | customer MLS→tenant-Postgres CLI |

Versioning policy: semver; breaking template/package changes get a migration note
in the package README + docs site. Compliance fixes (attribution) always land in
`@chatrealty/ui` patch releases so one publish fixes every updated site.

## 4. Identity ladder & representation gate

| Rung | Identity | Gets | We record |
|---|---|---|---|
| Guest | none (localStorage) | browse, local favorites | nothing |
| Site account | per-tenant, magic-link verified | synced favorites, saved searches | name, email, agent → Contact (via `onSignup`, `src/lib/crm/end-user.ts`) |
| Claimed account | platform-level, explicit opt-in | client-facing MCP research tools | representation status (agent-attested), MCP usage signal |

Reuse map (do not reinvent): `User.roles` default `["endUser"]` (User.ts:645-649);
`User.agentRelationship`; `User.representationAgreement`; `User.signupOrigin`
(add a `"magic_link"` method value); `Contact.linkedUserId` + the
`linkUserToAgent` dedup pattern (`src/lib/signup-origin.ts:113-175`);
`/api/skill/contacts/from-signup` (zod body: email|phone required, consent block).

Privacy: this makes ChatRealty a consumer-data processor across agent sites —
CCPA applies (California). Signup UI ships with consent language; the agent owns
their client data (exportable). Per-tenant identity avoids cross-agent data
questions until the claim step, which is explicit consent.

## 5. Free / paid ladder

Free = **CHAP + the ChatRealty login connect + the CMS blog** (confirmed with
Joseph 2026-07-23), on the agent's own BYOD data. Free scopes:
`FREE_TIER_SCOPES` in `src/lib/skill-scopes.ts` (listings:read, market:read,
articles:read, articles:write).

| Free (complete site + the hook) | Paid (actions on the data) |
|---|---|
| listings search/detail/map on THEIR data (CHAP's substrate) | CMA + subdivision stats, comparables, cashflow |
| CHAP widget (BYOK — inference cost is the agent's) | done-for-you listing treatment (server-computed API fields) |
| ChatRealty login connect: end-user accounts + favorites sync | client-facing MCP research (claimed + attested clients) |
| **lead capture, free and unlimited** → agent's CRM | campaigns on that data (credits — the revenue engine) |
| **CMS blog** — write in chatrealty.io, served on their own site AND tenant site | analytics depth, agency multi-tenant, network placement |
| Client Activity dashboard (basic) | |

## 6. Build phases

Workstream style matches `build_plan.md` (Owns / Depends / Accept). C1/C2 are
independent of Phase B and can run in parallel with it; C3 (the thin-shell
template) needs B3 + C2. D depends on B.

### Phase A — First agent site (internal dogfood run)

No code. Prove the shipped v0.1.0 end-to-end from a second machine. NOTE
(2026-07-23): with the BYOD gate live, this runbook works only with an ADMIN
(dogfood) token — a customer token returns `no_data_source` until tenant
provisioning ships. The first true CUSTOMER run is gated on the provisioning
phase below. Customers aren't dead-ended meanwhile: scaffolder v0.2.0 ships
**TEST DATA mode** (`--test-data`, no token — 25 bundled fictitious listings,
permanent banner, never launched publicly) so the site is previewable while
the backend setup happens.

1. On chatrealty.io (Google login fixed 2026-07-11): **Agent → Settings →
   Integrations** → mint token, preset **Full workspace**. Copy the `crt_live_…`
   once-shown value.
2. On the test machine: `npx create-chatrealty-site@latest my-agent-site --token
   crt_live_… ` (default API base `https://www.chatrealty.io` is correct; the
   CLI verifies against `/api/skill/me`).
3. `cd my-agent-site && npm install && npm run dev` → http://localhost:3000.
4. **Accept:** listings grid + filters render live MLS data; map pins; detail
   page shows "Listed by {office} — {agent}"; favorites heart persists
   (localStorage); lead form submits → Contact appears in the ChatRealty CRM
   (dedup on email; `contactId` in the proxy response). 401 → bad/revoked token;
   429 → read tier is 100 req/min.

### Phase B — End-user auth (the tether)

- **B1 — Platform magic-link API.** OWNS `src/app/api/skill/end-users/*`:
  `POST auth/request` (email + name + consent → send magic link; create/link
  User with `signupOrigin.method: "magic_link"` + `agentRelationship` from the
  tenant; fire `onSignup` for the Contact), `POST auth/verify` (token → session
  JWT, distinct issuer/audience from agent tokens), `GET me`. Email via existing
  Resend plumbing. Depends: nothing new. Accept: signup on a scaffolded site
  creates exactly one verified end-user + one deduped Contact tagged with the
  site domain; re-signup links, never duplicates.
- **B2 — Harden the signup surface.** OWNS rate limiting for `from-signup` and
  the new B1 routes (per-token `write` tier or a dedicated `signup` tier in
  `src/lib/skill-auth.ts:233-244`) + Turnstile-compatible hook for the template
  form. Depends: B1. Accept: burst signups 429 without breaking normal flow.
- **B3 — `@chatrealty/auth` package.** OWNS `packages/chatrealty-auth/`:
  `useEndUser()` hook, `<SignInDialog>` (magic-link UX), route helpers that
  forward the end-user JWT + the site's tenant token to the platform. Zero-dep
  bias; MIT. Accept: builds standalone; template integration is <30 lines.
- **B4 — End-user favorites on the skill surface + template v0.2.** OWNS
  `src/app/api/skill/end-users/me/favorites/*` (server-side favorites keyed to
  the end-user, mirroring `/api/user/favorites` semantics: merge-only bulk POST,
  per-key POST with 410 for gone listings, DELETE) + template upgrade: guest
  localStorage → merge on sign-in (the flow already proven on the platform site).
  Depends: B1, B3. Accept: favorites survive devices; guest merge works; the
  agent sees favorite activity on the Contact.
- **B5 — Recommended listings (2026-07-23, Joseph).** PORT, NOT INVENTION: the
  platform's proven "Favorite Spotlight" flow (`FaveSpot` on the authed home
  page, `/api/insights/favorite-spotlight` — reads `swipeAnalytics`
  topSubdivisions/topCities derived from the user's likes, serves fresh active
  listings from their favorite communities, community switcher, no-store).
  OWNS `GET /api/skill/end-users/me/recommendations` (same design, tenant
  data, exclude already-liked/disliked) + the template's homepage
  "Recommended for you" rail — personalized when signed in, featured/newest
  fallback for guests. Depends: B1, B4. Accept: two users with different
  favorites get visibly different rails; matches jpsrealtor.com's authed
  FaveSpot behavior.
- **B6 — Agent-site security hardening (2026-07-23, Joseph).** OWNS template
  `middleware.ts` (security headers, bot-hostile basics, per-IP rate limits on
  `/api/lead` + auth routes) + **the agent's own Cloudflare Turnstile**: env
  slots (`TURNSTILE_SITE_KEY`/`TURNSTILE_SECRET_KEY`, graceful no-op when
  unset) wired into sign-in + inquiry forms, and a guide step walking the
  agent through creating their own free Cloudflare Turnstile widget (their
  keys, their account — not ChatRealty's). Depends: B3 (forms exist).

### Phase C — CHAP on agent sites

- **C1 — Server-driven CHAP tool definitions.** OWNS `GET
  /api/skill/chap/tools`: returns the tool JSON schemas the widget's loop may
  call, each mapping to an existing skill route (search, detail, comparables,
  market stats, neighborhoods, cashflow — see the route/scope table in this
  folder's README). Versioned envelope so old widgets keep working. Accept: a
  new tool added server-side appears in a deployed site's CHAP with no client
  change.
- **C2 — `@chatrealty/ui` package.** OWNS `packages/chatrealty-ui/`: CHAP chat
  widget (provider-agnostic via AI SDK — Groq default, Anthropic supported; BYOK
  key stays in the site's server env), SSE streaming route helper, listing
  card/detail/grid components with **attribution rendered in-package**.
  Depends: C1. Accept: widget answers "3 bed under 800k in La Quinta with a
  pool" with live listings + cards on a scaffolded site; provider swap is an
  env-var change.
- **C3 — Template v0.3 (thin shell).** OWNS template refactor to import
  `@chatrealty/ui` + `@chatrealty/auth` instead of local copies; scaffolder
  prompts for the LLM key (optional — site works without CHAP). Depends: B3, C2.

### Phase D — Claim flow, representation gate, client MCP

- **D0 — BLOCKER: tier enforcement on the hosted MCP bridge.** OWNS
  `src/lib/mcp-tool-bridge.ts`: filter `tools/list` AND `tools/call` through
  `toolsForTier` (`packages/mcp-server/src/tiers.ts` — `research:read` tier and
  `RESEARCH_TOOL_NAMES` already exist). Accept: a research-tier credential can
  list/call only the research allow-list on the hosted transport.
- **D1 — Claim flow.** OWNS the "claim your ChatRealty account" invite (email +
  dashboard surface): site account → platform account; records the claim,
  preserves `agentRelationship`. Depends: B1.
- **D2 — Representation attestation.** OWNS agent-dashboard prompt ("confirm
  representation for {client}", optional doc upload) writing
  `User.representationAgreement`; buyers=BRBC, sellers=listing agreement,
  stored generically. Depends: D1. Accept: no attestation → no client MCP
  access; the pending state nudges the client to their agent.
- **D3 — Client research MCP access.** OWNS issuing research-tier credentials to
  claimed+attested end-users (scope `research:read` + `listings:read` +
  `market:read` — the `client_research` preset in `src/lib/skill-scopes.ts`
  already defines it) + a buyer/seller-curated guide resource. Depends: D0, D2.

### Phase E — Client Activity dashboard (the retention surface)

- **E1** OWNS a per-Contact activity feed + "this week" rollup for the agent
  dashboard: favorites, dislikes, saved searches, CHAP topics, MCP research
  signal — joined via `Contact.linkedUserId` (the raw behavioral fields already
  exist on User: `likedListings`, `dislikedListings`, `savedSearches`,
  `swipeAnalytics`). Depends: B4. Accept: an agent sees "Sarah favorited 9
  listings in PGA West this week" without leaving chatrealty.io.

### Phase F — docs.chatrealty.io

Already specified as build_plan **§8.4 (Agents 33-35)** — Fumadocs +
`<ClaudePrompt>` copy-for-Claude blocks + generated API reference + llms.txt.
The prompt library and the MCP build guide share one source. Phase A-C learnings
feed the quickstart.

### Phase P — Tenant provisioning + sync (CRITICAL PATH, was "Holstered")

`@chatrealty/sync` + control plane + tenant Neon provisioning: build_plan
Phases 1-3 (provisioning surface), with the sync package itself in Phase 4.
Since the 2026-07-23 BYOD correction this is the launch blocker for any
outside agent: until a tenant DB can be provisioned and bound to their token,
their `dataSource` is `"none"` and the whole funnel stops at guide step 1.
Publishing sync before a customer can obtain a tenant DB connection string
still ships vaporware — provisioning first, then publish.

**Sync CLI UX spec (Joseph, 2026-07-23)** — the onboarding conversation IS the
product surface, so the CLI must support it first-class:

1. **"Do you have a data key?"** — the guide's step-1 question. Setup starts
   from the agent's MLS credentials (RESO Web API or Spark), env-var only.
2. **Small local test fetch** — a low-commitment mode that validates the
   credentials and previews a sample of the agent's feed on their own machine
   before any DB or server exists (maps to `doctor` + a bounded sample pull).
3. **VPS daily sync (recommended)** — the guided production path: the same
   set-and-forget cron pattern the platform itself runs. The guide recommends
   this explicitly; docs + CLI should make VPS setup a first-class walkthrough,
   not an afterthought.

## 7. Risks & open items

| Risk | Mitigation |
|---|---|
| CCPA / consumer-data processing across agent sites | consent language in `@chatrealty/auth` UI; agent-owned exportable data; privacy policy before Phase B ships |
| `from-signup` abuse (no scope, no rate limit today) | B2 hardening before multi-site scale |
| Hosted-bridge tier gap | D0 is a hard blocker for any client credential |
| BRBC is a California (C.A.R.) form | store as generic representation agreement; CA-first is fine |
| npm publish token expires 2026-10-08 | re-mint quarterly or move to GitHub Actions trusted publishing |
| Reseller scaffolds many sites on free tier | that's the agency-tier channel (see agency multi-tenant plan), not a leak |
