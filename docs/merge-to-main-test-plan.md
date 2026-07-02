# Merge-to-main Test Plan (`feat/chatrealty-api` → `main`)

_Generated 2026-07-02. Ground truth for what lands on `main` and how to hand-test it before go-live._

`feat/chatrealty-api` is **62 commits / ~217 files ahead of `main`**, plus an **uncommitted cashflow feature** in the working tree. Production deploys from `main`, so nothing here is live yet — including the cache-leak fix.

---

## 0. Pre-merge gates (do these first)

1. **Verify the cache-leak fix on a Vercel PREVIEW deploy** (see §A). This is the reason the leak reached prod in the first place — do not trust config, curl the headers.
2. **Commit the cashflow feature** (§H) — it's untracked; if you merge as-is it ships absent. Rebuild `packages/mcp-server/dist` too (dist is tracked).
3. **Exclude junk from the merge** — must NOT go to `main`:
   - `.claude/worktrees/agent-a24ab032e602bed93/` (a whole leftover agent worktree w/ its own `.git`, build logs, `bash.exe.stackdump`)
   - `.local-dev-server.log`, `_tmp_dbcheck.js`, `.claude/NEW_CHAT_PROMPT.md`
   - `docs/campaigns/*.pdf` (optional — your call)
4. **Set go-live env vars** (see §Env at bottom) — several features silently no-op or misbehave if unset.
5. ✅ Working tree compiles (`npm run build` → exit 0, confirmed 2026-07-02).

---

## A. 🔒 Security / CDN cache + Meta-Pixel leak — SHIP-CRITICAL

**What it is:** Closes a **confirmed live cross-user cache leak**. Per-user `/api` routes that set no `Cache-Control` inherited the `vercel.json` catch-all `public, immutable` and were edge-cached across users — `/api/user/favorites`, `/api/user/favorite-communities`, and `/api/auth/user` (admin identity) leaked one user's data to another. Also disables Meta Pixel `autoConfig` to stop lat/lng auto-collection on map URLs.

**Root cause (confirmed):** among `vercel.json` rules the **last match wins**, so the catch-all `/(.*)` shadowed the `/api/*` no-store rules. A route's own header beats `vercel.json` (dynamic public routes were safe); routes with no header inherited immutable. **Fix applied on branch:** catch-all changed to `/((?!api/).*)` so it can't touch `/api`, and the blanket `/api/(.*)` no-store now takes effect.

**Tests:**
1. On a **preview** deploy, `curl -sI` an authed route with no cookie (`/api/admin/stats`, `/api/campaigns`, `/api/appointments`) → `Cache-Control: no-store, max-age=0`, no `x-vercel-cache: HIT`.
2. Cross-user: hit `/api/user/favorites`, `/api/auth/user`, `/api/insights/favorite-spotlight` as User A twice, then as User B / anon → **no-store, always MISS/BYPASS**; B must never receive A's data.
3. Insights spotlight logged-out (401) and logged-in (200) → **both** carry `no-store` (set in the GET wrapper).
4. **Perf check (the tradeoff):** `curl -sI /api/mls-listings`, `/api/neighborhoods/directory`, `/api/agents/directory`, `/api/california-stats`. Dynamic ones should keep their own `s-maxage`/`max-age`; **statically-prerendered public routes will regress to no-store** — confirm which and add `s-maxage` exemptions AFTER the blanket rule before prod merge. (The security-audit pass enumerates these.)
5. Reproduce the neighborhoods data-loss bug on preview (fresh browser, hard-navigate twice) → listings render both times, no frozen empty immutable response.
6. Meta Pixel: `/chap?view=map&lat=..&lng=..` with DevTools filtered to `facebook.com/tr` → no request carries `lat`/`lng`. Then a normal page → PageView/ViewContent **still fire** (autoConfig-off must not kill legit events).

**Top risks:** perf regression on prerendered public routes (biggest); Vercel header-precedence must be preview-confirmed; **already-poisoned caches persist** (plan a purge / hard-refresh, and check Cloudflare `cf-cache-status` too, not just `x-vercel-cache`); autoConfig-off could suppress Meta automatic events marketing relies on.

---

## B. ChatRealty API / BaaS backend (~22 commits)

