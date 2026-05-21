---
title: System Architecture Map
status: current
last_verified: 2026-05-19
audience: Claude Code sessions + new contributors
---

# jpsrealtor / ChatRealty — Architecture Map

> **The single source of truth for how the project is structured today.**
> Generated 2026-05-19 from a full subsystem inventory + this codebase's
> recent session history. Update this doc in the same PR whenever you
> change a load-bearing piece. If you find drift, fix it.

## TL;DR

One Next.js 16 deployment on Vercel serves multiple branded domains via
host-aware routing in `src/proxy.ts`. Every Article, Contact, Listing,
Campaign, etc. is owned by a `User` (the agent). Public pages scope
content to the **domain owner** (jpsrealtor.com → Joseph;
bethanyklier.chatrealty.io → Bethany) via `src/lib/resolveDomainOwner.ts`.
Identity is NextAuth JWT; cross-domain sessions go through a
transfer → receive handshake; signout is a chained multi-apex flow.
MongoDB Atlas is the source of truth for all content; MDX mirrors in
`src/posts/` exist for git history and dev. Cloudinary holds all images.

## Linchpin files (read these first when onboarding)

| File | Why it matters |
|---|---|
| `src/proxy.ts` | Every request goes through here. Host → behavior table. |
| `src/lib/auth.ts` | NextAuth config (JWT, cookie policy, providers). |
| `src/lib/resolveDomainOwner.ts` | The "which agent owns this domain?" helper. Every public scoping uses it. |
| `src/lib/publishing-pipeline.ts` | CMS publish flow: Mongo → MDX → Git → Vercel. |
| `src/lib/signout-chain.ts` | Multi-domain signout orchestration. |
| `src/models/User.ts` | Biggest model. Anchors most relationships via `agentProfile`. |
| `src/models/Contact.ts` | CRM contact (phones[], emails[], address{}). |
| `src/models/Article.ts` | CMS article (Mongo source of truth). |
| `src/models/UnifiedListing.ts` | MLS listing (100+ fields, 8 sources). |
| `src/app/api/articles/list/route.ts` | Reference impl for resolveDomainOwner scoping. |

## 1. Domain & Routing

**File:** `src/proxy.ts` (renamed from `middleware.ts` per Next.js 16 convention)

| Host pattern | Behavior |
|---|---|
| `chatrealty.io` / `www.chatrealty.io` | Rewrites `/` → `/chat-landing` (platform marketing page) |
| `{slug}.chatrealty.io` | Sets `x-agent-subdomain: {slug}` header; page reads it and rebrands |
| `agent.chatrealty.io` | Admin-only owner preview (`token.isAdmin` gate, `x-admin-preview` header) |
| `jpsrealtor.com` / `josephsardella.com` (+ www) | Owner apex — pass-through; pages resolve to Joseph via `resolveDomainOwner` fallback |
| Custom agent domains | `AGENT_DOMAIN_MAP` rewrites `/` → `/agent/[agentId]` (currently empty Map — see "Known issues") |

**Notable gotcha:** `chatrealty.io` canonicalizes to `www.chatrealty.io` at the Vercel edge. The platform check uses the already-computed `detectedSubdomain` (which correctly filters out `www`) rather than naïve string includes.

## 2. Auth

**Files:** `src/lib/auth.ts`, `src/app/api/auth/**`, `src/lib/signout-chain.ts`, `src/lib/resolveDomainOwner.ts`

- **Strategy:** NextAuth JWT, 30-day TTL.
- **Cookie:** `__Secure-next-auth.session-token` in production. Default signin sets it host-only (no `Domain` attribute). The `/api/auth/receive` endpoint sets it with `Domain=.{apex}` so subdomains share a single session.
- **Providers:** Credentials (with bcrypt + Cloudflare Turnstile + rate limit), Google, Facebook.
- **2FA:** SMS via Twilio or email via Resend. Six-digit OTPs in `TwoFactorToken` (TTL 10 min).
- **Cross-domain transfer:** `/api/auth/transfer` mints a 30-second signed JWT → `/api/auth/receive` on the target apex decodes, looks up the user, sets the session cookie with `Domain=.{apex}`.
- **Signout chain:** `signOutChain()` (in `src/lib/signout-chain.ts`) navigates through every platform apex's `/api/auth/signout-chain` endpoint in sequence, clearing **both** host-only and Domain-scoped variants of the session cookie. Ends on `/auth/signed-out` on the originating origin.
- **CAPTCHA:** Cloudflare Turnstile (per memory, May 2026). Active on auth + lead-capture forms.

