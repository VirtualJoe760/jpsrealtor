---
title: Campaigns & Multi-Tenant Advertising
status: current
last_verified: 2026-06-10
related:
  - ../archive/campaigns/CAMPAIGNS_CURRENT_STATE.md
  - ../archive/multi-tenant/advertising/campaign-multi-tenant.md
  - ../multi-tenant/README.md
---

# Campaigns & Multi-Tenant Advertising

## TL;DR

The campaign system runs marketing across four channels — **Google Ads** (search
PPC), **Meta Ads** (FB/IG retargeting), **thanks.io** (direct mail), and **Drop
Cowboy** (ringless voicemail). It is being converted from **single-tenant**
(everything ran on Joseph/ChatRealty's own accounts) to a **digital-agency**
model: each agent authorizes ChatRealty to run ads/outreach *on their behalf*,
billed to the agent's own accounts, with ChatRealty earning the credit markup.

The launch entry point is `src/app/api/campaigns/[id]/launch-ads/route.ts`. Ad
API clients are `src/lib/google-ads-api.ts` and `src/lib/meta-ads-api.ts`.

## Gotchas

- **Per-agent creds must be threaded, not just stored.** Before Phase 1, agent
  campaigns silently ran on ChatRealty's account because the launch route never
  passed the agent's credentials to the API clients (Google) or overrode them
  with the env system-user token (Meta). Both clients now use AsyncLocalStorage
  (`runWithGoogleCreds` / `runWithMetaCreds`) — the launch route binds the
  agent's creds for the duration of the call.
- **Meta write ops are capability-gated.** Until Meta grants this app **Advanced
  Access** on `ads_management`, an agent's OAuth token may fail write ops (image
  upload, ad creative) with `(#3) Application does not have the capability`. The
  platform's *own* account uses the system-user token (`META_ADS_ACCESS_TOKEN`)
  which carries the capability. Securing Advanced Access is the gate for full
  per-agent Meta launches — and the screencast for that review requires the
  per-agent flow to already work, so the code lands first.
- **Google runs via the MCC.** Agents do not supply their own developer token.
  The platform manager account (`GOOGLE_ADS_LOGIN_CUSTOMER_ID`) + platform dev
  token operate on the agent's `customerId`. The agent's account must be linked
  under the MCC (they accept a manager invite — onboarding, Phase 2).
- **thanks.io / Drop Cowboy are not OAuth.** Agency-on-behalf means per-agent
  sub-accounts (thanks.io) / per-agent Brand + number pool (Drop Cowboy), under
  ChatRealty's master account, billed via credit-passthrough.

## Channel credential model

| Channel | Per-agent identity | Auth mechanism | Billing |
|---|---|---|---|
| Google Ads | `customerId` (agent's account) | MCC: platform dev token + `login-customer-id` operate on agent's account | Agent's Google billing |
| Meta Ads | `adAccountId` + `pageId` | Agent OAuth (Settings → Integrations); platform system-user token for platform-own account only | Agent's Meta billing |
| thanks.io | sub-account + return address | Single master API key + per-agent `sub_account` (planned) | Credit-passthrough ($0.10) |
| Drop Cowboy | Brand id + number pool | Single team creds + per-agent brand/pool (planned) | Credit-passthrough ($0.10) |

## Linchpin files

| File | Role |
|---|---|
| `src/app/api/campaigns/[id]/launch-ads/route.ts` | Launch entry — threads per-agent creds for Google + Meta |
| `src/lib/google-ads-api.ts` | Google Ads REST v18 client; `runWithGoogleCreds` + ALS `getConfig` |
| `src/lib/meta-ads-api.ts` | Meta Marketing v21 client; `runWithMetaCreds` + ALS `getConfig` |
| `src/lib/thanksio.ts` | Direct mail client (single key today) |
| `src/app/api/campaigns/[id]/send/route.ts` | Drop Cowboy voicemail send (env team creds today) |
| `src/models/User.ts` | `adAccounts.{google,meta}` per-agent cred storage |
| `src/models/Campaign.ts` | Campaign model, strategies, stats |
| `src/lib/credits.ts` / `src/config/credits.ts` | Credit operations + math ($0.10/credit) |

## Decisions (2026-06-09)

- **Google** → MCC manager-account model (manager `206-304-7113`; agents don't
  need their own dev token).
- **Meta** → per-agent OAuth via Integrations; apply for Advanced Access *after*
  the per-agent flow works (code-first).
- **thanks.io / Drop Cowboy** → keep credit-passthrough (ChatRealty pays the
  vendor, agent charged via credits at the $0.10 rate).

## Phased plan

| Phase | Goal | Status |
|---|---|---|
| 1 | Thread per-agent creds (Google + Meta) so launches target the agent's account | **Done** |
| 2 | Onboarding: Google account auto-discovery (`listAccessibleCustomers`) + customer picker; MCC manager-invite + Meta "Add as Partner" guidance in Settings → Integrations | **Done** (auto-discovery + UI). Meta Advanced Access submission + actually sending MCC invites still pending |
| 3 | Reserve credits at launch (`reserve`/`settle` in `credits.ts`, `creditReserve` on `Campaign` — neither exists yet) | Planned |
| 4 | Nightly settle cron — reconcile reserved credits vs real Meta/Google spend | Planned |
| 5 | Escrow UI + Meta token-refresh cron + disconnect→pause-campaigns | Planned |
| 6 | thanks.io per-agent sub-accounts | Planned |
| 7 | Drop Cowboy per-agent Brand + number pool (TCPA) | Planned |

## Scoping note

Campaign launch / save / ad-account routes are **agent-private** — they scope by
`session.user.id`, NOT `resolveDomainOwner`. Do not migrate them. See
[../multi-tenant/README.md](../multi-tenant/README.md).
