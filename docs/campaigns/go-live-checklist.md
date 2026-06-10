---
title: Multi-Tenant Ads — Go-Live Checklist
status: current
last_verified: 2026-06-11
related:
  - ./README.md
  - ../archive/multi-tenant/advertising/campaign-multi-tenant.md
---

# Multi-Tenant Ads — Go-Live Checklist

What stands between the current branch (`feat/agency-multitenant-phase1`) and
charging real agents to run ads on their own accounts. Ordered by gate.

**Current status:** code mechanism built + unit-verified (Phase 1–2). **No real
cross-agent launch has ever run.** Not production ready.

---

## Gate 0 — Pre-deploy hygiene
- [x] **Cash-flow build errors fixed (working tree).** `cashflow-query.ts` is the
      cash-flow feature's own untracked WIP in THIS repo (not a separate backend
      session). Applied: `let derived` (:243) + import `getCurrentMortgageRate`
      from the new shared `src/lib/listings/mortgage-rate.ts`. The helper is
      committed; the 2-line fix ships with the cash-flow feature when it's committed.
- [x] **Live mortgage rate wired** (commit `493af993`): `get_mortgage_rates` +
      calculator now show the live 6.48% instead of the 6.85% fallback.
- [ ] Merge/push `feat/agency-multitenant-phase1` and confirm CI build.
- [ ] Production env vars set: `GOOGLE_ADS_DEVELOPER_TOKEN`,
      `GOOGLE_ADS_LOGIN_CUSTOMER_ID` (= MCC `206-304-7113`), `GOOGLE_CLIENT_ID/SECRET`,
      `META_ADS_ACCESS_TOKEN`, `META_AD_ACCOUNT_ID`, `FACEBOOK_PAGE_ID`,
      `API_NINJA_KEY` (or `API_NINJAS_KEY`, for the live mortgage rate).
- [x] **Cross-domain OAuth fixed** (commit `f66c43f9`): ad-OAuth callbacks run on
      the canonical domain and identify the agent via a signed `state`
      (`src/lib/oauth-state.ts`), not a cross-domain session — so agents on their
      own branded domain can connect. Only the canonical callback URL needs to be
      registered in Google/Meta. **Still TODO:** run a real cross-domain OAuth
      roundtrip with a second agent (folds into Gate 3); confirm the canonical
      `…/google-ads/callback` + `…/meta-ads/callback` are registered in prod.

## Gate 1 — External approvals (hard blockers)
- [ ] **Google Ads developer token** approved for production (Basic Access — in
      review). Until then, live campaign creation fails for everyone.
- [ ] **Meta Advanced Access on `ads_management`** approved. Until then, agent
      OAuth tokens can't do write ops (image upload, ad creative). Submission
      needs a screencast of the *working per-agent flow* — record it once Gate 2
      works for a test agent.

## Gate 2 — Onboarding actually works (per real test agent, not Joseph)
- [ ] **Google manager link:** ChatRealty's MCC sends a manager invite to the
      agent's account; agent accepts (Admin → Access and security → Managers).
      Currently we only *show instructions* — confirm whether we also need to
      auto-send invites via `customerClientLinks`.
- [ ] **Google auto-discovery:** after the agent connects, `listAccessibleCustomers`
      returns their account(s) and the picker populates. (Never run live yet.)
- [ ] **Meta Partner link:** agent adds ChatRealty (Business ID `1260738784844861`)
      as a Partner with *Manage ad account* in Meta Business Settings.
- [ ] Confirm the system-user token can now reach the agent's `act_` (image upload
      succeeds) — the thing the old env-fallback was hiding.

## Gate 3 — End-to-end launch on a SECOND agent's account (the real test)
- [ ] Google: launch a small Search campaign → it appears **PAUSED in the agent's
      Google Ads**, not ChatRealty's. Confirm via `[launch-ads] Google account
      resolution` log showing the agent's customerId.
- [ ] Meta: launch a retargeting campaign → appears in the **agent's** Ads Manager.
      Confirm via `[launch-ads] Meta token + asset resolution` (isPlatformOwnAccount=false,
      resolvedAdAccountId = agent's).
- [ ] Agent's payment method is what gets billed (verify in each platform's billing).
- [ ] Failure UX: an agent who skipped the manager/Partner step gets a clear error,
      not a silent run on ChatRealty's account. (Code does this — verify live.)

## Gate 4 — Billing & credits (before charging anyone) — NOT BUILT
- [ ] `reserve()` / `settle()` / `releaseReservation()` in `src/lib/credits.ts`
      (don't exist yet).
- [ ] `creditReserve` subdocument on `Campaign` (doesn't exist yet).
- [ ] Reserve credits at launch; insufficient balance blocks launch.
- [ ] Nightly cron reconciles reserved credits vs real Meta/Google spend; pauses
      campaigns when the agent's balance runs dry.
- [ ] Escrow display in the dashboard (available / in-escrow / total).

## Gate 5 — Lifecycle & safety — NOT BUILT
- [ ] Meta long-lived token refresh cron (tokens expire ~60 days → silent failure).
- [ ] Disconnect → pause the agent's active campaigns (today disconnect only clears
      local tokens; live ads keep running).
- [ ] Monitoring/alerting on launch failures and settle-cron health.

## Gate 6 — Other channels (only if launching them multi-tenant) — NOT STARTED
- [ ] **thanks.io** per-agent sub-accounts (`sub_account` populated; return address
      stored). Today: single shared API key.
- [ ] **Drop Cowboy** per-agent **Brand** (TCPA — the registered caller identity
      must legally be the agent) + number pool. Today: single shared team. **This
      is a compliance item, not just a feature.**

## Gate 7 — Legal / compliance
- [ ] Agent ToS covering: who owns the ad accounts, who's liable for spend, what
      ChatRealty is authorized to do, data handling.
- [ ] Housing Special Ad Category applied (Meta — already auto-applied in
      `meta-ads-api.ts`; verify it survives the per-agent path).
- [ ] TCPA review for Drop Cowboy if voicemail goes multi-tenant (see Gate 6).

---

## Minimal viable launch (smallest honest "production")
Google-only, one channel, real billing:
**Gate 0 → Gate 1 (Google token) → Gate 2 (Google) → Gate 3 (Google) → Gate 4.**
Meta, voicemail, and direct mail can stay single-tenant / disabled for agents
until their gates are met. Don't enable a channel for agents until its full
gate passes — a half-wired channel silently bills the wrong account.
