---
title: Auth
status: current
last_verified: 2026-07-23
related: [../routing/README.md, ../multi-tenant/README.md]
supersedes: docs/features/AUTHENTICATION.md
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
- **Domain-scoped variant:** When a user arrives via `/api/auth/receive`, the cookie is set with `Domain=.chatrealty.io` (or `.jpsrealtor.com`, etc.) so all subdomains of that apex share the session.
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
3. Receive endpoint decodes the token, looks up the user in MongoDB by email, builds a NextAuth-shaped session JWT, sets it as a cookie with `Domain=.chatrealty.io` (subdomain-shared)
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
| Came via `/api/auth/receive` on chatrealty subdomain | `Domain=.chatrealty.io`, otherwise same | Set-Cookie with `Domain=.chatrealty.io` |

If only one clear is issued, the other variant survives and the user appears still signed in on refresh.

## 2FA

- 6-digit codes stored in `TwoFactorToken` (TTL 10 min via MongoDB TTL index)
- Methods: SMS (via Twilio) or email (via Resend), switchable per user
- Endpoints: `/api/auth/2fa/{enable, disable, send-code, verify-code, verify-phone, confirm-phone, switch-method}`

## Anti-abuse

- **CAPTCHA (Cloudflare Turnstile)** on `/api/auth/register`, `/api/auth/forgot-password`, `/api/contact`, `/api/leads/buy-intake`, `/api/leads/sell-intake`. Added May 2026 after a bot-signup spam wave.
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

- vercel.json catch-all forces `no-store` override on auth API responses
- Some legacy auth docs (`docs/features/AUTHENTICATION.md`) predate the cross-domain flow
