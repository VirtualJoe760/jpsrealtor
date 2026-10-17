---
title: Hosted MCP Server (Streamable HTTP + OAuth)
status: current
last_verified: 2026-10-17
related: [./README.md, ./tools.md, ./scopes-and-safety.md, ./site-building.md, ../integrations/README.md]
---

# Hosted MCP Server (Streamable HTTP + OAuth)

> **TL;DR.** `https://www.chatrealty.io/api/mcp/mcp` serves the same `ALL_TOOLS`
> registry as the stdio `@chatrealty/mcp-server` (43 tools) over **Streamable
> HTTP**, as a route in the Next app on Vercel, behind a minimal **OAuth 2.1
> (DCR + PKCE)** shim. It is what lets an agent add ChatRealty as a *custom
> connector* in the Claude web/mobile apps. The agent pastes their `crt_live_`
> token on the consent screen; that token's scopes decide which tools the
> connector **lists and allows** (`TOOL_SCOPE` in `src/lib/mcp-tool-bridge.ts`),
> and the `/api/skill/*` routes enforce them again. Because the package is
> compiled from source on every Vercel build (root `prebuild` →
> `build:mcp-server`), the hosted surface is always current — unlike stdio,
> which waits for an npm publish.

The only new surface versus stdio is **how the credential arrives**. Instead of
an env var, the agent connects via OAuth; the access token resolves server-side
to the agent's existing `crt_live_*` token (encrypted at rest), and that token
still drives identity, scopes, and rate limits.

No new infrastructure: the transport runs **statelessly with no Redis/KV**.
Everything lives in the Next app and deploys with it.

```
Claude phone/web  ──OAuth──►  /api/mcp/oauth/{authorize,token,register}
       │                              (issues access token ⇄ crt_live token)
       │  Streamable HTTP + Bearer
       ▼
/api/mcp/mcp ──► mcp-tool-bridge (TOOL_SCOPE filter) ──► /api/skill/* route handlers
   (withMcpAuth → crt_live token)      reads dispatched in-process;   (scopes + rate
                                       writes over HTTPS              limits enforced)
```

### How it differs from stdio

| | Hosted | stdio |
|---|---|---|
| Tool filter | Token scopes (`TOOL_SCOPE`); tools absent from the map are listed for every token | Tier (`tiers.ts`); no scope filter |
| Tier filter | **None** — `tierFromScopes` exists in `tiers.ts` but the bridge never calls it, so a `client_research` token sees every no-scope tool (`my_agent_profile`, `get_tracking`, `get_site_claim_code`, …) | `agent` / `research:read` |
| Carousel + Instagram tools | Listed when the token has the scope | Hidden on the agent tier |
| Resources | Listing-board UI only | Listing board + `guide://chatrealty/*` build-guide resources |
| Server version reported | Read from `packages/mcp-server/package.json` | Hard-coded `"0.21.0"` in `src/index.ts` |

## Why this and not the VPS

The `/api/skill/*` data API already runs on Vercel. Hosting the MCP server on the
back-end VPS would mean phone → VPS → Vercel API → Atlas — a pointless extra hop
plus a long-lived Node service to operate (TLS, nginx, patching). Co-locating the
MCP route in the Next app removes the hop and the ops burden. Read tools are
dispatched **in-process** to the skill route handlers
(`src/lib/mcp-inprocess-fetch.ts` — same warm function, no second cold start);
writes, images, Instagram and unmatched paths fall back to a real HTTPS fetch.
The route handlers still run `authenticateSkillRequest` either way.

## Linchpin files