## 3. Multi-tenant scoping pattern

**The single most important architectural rule.**

```
Any public-facing endpoint that displays content scoped to "this site"
MUST resolve the domain owner via src/lib/resolveDomainOwner.ts, NOT
session.user.id.
```

Resolution chain (in order):
1. `?subdomain=` query param or `x-agent-subdomain` header
2. `agentProfile.customDomain` on a `User` document matching the host
3. `domainregistries` collection lookup by host
4. `PRIMARY_AGENT_EMAIL` env var fallback (Joseph)

**Endpoints currently using this correctly:**
- `/api/agent/public` (full agent profile)
- `/api/agent-branding` (sidebar branding)
- `/api/articles/list` (article scoping)

**Known endpoints still using `session.user.id` (likely a bug — see "Known issues"):**
- Various `/api/cms/*` endpoints (need audit)
- Any listings-by-agent endpoints
- Sitemap generators

## 4. Content / CMS

**Files:** `src/lib/publishing-pipeline.ts`, `src/lib/services/article.service.ts`, `src/models/Article.ts`

- **Source of truth:** MongoDB `articles` collection.
- **MDX mirror:** `src/posts/*.mdx` written via filesystem (localhost) or GitHub Contents API (production). Kept for git history; **not** read in production.
- **Publishing flow:** `publishArticle()` does Mongo save → MDX write → Git push to `main` → Vercel rebuild. Same code, two environments — production uses the GitHub Contents API because Vercel's filesystem is read-only.
- **Scoping:** `/api/articles/list` resolves the domain owner and filters by `author.id`. Admin bypass via `?all=true`.
- **Featured images:** Cloudinary URLs with `f_auto,q_auto` transforms. Public ID lives at `featuredImage.publicId`.
- **Routes:** `/admin/cms` (admin sees all), `/agent/cms/*` (each agent sees their own), `/insights` (public landing), `/insights/[category]/[slug]` (article page), `/lp/[slug]` (landing pages).

## 5. CRM (Contacts, Campaigns, Outreach)

**Contact model** (`src/models/Contact.ts`):
- `phones[]` array with labels (`mobile`/`home`/`work`/`other`) and `isPrimary` flag
- `emails[]` array with labels (`personal`/`work`/`other`)
- `address` nested object
- **Unique compound index** `(userId, phone)` enforces dedup
- Legacy top-level `phone` and `email` fields kept for backward compat

**Import flow** (`/api/crm/contacts/import/{preview, confirm, status}`):
- `preview` → Papa Parse CSV / XLSX, auto-detects column mappings via `ColumnDetectionService`
- `confirm` → wraps the heavy work in `after()` so it survives the Vercel 200 response
- Inside the work: single Contact.find for dedup → in-memory Map → bulk `Contact.insertMany` in chunks of 100 with `ordered: false`
- `status/[batchId]` → polled by the UI; reads from `ImportBatch`
- Three "scenarios" for duplicates (campaign tag, campaign context, regular import)

**Campaign model** — multi-channel: voicemail (Drop Cowboy), email (Resend), SMS (Twilio), direct mail (Thanks.io), Google Ads, Meta Ads. Status workflow + script templates + per-channel config.

**FUB integration** (`src/lib/services/fub-client.ts`) — pulls Follow Up Boss contacts into the local Contact model. Zillow leads → campaigns (voicemail, postcard, ads) per business rules.

