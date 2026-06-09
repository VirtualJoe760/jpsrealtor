---
title: Hosted MCP Server (Streamable HTTP + OAuth)
status: current
last_verified: 2026-06-09
related: [./README.md, ./scopes-and-safety.md, ../integrations/README.md]
---

# Hosted MCP Server (Streamable HTTP + OAuth)

> **Status: built.** The hosted transport the README called "v2 — planned" now
> exists. The same 26 tools the stdio `@chatrealty/mcp-server` exposes are served
> over **Streamable HTTP** as a Next.js route on the existing Vercel app, behind a
> minimal **OAuth 2.1 (DCR + PKCE)** shim. This is what lets an agent add
> ChatRealty as a *custom connector* in the Claude iOS/Android/web apps and search
> the MLS from their phone — stdio can't be reached from a phone; this can.

## TL;DR

The hosted server is a thin transport adapter, identical in spirit to the stdio
one: it reuses the exact same `ALL_TOOLS` registry and tool handlers from
`packages/mcp-server`, each of which forwards to `/api/skill/*` with a bearer
token. The only new surface is **how the credential arrives**. Instead of an env
var, the agent connects via OAuth; the access token resolves server-side to the
agent's existing `crt_live_*` token (encrypted at rest), and that token still
drives identity, scopes, and rate limits at the `/api/skill/*` layer.

No new infrastructure: SSE is disabled, so the transport runs **statelessly with
no Redis/KV**. Everything lives in the Next app and deploys with it.

```
Claude phone/web  ──OAuth──►  /api/mcp/oauth/{authorize,token,register}
       │                              (issues access token ⇄ crt_live token)
       │  Streamable HTTP + Bearer
       ▼
/api/mcp/mcp  ──reuses 26 tools──►  /api/skill/*  ──►  MongoDB Atlas
   (withMcpAuth → crt_live token)     (scopes + rate limits enforced here)
```

## Why this and not the VPS

The `/api/skill/*` data API already runs on Vercel. Hosting the MCP server on the
back-end VPS would mean phone → VPS → Vercel API → Atlas — a pointless extra hop
plus a long-lived Node service to operate (TLS, nginx, patching). Co-locating the
MCP route in the Next app removes the hop and the ops burden. The tool calls do a
single HTTPS loopback to our own `/api/skill/*`; that's the thin-adapter design,
preserved.

## Linchpin files

| File | Purpose |
|---|---|
| `F:\web-clients\joseph-sardella\jpsrealtor\src\app\api\mcp\[transport]\route.ts` | The MCP endpoint. `createMcpHandler` + `withMcpAuth`; SSE disabled. Served at `/api/mcp/mcp`. |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\lib\mcp-tool-bridge.ts` | Registers the 26 tools onto the hosted server via low-level `setRequestHandler`, reusing `@chatrealty/mcp-server` verbatim. |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\lib\mcp-oauth.ts` | OAuth helpers: origin/issuer, PKCE S256 verify, `crt_live` resolution, lifetimes. |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\models\McpOAuth.ts` | Mongoose models: DCR clients, auth codes (5 min TTL), access/refresh tokens. |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\app\api\mcp\oauth\authorize\route.ts` | Consent screen — agent pastes their `crt_live` token; mints a PKCE-bound code. |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\app\api\mcp\oauth\token\route.ts` | Code→token exchange + refresh rotation. |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\app\api\mcp\oauth\register\route.ts` | RFC 7591 Dynamic Client Registration (public PKCE clients). |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\app\.well-known\oauth-authorization-server\route.ts` | RFC 8414 auth-server metadata. |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\app\.well-known\oauth-protected-resource\[[...slug]]\route.ts` | RFC 9728 protected-resource metadata (bare + path-derived). |

## Environment variables

| Var | Required | Notes |
|---|---|---|
| `SECRETS_ENCRYPTION_KEY` | **yes** | Already used by `lib/secrets.ts`. Encrypts the `crt_live` token at rest on the OAuth records. Must be base64 of 32 random bytes. |
| `MCP_PUBLIC_ORIGIN` | no | Override the auto-detected origin (e.g. `https://jpsrealtor.com`) if proxy headers are wrong. Falls back to `NEXT_PUBLIC_SITE_URL` → `NEXTAUTH_URL` → `https://jpsrealtor.com`. |

No `REDIS_URL` / `KV_URL` needed — SSE is disabled.

## Deploy

1. Confirm `SECRETS_ENCRYPTION_KEY` is set in the Vercel **Production** env.
2. Merge `feat/mcp-http-oauth` and let Vercel deploy.
3. Smoke-test discovery (should return JSON, not 404):
   - `GET https://jpsrealtor.com/.well-known/oauth-authorization-server`
   - `GET https://jpsrealtor.com/.well-known/oauth-protected-resource`
4. *(Optional)* point `mcp.chatrealty.io` at the app and set `MCP_PUBLIC_ORIGIN` to it.

## Connect from your phone

1. Mint a token at **Settings → Integrations** with at least `listings:read` and
   `market:read` (add `contacts:read` only if you want lead PII in Claude).
2. Claude app → **Settings → Connectors → Add custom connector**.
3. URL: `https://jpsrealtor.com/api/mcp/mcp`
4. The OAuth screen opens → paste your `crt_live_…` token → **Approve & connect**.
5. Ask: *"Search active listings in La Quinta under $800k with a pool."*

## Gotchas

- **The consent screen trusts whoever pastes a valid token.** That's by design —
  the `crt_live` token *is* the credential, same trust level as the token itself.
  Treat tokens like passwords; revoke from Settings → Integrations to kill access.
- **`.well-known` routing** depends on Next not ignoring dot-folders. Verified on
  Next 16: the app-router ignore filter is `_`-prefixed only. If a future Next
  version 404s these, add rewrites from `/.well-known/*` to a non-dot route.
- **`maxDuration = 60`.** Long tool calls are bounded by the Vercel plan's
  function timeout. The heaviest tools (CMA, comparables) are well under this.
- **Access token 24h, refresh 90d, rotated on use**; replayed auth codes revoke
  previously issued tokens. Tokens auto-expire via Mongo TTL indexes.
- **Scopes are enforced downstream**, not here. The OAuth layer advertises one
  coarse `chatrealty` scope; real gating is the `crt_live` token's own scopes at
  `/api/skill/*` (see [scopes-and-safety.md](./scopes-and-safety.md)).

## Not done yet / follow-ups

- Cloudflare Turnstile on the `/authorize` POST (matches the platform's bot-defense
  posture; see memory on CAPTCHA).
- `McpToolCallLog` audit entries for hosted calls (designed in scopes-and-safety.md;
  currently only the `/api/skill/*` routes log).
- A "Connected clients" view in Settings → Integrations to list/revoke active
  `McpOAuthToken` rows per device.