**What it is:** A multi-tenant Neon-Postgres db-per-tenant data plane alongside Mongo: control-plane `Tenant` model + token→tenant resolver, a `DbAdapter` (Mongo + Postgres), **additive tenant forks** in 3 legacy `/api/skill` listing routes, a new NestJS product API (`apps/api`), and a `/developers` docs site. **Core invariant:** legacy skill traffic with no tenantId is byte-identical to today (Mongo); the Neon path only engages for a token that resolves to an ACTIVE tenant.

**Tests:**
1. **Legacy invariant** — `GET /api/skill/listings/search?city=Palm Desert` with a normal (non-tenant) token before/after deploy → identical Mongo-sourced JSON. Same for `/{key}` and `/comparables`.
2. **Auth** — no header → 401 `missing_or_malformed_token`; `Bearer garbage` → 401; revoked → 403.
3. **Scope/rate** — token lacking `listings:read` → 403 `missing_scope`; >100/min → 429 (runs before the tenant fork).
4. **Tenant happy path** — token bound to an ACTIVE tenant → 200 with items from the tenant's Neon DB incl. `listAgentName`/`listOfficeName`.
5. **⚠️ Tenant error path (highest-priority)** — point a token at a suspended/unreachable tenant → must return a clean 503/403 **JSON Response**, not a 500/empty body. (See risk: the forks `return mapErrorToResponse(e)` which returns a plain object, not a `NextResponse`.)
6. **Cross-tenant isolation** — tenant A's token requesting a key that exists only in tenant B → 404, never B's data.
7. **NestJS** — `apps/api` boots on :3001; `GET /v1/listings` → 401/403/200 by token; `/docs` renders Swagger.
8. `/developers`, `/developers/{authentication,endpoints,schema,mcp,sync}` all render.

**Top risks:** the `mapErrorToResponse` non-Response bug (error paths only → passes happy-path smoke tests); `skill-auth.ts` now runs an extra Mongo Tenant lookup on **every** skill request (hot-path latency + failure surface); cross-tenant leak hinges on `resolveTenantByTokenHash` filtering `status:active` + revocation and strict adapter-cache keying; Neon LRU must `close()` pools on evict or exhaust connection caps; any prod agent token accidentally bound to a Tenant would silently switch legacy calls off Mongo.

---

## C. Messaging / Twilio multi-tenant SMS (~11 commits)

**What it is:** Per-agent SMS — each agent claims their own number (credit-billed), sends from it, receives inbound routed by `To`, gets STOP/HELP/START auto-replies, lead-alert texts, opt-in AI auto-replies, and submits A2P 10DLC info. Primary agent stays on the shared env number, exempt from gating/metering.

**Tests (key ones):**
1. Primary agent → send SMS from shared number, **no** credit debit; inbox loads (no gate).
2. Non-primary un-provisioned → `/agent/messages` shows "Set up text messaging" gate; direct POST `/api/crm/sms/send` → 403 `messaging_not_setup`.
3. Provision a number (Settings → Integrations → area code → Claim) → 250 credits debited (`messaging_setup`), real Twilio number bought with webhook → `/api/crm/sms/webhook`. **Spends real money — do once.** Second provision → 409; <250 credits → 402.
4. Send from provisioned agent → from their own number; `sms_send` debit 0.10/segment; multi-segment/unicode bills more.
5. Reply **STOP** → auto-unsub, `doNotContact=true`, later send → 403. **START** → re-opt-in. **HELP** → agent-info reply.
6. Inbound to a provisioned number from unknown phone → new Contact under **that** agent; inbound to shared env number → resolves to `PRIMARY_AGENT_EMAIL`.
7. AI auto-reply toggle on → "open houses in Palm Desert?" returns listings; conversational chatter → silent (saved, no reply); `doNotContact` → no AI reply.
8. Lead alerts: buy-intake + appointment booking → agent gets the lead-alert SMS; toggle off suppresses.

**Top risks (SECURITY):** **`/api/crm/sms/webhook` has NO Twilio signature validation** — anyone can forge inbound SMS to opt-out contacts, spam-create contacts, or trigger credit-spending AI replies (**highest go-live risk — add `validateRequest`**); provisioning spends real money and partial failures (number bought, Messaging Service throws) still mark `active`; opt-in keyword mismatch ("OPT IN" not recognized, only START/YES); STOP/HELP/AI replies aren't persisted to the thread; lead-alert "reply STOP to mute" actually corrupts the primary agent's contact opt-out state; `getMessageHistory()` still hardcodes the env number (not multi-tenant); outbound TCPA opt-out check only uses legacy `.phone`, not `phones[]`.

