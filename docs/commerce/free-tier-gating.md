---
title: Free-Tier Gating & Forced Onboarding
status: current
last_verified: 2026-11-04
related: [README.md, ../auth/README.md, ../admin/README.md]
---

# Free-tier gating & forced onboarding

## TL;DR

Every real-estate agent has a **subscription tier** that decides which portal features they can use.
Only the **Free** tier is purchasable today; paid tiers (Beginner / Experienced / Top Agent) are built
but shown "Coming soon". *(Superseded — see the 2026-10-28 update below: agents now pay for Basic.)*
When a user first becomes an agent they are **forced through the setup chat** (`/agent/setup`)
before they can use the rest of the portal. Free-tier agents get a reduced
nav (Dashboard, Contacts, CMS, Settings) and reduced Settings; Email, Messages, and Campaigns are hidden
**and** blocked server-side. **Admins and any paid-tier agent see everything.**

## Update 2026-10-28 — paid onboarding (supersedes the "free agent" model below)

- **Being an agent requires Basic.** `portalGates()` in `src/proxy.ts` sends a
  non-admin agent whose JWT `agentTier` is `"free"` (never paid, or the plan
  ended) to `/agent/settings?section=billing`, where `BillingSettings` now
  sells Basic (Checkout) and opens the billing portal for payers.
- **Grandfathered agents** (`agentProfile.grandfathered`) resolve to
  `"beginner"` inside `getAgentTier()`, so every gate — JWT, paywall,
  `isFreeTier` route guards, Settings steps — treats them as Basic.
- **Outreach is admin-only**, whatever the tier: campaigns (ads, postcards,
  voicemail), text messages and email sending. One switch,
  `OUTREACH_FOR_AGENTS` in `src/config/feature-access.ts`, gates the proxy
  (`/api` prefixes → 403, pages → dashboard), the 12 outreach routes'
  in-route guards, the agent nav and the Settings integrations. The dialer was
  already admin-only (`src/lib/dialer/session-server.ts`).
- **Site live** is one helper, `isAgentSiteLive()` in
  `src/lib/agent-site-readiness.ts`: force-active → live; grandfathered → old
  rule (checklist complete OR active sub); everyone else → checklist complete
  AND active sub AND admin-confirmed (`agentApplication.siteApprovedAt`).
- **`PUT /api/user/profile` writes only an allowlist of `agentProfile` keys**
  (2026-11-03; a denylist of `grandfathered`, `siteForceActive`,
  `customDomain`, `mlsMembership` from 2026-10-28 before that). An agent could
  otherwise grant themselves free Basic, publish an unreviewed site, claim
  another agent's domain, or plant an API token with any scope.

## The one gating rule

```
hidePaid = isFreeTier && !isAdmin
```

Admins always see/do everything. Paid-tier agents see/do everything their tier allows. Only a
**free, non-admin** agent is gated. Every surface below is an application of this rule (or its
`showPaid = isAdmin || tier !== 'free'` inverse).

## Canonical tier source

| Thing | Value | Notes |
|---|---|---|
| Source of truth | `AgentSubscription.tier` (keyed by `agentId`) | **NOT** `User.subscriptionTier` — that's the legacy *client* tier |
| Resolver | `src/lib/subscription-helpers.ts` | `getAgentTier` / `isFreeTier` / `hasPaidTier`; all default to `"free"` when no record |
| On the session | `session.user.agentTier` + `session.user.isAdmin` | Stamped into the JWT; lets client gating avoid a DB call |

> ⚠️ **Stale data trap:** `PricingCard.tsx`'s local `TIERS` array ($49/$99/$299) is legacy/wrong.
> Source prices from `TIER_DETAILS` in `src/config/stripe-prices.ts` only.

## Forced onboarding (setup chat)

New agents must finish the setup chat before using the portal. Full detail:
[../agent-onboarding/setup-chat.md](../agent-onboarding/setup-chat.md). (The form wizard,
`SettingsWizard.tsx`, was removed 2026-11-04.)

