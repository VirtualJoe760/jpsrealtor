---
title: Routing (src/proxy.ts)
status: current
last_verified: 2026-10-17
related: [../auth/README.md, ../multi-tenant/README.md, ../chatrealty-api/external-site.md, ../seo/README.md]
---

# Routing

## TL;DR

`src/proxy.ts` is the Next.js 16 "proxy" file (the convention formerly called
middleware). It runs on every request the matcher lets through and decides by
**path first, then Host header**: `/api/*` goes through the deny-by-default API
gate (after an external-site check on agent subdomains); pages are routed per
host — owner domains, the admin-only `agent.` host, agent subdomains (which may
be reverse-proxied to the agent's own deployment), the platform root, and
everything else. `src/lib/agent-host.ts` is the shared, edge-safe rulebook for
which host is "the platform" and which is "the agent's". There are no rewrites
in `next.config.mjs` — only a handful of redirects (below).

## Order of evaluation inside `proxy()`

| # | Branch | What happens |
|---|---|---|
| 1 | `/api/*` | On an agent subdomain (not `agent.`, not `/api/site-config`): if the subdomain serves an external site, rewrite to it — **except** the platform-pinned hand-off routes, which run here (and `receive`/`impersonate` answer 403 on such a host). Everything else → `handleApiGate()`. |
| 2 | `BYPASS_PREFIXES` | `/_next/`, `/favicon`, `/manifest`, `/sw.`, `/workbox-`, `/icons/`, `/images/` → `NextResponse.next()`. |
| 3 | `OWNER_HOSTNAMES` | `jpsrealtor.com`, `josephsardella.com` (+ `www.`) → `handleAuthProtection()`. |
| 4 | `agent.` subdomain | Admin-only owner preview (`ADMIN_ONLY_SUBDOMAINS`). |
| 5 | Any other detected subdomain | Agent site — see "Agent subdomains". |
| 6 | Platform root, path `/` | Agent sent home (unless their subdomain serves an external site), else rewrite `/` → `/chat-landing`. |
| 7 | `AGENT_DOMAIN_MAP` | Custom-domain rewrite `/` → `/agent/{id}`; other paths pass. **The map is empty.** |
| 8 | Everything else | `handleAuthProtection()`. |

## Host → behaviour

| Host | Behaviour |
|---|---|
| `chatrealty.io`, `www.chatrealty.io`, dev `chatrealty.localhost` | Platform. `/` rewrites to `/chat-landing`. A signed-in **agent** on `/`, `/dashboard*` or `/agent*` is sent to their own subdomain via `/api/auth/transfer` — unless that subdomain serves their external site (then www is home). Admins and impersonating sessions stay on www. |
| `agent.chatrealty.io`, dev `agent.localhost` | Admin-only owner preview. `/auth*` and `/api/auth*` pass. No session → `/auth/signin?callbackUrl=…`. Signed in but not admin (and not impersonating) → redirected to `https://www.chatrealty.io/` (dev: `http://localhost:{port}/`). Admin → page renders, response carries `x-admin-preview: true` + `x-owner-domain: jpsrealtor.com`. |
| `{slug}.chatrealty.io`, dev `{slug}.localhost` / `{slug}.chatrealty.localhost` | Agent site: external deployment (reverse proxy), `/coming-soon`, or the platform-rendered agent site. The portal paths behave differently — see below. |
| `jpsrealtor.com`, `josephsardella.com` (+ `www.`) | Owner domains: normal routing via `handleAuthProtection()`. No agent-home redirect (not platform hub hosts). |
| Bare `localhost:{port}` | **Not the platform** — `isPlatform` requires "chatrealty" in the host, so `/` is not rewritten and renders the primary agent's site. It *is* a platform hub host for the agent-home redirect (`PLATFORM_HUB_HOSTS` in `agent-host.ts`). Preview the platform at `http://chatrealty.localhost:3000`. |
| Any other host (agent custom domains) | `AGENT_DOMAIN_MAP` is empty, so it falls through to `handleAuthProtection()`; the owning agent is resolved later from the Host by `src/lib/resolveDomainOwner.ts`. See [multi-tenant/custom-domains.md](../multi-tenant/custom-domains.md). |

## The `/api` gate (`handleApiGate`)

Deny-by-default since the 2026-07-02 security audit (commit `78295f27`). Before
that the proxy bypassed all of `/api` and every route had to remember its own
auth check; ~20 forgot. Matching is by path segment (`/api/x` and `/api/x/…`,
not `/api/xy`) for the prefix lists, exact for the `*_EXACT` sets.

| List in `src/proxy.ts` | Effect |
|---|---|
| `PUBLIC_API_PREFIXES`, `PUBLIC_API_EXACT` | Pass with no session. Prefixes: listings, map, geo, stats, neighborhoods/cities/subdivisions, search, chat (`/api/chat*`), analytics, photos, …. Exact: `/api/site-config`, `/api/agent/public`, `/api/agent-branding`, `/api/og`, `/api/og/place`, appointment slots/book, articles list/search/ai-search/topics, `/api/service-partner/directory`, newsletter subscribe/unsubscribe, `/api/ai/console`. |
| `SELF_AUTH_API_PREFIXES`, `SELF_AUTH_API_EXACT` | Pass; the route authenticates itself: `/api/skill` (bearer `crt_live_`), `/api/webhooks`, `/api/cron`, `/api/auth`, `/api/mcp` (OAuth 2.1), plus the two Twilio SMS webhooks (`/api/crm/sms/webhook`, `/api/crm/sms/status-webhook`). |
| everything else | Needs a NextAuth JWT (`getToken`) → else `401 {"error":"unauthorized"}`. |
| `ADMIN_API_PREFIXES` | Also need `token.isAdmin` or `token.impersonatedBy` → else `403 {"error":"forbidden"}`. The list is literal, not a wildcard: `/api/admin`, `/api/resend`, `/api/debug`, `/api/test`, `/api/test-photos`, `/api/testPhotos`, `/api/test-chat`, `/api/performance`, `/api/scrapeMLS`, `/api/trello`, `/api/domains/registry`. |

The gate checks only "is there a session" — tier, ownership and role checks
stay in each route. Detail: [auth/README.md](../auth/README.md).

## Agent subdomains

Every page request (and every `/api` request) on an agent subdomain asks
`GET /api/site-config?subdomain={slug}[&pv=…]` on the platform host — edge code
can't reach Mongo. 2.5 s timeout; any failure returns `null` (= "no external
site"). Token-less answers are CDN-cached (`s-maxage=30`); a lookup carrying a
preview token is `no-store`. The answer is `{status, url, previewOk, exists,
ready}`; the proxy treats a site as *serving* when it has a `url` and the status
is `live`, or `preview` with `previewOk` (a valid signed credential).

**`/api` on a subdomain that serves an external site** belongs to the agent's
deployment — NextAuth included — so the whole `/api` surface is rewritten there
(`rewriteToExternal()`), before the platform gate. A failed lookup or a site
that isn't serving falls through to the normal gate.

**Portal paths** (`/auth`, `/agent`, `/admin`, `/dashboard`):

1. If the subdomain **serves an external site** → `sendToPlatform()`: same path
   on www, through this host's own `/api/auth/transfer` (carries a plain
   session, refuses an impersonation one, and with no session just redirects).
   Added in `2fd6c3e3` (review M2) because that host's `/api` belongs to the
   agent's deployment, so the platform portal cannot run there.
