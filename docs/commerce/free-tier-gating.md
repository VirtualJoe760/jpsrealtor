---
title: Free-Tier Gating & Forced Onboarding
status: current
last_verified: 2026-07-02
related: [README.md, ../auth/README.md]
---

# Free-tier gating & forced onboarding

## TL;DR

Every real-estate agent has a **subscription tier** that decides which portal features they can use.
Only the **Free** tier is purchasable today; paid tiers (Beginner / Experienced / Top Agent) are built
but shown "Coming soon". When a user first becomes an agent they are **forced through the setup wizard**
(which includes a plan step) before they can use the rest of the portal. Free-tier agents get a reduced
nav (Dashboard, Contacts, CMS, Settings) and reduced Settings; Email, Messages, and Campaigns are hidden
**and** blocked server-side. **Admins and any paid-tier agent see everything.**

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

## Forced onboarding wizard

New agents must complete the setup wizard before using the portal.

| Piece | File | Behavior |
|---|---|---|
| Flag | `User.agentProfile.onboardingComplete` (default `false`) | Set `true` when the wizard is finished/skipped |
| JWT | `src/lib/auth.ts` | Stamps `onboardingComplete` + `agentTier` at sign-in; `trigger:"update"` re-reads them so `session.update()` refreshes without re-login |
| Middleware guard | `src/proxy.ts` | A non-admin agent whose `onboardingComplete === false` is redirected to `/agent/settings?onboarding=true` (except when already there) |
| Wizard | `src/app/agent/settings/components/SettingsWizard.tsx` | On Finish/Skip: PUTs `onboardingComplete:true`, calls `session.update()`, lands on the sidebar view |

**Gotcha — JWT staleness:** the guard checks `onboardingComplete === false` **explicitly** (not falsy).
Existing agents whose JWT predates the field carry `undefined` and are NOT trapped in the wizard.
A client-side `localStorage` flag is a secondary fallback.

**Deploy note — existing-agent backfill:** if a cohort of agents predates this feature, run a one-off
`onboardingComplete=true` backfill so they aren't sent through the wizard. Not urgent today (only the
admin — exempt — and one test agent exist).

## Gating map

### Client (hide)

| Surface | File | Gate |
|---|---|---|
| Agent nav (hide Email/Messages/Campaigns; Subscription always hidden) | `src/app/components/agent-nav/constants/index.ts` (`getNavItems`) + `AgentNav.tsx` | `showPaid = isAdmin \|\| tier !== 'free'` |
| Settings steps (hide `paidOnly` steps, e.g. Domain) | `.../settings/components/SettingsStepIndicator.tsx` (`getVisibleSteps`) | filters `paidOnly` unless admin/paid |
| Settings → Integrations (hide Ad accounts / Messaging / Email blocks) | `.../settings/components/SettingsSidebar.tsx` | `showPaid` wrap; AI keys + Legal stay free |
| Plan step / Billing panel | `.../settings/components/steps/BillingSettings.tsx` | Free = current; paid tiers greyed "Coming soon" |
| `/agent/subscription` (retired standalone page) | `src/proxy.ts` | Redirects → `/agent/settings?section=billing` |

### Server (enforce) — free-tier → 403

Client hiding is not enough; these routes reject free-tier agents (admins exempt) via
`isFreeTier(userId)`:

| Route | Feature |
|---|---|
| `src/app/api/crm/send-email/route.ts` | Email send |
| `src/app/api/crm/sms/send/route.ts` | SMS send |
| `src/app/api/agent/messaging/provision/route.ts` | Provision Twilio number |
| `src/app/api/campaigns/create/route.ts` | Create campaign |
| `src/app/api/campaigns/[id]/launch-ads/route.ts` | Launch ads |
| `src/app/api/domains/purchase/route.ts` | Buy custom domain |

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
- **The Settings STEPS registry is shared** by the wizard and the sidebar. Adding a `paidOnly` step
  hides it in both for free agents automatically — add new paid steps there, not ad-hoc.
- **The Billing panel is one component** used in both the wizard's plan step and Settings → Billing.
  Only Free is selectable until paid checkout is wired up (see README for the Stripe checkout flow).