| Piece | File | Behavior |
|---|---|---|
| Flag | `User.agentProfile.onboardingComplete` (default `false`) | Set `true` only by `finish_setup` in `/api/agent/setup-chat`, after license + brokerage are saved |
| JWT | `src/lib/auth.ts` | Stamps `onboardingComplete` + `agentTier` at sign-in; `trigger:"update"` re-reads them so `session.update()` refreshes without re-login |
| Middleware guard | `src/proxy.ts` (`portalGates()`, applied on www **and** on agent subdomains since 2026-10-16) | A non-admin agent whose `onboardingComplete === false` is redirected to `/agent/setup` (`/agent/setup` and `/agent/settings` exempt) |
| Setup chat | `src/app/agent/setup/page.tsx` | On finish: `session.update()`, then `/agent/dashboard` |

**Gotcha — the `=== false` check protects nobody.** The guard compares explicitly (not falsy), which
*looks* like it spares agents carrying `undefined` — and this doc claimed exactly that until
2026-11-04. It does not. Three things collapse `undefined` to a hard `false`:

1. The schema declares `onboardingComplete: { default: false }` (`src/models/User.ts`), so every user
   document saved through Mongoose since already stores an explicit `false` — not a missing field.
2. `src/lib/auth.ts` stamps the token with `!!agentProfile?.onboardingComplete` at sign-in.
3. The silent permission refresh in the same file re-stamps every live session **once a minute**, so
   even an old JWT holding `undefined` flips to `false` within 60s.

Until 2026-11-04 a client-side `localStorage` flag cushioned this on the settings page; it was removed
with the wizard, since the wizard was the only thing it fed.

**Deploy note — the backfill is REQUIRED, not advisory.** Without it an established agent signs in and
is bounced to `/agent/setup`, unable to reach their dashboard. Run:

```
npx tsx scripts/backfill-agent-onboarding.ts --dry-run   # review the cohort split
npx tsx scripts/backfill-agent-onboarding.ts             # apply
```

It flips agents who have **both** `licenseNumber` and `brokerageName` — the same bar `finish_setup`
enforces — and deliberately leaves anyone missing either one gated, because for them setup *is* the
compliance gate. Idempotent. Live sessions pick the change up within ~60s via the refresh in (3).

## Gating map

### Client (hide)

| Surface | File | Gate |
|---|---|---|
| Agent nav (hide Email/Messages/Campaigns; Subscription always hidden) | `src/app/components/agent-nav/constants/index.ts` (`getNavItems`) + `AgentNav.tsx` | `showPaid = isAdmin \|\| tier !== 'free'` |
| Settings steps (hide `paidOnly` steps, e.g. Domain) | `.../settings/components/SettingsStepIndicator.tsx` (`getVisibleSteps`) | filters `paidOnly` unless admin/paid |
| Settings → Integrations (hide Ad accounts / Messaging / Email blocks) | `.../settings/components/SettingsSidebar.tsx` | `showPaid` wrap; AI keys + Legal stay free |
| Plan step / Billing panel | `.../settings/components/steps/BillingSettings.tsx` | Free = current; paid tiers greyed "Coming soon" |
| `/agent/subscription` (retired standalone page) | `src/proxy.ts` | Redirects → `/agent/settings?section=billing` |
| Paid portal pages (`/agent/campaigns`, `/agent/messages`, `/agent/email`, `/agent/dashboard/domains`) | `src/proxy.ts` (`PAID_AGENT_PATHS`) | Free, non-admin agent → `/agent/settings?section=billing` |

### Server (enforce) — free-tier → 403

Client hiding is not enough; these routes reject free-tier agents (admins exempt) via
`isFreeTier(userId)` (15 routes, checked 2026-10-17):

| Route (under `src/app/api/`) | Feature |
|---|---|
| `crm/send-email`, `agent/email` | Email send / email setup |
| `crm/sms/send`, `agent/messaging/provision` | SMS send / provision a Twilio number |
| `campaigns/create`, `campaigns/[id]/{send,send-mail,send-simple,launch-ads,fund}` | Campaign create, send, mail, ads, funding |
| `campaigns/funding/[fundingId]/respond` | Approving co-marketing ad funding |
| `dropcowboy/campaign` | Voicemail drops |
| `domains/purchase`, `agent/domains` | Buying / mapping a custom domain |
| `integrations/api-tokens` | Not a block: free tier may only mint tokens with `FREE_TIER_SCOPES` (403 names the disallowed scopes) |

