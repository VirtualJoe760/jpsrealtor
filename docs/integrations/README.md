---
title: External Integrations
status: current
last_verified: 2026-06-02
related: [../auth/README.md, ../crm/README.md, ../multi-tenant/README.md, ../cms/README.md]
---

# External Integrations

## TL;DR

Every external API the platform talks to is wrapped in a single file under `src/lib/`. The pattern is consistent: a **lazy singleton client** (constructed on first use) that reads its config from `process.env`, with all keys stored in `.env.local` (gitignored). Per-user OAuth integrations (GBP, GSC, Google Calendar) layer a refresh-token cache on top — the access token is refreshed on demand with a 60s expiry buffer. Client-side trackers (Meta Pixel, Google Ads `gtag`) ship as `"use client"` modules that read `NEXT_PUBLIC_*` env vars.

## Integration matrix

### AI / LLM

| Name | File | Purpose | Env vars | Used in | Quirks |
|---|---|---|---|---|---|
| **Groq** | `F:\web-clients\joseph-sardella\jpsrealtor\src\lib\groq.ts` | Fast/cheap inference for chat narration, contact scoring, article generation | `GROQ_API_KEY` | `/api/chat-v3/*`, article generation, contact analysis | Two-tier model config: `llama-3.1-8b-instant` (free) / `openai/gpt-oss-120b` (premium, function calling). Streaming + tools both supported. |
| **OpenAI / GPT** | (via Groq's `openai/gpt-oss-120b` route) | Premium tier reasoning + function calling | same as Groq | Tool-calling routes | We do NOT use OpenAI's API directly — premium goes through Groq. |
| **ElevenLabs (11Labs)** | `F:\web-clients\joseph-sardella\jpsrealtor\src\lib\services\audio-generation.service.ts` | Voicemail audio synthesis (Drop Cowboy ringless campaigns) | `ELEVENLABS_API_KEY` | `/api/voicemail/generate-audio`, `/api/campaigns/[id]/scripts/[scriptId]/*` | Output MP3 is uploaded to Cloudinary, then Drop Cowboy fetches the URL. |
| **Runway ML** | `F:\web-clients\joseph-sardella\jpsrealtor\src\app\api\ai\runway\route.ts` | AI video gen (curb-appeal feature) | `RUNWAY_API_KEY` | `/api/ai/runway/*`, `/curb-appeal` | Async task model — poll `/api/ai/runway/[id]` for completion. State persisted on `RunwayTask`. |
| **Anthropic (platform)** | `F:\web-clients\joseph-sardella\jpsrealtor\src\app\api\claude\draft-article\route.ts` | Admin article drafter (streaming) | `ANTHROPIC_API_KEY` | `/api/claude/draft-article` (admin only) | SSE streaming via `@anthropic-ai/sdk`. Uses global platform key, not per-agent. |
| **Anthropic (BYOK)** | `F:\web-clients\joseph-sardella\jpsrealtor\src\app\api\claude\draft-landing-page\route.ts` | Conversational landing-page builder for agents using **their own** Anthropic key | per-agent `User.agentProfile.aiIntegrations.anthropic.apiKeyEncrypted` | `/api/claude/draft-landing-page`, surfaced in `/agent/cms/new` when category=landing-page and the agent has chosen "Claude · chat" | Key is AES-256-GCM encrypted at rest via `F:\web-clients\joseph-sardella\jpsrealtor\src\lib\secrets.ts`. Requires `SECRETS_ENCRYPTION_KEY` env. Tool-call architecture — Claude fires `set_article_field`, `set_landing_page_option`, `add_form_field`, `finalize` as the chat progresses, and the client live-updates the form. |

### Media / Storage

| Name | File | Purpose | Env vars | Used in | Quirks |
|---|---|---|---|---|---|
| **Cloudinary** | `F:\web-clients\joseph-sardella\jpsrealtor\src\lib\cloudinary.ts` | All user-uploaded images: headshots, hero photos, article featured / OG, voicemail audio | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Article editor, agent settings, lead avatars, audio-generation | Convention: every delivery URL gets `f_auto,q_auto` transform. Folder prefix `jpsrealtor/`. Headshots in emails get `c_thumb,g_face,w_200,h_200,r_max,f_auto,q_auto` injected into the `/upload/` path. |

### Communication

| Name | File | Purpose | Env vars | Used in | Quirks |
|---|---|---|---|---|---|
| **Twilio** | `F:\web-clients\joseph-sardella\jpsrealtor\src\lib\twilio.ts` | SMS, MMS, 2FA codes, conversation history | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` | `/api/auth/2fa/*`, contact SMS threads, `/api/twilio/webhook` | E.164 required. Phone validation via Lookup API ($0.005/lookup) — gated. Lookup v1 (`client.lookups.v1`). |
| **Resend** | `F:\web-clients\joseph-sardella\jpsrealtor\src\lib\email-resend.ts` | Transactional email (verification, 2FA, password reset, lead welcome, agent approval, subscription emails) | `RESEND_API_KEY`, `EMAIL_FROM_DOMAIN`, `ADMIN_EMAIL` | Auth flows, lead intake, partner application | Lazy `getResendClient()` singleton. From-line is agent-branded when an agent is resolved: `"{agent.name} via ChatRealty <noreply@…>"`. Templates inline HTML with agent brand colors. |

### Payments

| Name | File | Purpose | Env vars | Used in | Quirks |
|---|---|---|---|---|---|
| **Stripe** | `F:\web-clients\joseph-sardella\jpsrealtor\src\lib\stripe-subscription.ts`, `src\lib\stripe-identity.ts` | Subscription billing (Beginner / Experienced / Top Agent), customer portal, ID verification | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | `/api/billing/*`, `/api/stripe/webhook`, agent onboarding | Lazy singleton via `getStripe()`. API version pinned `2025-12-15.clover`. Full details in `../commerce/` doc. |

### Marketing / Tracking

| Name | File | Purpose | Env vars | Used in | Quirks |
|---|---|---|---|---|---|
| **Meta CAPI** | `F:\web-clients\joseph-sardella\jpsrealtor\src\lib\meta-capi.ts` | Server-side conversion events (Lead, Subscribe, CompleteRegistration) | `NEXT_PUBLIC_META_PIXEL_ID`, `META_CAPI_ACCESS_TOKEN` | All lead-form server routes, register, subscribe | User PII is SHA-256 hashed before send. Graph API `v20.0`. Permanent CAPI token — no expiry. |
| **Meta Pixel** | `F:\web-clients\joseph-sardella\jpsrealtor\src\lib\meta-pixel.ts`, `src\components\MetaPixel.tsx` | Client-side pixel for retargeting (PageView, ViewContent, AddToWishlist, Lead, Search) | `NEXT_PUBLIC_META_PIXEL_ID` | Root layout (mounted globally) | **Suppressed on URLs with `?lat=` or `?lng=` query params** (Meta flags coords as PII — May 2026 enforcement). All `track*` helpers gate on `hasBlockedUrlParams()`. |
| **Google Ads / gtag** | `F:\web-clients\joseph-sardella\jpsrealtor\src\lib\google-ads.ts` | Conversion tracking via `gtag('event', ...)` (generate_lead, sign_up, view_listing, click_to_call) | `NEXT_PUBLIC_GA4_ID` (`GT-MKB7FKDR`) | Lead forms, signup, listing pages, click-to-call buttons | gtag tag is loaded once in root layout; this file only fires events. |
| **Google Ads API** | `F:\web-clients\joseph-sardella\jpsrealtor\src\lib\google-ads-api.ts` | Campaign management, ad creation (separate from `google-ads.ts` tracking) | `GOOGLE_ADS_DEVELOPER_TOKEN`, `GOOGLE_ADS_CUSTOMER_ID`, OAuth creds | Admin campaigns dashboard | See `F:\web-clients\joseph-sardella\jpsrealtor\docs\google-ads\GOOGLE_ADS_API_DESIGN_DOC.md`. |
| **Meta Ads API** | `F:\web-clients\joseph-sardella\jpsrealtor\src\lib\meta-ads-api.ts` | Facebook/Instagram ad campaigns | `META_ADS_ACCESS_TOKEN`, `META_AD_ACCOUNT_ID` (act_160011552) | Admin ad campaigns | Long-lived system user token (no 60-day rotation). |
| **Google Calendar** | `F:\web-clients\joseph-sardella\jpsrealtor\src\lib\gcal-api.ts` | Per-agent booking calendar (free/busy + event create) | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (per-agent refresh token in `User.calendarSettings`) | `/api/calendar/*`, booking widgets | Per-agent OAuth — each agent connects their own Google account. Token cache keyed by `gcal_${refreshToken.slice(-8)}`. |

### Domain / Infrastructure

| Name | File | Purpose | Env vars | Used in | Quirks |
|---|---|---|---|---|---|
| **Cloudflare (Zones/DNS)** | `F:\web-clients\joseph-sardella\jpsrealtor\src\lib\cloudflare.ts` | DNS management for agent custom domains (add zone, create A/CNAME/TXT, delete) | `CLOUDFLARE_API_TOKEN` (or `CF_API_TOKEN`) | Domain provisioning pipeline | API v4. `addZone()` uses `type: "full"` (full DNS management). |
| **Cloudflare Turnstile** | `F:\web-clients\joseph-sardella\jpsrealtor\src\lib\turnstile.ts` | CAPTCHA on auth forms, lead intake, forgot-password | `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | Sign in/up, forgot password, `/buy`, `/sell`, `/contact` | In dev (no secret set) `verifyTurnstile()` returns `success: true`. Production must have `TURNSTILE_SECRET_KEY`. Trusted-internal bypass: `x-internal-secret` header matching `INTERNAL_API_SECRET`. |
| **Vercel Domains** | `F:\web-clients\joseph-sardella\jpsrealtor\src\lib\vercel-domains.ts` | Domain availability / pricing / purchase / project attach | `VERCEL_API_TOKEN`, `VERCEL_PROJECT_ID` | Domain provisioning pipeline, agent custom-domain checkout | Uses `/v4/domains/status`, `/v4/domains/price`, `/v5/domains/buy`, `/v10/projects/{id}/domains`. |
| **Google Business Profile** | `F:\web-clients\joseph-sardella\jpsrealtor\src\lib\gbp-api.ts` | localPosts v4 (auto-posting), media (photos), location info | `GBP_CLIENT_ID`, `GBP_CLIENT_SECRET`, `GBP_REFRESH_TOKEN` (platform owner) + per-user refresh tokens | Auto-posting cron, agent GBP UI | **Per-user OAuth**: client ID/secret are app-level; refresh token can be passed per-agent (falls back to env). Token cache keyed by last 16 chars of refresh token. Two endpoints: `mybusiness.googleapis.com/v4` (posts) + `mybusinessbusinessinformation.googleapis.com/v1` (media, location info). |
| **Google Search Console** | `F:\web-clients\joseph-sardella\jpsrealtor\src\lib\gsc-api.ts` | Add site property, submit sitemap, check verification | Reuses `GBP_CLIENT_ID` / `GBP_CLIENT_SECRET` / `GBP_REFRESH_TOKEN` (shared OAuth) | Domain provisioning post-DNS-setup | DNS-based verification cannot be automated — owner must add TXT record manually. API can only check status. |

### Real estate marketing

| Name | File | Purpose | Env vars | Used in | Quirks |
|---|---|---|---|---|---|
| **Thanks.io** | `F:\web-clients\joseph-sardella\jpsrealtor\src\lib\thanksio.ts` | Direct mail (postcards, notecards, letters), radius search, mailing lists, webhooks | `THANKSIO_API_KEY`, `THANKSIO_TEST_MODE` | `/api/campaigns/*` postcard sends | Rate limit 60 req/min. Pricing table in module (e.g. `postcard_4x6 = $0.65`). Radius search $0.05/record. |
| **Drop Cowboy** | `F:\web-clients\joseph-sardella\jpsrealtor\src\app\api\dropcowboy\campaign\route.ts` (inline; no shared lib) | Ringless voicemail delivery | `DROPCOWBOY_API_KEY`, `DROPCOWBOY_TEAM_ID`, `DROPCOWBOY_BRAND_ID` | Campaign send routes | Brand ID is per-campaign (see `docs/integrations/dropcowboy/BRAND_ID_GUIDE.md`). Audio URL must be publicly fetchable (we use Cloudinary). |
| **Follow Up Boss** | `F:\web-clients\joseph-sardella\jpsrealtor\src\lib\services\fub-client.ts`, `fub-mapper.ts` | Lead sync (Zillow / other sources) into our `Contact` model | `FUB_API_KEY` | `src/scripts/fub/sync-fub-leads.py`, Contact import flows | Python cron does bulk pull; TS client + mapper handle ad-hoc lookups. |

### Geographic / Place data

| Name | File | Purpose | Env vars | Used in | Quirks |
|---|---|---|---|---|---|
| **Google Maps Geocoding** | `F:\web-clients\joseph-sardella\jpsrealtor\src\lib\geocoding.ts` | Address → lat/lng | `GOOGLE_MAPS_API_KEY` (or `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`) | Search/geocode endpoints, listing intake, CMA | `batchGeocodeAddresses()` rate-limits with 200ms delay. |
| **OpenCage** | inline at `F:\web-clients\joseph-sardella\jpsrealtor\src\app\api\geocode\route.ts` and `F:\web-clients\joseph-sardella\jpsrealtor\src\app\api\search\route.ts` | Fallback / alternative geocoding | `OPENCAGE_API_KEY` | Search resolver, geocode API | No shared lib wrapper — called directly from the two route handlers. |
| **Yelp Fusion** | inline at `F:\web-clients\joseph-sardella\jpsrealtor\src\app\api\yelp-search\route.ts` | Nearby businesses for neighborhood POIs | `YELP_API_KEY` | Map/insights POI panel | No shared wrapper. |

### Market data

| Name | File | Purpose | Env vars | Used in | Quirks |
|---|---|---|---|---|---|
| **API Ninjas** | inline at `F:\web-clients\joseph-sardella\jpsrealtor\src\app\api\mortgage-rates\route.ts` | Live mortgage rate quotes | `API_NINJAS_KEY` | Insights / mortgage calculator | |
| **FRED (St. Louis Fed)** | inline at `F:\web-clients\joseph-sardella\jpsrealtor\src\app\api\market-stats\route.ts`, `src\app\api\stats\market\route.ts` | Macro / economic data series (mortgage rates, CPI, etc.) | `FRED_API_KEY` | Market stats widgets, insights page | No shared wrapper. |

### ChatRealty-issued (outbound integrations from agents)

| Name | File | Purpose | Credential | Notes |
|---|---|---|---|---|
| **ChatRealty API tokens (skill)** | `F:\web-clients\joseph-sardella\jpsrealtor\src\lib\skill-auth.ts`, `F:\web-clients\joseph-sardella\jpsrealtor\src\app\api\skill\*` | Bearer-token auth for the Claude Code / Claude Desktop skill (`@chatrealty/install-skill`) so agents can create landing-page drafts from any Claude window | `User.agentProfile.aiIntegrations.apiTokens[]` — stored as sha256 hash, plaintext shown to the agent ONCE on creation. Tokens look like `crt_live_<32 bytes base64url>`. | Agent mints up to 10 tokens per account in Settings → Integrations. Each token has a name (e.g. "MacBook"), createdAt, lastUsedAt. Revoke sets `revokedAt` (we keep the row for audit). Skill API endpoints are `/api/skill/me`, `/api/skill/landing-pages` (POST/GET), all token-auth, no session. Draft-only — no publish endpoint v1. Installer package lives at `F:\web-clients\joseph-sardella\jpsrealtor\packages\install-skill\`. |

### MCP servers (Claude Code)

| Name | Config | Purpose | Credential | Notes |
|---|---|---|---|---|
| **mcp-gsc** | `F:\web-clients\joseph-sardella\jpsrealtor\.mcp.json` → `gsc` | Google Search Console queries from Claude Code (performance, indexing, sitemaps, quick wins) | `F:\web-clients\joseph-sardella\jpsrealtor\src\.credentials\gsc-credentials.json` (gitignored) | Runs as `npx -y mcp-gsc@latest`. Credentials path moved through several locations: was in `.claude/`, then project root, now under `src/.credentials/` to keep all secrets in one place. |

## Patterns

**Lazy singleton client.** Most wrappers construct the SDK client (or set up auth headers) on first invocation, not at module load. Resend, Stripe, and Cloudinary all use this pattern so that `.env.local` only needs to be loaded when the feature is actually exercised — important for builds and unit tests that don't have all keys set.

**Env-var validation at first use.** A missing required key throws a descriptive error inside the first function call, not at import time. See `getResendClient()`, `getStripe()`, `getToken()` in `cloudflare.ts` and `vercel-domains.ts`.

**Per-user OAuth token cache.** GBP, GSC, and Google Calendar refresh their own access tokens from a per-user refresh token. Each module keeps a `Map<cacheKey, { token, expiresAt }>` with a 60-second buffer before expiry. Cache key is derived from the refresh token's last 8-16 chars (not cryptographic — just disambiguation).

**Hashed PII for server-side tracking.** Meta CAPI SHA-256-hashes email, phone, name, city, state, ZIP before sending. IP and user agent go un-hashed (Meta requires raw values for IP/UA).

**Client- vs. server-side env vars.** Anything used in a browser bundle (Turnstile site key, Meta Pixel ID, Google Maps key for client SDK) is prefixed `NEXT_PUBLIC_*`. Secrets (Turnstile secret, CAPI access token, Stripe secret) are server-only and have no `NEXT_PUBLIC_` prefix.

## Gotchas

- **Meta Pixel is suppressed on URLs containing `?lat=` or `?lng=`.** `fbq` always attaches `event_source_url = window.location.href`, and Meta now treats coords as PII (May 2026 enforcement). `MetaPixel.tsx` short-circuits `pageView()`, and every helper in `meta-pixel.ts` gates on `hasBlockedUrlParams()`. Lat/lng stay in the URL because Google Ads / YouTube attribution still uses them.
- **GBP and GSC use per-user OAuth, not platform-wide creds.** Client ID/secret are app-level; the refresh token must be per-user for agent GBP posting. Env vars (`GBP_REFRESH_TOKEN`) only cover the platform owner's account.
- **Cloudinary URLs always use the `f_auto,q_auto` transform** for automatic format/quality optimization. Email headshots add face-detection cropping by injecting `c_thumb,g_face,w_200,h_200,r_max,f_auto,q_auto` into the `/upload/` path.
- **mcp-gsc credentials live at `src/.credentials/gsc-credentials.json`.** Was originally in `.claude/`, then project root, now centralized. Path is referenced from `.mcp.json` env block.
- **Turnstile site key is public (`NEXT_PUBLIC_TURNSTILE_SITE_KEY`), secret key is server-only (`TURNSTILE_SECRET_KEY`).** Forgetting `TURNSTILE_SECRET_KEY` in dev silently succeeds — production deployments must verify it's set.
- **Cloudinary creds are hardcoded as fallbacks** in `cloudinary.ts` (cloud_name, key, secret). The `.env.local` values override, but if env vars are missing the lib still works against the production account. Treat as a smell, not a feature.
- **Stripe API version is pinned** to `2025-12-15.clover`. Bumping requires re-testing all webhook handlers.
- **Drop Cowboy has no shared lib wrapper** — the fetch + auth is inline in `src/app/api/dropcowboy/campaign/route.ts`. If we extract a helper, model it on `thanksio.ts`.
- **OpenCage, Yelp, API Ninjas, FRED — no shared wrappers either.** All inline in their respective route handlers. Fine for now; revisit if usage spreads.

## Reference implementations

Three wrappers are good models when adding a new integration:

- **`F:\web-clients\joseph-sardella\jpsrealtor\src\lib\thanksio.ts`** — bearer-token REST API, narrow typed wrapper around every endpoint, clear `isThanksioConfigured()` check, pricing constants colocated with the API client. Use as the template for any new bearer-token REST integration.
- **`F:\web-clients\joseph-sardella\jpsrealtor\src\lib\gbp-api.ts`** — OAuth2 refresh-token flow with a token cache, per-user credentials with env fallback, generic `gbpFetch()` for auth header injection. Use as the template for any Google API or OAuth2 integration.
- **`F:\web-clients\joseph-sardella\jpsrealtor\src\lib\cloudflare.ts`** — typed v4 API wrapper with a generic `cfFetch<T>()` that unwraps Cloudflare's `{ success, result, errors }` envelope. Use as the template for APIs with a consistent response envelope.

## Related

- `../auth/README.md` — Turnstile + rate-limit on auth flows
- `../crm/README.md` — Twilio SMS threads, FUB sync, contact model
- `../commerce/README.md` — Full Stripe billing details (subscriptions, identity, credits)
- `../multi-tenant/README.md` — Domain provisioning pipeline (Vercel + Cloudflare + GSC)
- `F:\web-clients\joseph-sardella\jpsrealtor\docs\chatrealty\GBP_AUTO_POSTING.md` (legacy) — GBP auto-posting flow
- `F:\web-clients\joseph-sardella\jpsrealtor\docs\google-ads\GOOGLE_ADS_API_DESIGN_DOC.md` (legacy) — Google Ads campaign architecture

## Migration log

Audit of `/docs/` integration material — outcomes for the v2 migration:

| Title | Path | Classification | Action |
|---|---|---|---|
| Twilio | `F:\web-clients\joseph-sardella\jpsrealtor\docs\integrations\TWILIO.md` | PARTIAL — covers SMS basics, missing 2FA + Lookup details | Merge SMS quirks into this README; archive original after verification |
| Twilio webhook setup | `F:\web-clients\joseph-sardella\jpsrealtor\docs\TWILIO_WEBHOOK_SETUP.md` | CURRENT but standalone | Keep as-is for now; reference from `../crm/README.md` |
| Drop Cowboy overview | `F:\web-clients\joseph-sardella\jpsrealtor\docs\integrations\dropcowboy\OVERVIEW.md` | PARTIAL | Summary captured here; deep dive stays in `/docs/integrations/dropcowboy/` until extracted to `docs-v2/campaigns/` |
| Drop Cowboy brand IDs | `F:\web-clients\joseph-sardella\jpsrealtor\docs\integrations\dropcowboy\BRAND_ID_GUIDE.md` | CURRENT | Keep in place; referenced from this README |
| Drop Cowboy voicemail system | `F:\web-clients\joseph-sardella\jpsrealtor\docs\integrations\dropcowboy\VOICEMAIL_SYSTEM.md` | CURRENT | Keep in place; relevant to campaigns area, not integrations |
| Thanks.io integration | `F:\web-clients\joseph-sardella\jpsrealtor\docs\thanks\THANKSIO_INTEGRATION.md` (Apr 17 2026) | CURRENT | Linked from row in matrix; archive after `docs-v2/campaigns/` ingests pricing + flow detail |
| Google Ads API design | `F:\web-clients\joseph-sardella\jpsrealtor\docs\google-ads\GOOGLE_ADS_API_DESIGN_DOC.md` (Apr 21 2026) | CURRENT — design doc, still authoritative for campaign internals | Keep; linked from this README and `../campaigns/` |
| GBP auto-posting | `F:\web-clients\joseph-sardella\jpsrealtor\docs\chatrealty\GBP_AUTO_POSTING.md` | PARTIAL | High-level summary lives here; cron / scheduling detail belongs in `docs-v2/cron/` |
| GBP per-user | `F:\web-clients\joseph-sardella\jpsrealtor\docs\chatrealty\GBP_PER_USER.md` | CURRENT | OAuth pattern captured here; archive after `docs-v2/multi-tenant/` cross-links it |
