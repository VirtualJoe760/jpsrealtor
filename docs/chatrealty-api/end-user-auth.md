---
title: End-user auth + account favorites (Phase B)
status: template-complete; platform built (untested vs live tenant)
last_verified: 2026-07-23
---

# End-user auth + account favorites (Phase B)

> Why: on an agent's ChatRealty site, **Favorites is an account feature**, not a
> floating nav item. A visitor's saved homes should belong to a logged-in
> account and sync to the agent's CRM — that's the retention tether. This doc
> locks the architecture so the build doesn't drift.

## Locked decisions

1. **Auth runs THROUGH ChatRealty (the tether).** The agent's clients do NOT get
   a custom per-site auth system. They sign in via a **platform-hosted
   magic-link** flow. The agent provisions nothing (no auth provider, no SMTP) —
   ChatRealty sends the email and issues the session. This is the "ship a basic
   auth, run that auth through ChatRealty" decision.
2. **An end-user IS a Contact in the agent's tenant CRM.** Registration/first
   sign-in upserts a Contact (deduped by email), stamped `source` + tag +
   `linkedEndUserId`. Favorites and saved searches accrue to that Contact. This
   reuses the existing `contacts/from-signup` upsert path.
3. **PURELY BYOD — end-user data lives in the agent's tenant DB.** End-user
   accounts + favorites are stored in the agent's ChatRealty (Postgres) database,
   never in a shared pool. No cross-tenant visibility: an end-user of agent A
   never sees agent B's data, and never appears in agent B's CRM.
4. **Degrade to guest when auth isn't available.** In test-data mode and on the
   free tier (no provisioned tenant DB), there is nowhere to persist an account,
   so the template runs **guest-only**: favorites stay in localStorage exactly as
   today, and the account UI shows "saved on this device." The same client code
   lights up server sync automatically once the tenant + auth capability exist.
   Favorites is therefore never "broken" — it's guest now, account-synced later.

## Data flow (mirrors the jpsrealtor favorites model)

- **Guest:** favorites in `localStorage` (`lib/favorites.ts`). Source of truth
  while signed out.
- **Sign-in:** on first authenticated load, **merge** the guest localStorage
  favorites into the account (server), then **clear** the guest copy and let the
  server be the source of truth. Never write guest localStorage while signed in.
  (This is the exact rule from the platform's favorites-data-flow: DB is source
  of truth once authed; localStorage is guest-only, merged at login then cleared.)
- **Signed-in:** favorites read/write go to the account; the heart button and the
  /discover swipe deck both persist to the server.

## Template surface (this repo: `packages/create-chatrealty-site/template`)

- `lib/account.tsx` — `AccountProvider` + `useAccount()`: `{ user, status,
  requestLink(email), signOut() }`. `status` ∈ `guest | sending | linkSent |
  signedIn | unavailable`. `unavailable` = the site can't do accounts yet
  (test-data / free) → UI falls back to guest framing.
- `components/AccountMenu.tsx` — header affordance (person icon). Signed-out:
  "Sign in to save homes across devices" → opens `SignInDialog`. Signed-in:
  name + "Saved homes" (→ /favorites) + "Sign out". **Favorites moves OUT of the
  primary nav into this menu** — that's the "out of place" fix.
- `components/SignInDialog.tsx` — email field → magic link. Never collects a
  password (magic-link only). Shows "check your email" on success; shows the
  guest-mode note when `status === unavailable`.
- `app/api/account/*` — template proxy routes (token stays server-side):
  `request` (magic link), `verify` (token → session cookie), `me`, `signout`,
  and `favorites` (GET/PUT, signed-in only). Each proxies the platform
  `/api/skill/end-users/*`; when the platform answers "not supported" (no tenant)
  the route returns `{ available: false }` and the client degrades to guest.
- Session: an httpOnly cookie set by `verify`, carrying the platform-issued
  end-user session token. Read server-side by the `/api/account/*` routes.

## Platform surface (main app: `src/app/api/skill/end-users/*`) — BUILT

Tenant-scoped via `withSkill` (same tenant keystone as every other skill route).
Every route hard-guards `auth.tenantId` — no tenant → HTTP 501, which the
template reads as "accounts unavailable" and degrades to guest. **Built and
type-clean; not yet exercised against a live provisioned tenant.**

- `POST /auth/request` — `{ email, origin, siteName }` → `onSignup` (create/find
  end-user + mirror a deduped Contact), mint a single-use magic-link token
  (SHA-256 hash stored, raw token emailed), email `${origin}/account/verify?token=`
  via the platform's Resend, branded to `siteName`. Always `{ ok: true }` (no
  enumeration). `origin` validated: https, or http for localhost only.
- `POST /auth/verify` — `{ token }` → atomic single-use consume (UPDATE …
  RETURNING, gated on unexpired+unconsumed), return a session JWT bound to
  `{ tenantId, endUserId }`.
- `GET /me` — `X-End-User-Session` header → `{ email, name }`.
- `GET/PUT /favorites` — session → the end-user's saved listing keys. PUT
  replaces the whole set (INSERT new + DELETE removed).

**Session:** `jsonwebtoken`, signed with `END_USER_SESSION_SECRET` (falls back to
`NEXTAUTH_SECRET` — no new env required to function). `verifySession` requires
the request's `tenantId` to match the token's, so a session from tenant A can't
be replayed on tenant B.

**Storage:** reuses the existing `end_user` table (via `registerEndUser`/
`onSignup`); adds `end_user_magic_link` + `end_user_favorite` tables created
idempotently (`CREATE TABLE IF NOT EXISTS`) by `ensureEndUserAuthSchema` on first
use — so existing and new tenants both get them without a re-migration. Folding
the DDL into the provisioning migration is a cleanup TODO.

**Untested paths (need a live tenant to verify):** the full magic-link round trip
(email delivery, token consume, session issue), favorites GET/PUT against real
Postgres, and the guest→account merge + `/by-keys` hydration on first sign-in.
The guest path IS verified end-to-end in a real build.

## Env

- `RESEND_API_KEY` — required to send the magic-link email (platform already has it).
- `END_USER_SESSION_SECRET` — optional; falls back to `NEXTAUTH_SECRET`.
- `END_USER_EMAIL_DOMAIN` — optional; the sign-in email's From domain (default
  `chatrealty.io`). Deliberately NOT `EMAIL_FROM_DOMAIN` — that may be
  `jpsrealtor.com` on this deployment, and every agent's sign-in email must send
  from the shared verified PLATFORM domain, branded with the agent's site name.

## Security invariants

- Magic-link only — the template never collects or stores a password.
- Session cookie is httpOnly + Secure + SameSite=Lax; the end-user session token
  never reaches client JS.
- End-user routes are hard-bound to the token's tenant; an end-user can only ever
  read/write their OWN favorites in their OWN agent's tenant.
- Favorites reads/writes are per-user → `no-store`, never edge-cached (distinct
  from the public listing routes, which are cacheable). See the auth-cache-leak
  rule.
- No PII of other contacts is ever returned to the visitor side.