> **Gap:** the API-token scope cap is enforced only when the token is minted.
> `src/lib/skill-auth.ts` does not re-check tier on each request, so a key
> minted on a paid plan keeps its scopes after a downgrade. (Planting a token
> through `PUT /api/user/profile` was closed 2026-11-03 — see
> [../agent-identity/agent-profile.md](../agent-identity/agent-profile.md).)

Guard pattern (matches each route's own error envelope):

```ts
if (!isAdmin && (await isFreeTier(userId))) {
  return NextResponse.json({ error: "… requires a paid plan." }, { status: 403 });
}
```

## Multi-tenant interaction (the two separate gates)

Free tier touches the multi-tenant layer at two points, and they are **different
gates** — conflating them causes confusion:

1. **Feature-tier gate** (this doc). Per-agent, keyed on `AgentSubscription.tier`
   (or no record → `"free"`). Decides which *portal features / API routes* the
   logged-in agent may use. Rule: `block iff (isFreeTier && !isAdmin)`.

2. **Public-site "live vs Coming Soon" gate.** Per-agent, decides whether the
   agent's public branded site (`{slug}.chatrealty.io`, or a custom domain)
   renders vs. shows a "Coming Soon" placeholder. Implemented in
   `src/app/api/agent/public/route.ts` and `src/app/agent-site/[[...slug]]/`:
   `siteLive = getSiteReadiness(agent).complete || <active|trialing AgentSubscription> || agentProfile.siteForceActive`.

**A free agent's site goes live when they finish profile setup — no paid
subscription required (resolved 2026-07-02).** The go-live checklist is
`src/lib/agent-site-readiness.ts` (`getSiteReadiness`): **name, phone, banner
photo, headshot, headline, and a personal story or video**. The *same* helper
drives the dashboard "Finish setup / Your site is live" card, so what the agent
sees is exactly what publishes their site. Free tier gets **no custom domain**
but a **network-discoverable `{slug}.chatrealty.io` subdomain** once complete.

| Agent state | Feature tier | Public subdomain site |
|---|---|---|
| Approved, profile **incomplete** | `free` (portal works: Dashboard/Contacts/CMS/Settings) | **"Coming Soon"** until the go-live checklist is done |
| Free, profile **complete** | `free` | **Live** (`getSiteReadiness().complete`) — no subscription needed |
| Any paid tier (active) | paid (full portal) | Live (active sub also passes the gate) |
| Admin / agent viewing **their own** site | exempt everywhere | Always renders (preview bypass) |

**Why setup-completion, not a subscription record:** admin approval
(`/api/admin/applications/agents`) grants the `realEstateAgent` role + assigns
the `{slug}` subdomain but **does not create an AgentSubscription**. So gating on
"has an active sub" would leave every free agent's site dark forever. Gating on
profile completeness lets free agents publish + be discoverable on the network,
which is the intended free-tier value.

`resolveDomainOwner` still governs *whose data* a public page shows (see
[../multi-tenant/README.md](../multi-tenant/README.md)); the site-live gate is
layered on top of it to decide *whether* that owner's site renders.

## Gotchas

- **Two gates, not one.** "Free tier" (features) is separate from "site live"
  (public subdomain). A free agent's portal works immediately; their public site
  goes live only once the go-live checklist (`getSiteReadiness`) is complete.
- **Change the checklist in ONE place.** `src/lib/agent-site-readiness.ts` is the
  single source of truth — the dashboard card and the public gate both read it.
  Editing required fields anywhere else will drift what the agent sees from what
  actually publishes.
- **Admins and paid agents are exempt everywhere.** If a paid agent can't see a paid feature, the JWT
  `agentTier` is likely stale — `session.update()` refreshes it.
- **The Settings STEPS registry** (`SettingsStepIndicator.tsx`) drives the settings sidebar. Adding a
  `paidOnly` step hides it for free agents automatically — add new paid steps there, not ad-hoc.
- **The Billing panel** (`BillingSettings`) lives in Settings → Billing.