2. `/agent`, `/admin`, `/dashboard` need a session (→ `/auth/signin`).
   Non-admin on `/admin*` → `/dashboard`. An admin not impersonating →
   `/auth/admin-access?subdomain=…&callbackUrl=…` (the "Log in as" chooser).
   `/auth*` itself is not protected.
3. `portalGates()` (below), then the page renders with `x-agent-subdomain`.

**Every other path:**

1. External site serving → arriving with `?crpv=` pins the credential into a
   host-only `cr_site_preview` cookie (15 min, httpOnly, `Secure` on https) and
   redirects to the clean URL; otherwise `rewriteToExternal()` onto the
   deployment URL with NextAuth session cookies stripped
   (`isPlatformSessionCookie`).
2. Agent exists but not ready (`exists && !ready`, the checklist in
   `src/lib/agent-site-readiness.ts`) → rewrite to `/coming-soon`.
3. Otherwise `NextResponse.next()` with `x-agent-subdomain: {slug}`.

**Platform-pinned API routes** (`isPlatformPinnedApi` in `agent-host.ts`):
`/api/auth/transfer`, `/api/auth/receive`, `/api/auth/impersonate`,
`/api/auth/signout-chain` always run on the platform, on every host. On a host
serving an external site, `receive` and `impersonate` return 403 — the
platform must not *create* a session where the agent's code runs; `transfer`
(host-bound) and `signout-chain` stay allowed. Why: before `2fd6c3e3` a
hand-off token for that host was delivered to the agent's own code (review M1).