**Anti-spam defenses** — `src/lib/spam-defenses.ts` (gibberish-name detection, honeypot fields, per-IP + per-email rate limits via `src/lib/rate-limit.ts`). Active on `/api/auth/register`, `/api/auth/forgot-password`, `/api/contact`, `/api/leads/{buy,sell}-intake`.

## 6. Listings / MLS

**Model:** `src/models/UnifiedListing.ts` (100+ fields, 2dsphere index on coordinates)

- **Sources:** 8 MLSs aggregated into one `unified_listings` collection. Includes GPS (Greater Palm Springs), CRMLS, and others.
- **Scale:** ~76k active listings, ~2.1M photos (per memory).
- **Property types:** A=sale, B=rental, C=multifamily, D=land. Rentals reuse `listPrice` for monthly rent.
- **VPS cron pipeline:** runs on DigitalOcean. Order: fetch → status → CMA → photos. `--purge` flag is disabled after the April 6 incident (per memory).
- **Closed listings:** separate `unified_closed_listings` collection feeds CMA.
- **Subdivisions:** 1,424 subdivisions with pre-built `cmaStats` (PGA West hierarchy live). Pre-built models are ~75x faster than aggregation (~200ms vs ~15s per memory).
- **Photos:** separate `photos` collection. On-demand Cloudinary uploads. Frontend `IMedia` needs PascalCase → camelCase update (per memory).
- **Frontend:** `/mls-listings/[slugAddress]` (detail page), `/map` (map view), `/chap` (chat + inline map).

## 7. Map & CHAP (Chat + Map)

**Files:** `src/lib/chat-search/{parse, preview, narrate, nearby-pois}.ts`, `src/app/components/chat/**`, `src/app/components/map/**`

- **Map:** MapLibre-based. `resolveSpawnPoint()` does geolocation prompt → Palm Desert fallback. Map view is tied to chat session and reset on New Chat (per memory).
- **CHAP** = Chat + Map unified experience. The core product differentiator.
- **Chat-v3 architecture** (`docs/chat-production/CHAT_V3.md` is current canonical doc):
  - **Layer 0 (parse):** user query → `ParsedQuery` (thin wrapper over query-parser, swappable for LLM intent in future)
  - **Layer 1 (preview):** dispatcher routes intent → `PreviewResult` (listing detail / stats / CMA / trends / articles)
  - **Layer 2 (narrate):** PreviewResult + context → natural language via Groq
  - **Layer 3 (UI):** renders the matching component
- **POI display** (per memory): communities as large landmarks at zoom 13+, others clustered at zoom 15+. Info panel on click.
- **Tools index:** `docs/chat-production/TOOLS_INDEX.md` — any new tool MUST be registered here in the same commit.

## 8. Commerce (Stripe, Subscriptions, Credits)

**Subscription tiers** (per `STRIPE_BILLING_SYSTEM.md` + memory):
- **Beginner $125** — entry tier
- **Experienced $500** — mid tier
- **Top Agent $1000** — full features
- **Admin** gets free Top Agent + 0% markup

**Models:**
- `AgentSubscription` — Stripe customer ID, current period, status, usage stats, addons, invoice history. Unique on `userId`.
- `CreditLedger` (formerly `PointsLedger`) — in-app credit balance for marketing spend. Tiered markup (1.25 / 1.20 / 1.15 per memory). >$999 custom at 1.15.
- `Transaction` — commission breakdown: swipe 15%, referral 25%, data broker 5%, handoff 5%, company split variable.
- `Partnership` — agent ↔ service-partner cost-sharing, RESPA compliance, billing history.

**Identity verification:** `/api/agent/verify-identity` triggers Stripe Identity. Webhook at `/api/webhooks/stripe-identity` (Turnstile-protected).

## 9. External Integrations

