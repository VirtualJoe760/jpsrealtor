---
title: Routing (src/proxy.ts)
status: current
last_verified: 2026-05-21
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
| `{slug}.chatrealty.io` (e.g. `bethanyklier.chatrealty.io`) | Sets `x-agent-subdomain: {slug}` header; pages read it and rebrand. Sub-paths (`/chap`, `/insights`, etc.) pass through normally. |
| `agent.chatrealty.io` | **Admin-only owner preview.** Requires `token.isAdmin`. Sets `x-admin-preview: true` + `x-owner-domain: jpsrealtor.com`. Non-admins get redirected. |
| `jpsrealtor.com` / `www.jpsrealtor.com` | Owner apex (Joseph). Pass-through; resolveDomainOwner falls back to PRIMARY_AGENT_EMAIL. |
| `josephsardella.com` / `www.josephsardella.com` | Same as jpsrealtor.com — owner apex for Joseph. |
| Custom agent domains | `AGENT_DOMAIN_MAP` rewrites `/` → `/agent/[agentId]`. **Currently hardcoded empty — see Gotchas.** |
| Bare `localhost` / `{slug}.localhost` | Dev fallback; subdomain detection mirrors chatrealty.io behavior. |

## Bypass list

The proxy skips entirely for static / framework / asset paths (see `BYPASS_PREFIXES` in the file):

`/api/*`, `/_next/*`, `/favicon*`, `/manifest*`, `/sw.*`, `/workbox-*`, `/icons/*`, `/images/*`

This means **API routes don't get host rewriting** — they need to read the Host header directly via `resolveDomainOwner` if they care about which agent owns the request.

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
- `F:\web-clients\joseph-sardella\jpsrealtor\vercel.json` — Vercel-level headers (the cache catch-all lives here)

## Related

- [auth/README.md](../auth/README.md) — the auth-protection branches inside `handleAuthProtection`
- [multi-tenant/README.md](../multi-tenant/README.md) — what happens after the proxy stamps `x-agent-subdomain`