**Host-only sessions.** An agent's session lives on their own subdomain as a
host-only cookie (no `Domain`), never on `.chatrealty.io`, so it is not sent to
www or to another agent's site. That is also why `rewriteToExternal()` strips
the NextAuth cookies: the browser would otherwise hand a working ChatRealty
session — possibly an admin's mid-impersonation — to code the agent controls.
How cookies are scoped and issued: [auth/README.md](../auth/README.md).

## `handleAuthProtection` and `portalGates`

`handleAuthProtection()` (owner hosts, platform non-root paths, custom domains):

- On a platform hub host, a workspace path, and a real agent session →
  `sendAgentHome()` unless `externalSiteOwns()`. `externalSiteOwns()` looks the
  subdomain up without a preview token and counts any `live` or `preview` status
  with a `url`; it **fails closed** (a failed lookup keeps the agent on www,
  where the portal always works) so www ⇄ subdomain cannot bounce.
- Signed-in user on `/auth*` → `/dashboard` (except `/auth/signed-out`).
- No session on `/dashboard*`, `/admin*`, `/agent*` →
  `/api/auth/signin?callbackUrl=…`.
- Signed in → `portalGates()`.

`portalGates()` runs on www **and** agent subdomains, so moving an agent's
portal to their own host cannot skip it:

| Rule | Redirect |
|---|---|
| `/agent/subscription*` | `/agent/settings?section=billing` |
| `/admin*` and not `isAdmin` | `/dashboard` |
| Agent role, not admin, `onboardingComplete === false`, not already on `/agent/settings` | `/agent/settings?onboarding=true` |
| `agentTier === "free"`, not admin, on `/agent/campaigns`, `/agent/messages`, `/agent/email`, `/agent/dashboard/domains` | `/agent/settings?section=billing` (an undefined tier is not treated as free) |

## Subdomain detection

`detectSubdomainFromHost()` (proxy) and `subdomainOfHost()` (`agent-host.ts`)
use the same rule: for a host containing "chatrealty", take the part before
the literal `chatrealty`, drop the trailing dot, split on `.`, drop empty and
`www`, take the last label; for `*.localhost`, the part before `.localhost`.
`bethanyklier.chatrealty.io` → `bethanyklier`; `www.chatrealty.io` and
`chatrealty.io` → none; `agent.chatrealty.io` → `agent` (admin-only).
`isPlatform` = host contains "chatrealty" AND no subdomain — the older
`!bareHost.includes(".chatrealty")` test misread `www.` as a subdomain (fixed
`f04682bb`, May 2026).

## Other routing layers

| Layer | What it does |
|---|---|
| `config.matcher` in `src/proxy.ts` | Skips `_next/static`, `_next/image`, `favicon.ico` and any path ending in an image/`txt`/`xml`/`json`/`webmanifest` extension — so `/robots.txt` and `/sitemap*.xml` never reach the proxy. |
| `next.config.mjs` `redirects()` | `/agent/settings/{identity,branding,photos,content,highlights,social,domain,areas,calendar,gbp,integrations,billing}` → `/agent/settings?section={section}` (302); `/neighborhoods/{city}[/{slug}]/buy|sell` → `/neighborhoods/{city}#buy|#sell` (301); `/selling` → `/sell` (301). No rewrites, no `headers()`. |
| `vercel.json` | `cleanUrls: true`, `trailingSlash: false`. Cache headers: the page catch-all `/((?!api/|_next/).*)` is `max-age=0, must-revalidate`; `/api/*`, `/api/auth/*`, `/auth/*`, `/dashboard*`, `/terms-of-service`, `/privacy-policy` are `no-store`. Rules are last-match-wins and a route handler's own headers beat them. Also the cron schedule (`auto-approve-partners` and `publish-pending` hourly, `mls-sync` every 5 min). |