---

## D. Billing / Stripe + per-agent email (~5 commits)

**What it is:** Finalizes Stripe credit math ($0.125→$0.10/credit, ~25% more credits per $), webhook idempotency (`ProcessedStripeEvent`) + 5xx-on-failure retries + `charge.refunded` reversal, and per-agent email via Resend (credit-gated). Primary agent exempt.

**Tests:**
1. `$125` Beginner top-up → **1000** credits (not 800); ledger `topup_purchase`.
2. Replay the same webhook event → 200 `{duplicate:true}`, no double credit.
3. Force a handler error on a paid event → **500** (Stripe retries), idempotency claim deleted, credits land exactly once on retry.
4. Full refund (unspent) → `refund` debit restores balance; re-send → no-op. Refund after spending → floors at 0, never negative. Partial refund → logged only (confirm intent).
5. SMS/email gating + metering as in §C; primary exempt (no ledger rows).
6. Email setup: `POST /api/agent/email` invalid domain/mismatched from → 400; valid → 100 credits (`email_setup`), Resend domain + DNS records, status `provisioning`; `PATCH` verify only when Resend says verified.
7. CRM composer (multipart w/ cc/bcc/attachment) → posts to `/api/crm/send-email` (not the old 404 `/api/send-email`); `email_send` 0.02 × recipients.

**Top risks:** **`STRIPE_WEBHOOK_SECRET` is flagged missing from `.env.local`** — unset in prod = every webhook 400s = silent revenue outage (most likely go-live break); non-atomic meter (check-then-debit → concurrent overspend / message sent-but-not-billed); LIVE-mode requires all `STRIPE_PRICE_*` set or subscription webhooks won't map to a tier; `PRIMARY_AGENT_EMAIL` mis-set exempts the wrong account; refund lookup depends on `payment_intent` always captured at grant.

---

## E. Campaigns / Google Ads (~10 commits)

**What it is:** Per-agent ad launches (was single-tenant): signed cross-domain OAuth, Google account auto-discovery + picker, **fail-loudly** guard when a connected agent hasn't selected an account, YouTube video ads, API v18→v24, live mortgage rates (no 6.85% fallback).

**Tests:**
1. `GET /api/mortgage-rates` → live `frm_30` (~6.4, not 6.85), `fallback:false`; missing key → `fallback:true`, 7.00. Calculator + chat show the **same** rate (DRY).
2. Unconnected agent (env creds) launch → launches on platform account (unchanged).
3. **Connected-but-no-account-selected** → `results.google.success=false` "Select your Google Ads account…" — must NOT fall back to ChatRealty's env account. Same for Meta.
4. Google connect → 302 to consent with signed `state`; callback tamper (`state=garbage` / expired) → `?error=invalid_state`, no user update.
5. Auto-discovery: 1 customer → auto-selected; >1 → dropdown; dev-token-in-review → manual entry fallback.
6. YouTube link parsing (watch/youtu.be/shorts/embed/bare id) → detected; **BUG:** YouTube-only campaign passes the continue gate but Launch/Save buttons require `enableGoogle||enableMeta` — un-launchable dead-end.

**Top risks:** silent-wrong-account if a partial `adAccounts.google` skips the fail-loudly guard; **`oauth-state.ts` falls back to `'fallback-secret'` if `NEXTAUTH_SECRET` unset → forgeable state / ad-account-connect takeover**; v24 field shapes unverified (first live launch may 400); post-connect redirect lands on `/agent/campaigns` but the picker is on `/agent/settings#integrations` (agents may not find it).

---

## F. Co-marketing / RESPA group ad-spend (~8 commits)

**What it is:** Backend-only. Lead agent bills a campaign's ad spend across N partnerships: computes fair-value credit shares, stages `pending_adspend`, emails partners an approve/deny deep link, collects each share (balance-first then tier-priced purchase), and once fully funded replays the stored launch payload. **No frontend UI yet**; Stripe charge/refund for shortfalls not wired.