| File | Purpose |
|---|---|
| `F:\web-clients\joseph-sardella\jpsrealtor\src\app\api\mcp\[transport]\route.ts` | The MCP endpoint, served at `/api/mcp/mcp`. Drives the SDK's `WebStandardStreamableHTTPServerTransport` directly — stateless, `enableJsonResponse: true` — wrapped in `withMcpAuth`. (It no longer uses `createMcpHandler`: that waited for an SSE stream that never drained, so every authenticated request hung.) Reports the package version from `package.json`. |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\lib\mcp-tool-bridge.ts` | Registers `ALL_TOOLS` via low-level `setRequestHandler`, filtering list + call by `TOOL_SCOPE`. Serves the listing-board UI resource. |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\lib\mcp-inprocess-fetch.ts` | In-process dispatch table for read routes. |
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
| `MCP_PUBLIC_ORIGIN` | no | Override the auto-detected origin (e.g. `https://www.chatrealty.io`) if proxy headers are wrong. Falls back to `NEXT_PUBLIC_SITE_URL` → `NEXTAUTH_URL` → `https://www.chatrealty.io`. |

No `REDIS_URL` / `KV_URL` needed — the transport is stateless.

## Deploy

Deploys with the app (the original `feat/mcp-http-oauth` branch is merged).

1. Confirm `SECRETS_ENCRYPTION_KEY` is set in the Vercel **Production** env.
2. Smoke-test discovery (should return JSON, not 404):
   - `GET https://www.chatrealty.io/.well-known/oauth-authorization-server`
   - `GET https://www.chatrealty.io/.well-known/oauth-protected-resource`
3. The metadata is host-relative, so the server self-advertises whatever domain
   it's reached on. Use the canonical **`www.chatrealty.io`** host. The apex
   `chatrealty.io` 307-redirects to `www`, and a redirect on the connector URL
   breaks the OAuth handshake — so always give clients the `www` URL.

## Connect from your phone

1. Mint a token at **Settings → Integrations** with at least `listings:read` and
   `market:read` (add `contacts:read` only if you want lead PII in Claude). To
   let Claude connect and launch a website, the token also needs
   `site:manage` — only the **Website** preset (or Custom) includes it; the
   Content drafting / Lead-aware / Full workspace presets do not, and the site
   tools then never appear on the connector.
2. Claude app → **Settings → Connectors → Add custom connector**.
3. URL: `https://www.chatrealty.io/api/mcp/mcp`  *(use `www`; the bare apex redirects)*
4. The OAuth screen opens → paste your `crt_live_…` token → **Approve & connect**.
5. Ask: *"Search active listings in La Quinta under $800k with a pool."*

## Gotchas

- **The whole `/api/mcp` surface must stay on the middleware's self-auth
  allowlist** (`SELF_AUTH_API_PREFIXES` in `src/proxy.ts`). OAuth requires
  unauthenticated reachability by protocol: `/oauth/register` (RFC 7591 DCR,
  rate-limited in-route 20/hr/IP), `/oauth/token` (PKCE), `/oauth/authorize`
  (the pasted `crt_live` token is the credential), and the transport's
  401+`WWW-Authenticate` challenge. The 2026-07-02 default-deny gate silently
  broke Claude's Connect flow ("Couldn't register with chatrealty's sign-in
  service") until re-allowlisted 2026-07-23.
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
- **OAuth scope is coarse; token scopes do the gating — twice.** The OAuth
  layer advertises one `chatrealty` scope (`MCP_OAUTH_SCOPES`). The bridge then
  filters `tools/list` and refuses `tools/call` (`insufficient_scope`) using the
  `crt_live` token's scopes and `TOOL_SCOPE`, and each `/api/skill/*` route
  enforces its own `requireScope`. A tool missing from `TOOL_SCOPE` is shown to
  every token even when its route requires a scope — today `get_tracking` and
  `set_tracking` (route needs `site:manage`) and `show_listing_board` (route
  needs `listings:read`). See [scopes-and-safety.md](./scopes-and-safety.md).
- **Token scopes are frozen at connect time.** Re-minting a token changes
  nothing until that token is pasted into a fresh connect.

## Not done yet / follow-ups

- Cloudflare Turnstile on the `/authorize` POST (matches the platform's bot-defense
  posture; see memory on CAPTCHA).
- `McpToolCallLog` audit entries for hosted calls (designed in scopes-and-safety.md;
  currently only the `/api/skill/*` routes log).
- A "Connected clients" view in Settings → Integrations to list/revoke active
  `McpOAuthToken` rows per device.