## Local dev server (`npm run dev` → `server.js`)

`npm run dev` runs the custom `server.js` (Next dev + Socket.io), not `next dev`.
Next 16.0–16.3 has a startup race: when the initial scan of `src/app` is slow,
a partial route-table rebuild can finish *last*, and every route deeper than
that scan returns **Next's HTML 404** until a file changes (2026-10-15: all the
4+-segment `/api/skill` routes, so the local MCP server could call nothing; it
also half-overwrote `.next/dev/types/routes.d.ts`, breaking `npx tsc --noEmit`).
Fixed upstream in Next 16.4.0; the repo is on 16.0.7.

Until the upgrade, `server.js` guards against it in dev only
(`guardDevRouteTable()`; as of 2026-10-17 this is an **uncommitted** change to
`server.js` in the main checkout, so no branch has it yet): once
listening it probes `/api/skill/listings/__route-table-probe__/photos` (answers
401 JSON when healthy) and checks every `page`/`route` file appears in
`routes.d.ts`. If either fails it bumps one route file's mtime to force a
rescan and logs `Dev route table healed after N rescan(s)`. If you still see
`still stale … Restart npm run dev`, restart. Production never runs the guard.

## Gotchas

- **`src/proxy.ts`, not `src/middleware.ts`.** Archived docs that say middleware describe the same file under its old name.
- **`x-agent-subdomain`, `x-admin-preview`, `x-owner-domain` are set on the *response*.** They go to the browser; route handlers and `headers()` never see them. Code that needs the agent parses the Host itself. See the multi-tenant gotcha for which callers likely fall back to the owner.
- **`AGENT_DOMAIN_MAP` is empty.** Custom domains get no edge rewrite; owner resolution happens per request in `resolveDomainOwner`.
- **A public endpoint must also be listed in the gate**, or anonymous visitors get 401. Test with a cookie-less request — a signed-in browser hides it. (This silently broke the sidebar compliance block and every OG card from 2026-07-02 to 2026-07-25.) **Still open:** `/api/leads/buy-intake`, `/api/leads/sell-intake` and `/api/contact` are in no public list, so the buy, sell and contact forms get `401` for logged-out visitors (confirmed on production 2026-10-17). See `../review/README.md`.
- **Unregistered subdomain = Vercel 404** before the proxy runs. Registration happens at mint and connect (`ensureSubdomainRegistered` in `src/lib/generate-subdomain.ts`).
- **`agent` is reserved** — never issue it as a slug (`RESERVED` in `src/lib/generate-subdomain.ts`).
- **Don't redirect from the proxy straight to another host on localhost.** `next dev` turns a middleware redirect whose origin equals its own into a relative `Location`, which loops on `{sub}.localhost`. That's why `sendToPlatform()` hops through `/api/auth/transfer`.
- **Fixed:** non-admins on `agent.chatrealty.io` used to be redirected to a hardcoded `http://localhost:3000/` (and a same-host `/` would have looped). Now env-aware (`395b20b4`).

## Files

- `src/proxy.ts` — the proxy
- `src/lib/agent-host.ts` — platform hub hosts, agent origin, pinned API routes, platform surface paths, session-cookie names
- `src/app/api/site-config/route.ts` — the external-site / readiness lookup the proxy calls
- `src/app/api/auth/transfer/route.ts`, `src/app/api/auth/receive/route.ts`, `src/app/api/auth/impersonate/route.ts`, `src/app/api/auth/signout-chain/route.ts` — host hand-offs
- `src/lib/resolveDomainOwner.ts` — content-level host → owner resolution
- `server.js` — custom dev/prod server; holds the dev-only route-table guard
- `next.config.mjs` (redirects), `vercel.json` (headers, crons)

## Related

- [auth/README.md](../auth/README.md) — sessions, host-only cookies, hand-offs
- [multi-tenant/README.md](../multi-tenant/README.md) — the host matrix and what happens after the proxy
- [chatrealty-api/external-site.md](../chatrealty-api/external-site.md) — the external-site lifecycle (connect → preview → live)
