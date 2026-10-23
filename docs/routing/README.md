---
title: Routing (src/proxy.ts)
status: current
last_verified: 2026-10-18
related: [../auth/README.md, ../multi-tenant/README.md]
---

# Routing

## TL;DR

`src/proxy.ts` is the Next.js 16 "proxy" file (formerly known as middleware — the
convention was renamed in v16.0). It runs on every non-bypassed request and
decides what to do based on the **Host header**: which agent owns this site,
whether to rewrite the URL, whether to enforce admin-only access, etc.

## Host → behavior table

| Host | Behavior |
|---|---|
| `chatrealty.io` / `www.chatrealty.io` | Rewrites `/` → `/chat-landing` (platform marketing page) |
| `{slug}.chatrealty.io` (e.g. `bethanyklier.chatrealty.io`) | **Two serving models** (see `../chatrealty-api/external-site.md`). If the agent has a connected external site (`agentProfile.externalSite`, status `live` — or `preview` with a signed link), the proxy REWRITES pages **and the whole `/api` surface** onto their deployment. Otherwise: sets `x-agent-subdomain: {slug}` and the platform routes render (or `/coming-soon` if the profile checklist is incomplete). Sub-paths pass through normally. The subdomain must also be REGISTERED on the Vercel project (wildcard DNS alone 404s at the edge) — registration is automatic at mint + connect since 2026-08-05. |
| `agent.chatrealty.io` | **Admin-only owner preview.** Requires `token.isAdmin`. Sets `x-admin-preview: true` + `x-owner-domain: jpsrealtor.com`. Non-admins get redirected. |
| `jpsrealtor.com` / `www.jpsrealtor.com` | Owner apex (Joseph). Pass-through; resolveDomainOwner falls back to PRIMARY_AGENT_EMAIL. |
| `josephsardella.com` / `www.josephsardella.com` | Same as jpsrealtor.com — owner apex for Joseph. |
| Custom agent domains | `AGENT_DOMAIN_MAP` rewrites `/` → `/agent/[agentId]`. **Currently hardcoded empty — see Gotchas.** |
| Bare `localhost` / `{slug}.localhost` | Dev fallback; subdomain detection mirrors chatrealty.io behavior. |

## Bypass list

The proxy skips entirely for static / framework / asset paths (see `BYPASS_PREFIXES` in the file):

`/_next/*`, `/favicon*`, `/manifest*`, `/sw.*`, `/workbox-*`, `/icons/*`, `/images/*`

`/api/*` is **not** bypassed (it was until the 2026-07-02 security audit). It goes
through the default-deny gate (`handleApiGate`): public, self-authenticating
(`/api/skill`, `/api/webhooks`, `/api/cron`, `/api/auth`, `/api/mcp`) and
signed-webhook routes pass through; everything else needs a session. The exact /api/crm/dialer/webhooks/twilio/status path now self-authenticates Twilio voice status callbacks using a configured canonical HTTPS URL and account signature before database access; no dialer subtree or voice-instruction route is exempted. An agent
subdomain with a live external site gets its whole `/api` surface rewritten to
that deployment first. API routes still don't get host-based *page* rewriting:
they read the Host header via `resolveDomainOwner` if they care which agent
owns the request.

## Local dev server (`npm run dev` → `server.js`)

`npm run dev` runs the custom `server.js` (Next dev + Socket.io), not `next dev`.
Next 16.0–16.3 has a startup race in its dev route table: when the initial scan
of `src/app` is slow (cold disk, busy machine), Next rebuilds the table once per
partial scan, and the partial rebuild can finish *last*. Then every route deeper
than that partial scan reached returns **Next's HTML 404 page**, even though the
route file exists and compiles. It stays that way until a file changes. On
2026-10-15 that broke every `/api` route 4+ segments deep (all the `/api/skill`
data routes, so the local MCP server could call nothing) while `/api/skill/me`
worked, and it left `.next/dev/types/routes.d.ts` half-overwritten, which breaks
`npx tsc --noEmit`. It's fixed upstream in Next 16.4.0.

Until the upgrade, `server.js` guards against it in dev only: once listening, it
probes `/api/skill/listings/__route-table-probe__/photos` (5 segments, answers
401 JSON when healthy) and checks that every `page`/`route` file appears in
`routes.d.ts`. If either check fails, it bumps one route file's mtime, which
forces a full rescan, and logs `Dev route table healed after N rescan(s)`. If
you still see `still stale … Restart npm run dev`, restart. Production
(`NODE_ENV=production`) never runs the guard.

## How subdomain detection works

For any chatrealty-family host:

```
bareHost.split("chatrealty") → parts before/after the literal "chatrealty"
  → trim trailing dot → split by "." → filter out "" and "www" → pop()
  → detectedSubdomain (or undefined)
```

Example walk:
- `bethanyklier.chatrealty.io` → `"bethanyklier"`
- `www.chatrealty.io` → `undefined` (www filtered)
- `agent.chatrealty.io` → `"agent"` (treated as admin-only)
- bare `chatrealty.io` → `undefined`

The "platform" branch (rewrite to `/chat-landing`) fires when host includes "chatrealty" AND no real subdomain detected. **Note:** this used to be `!bareHost.includes(".chatrealty")` which was buggy — `www.chatrealty.io` literally contains `.chatrealty`. Fixed May 18 2026 (commit `f04682bb`).

## Gotchas

- **`src/proxy.ts`, not `src/middleware.ts`.** Next.js 16 renamed the convention. Older docs in `/docs/` may still say middleware — they're wrong. Reference: https://nextjs.org/docs/app/api-reference/file-conventions/proxy
- **`AGENT_DOMAIN_MAP` is currently empty.** Custom agent domains are routed via the `DomainRegistry` collection lookup that happens inside `resolveDomainOwner` (used by content endpoints) — but the proxy's static map never reads from it. If a custom domain ever needs URL rewriting at the proxy level, that gap will matter.
- **`proxy.ts:106` redirects to `http://localhost:3000/`** for non-admins on `agent.chatrealty.io`. In production that sends real users to localhost. Needs to be made env-aware.
- **The "agent" subdomain (`agent.chatrealty.io`) is reserved.** Don't issue it as an agent's username/slug.

## File pointers

- `F:\web-clients\joseph-sardella\jpsrealtor\src\proxy.ts` — the proxy file itself
- `F:\web-clients\joseph-sardella\jpsrealtor\src\lib\resolveDomainOwner.ts` — content-level host resolution (used by API routes)
- `F:\web-clients\joseph-sardella\jpsrealtor\next.config.mjs` — Next.js config (no rewrites here; everything is in proxy.ts)
- `F:\web-clients\joseph-sardella\jpsrealtor\server.js` — custom dev/prod server; holds the dev-only route-table guard
- `F:\web-clients\joseph-sardella\jpsrealtor\vercel.json` — Vercel-level headers (the cache catch-all lives here)

## Related

- [auth/README.md](../auth/README.md) — the auth-protection branches inside `handleAuthProtection`
- [multi-tenant/README.md](../multi-tenant/README.md) — what happens after the proxy stamps `x-agent-subdomain`