| Service | Use | Key files |
|---|---|---|
| Groq | LLM (chat narrate, article generation, contact scoring) | `src/lib/groq.ts` |
| Cloudinary | Image storage, transforms, deletion | `src/lib/cloudinary.ts` |
| Twilio | SMS, 2FA codes, voicemail audio delivery | `src/lib/twilio.ts` |
| Stripe | Subscriptions, Identity, webhooks | `src/lib/stripe-subscription.ts`, `src/lib/stripe-identity.ts` |
| Meta CAPI | Server-side conversion tracking (hashed user data) | `src/lib/meta-capi.ts` |
| Meta Pixel | Client-side tracking; suppressed on URLs with lat/lng | `src/components/MetaPixel.tsx`, `src/lib/meta-pixel.ts` |
| Resend | Transactional email (verify, 2FA, password reset, welcome) | `src/lib/email-resend.ts` |
| Cloudflare | Turnstile CAPTCHA + DNS for agent custom domains | `src/lib/turnstile.ts`, `src/lib/cloudflare.ts` |
| Vercel | Domains API, deploy hooks | `src/lib/vercel-domains.ts` |
| Google Business Profile | localPosts v4 (per memory; working) | `src/lib/gbp-api.ts` |
| Google Search Console | Site verification, sitemap submission | `src/lib/gsc-api.ts` |
| Google Ads | Campaign mgmt | `src/lib/google-ads.ts` |
| Google Calendar | Agent scheduling | `src/lib/gcal-api.ts` |
| Thanks.io | Direct mail postcards/letters | `src/lib/thanksio.ts` |
| Drop Cowboy | Ringless voicemail | (via campaign routes, webhook) |
| Follow Up Boss | Lead sync | `src/lib/services/fub-client.ts`, `fub-mapper.ts` |
| 11Labs | Voicemail audio generation | (campaign routes) |
| Runway ML | AI video for marketing | `RunwayTask` model |
| OpenCage | Geocoding | `src/lib/geocoding.ts` |
| Yelp | Nearby businesses | `/api/yelp-search` |
| API Ninjas + FRED | Mortgage rates + economic data | `/api/stats/market` |

**MCP servers** (Claude Code only):
- `mcp-gsc@latest` — wraps Google Search Console. Credential file at `src/.credentials/gsc-credentials.json`. Configured via `.mcp.json`.

## 10. Data Models (high-level catalog)

26 Mongoose models across 7 domains:

**Identity & multi-tenant:** `User` (anchors everything via `agentProfile`), `Team`, `TwoFactorToken`, `PushSubscription`

**CRM:** `Contact`, `Campaign`, `ContactCampaign` (junction), `Label`, `AgentMatch`

**Content:** `Article`

**Listings & geo:** `UnifiedListing`, `Subdivision`, `City`

**Scripts & execution:** `VoicemailScript`, `CampaignExecution`, `GenerationSession`, `RunwayTask`

**Commerce:** `Transaction`, `AgentSubscription`, `CreditLedger`, `Partnership`, `AdCampaignRecord`

**Infrastructure:** `DomainRegistry`, `DomainMapping` (legacy), `ImportBatch`

**Deprecated:** `PointsLedger` (now a shim re-exporting `CreditLedger`)

**Critical invariants:**
- `UnifiedListing` unique on `(mlsId, source)`.
- `Contact` unique on `(userId, phone)` (sparse).
- `Label` unique on `(userId, name)`.
- `AgentSubscription` unique on `userId`.
- `DomainRegistry` unique on `(userId, domain)`.
- `Subdivision` text-indexed on `name + description + keywords`.
- `City` text-indexed.
- `UnifiedListing` has 2dsphere on `coordinates`.
- TTL cleanup: `GenerationSession` 7 days, `TwoFactorToken` 10 min.

## 11. Deployment & Infrastructure

- **Production:** Vercel. All four platform domains (chatrealty.io, www.chatrealty.io, jpsrealtor.com + www, josephsardella.com + www) routed to the same project.
- **VPS:** DigitalOcean droplet for the MLS cron pipeline (separate from Vercel). Per memory: SSH key was rotated; old `digitalocean*` files were cleaned from the repo.
- **Build:** Next.js 16, SWC, custom webpack chunking (three.js, mapbox-gl), MDX support, PWA only in production.
- **Agent custom domains:** Provisioned via Vercel API + Cloudflare DNS, status tracked in `DomainRegistry`.
- **Env vars:** `.env.local` (gitignored) locally; Vercel dashboard for prod secrets.
- **Logs:** `local-logs/` (gitignored, ~21 GB) for VPS cron output + scrape history.
- **Cron:** `crontab.vps` in the repo describes the cron schedule. Active.