**Tests:** ownership (agent A funding B's campaign → 403); validation (≥2 participants, lead==caller, percentages=100, fixed needs per-party credits, active partnership required); happy path → `pending_adspend` + emails partners (not lead); approve with balance → `partner_split_debit`; approve w/o balance → 402 `paymentRequired` (no debit); final approval → `funded` + campaign `active` + AdCampaignRecords w/ contributors; deny (required) → refunds all + reverts to draft; regression: normal `/launch-ads` unchanged.

**Top risks:** campaign flips to `active` even if the actual launch fails (money collected, no ads, no alert); **no concurrency guard** (two participants `findById→save` race → double-launch/clobber); dual ledger (PointsLedger vs CreditLedger — same collection, divergent enums, strict-mode drop risk); no UI so partners realistically can't approve at go-live; dormant credit-mint branch would mint free credits if ever passed an unverified intent id.

---

## G. Legal / TOS + Privacy (~3 commits)

**What it is:** Per-agent Terms/Privacy generator composing agent body + **mandatory non-removable** platform + SMS clauses; `/terms-of-service` + `/privacy-policy` became per-domain `force-dynamic` server components; Settings editor with live preview; `vercel.json` no-store on both legal routes.

**Tests:** primary agent domain → platform master docs; branded agent domain → generated per-agent doc (platform clause + SMS section + contact block, all present); response `no-store` (no cross-domain poisoning); editor save custom body → preview + public page show custom body + mandatory clauses; clear + save → reverts to standard; empty PATCH → 400; logged out → 401; HTML injection in custom body → escaped (react-markdown v9, no rehype-raw).

**Top risks:** two previously-cached pages now hit Mongo every request — a DB outage silently serves the PRIMARY doc on branded domains (agents' terms vanish without error); `PRIMARY_AGENT_EMAIL` fallback drives which doc renders (legal exposure if wrong); `User.legal` is a new subdoc — confirm schema deployed before PATCH writes (Mongoose strict-mode drops otherwise); wrong `domainRegistry`/stale `customDomain` → wrong agent's license/identity on a legal page.

---

## H. 💰 Cashflow — UNCOMMITTED (commit before merge)

**What it is:** 3 MCP tools (`find_cashflowing_listings`, `get_going_rate`, `analyze_listing_cashflow`) + 3 `/api/skill` routes + a shared `cashflow-query.ts` reading VPS-precomputed `cashflowStats`/`rentStats`/`rent_rates` from Mongo. Registered in an INVESTMENT tool group + `RESEARCH_TOOL_NAMES`.

**Tests:** **first confirm it's committed** (incl. rebuilt `packages/mcp-server/dist`); auth 401 / scope 403 / `listings:read` 200 on all three; going-rate by ZIP/subdivision → 200, city-only → 404 (city param ignored); `find cashflow` default → live rate, `meta.derived` true when rate≠7%, junk-guard (no <$50k, no >30% cap); per-listing with data → `cashflowStats`, without data → `cashflowStats:null` (NOT 404), bad key → 404; MCP end-to-end renders the listing-board with per-card cash-flow line; rate-limit 429 after 100/min.

**Top risks:** **not committed** (won't ship + dist must be rebuilt); doc-drift claim that web-chat consumes the lib (it doesn't — grep finds no reference); MCP instructions demand short-term/seasonal/long-term determinations but data is **long-term only** (over-claim risk in the seasonal Coachella market); new indexes only cover `down20` → `capRate`/`down25`/re-derive sorts can COLLSCAN 76k listings; live-rate dependency makes default output non-deterministic day to day.

---

## Env vars to set before go-live (per-env)
`STRIPE_WEBHOOK_SECRET`, all `STRIPE_PRICE_*` + `USER_PRO_STRIPE_PRICE_ID` (LIVE), `NEXTAUTH_SECRET` (else forgeable OAuth state), `PRIMARY_AGENT_EMAIL` (else wrong account exempted / wrong legal doc), `API_NINJA_KEY` (mortgage rates), Neon `NEON_*` + `SECRETS_ENCRYPTION_KEY` (tenant path), `PRIMARY_AGENT_EMAIL` for Twilio shared-number routing.

## Cross-cutting security follow-ups (feed into the system-wide audit)
- Add Twilio webhook signature validation (§C).
- Add s-maxage exemptions for prerendered public `/api` routes (§A).
- Confirm `mapErrorToResponse` returns a real `NextResponse` on tenant error paths (§B).
- Confirm `NEXTAUTH_SECRET` / `STRIPE_WEBHOOK_SECRET` / `PRIMARY_AGENT_EMAIL` set in every env.
