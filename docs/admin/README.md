---
title: Admin dashboard
status: current
last_verified: 2026-10-17
related: [../auth/README.md, ../agent-onboarding/README.md, ../commerce/README.md, ../multi-tenant/README.md, ../testing/loop-console.md, ../chatrealty-api/control-plane.md]
supersedes: docs/archive/ADMIN_DASHBOARD.md
---

# Admin dashboard

## TL;DR

`/admin` is the platform owner's console: overview metrics, the agent and
partner application queues, subscriptions + credit gifting, custom-domain
approvals, user management (including **"Log in as"** an agent), and the Loop
Console. Every page is a client component in `src/app/admin/` that reads one of
the 12 route files under `src/app/api/admin/`. Pages are gated in `src/proxy.ts`
on the JWT `isAdmin` claim; the APIs are gated at the middleware **and** in each
route — but the in-route checks use two different definitions of "admin" (see
[Gotchas](#gotchas)). The April 2026 plan (`docs/archive/ADMIN_DASHBOARD.md`,
now deleted) listed partnerships, campaign approvals, CRM, content and a
homepage builder; none of those are in the dashboard today.

## Gotchas

1. **Two meanings of "admin".** `verifyAdmin()` (`src/lib/admin-auth.ts`) passes
   the hard-coded `josephsardella@gmail.com` **or** `roles` containing `"admin"`;
   it never reads `User.isAdmin`. The page gate, the middleware, the Users/Teams
   and Loop routes all use `isAdmin`. The Users page edits the two separately
   (an "admin" role checkbox and an "Admin" flag), so a second admin needs
   **both** set or half the dashboard returns 403.
2. **"Pending Applications" on the Overview is always 0.** `/api/admin/stats`
   counts `agentApplication.phase: "pending"` (not a valid phase; the live one is
   `inquiry_pending`) and hard-codes the partner count to 0.
3. **Impersonating blocks `/admin`.** The impersonated session is the agent's
   (`isAdmin: false`), so `/admin` redirects to `/dashboard`. Use **Exit to
   Admin** first.
4. **Deleting a user is a hard delete.** `DELETE /api/admin/users` runs
   `User.deleteMany`; the subscription, ledger, contacts and domain records it
   owned are left behind.
5. **The Users "Live" badge is not the public gate.** It reads the legacy
   `User.subscriptionTier`; the real site gate reads an active `AgentSubscription`
   (`src/app/api/agent/public/route.ts`). Both also accept `siteForceActive` and
   a finished go-live checklist.

## Who counts as an admin

| Check | Where | Rule |
|---|---|---|
| JWT `isAdmin` | `src/lib/auth.ts` (copied from `User.isAdmin`; re-read from the DB at most every 60s) | Page gate, `/api/admin` middleware gate, the "Admin" nav link (`EnhancedNavbar`, `EnhancedSidebar`, `navbar/DesktopMenu`, `navbar/MobileMenu`) |
| `verifyAdmin()` | `src/lib/admin-auth.ts` | Hard-coded email **or** `roles` includes `"admin"` |
| DB `isAdmin` lookup | `api/admin/users`, `users/[id]`, `teams`, `loop`, `loop/stream` | `User.isAdmin === true` |
| Impersonation start | `src/app/api/auth/impersonate/route.ts` | Hard-coded email **or** JWT `isAdmin` |
| User pre-save hook | `src/models/User.ts` | On create / email change, the admin email gets `isAdmin`, `canPromoteAdmins` and the `"admin"` role |

## How the gates work

- **Pages** (`src/proxy.ts`, `portalGates()`): no session → sign-in; a token
  without `isAdmin` → `/dashboard`. On an agent subdomain the same redirect
  applies, and an admin who is not impersonating is sent to the
  `/auth/admin-access` chooser first.
- **APIs**: `/api/admin` is in `ADMIN_API_PREFIXES`, so the middleware returns
  403 unless the token has `isAdmin` **or** `impersonatedBy`. The second clause
  lets an impersonation session reach the routes; each route then rejects it,
  because the session user is the agent. `vercel.json` stamps `/api/*`
  `no-store`.

## Sections

Sidebar order (`src/app/admin/layout.tsx`). All pages live under `src/app/admin/`.

| Page | Backing API | What it does |
|---|---|---|
| Overview `/admin` | `GET /api/admin/stats` | Cards: total users, agents, service partners, active `AgentSubscription`s, MRR (sum of active `monthlyPrice`), credits outstanding, pending applications (broken — Gotcha 2). Below: the 15 newest signups with their signup origin |
| Agent Applications `/admin/applications/agents` | `GET/PUT /api/admin/applications/agents` | Users with an `agentApplication.phase`. **Approve** grants `realEstateAgent`, sets `final_approved`, mints a subdomain (`generateSubdomain`, which also registers it on Vercel) and sends the approval email. **Reject** stores the reason and emails it. Flow: [agent-onboarding](../agent-onboarding/README.md) |
| Partner Applications `/admin/applications/partners` | `GET/PUT /api/admin/applications/partners`, `GET/PUT /api/admin/settings/partner-approval` | Service partners with their `servicePartnerProfile.status` (missing = approved). Approve/reject run through `src/lib/partner-moderation.ts`. The **auto-approve switch** writes `PlatformConfig` `_id:"moderation"` → `moderation.partnerAutoApprove` (default ON). When OFF, the hourly cron `/api/cron/auto-approve-partners` approves anything pending over 24h |
| Subscriptions `/admin/subscriptions` | `GET /api/admin/subscriptions`, `POST /api/admin/credits` | Every `AgentSubscription` with its ledger balance, MRR and revenue by tier (active + trialing), cancellation reasons (`User.cancellationReason`). **Gift credits** posts a `bonus` transaction to the ledger — no Stripe involved. Read-only for plans: no tier change, cancel or refund here. Tiers: [commerce](../commerce/README.md) |
| Domains `/admin/domains` | `GET/PATCH /api/admin/domains` (`PUT` = legacy alias), `GET /api/domains/list`, `/api/domains/registry` + `/seed`, `/check-nameservers`, `/cloudflare-provision` | Three tabs: pending requests, all `DomainMapping`s, the `DomainRegistry`. **Approve** creates the registry record and runs `provisionDomain()` (Vercel + Cloudflare zone, DNS, cache and page rules, worker routes); **reject**; **suspend** removes the domain from the Vercel project and suspends the registry record |
| Users `/admin/users` | `GET/DELETE /api/admin/users`, `PUT /api/admin/users/[id]`, `GET /api/admin/teams`, `POST /api/auth/impersonate` | Search; filter by role and signup domain; quick Agent / Partner / Admin role toggles (with a confirmation); edit name, email, phone, roles, admin flag, team leader, team, brokerage, license, description; force a site live (`agentProfile.siteForceActive`); bulk delete (your own account is skipped); **Log in as** |
| Loop Console `/admin/loop` | `GET/POST/PATCH /api/admin/loop`, `GET /api/admin/loop/stream` (server-sent events over Mongo change streams) | The QA feedback loop: testing toggle, Tom's mode, reports, ticket clusters, chat threads, bug reports and feedback submissions. See [testing/loop-console.md](../testing/loop-console.md) |

Not in the sidebar:

- `/admin/agent-feedback` — a redirect stub to `/admin/loop` (merged
  2026-08-05; kept because older notes link to it).
- `/admin/cms`, `/admin/cms/new`, `/admin/cms/edit/[slugId]` — a network-wide
  article list (`/api/articles/list?all=true`, `set-draft`, `unpublish`, all
  of which require `isAdmin` and no impersonation). Nothing links here; you
  reach it by typing the URL. Agents use `/agent/cms`.

## User management details

- `PUT /api/admin/users/[id]` writes only: `name, email, phone, roles, isAdmin,
  isTeamLeader, team, brokerageName, licenseNumber, profileDescription, image`,
  plus `siteForceActive`.
- **Adding `realEstateAgent`** makes the User pre-save hook mint a subdomain if
  the user has none (and register it on Vercel). **Removing it** sets the
  agent's `DomainMapping` and `DomainRegistry` records to `suspended`.
- `GET /api/admin/users` also returns `siteReady` (`getSiteReadiness()` from
  `src/lib/agent-site-readiness.ts`), the subdomain, and which agent a client
  signed up under (`signupOrigin.agentId`).

## "Log in as" (impersonation)

Users → pick a user → **User Details** panel → amber **"Log in as {name}"**. The
button only appears for users who have the `realEstateAgent` role **and** an
`agentProfile.subdomain`. Next to it, a link opens `https://{slug}.chatrealty.io`.

1. The page POSTs `{ action: "start", subdomain }` to `/api/auth/impersonate`.
2. From www, the route sets nothing on www. It returns a redirect to
   `/api/auth/receive` on the agent's subdomain carrying a 30-second hand-off
   token. Receive checks the admin is **still** an admin and that the token is
   being used on **that agent's** subdomain, then sets a host-only session as
   the agent carrying `impersonatedBy`. You land on `/agent/dashboard` there.
3. The amber `ImpersonationBanner` shows "Viewing as …". **Exit to Admin** posts
   `{ action: "stop" }`, which clears that subdomain's session and sends you
   back to `www…/admin/users`, where your own session was never touched.

Everything you change while impersonating is saved to the agent's record. 2FA
is skipped, nothing is audited, and if you close the tab without exiting, that
browser stays signed in as the agent on their subdomain. Full mechanics and
gotchas: [auth/README.md → Admin impersonation](../auth/README.md#admin-impersonation).

## Moderation config and tenant approval

`PlatformConfig` (`src/models/PlatformConfig.ts`), document `_id: "moderation"`:

| Field | Default | Set from |
|---|---|---|
| `moderation.partnerAutoApprove` | `true` | Partner Applications switch |
| `moderation.tenantAutoApprove` | `false` | **Nowhere** — no page or API writes it |

The tenant (headless-API customer) approval gate is
`src/lib/tenant/provisioning-gate.ts`: `approveTenant` mints exactly one
`crt_live` token and hands off to Neon provisioning; `rejectTenant`;
`getTenantAutoApprove`. **It is not wired up**: no admin page, no
`/api/admin` route, and no caller outside its unit test (checked 2026-10-17).
Design: [chatrealty-api/control-plane.md](../chatrealty-api/control-plane.md).

`PlatformConfig` still declares the homepage-builder fields (`hero`,
`valueProps`, `featuredAgentIds`, `testimonials`, `seo`, …). The builder, its
API routes and `/api/platform/homepage` were deleted on 2026-08-05 (commit
`395b20b4`) because nothing read them; the schema fields are dead.

## API route audit (2026-10-17)

Every route file under `src/app/api/admin/` checks admin in-file:

| Route | Methods | In-file check |
|---|---|---|
| `applications/agents`, `applications/partners` | GET, PUT | `verifyAdmin()` |
| `credits` | POST | `verifyAdmin()` |
| `domains` | GET, PUT, PATCH | `verifyAdmin()` |
| `settings/partner-approval` | GET, PUT | `verifyAdmin()` |
| `stats`, `subscriptions` | GET | `verifyAdmin()` |
| `users` | GET, DELETE | session + DB `isAdmin` |
| `users/[id]` | GET, PUT, DELETE | session + DB `isAdmin` |
| `teams` | GET | session + DB `isAdmin` |
| `loop`, `loop/stream` | GET, POST, PATCH / GET | session + DB `isAdmin` |

Routes outside `/api/admin` that the dashboard calls: `/api/domains/registry/*`
uses `verifyAdmin()` and is also on the middleware admin list.
**`/api/domains/list` only checks for a session**, so any signed-in user can
list every domain on the Vercel project with its verification records.

## Files

| File | Role |
|---|---|
| `src/app/admin/layout.tsx` | Sidebar, header, "Back to Dashboard" |
| `src/lib/admin-auth.ts` | `verifyAdmin()` |
| `src/proxy.ts` | `ADMIN_API_PREFIXES`, `portalGates()`, the subdomain admin chooser |
| `src/lib/partner-moderation.ts` | Partner approve/reject + auto-approve toggle |
| `src/lib/domain-registry/provision.ts` | `provisionDomain()` on domain approval |
| `src/lib/generate-subdomain.ts` | Subdomain mint + Vercel registration |
| `src/models/PlatformConfig.ts` | Moderation toggles |
