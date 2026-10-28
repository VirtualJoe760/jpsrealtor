---
title: Agent identity — affiliation, brokerage, team
status: current
last_verified: 2026-10-28
owner: platform
related: [./agent-profile.md, ../multi-tenant/README.md, ../agent-onboarding/README.md, ../ARCHITECTURE.md]
---

# Agent identity: affiliation, brokerage, team

## TL;DR

**Every licensed agent has a BROKERAGE. Not every agent has a TEAM.**

`agentProfile.affiliation` is the explicit switch:

| affiliation | brokerage | `User.team` |
|---|---|---|
| `"solo"` (default) | required | **must be unset** |
| `"team"` | required | set, → `Team` document |

Brokerage lives on `agentProfile.brokerage`. It is present in both modes.

```ts
agentProfile.affiliation : "solo" | "team"
agentProfile.brokerage   : { name, legalName, licenseNumber, address, phone, logo, logoDark }
User.team                : ObjectId → Team     // only when affiliation === "team"
```

- `name` — display, e.g. `"Fathom Realty"`
- `legalName` — compliance copy, e.g. `"Fathom Realty Group, Inc."`
- `licenseNumber` — the **brokerage's** licence, not the agent's (that's `agentProfile.licenseNumber`)
- `logo` / `logoDark` — light-background and dark-background artwork

## Why this exists

Brokerage used to live **only** on the `Team` model (`Team.brokerageName`,
`brokerageAddress`, `brokerageLicense`). That assumed every agent belongs to a
team, so a solo agent had nowhere structured to record their brokerage. Two
workarounds grew in its place:

1. A top-level `User.brokerageName`, marked "legacy — backwards compatibility".
2. An `agentProfile.brokerageName` that `/api/agent-branding` **read and
   projected but which was never declared in the schema**. Under Mongoose
   strict mode an undeclared path is silently dropped on write, so that field
   could only be set by a raw-driver write that bypassed the schema — a
   "successful" save that persisted nothing. (See AGENTS.md rule 5; this is the
   third instance of that failure in this codebase.)

Both are now declared, and both are **migration fallbacks only**.

## Resolution order

`/api/agent-branding` is the branding resolver. Order, newest first:

```
brokerageName = agentProfile.brokerage.name
             || agentProfile.brokerageName      // legacy mirror
             || User.brokerageName              // legacy top-level

brokerLogo    = agentProfile.brokerage.logo     // .logoDark on dark themes
             || agentProfile.brokerLogo         // legacy pair
```

**Team fields are suppressed when `affiliation !== "team"`.** `teamName`,
`teamLogo` and `teamLogoDark` return `null` for a solo agent regardless of what
is stored. This is deliberate: the API falls `navLogo` back to the team logo for
agents who set one before `navLogo` existed, so a leftover logo from a team the
agent has left would otherwise keep appearing in the nav indefinitely.

## What an agent's site calls itself

The platform brand (CHATREALTY) belongs on **platform hosts only**
(`chatrealty.io`, `www`, `chatrealty.localhost` in dev — `isPlatformDomain()`).
On an agent's site, every brand slot defaults to **the agent's own name**, set
in the two-weight wordmark style (`GENE CRUCEAN`: thin first names, bold
surname — `nameWordmark()` in `src/lib/agent-wordmark.ts`). Settings override
the default; nothing falls back to ChatRealty while the agent has a name.

| Slot | Component | Order on an agent site |
|---|---|---|
| Nav brand | `NavBrandMark` | Brand → **Nav Wordmark** text → **Navigation Bar Logo** → agent's name |
| Chat hero title | `ChatWidget` | **Platform host: always CHATREALTY** (Site Name and agent name are ignored there). Agent site: Identity → **Site Name** → agent's name. A Site Name that spells the Brand → **Nav Wordmark** (`JPSREALTOR`, spaces/case ignored) renders as that two-weight wordmark, with no corner badge beside it (it would repeat the brand); any other text renders plain. Typing `chatRealty` opts back into CHATREALTY. The wordmark is sized to its character count so any name fits a 320px phone |
| Corner badge (hero / chat) | `BrandCornerMark` | Brand → **Brand Mark** text → brokerage logo → nothing. **Never on a platform host** |

Why the corner badge is hidden on platform hosts: `/api/agent-branding` falls
back to the PRIMARY agent when a host maps to no one, so `chatrealty.io`'s chat
page used to wear Joseph's "JPS" badge — for every visitor, including an admin
impersonating another agent. When the badge renders nothing, the chat hero also
drops its frame and divider (`useHasCornerMark`), which used to leave a stray
rule before the title.

On 2026-10-28 chatrealty.io/chap showed JPSREALTOR: the hero read the
primary agent's Site Name, which owner resolution hands the platform host.
The Site Name, the navbar's agent/DRE line and `getServerTenantConfig()`
(layout, theme, tracking) are now all ignored on platform hosts — the
platform uses platform defaults, never an agent's.

Until 2026-10-16 the nav and the chat hero fell back to CHATREALTY instead of
the name (`getDefaultSiteName()` returned `"chatRealty"` for every host), so an
agent who hadn't configured branding got the platform's brand across their own
site. Share cards (`/api/og`) have their own resolution and were not changed.

## The rule for components

> **No component may hardcode a brokerage name or logo asset.**

This platform serves many agents from one deployment. A literal brokerage in
shared code stamps one agency onto every other agent's site. The heroes,
`ChatWidget`, `EnhancedSidebar`, `EnhancedNavbar` and `LandingPageFooter` all
did exactly this with an eXp asset until 2026-10-10 — which is why a brokerage
Joseph had left kept rendering on tenant sites that had nothing to do with him.

Read from `getHeroData()` (heroes) or `/api/agent-branding` (everything else).
If the agent has no logo, **render nothing** — never a default.

Still-outstanding violations are logged in [../tech-debt.md](../tech-debt.md):
the CRM `ComposePanel` templates and `AboutCta` carry Joseph's name, DRE# and
phone as literals.

## Changing an agent's brokerage

**Through the product, not a script.** `/agent/settings` → **Identity** has the
affiliation toggle and the brokerage fields. It saves via `PUT /api/user/profile`,
which deep-merges into `agentProfile` — no allowlist, so new fields persist as
long as they are declared in the schema (see rule 5 in AGENTS.md). The lack of
an allowlist is also a hole: the same request can write protected paths — see
[agent-profile.md](./agent-profile.md#gotchas).

Switching to solo clears `teamName` in the same save. `/api/agent-branding`
additionally suppresses every team field when `affiliation !== "team"`, so a
former team's logo cannot linger in the nav even if a stale value survives
somewhere.

A migration script is only warranted for a bulk change across many agents. For
one agent, the form is the tool.

## Gotchas

- **`/api/agent/public` resolves brokerage differently.** It returns
  `agentProfile.brokerageName || User.brokerageName` and never reads
  `agentProfile.brokerage.name`, so `useAgentProfile()` consumers (the buy/sell
  pages) miss a brokerage entered only in the Identity fields. Details:
  [agent-profile.md](./agent-profile.md).
- **`agentApplication.brokerageName`** is captured on the signup form and
  **never synced forward** to `agentProfile.brokerage`. An approved agent's
  brokerage is whatever they later type into Brand settings, not what they
  applied with.
- **`Team.brokerageName` still exists** and is correct for team-level records.
  It is not the per-agent source of truth; `agentProfile.brokerage` is.
- **Listing attribution is unrelated.** `listOfficeName` on a listing is the
  LISTING brokerage (RESO `Office` resource) and must never be rewritten to
  match the viewing agent's brokerage — that is a compliance violation. See
  [../chatrealty-api/data-dictionary.md](../chatrealty-api/data-dictionary.md).