## 12. Known issues / tech debt

| Severity | Issue | Where | Status |
|---|---|---|---|
| 🟠 | `vercel.json:57` catch-all sets `Cache-Control: immutable, max-age=31536000` on `/(.*)` — applies to `/api/*` too, freezing per-user data for a year. Each dynamic API needs explicit `no-store` override until the catch-all is scoped to `/_next/static/*` only. | `vercel.json` | Open |
| 🟠 | Public-facing API routes other than `/articles/list`, `/agent/public`, `/agent-branding` still scope by `session.user.id` instead of `resolveDomainOwner`. Class of bug — needs audit + migration. | `src/app/api/cms/**`, listings, sitemap | Open |
| 🟠 | `AGENT_DOMAIN_MAP` in `proxy.ts:18` is hardcoded empty. Custom agent domains route via `DomainRegistry` lookup in some endpoints but the proxy's static map never reads from it. | `src/proxy.ts` | Open |
| 🟡 | `Campaign` model has a duplicate `campaignId` index warning (both `index: true` on the field and `schema.index()` for it). Mongoose logs a noisy warning on every cold start. | `src/models/Campaign.ts` | Open |
| 🟡 | `/auth/2fa` flow, `forgot-password`, several other auth flows lack a current docs page. | `docs/features/AUTHENTICATION.md` is stale | Open |
| 🟡 | Article `author.id` orphan IDs were backfilled May 19 for the existing 39 articles. The pattern could recur if Joseph's user `_id` ever changes (e.g. account delete + recreate). | Mongo `articles` | Mitigated by publish endpoint always stamping `session.user.id` |
| 🟢 | Three video files + assorted root junk cleaned up in `ef2000be`/`375bd0a0`/`b3321103`. | repo root | Resolved |
| 🟢 | `post-photos/` migration: already complete; folder deleted. | `post-photos/` | Resolved |

## 13. Cross-cutting patterns

| Pattern | Where | Why |
|---|---|---|
| `resolveDomainOwner(request)` | `src/lib/resolveDomainOwner.ts` | Scope public content to the **domain owner**, not the visitor. |
| Vercel `after(...)` | `/api/crm/contacts/import/confirm`, anywhere with post-200 work | Serverless functions are killed when the response sends. `after()` keeps the worker alive. |
| Bulk insertMany + ordered:false | CRM import | One Mongo round trip per batch instead of per row. Single bad row doesn't abort the chunk. |
| Pre-fetched in-memory dedup Map | CRM import | Avoid N round trips for `findOne` dedup. |
| Signout chain | `src/lib/signout-chain.ts` | Multi-domain JWT cookies can't be cleared from one place — visit each apex. |
| Dual-environment publishing | `src/lib/publishing-pipeline.ts` | Localhost writes filesystem + git push; production writes via GitHub Contents API + deploy hook. Same code, environment-aware. |
| Token caching with expiry buffer | GBP, GSC OAuth | 60-second pre-expiry buffer minimizes redundant refreshes. |
| Lazy singleton clients | Stripe, Resend, Groq, Cloudinary | Avoid re-instantiation, tolerate missing env vars at build time. |
| 4-layer chat (parse → preview → narrate → render) | `src/lib/chat-search/**` | Decouples intent from rendering; lets us swap parser for LLM later. |

## 14. What this map intentionally does NOT include

- Per-page UI behavior (button states, modals, etc.) — those live in component-level comments or feature-specific docs.
- Marketing copy / business strategy.
- Anything that lives only in memory or in the founder's head — those go in feature-specific docs as we encounter them.

---

**Last verified:** 2026-05-19 (this session). Re-verify after any of: a model schema change, a new external integration, a multi-tenant scoping change, an auth flow change, a deployment target change.
