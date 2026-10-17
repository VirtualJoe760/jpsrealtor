---
title: Auth
status: current
last_verified: 2026-10-17
related: [../routing/README.md, ../multi-tenant/README.md, ../admin/README.md]
supersedes: docs/archive/features/AUTHENTICATION.md
---

# Auth

## TL;DR

NextAuth with JWT sessions (30-day TTL). Cookies are deliberately **host-scoped**
on default sign-in — sign-in on `jpsrealtor.com` does NOT carry to `chatrealty.io`.
A separate transfer → receive handshake (`/api/auth/transfer` → `/api/auth/receive`)
moves a session across apex domains. Sign-out is a **chained multi-apex flow**
because each apex has its own cookie that needs to be cleared independently.

## Files

| File | Purpose |
|---|---|
| `src/lib/auth.ts` | NextAuth config: providers, cookie policy, callbacks, pages |
| `src/lib/signout-chain.ts` | Builds the multi-apex signout chain URL |
| `src/app/api/auth/[...nextauth]/route.ts` | NextAuth handler |
| `src/app/api/auth/transfer/route.ts` | Mint 30s signed JWT to hand off across apexes |
| `src/app/api/auth/receive/route.ts` | Decode transfer token, look up user, set session cookie with `Domain=.{apex}` |
| `src/app/api/auth/signout-chain/route.ts` | Per-apex signout endpoint; clears both host-only and `.{apex}`-scoped cookies |
| `src/app/auth/signed-out/page.tsx` | Success page at end of signout chain; 5s countdown then redirects to origin |
| `src/lib/turnstile.ts` | Cloudflare Turnstile CAPTCHA verification |
| `src/lib/rate-limit.ts` | Per-IP + per-email sliding window limits |
| `src/lib/spam-defenses.ts` | Gibberish-name detection, honeypot helpers |
| `src/app/api/auth/impersonate/route.ts` | Admin impersonation — start (become an agent) / stop (back to admin). See [Admin impersonation](#admin-impersonation) |
| `src/app/components/ImpersonationBanner.tsx` | Amber "Viewing as … — Exit to Admin" bar shown during impersonation |
| `src/lib/hooks/useImpersonation.ts` | Client hook: is this session an impersonation, and of whom |
| `src/lib/admin-impersonate.ts` | Server helper for the *other* path: admin on an agent subdomain, resolved by header, no session swap |

## Session strategy

- **Strategy:** JWT (stateless).
- **Cookie:** `__Secure-next-auth.session-token` in production, `next-auth.session-token` in dev.
- **TTL:** 30 days.
- **Silent permission refresh (2026-07-23):** roles/`agentTier`/`onboardingComplete`
  are stamped into the JWT, so a permission granted *after* sign-in (agent
  application approved, plan change, admin grant) used to stay invisible until
  re-login. The `jwt` callback now re-reads them from the DB at most once per
  60s per session and updates the token **in place** — no logout, bounded ≤60s
  staleness. Explicit `session.update()` still forces an immediate refresh.
- **Default cookie scope:** *host-only* — `getCookieDomain()` returns `undefined`. So `jpsrealtor.com` and `chatrealty.io` are entirely separate cookie jars.
- **Receive variant:** When a user arrives via `/api/auth/receive`, the cookie is **host-only** on `chatrealty.io` and agent subdomains (2026-10-16 — each host holds its own session); only `jpsrealtor.com` / `josephsardella.com` get `Domain=.jpsrealtor.com` / `.josephsardella.com`.
- **Why two variants?** A user can have BOTH at once (signed in directly on chatrealty.io AND came in via transfer from jpsrealtor.com). The signout chain has to clear both, or one survives.

## Providers

| Provider | Notes |
|---|---|
| **Credentials** (email/password) | bcrypt for password hashing. Per-email rate limit (10/hr). Cloudflare Turnstile CAPTCHA required. Throws on unverified email or 2FA mid-flow. |
| **Google** | Standard NextAuth Google provider |
| **Facebook** | Standard NextAuth Facebook provider |

## Cross-domain transfer flow

When a logged-in user on `jpsrealtor.com` clicks a link to `chatrealty.io`:

1. Link points at `/api/auth/transfer?target=https://chatrealty.io/some/path`
2. Transfer endpoint reads the session, mints a 30-second signed JWT, redirects to `chatrealty.io/api/auth/receive?token=...&redirect=/some/path`
3. Receive endpoint decodes the token, looks up the user in MongoDB by email, builds a NextAuth-shaped session JWT, sets it as a host-only cookie on the receiving host (apex-wide only on jpsrealtor.com / josephsardella.com)
4. Browser follows the final redirect to `/some/path` — user is signed in on chatrealty.io

`isAllowedTarget()` only permits chatrealty.io / jpsrealtor.com / josephsardella.com / localhost (and their subdomains). Other targets get rejected.

## Signout chain

A user signed in on multiple platform apexes has cookies on each one (independent jars). NextAuth's default signout only clears the apex you're currently on. So we chain through all of them.

**`signOutChain()`** (in `src/lib/signout-chain.ts`) builds a nested URL that bounces through every platform apex's `/api/auth/signout-chain` endpoint, then lands on `/auth/signed-out` on the originating origin.

Chain in production (from any apex):

```
chatrealty.io/api/auth/signout-chain
  → jpsrealtor.com/api/auth/signout-chain
  → josephsardella.com/api/auth/signout-chain
  → {originatingApex}/api/auth/signout-chain   (if on a chatrealty subdomain)
  → {originatingOrigin}/auth/signed-out
```

Each per-apex endpoint emits **two** `Set-Cookie` headers via `response.headers.append()`:

1. Clear the host-only variant (no `Domain` attribute) — matches default signin
2. Clear the `.{apex}`-scoped variant — matches `/api/auth/receive` cookies

> **Why `append()` and not `cookies.set()` twice?** `NextResponse.cookies.set()` keys by cookie name; calling it twice with the same name overwrites the first entry. Only one Set-Cookie header would ship. Bug discovered May 18 2026 (commit `186e9d89`).

The `signed-out` page redirects to `window.location.origin/` after 5 seconds — so you return to the site you signed out from, not a hardcoded one.

## Cookie clearing in detail (the bit that bit us)

The `signout-chain` endpoint must clear cookies whose attributes match what was originally set. The two scenarios:

| How signed in | Cookie attributes | Cleared by |
|---|---|---|
| Default credentials/OAuth on `chatrealty.io` | Host-only (no `Domain`), `Path=/`, `Secure`, `HttpOnly`, `SameSite=Lax` | Set-Cookie with NO `Domain` attribute |
| Came via `/api/auth/receive` on a chatrealty host (since 2026-10-16) | **Host-only** — scoped to that one host (e.g. `genecrucean.chatrealty.io`) | Set-Cookie with NO `Domain`, issued on that host |
| Came via `/api/auth/receive` before 2026-10-16 (legacy, until expiry) | `Domain=.chatrealty.io`, otherwise same | Set-Cookie with `Domain=.chatrealty.io` |

If only one clear is issued, the other variant survives and the user appears still signed in on refresh.

**Why receive went host-only:** a `.chatrealty.io` cookie is sent to EVERY agent
subdomain, including ones reverse-proxied to the agent's own deployment, and it
made two sessions on sibling hosts (an admin on www, the agent they impersonate
on the agent's subdomain) collide under one cookie name. `jpsrealtor.com` /
`josephsardella.com` keep their apex cookie (www + bare of one site). As a
second line, `src/proxy.ts` `rewriteToExternal()` strips every `next-auth.*`
cookie from requests it forwards to an agent's external deployment.

## Agents work on their own subdomain (2026-10-16)

A signed-in **agent** (role `realEstateAgent`, not an admin, not an
impersonation) who requests a workspace page on a platform host — `/`,
`/dashboard*`, `/agent*` on `chatrealty.io` / `www` / `localhost` /
`chatrealty.localhost` — is redirected through `/api/auth/transfer` to the same
path on `{slug}.chatrealty.io` (dev: `{slug}.localhost:3000`), arriving with a
host-only session there. Portal links are relative, so every click after that
stays on the agent's site. Rule + hosts: `src/lib/agent-host.ts`
(`agentHomeSubdomain`, unit-tested); the JWT carries `agentSubdomain` (stamped at
sign-in and on the 60s permission refresh). Admins keep www.

On agent subdomains the proxy now runs the **same portal gates** as www
(`portalGates()`: onboarding wizard, retired subscription page, free-tier page
blocks). That branch used to skip them — harmless while agents worked on www,
a silent bypass once their portal moved.

**Subdomains must be registered on Vercel** (the `*.chatrealty.io` wildcard is DNS
only — `../chatrealty-api/external-site.md`). An agent whose subdomain 404s is
redirected into the 404. Checked 2026-10-16: every real agent's subdomain loads;
two test accounts' don't (`dianamarsh` — DNS points off-Vercel with an expired
certificate; `josephsardella1` — Vercel `DNS_HOSTNAME_RESOLVED_PRIVATE`).

## 2FA

- 6-digit codes stored in `TwoFactorToken` (TTL 10 min via MongoDB TTL index)
- Methods: SMS (via Twilio) or email (via Resend), switchable per user
- Endpoints: `/api/auth/2fa/{enable, disable, send-code, verify-code, verify-phone, confirm-phone, switch-method}`

## Admin impersonation

An admin can sign in **as** an agent to see and change exactly what that agent
sees — settings, integrations, CMS, CRM — then return to their own account.

**Where:** Admin → Users (`/admin/users`) → select the user → **User Details**
panel → amber **"Log in as {name}"** button (shown only for users with the
`realEstateAgent` role and a subdomain; the rest of the dashboard is in
[../admin/README.md](../admin/README.md)). Since 2026-10-16 this opens the
agent's portal **on their own subdomain** (`{slug}.chatrealty.io/agent/dashboard`)
— the whole impersonation stays on the agent's site, and your own www session is
never touched. A second entry point, `/auth/admin-access?subdomain=…`,
is shown when an admin visits an agent's subdomain and offers **View as Agent**
(impersonate) or **View as Administrator** (own account).

**How it works** (`POST /api/auth/impersonate`):

- `{ action: "start", subdomain }` — admins only (`josephsardella@gmail.com` is
  hard-coded in `ADMIN_EMAILS`, or a token with `isAdmin: true`). Looks the
  target up by `agentProfile.subdomain` — **a user with no subdomain can't be
  impersonated** ("User has no subdomain — cannot impersonate"). Mints a fresh
  NextAuth JWT *as the target* (`id`, `email`, `name`, `roles` of the agent;
  `isAdmin: false`) carrying `impersonatedBy` / `impersonatedByName`, and
  overwrites the session cookie with it.
  **Started from www** it no longer sets anything on www: it mints a 30-second
  hand-off token (`impersonation: true`, `targetUserId`, `impersonatedBy`) and
  returns `redirect` → `/api/auth/receive` on the agent's subdomain. Receive
  re-checks that the impersonator is **still an admin**, that the token is being
  redeemed **on that agent's own subdomain** (no replay elsewhere), then sets a
  host-only session carrying `impersonatedBy`. **Started on the agent's
  subdomain** (the `/auth/admin-access` chooser) it sets the cookie right there.
- `{ action: "stop" }` — **on an agent subdomain**: clears that host's session and
  returns `redirect` → `www/admin/users`, where the admin is still signed in.
  Elsewhere (a legacy impersonation on www): re-mints the admin's own JWT from
  `impersonatedBy`. This is what **Exit to Admin** in the banner calls.
- No nesting: starting while already impersonating returns 400.

**While impersonating, `session.user.id` IS the agent.** Every session-scoped
route reads and writes the agent's record — e.g. saving a key in Settings →
Integrations stores it on the agent, not the admin. Server code that must tell
the two apart checks `impersonatedBy` (the `isAdmin && !isImpersonating`
pattern in `../multi-tenant/README.md`).

Gotchas:

- **Exit when done.** The impersonated cookie has the normal 30-day lifetime.
  Close the tab without clicking Exit to Admin and that browser stays signed in
  as the agent **on the agent's subdomain** — and JWTs can't be revoked (see
  Gotchas below). Your www session is unaffected either way.
- **2FA is skipped both ways by design:** the agent's token is minted with
  `twoFactorEnabled: false`, and "stop" restores the admin with
  `requiresTwoFactor: false`.
- **Nothing is audited.** Start/stop write no record anywhere; the only trace
  is the `impersonatedBy` claim inside the live JWT.
- `src/lib/admin-impersonate.ts` (`resolveAgentForRequest`) is a different
  mechanism despite the name: an admin browsing an agent's subdomain is
  resolved to that agent via the `x-agent-subdomain` header, without swapping
  the session.

## Anti-abuse

- **CAPTCHA (Cloudflare Turnstile)** on credentials sign-in (`turnstileToken` in `src/lib/auth.ts`), `/api/auth/register`, `/api/auth/forgot-password`, `/api/contact`, `/api/leads/buy-intake`, `/api/leads/sell-intake`, `/api/newsletter/subscribe`. Added May 2026 after a bot-signup spam wave.
- **Per-IP and per-email rate limits** (in-memory sliding window) on register / signin / forgot-password.
- **Gibberish-name detection** (e.g. `huUnwmncpxBqZSyvDlKjcs`) blocks bot-generated display names.
- **Honeypot field** on lead forms.

## Gotchas

- **NextAuth `signOut()` from `next-auth/react` is the broken default.** It only clears the current apex's cookie. Always use `signOutChain()` from `src/lib/signout-chain.ts` instead. The 4 UI signout call sites were migrated May 17 (commit `0abb57e1`).
- **`pages.signOut: "/auth/signed-out"`** in `auth.ts` is a safety-net: any straggler `signOut()` call still lands on the success page, but it won't have cleared other apexes' cookies.
- **JWT can't be revoked.** A stolen token (e.g. via XSS) stays valid until its 30-day expiry, even after all cookies are cleared. If true session revocation matters, the eventual fix is moving NextAuth from `strategy: "jwt"` to database sessions.
- **`proxy.ts` exempts `/auth/signed-out`** from the "authenticated user on auth page → redirect to dashboard" rule. Otherwise users mid-signout with a lingering token get bounced to dashboard.
- **`NEXTAUTH_SECRET` is the single point of failure.** Anyone with it can mint a transfer JWT for any email and become any user on any apex in `ALLOWED_DOMAINS`. Rotate aggressively if leaked.

## Known issues

See [tech-debt.md](../tech-debt.md). Auth-relevant items:

- Admin is decided two ways — JWT/`User.isAdmin` vs. `verifyAdmin()`'s
  email-or-`"admin"`-role rule. See [../admin/README.md](../admin/README.md#gotchas).
- The legacy `docs/archive/features/AUTHENTICATION.md` (Jan 2025) predates the
  cross-domain flow; don't trust it.
- (Resolved 2026-07-25) the `vercel.json` catch-all no longer overrides the
  `no-store` rules on `/api/auth/*` and `/auth/*`.
