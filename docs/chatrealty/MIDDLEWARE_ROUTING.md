# Multi-Domain Middleware Routing

## Overview

The application uses Next.js middleware (`src/middleware.ts`) to route incoming requests based on the hostname. This enables a single Next.js deployment to serve multiple domains with different content — the ChatRealty landing page, individual agent sites, and the primary jpsrealtor.com platform.

## Routing Rules

Requests are evaluated in the following order. The first match wins.

| Priority | Hostname Pattern | Behavior |
|----------|-----------------|----------|
| 1 | `*chatrealty*` (e.g. chatrealty.io, www.chatrealty.io) | Root (`/`) rewrites to `/chat-landing`. Sub-paths served normally. |
| 2 | Agent custom domain (from registry) | Root (`/`) rewrites to `/agent/[agentId]`. Sub-paths served normally. |
| 3 | `josephsardella.com` | Pass through — same owner as jpsrealtor.com. |
| 4 | `jpsrealtor.com`, `localhost` | Default — standard Next.js routing. |

### Bypass Rules

The middleware skips processing entirely for:

- `/api/*` — API routes
- `/_next/*` — Next.js static assets and internals
- `/favicon*`, `/manifest*`, `/sw.*`, `/workbox-*` — PWA and browser assets
- `/auth/*` — Authentication endpoints
- `/icons/*`, `/images/*` — Static media
- Files with common static extensions (`.svg`, `.png`, `.jpg`, etc.) via the matcher config

## Agent Domain Registry

Agent custom domains are resolved via a static `Map<string, string>` in the middleware file:

```ts
const AGENT_DOMAIN_MAP = new Map<string, string>([
  // ["customdomain.com", "agentMongoObjectId"]
]);
```

### Why a static map?

Next.js middleware runs on the **Edge Runtime**, which cannot import the MongoDB driver or connect to databases directly. The static map is a temporary solution.

### Future migration path

Replace the static map with a `fetch()` call to an internal API endpoint:

```
GET /api/internal/agent-by-domain?domain=customdomain.com
```

This endpoint would query MongoDB and return the agent's `_id`. Consider caching the response (via `Cache-Control` headers or a KV store) to avoid a database hit on every request.

## ChatRealty Landing Page

**Route:** `/chat-landing` (rewritten from chatrealty.io root)
**File:** `src/app/chat-landing/page.tsx`

A standalone landing page for the ChatRealty.io brand featuring:

- Hero with "AI-Powered Real Estate Search" headline
- CTA button linking to `/chap` (the AI chat interface)
- Feature pills highlighting natural language search, MLS connectivity, and smart matching
- Theme-aware design using the existing `useTheme` / `SpaticalBackground` system

Sub-paths on chatrealty.io (e.g. `/chap`, `/neighborhoods`) are **not** rewritten and serve the same content as jpsrealtor.com, allowing the chat-landing CTA to link directly to the AI chat.

## DNS & Deployment Requirements

For this routing to work in production:

1. **DNS:** All domains must point to the same deployment (A/CNAME records to Vercel or the VPS).
2. **SSL:** Each domain needs a valid TLS certificate. Vercel handles this automatically for added domains. For self-hosted deployments, use a wildcard cert or individual certs via Let's Encrypt.
3. **Vercel domains:** Add each domain in the Vercel dashboard under Project Settings > Domains.

## Testing Locally

To test hostname routing locally, add entries to your hosts file:

```
# /etc/hosts (Linux/Mac) or C:\Windows\System32\drivers\etc\hosts (Windows)
127.0.0.1  chatrealty.local
127.0.0.1  testagent.local
```

Then add `testagent.local` to `AGENT_DOMAIN_MAP` with a test agent ID, and visit `http://chatrealty.local:3000` or `http://testagent.local:3000`.
