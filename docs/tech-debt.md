---
title: Tech Debt / Known Issues
status: current
last_verified: 2026-06-05
---

# Tech Debt / Known Issues

Live list of known platform tech debt. Sorted by severity, then chronological.
This is the canonical place to look before assuming something is "broken vs. by design."

Severity legend:
- 🔴 **critical** — active bug, security risk, or data integrity
- 🟠 **high** — real ongoing pain, frequent footgun
- 🟡 **medium** — annoying, papers-over-able
- 🟢 **low** — cleanup, cosmetic, eventual

---

## 1. Active issues

| Severity | Issue | Location | Impact | Recommended fix |
|---|---|---|---|---|
| 🟠 high | `vercel.json` catch-all caches every path as `public, max-age=31536000, immutable` — including `/api/*` | `F:\web-clients\joseph-sardella\jpsrealtor\vercel.json` (the `/(.*)` rule) | Any dynamic API route that forgets to set its own `Cache-Control: no-store` will freeze per-user / per-domain data in browser/CDN caches for a year. Recurring class of bug. (`/api/insights/*` patched 2026-06-05 — see Resolved.) | Scope the catch-all to `/_next/static/*` and `/(.*\.(js\|css\|woff2\|png\|jpg\|svg\|webp\|ico))$`. Add a sane default for HTML (`s-maxage=60, stale-while-revalidate=300`). |
| 🟠 high | Most public-facing API routes still scope content by `session.user.id` instead of the domain owner | `F:\web-clients\joseph-sardella\jpsrealtor\src\app\api\` (audit pending) | Class of bug. Visitor sees the wrong agent's content on apex domains, or empty pages, or leaked content from another tenant. Bethany-article-on-jpsrealtor (May 18) was one instance. | Grep every API route under `src/app/api/`, classify each as agent-private (correctly uses `session.user.id`) vs public-facing (must use `resolveDomainOwner`), then migrate the public-facing ones. Reference impl: `/api/articles/list/route.ts`. |
| 🟠 high | `AGENT_DOMAIN_MAP` in `src/proxy.ts` is hardcoded empty | `F:\web-clients\joseph-sardella\jpsrealtor\src\proxy.ts:18-20` | Custom agent domains currently get content resolution via `DomainRegistry` lookup inside `resolveDomainOwner`, but the proxy's static map never reads from it. If a custom domain ever needs URL rewriting at the proxy layer (e.g. `/` → `/agent/{id}`), it'll silently miss. | Either dynamic-load from `DomainRegistry` at edge (with KV cache) or document explicitly why the static map is intentionally unused. |
| 🟠 high | `src/proxy.ts` hardcodes `http://localhost:3000/` as the non-admin redirect on `agent.chatrealty.io` | `F:\web-clients\joseph-sardella\jpsrealtor\src\proxy.ts:106` | In production, real users who hit `agent.chatrealty.io` without admin get sent to localhost. Silent failure for anyone external. | Use `new URL("/", request.url)` (request origin) or env-aware `process.env.NEXTAUTH_URL`. |
| 🟡 medium | `Campaign` model declares the `dropCowboyConfig.campaignId` index twice | `F:\web-clients\joseph-sardella\jpsrealtor\src\models\Campaign.ts:284` and `:513` | Mongoose logs a noisy "Duplicate schema index" warning on every cold start. Confuses log scanning; suggests the index might double up. | Remove either the field-level `index: true` (the `:284` declaration is implicit via schema, not present here — check) OR the explicit `schema.index({ 'dropCowboyConfig.campaignId': 1 })` at the bottom. Keep one. |
| 🟡 medium | NextAuth JWT can't be revoked | `F:\web-clients\joseph-sardella\jpsrealtor\src\lib\auth.ts` (`session.strategy: "jwt"`) | A stolen token (XSS leak, dev clipboard, etc.) remains valid until its 30-day expiry, even after the user clicks sign-out everywhere. Cookies clear; the JWT lives. | Eventual: move to database sessions (`strategy: "database"`). Requires a `Session` collection and revisiting cross-domain transfer/receive. Not urgent unless we see incident traffic. |
| 🟡 medium | Article `author.id` orphan pattern can recur | `F:\web-clients\joseph-sardella\jpsrealtor\src\models\Article.ts`; publish path under `src/lib/publishing-pipeline.ts` | May 19 backfill (`b97bfdcf`) fixed 39 articles whose `author.id` pointed at a stale Joseph `_id`. Could recur if Joseph's `User._id` ever changes again (account delete + recreate, manual data rewrite, migration). | Publish endpoint should always stamp `author.id` from current `session.user.id`, not from a snapshotted field. Add a once-a-day cron that flags any article whose `author.id` doesn't resolve to a `User`. |
| 🟡 medium | Several legacy `/docs/*` docs reference `src/middleware.ts` which doesn't exist | various under `F:\web-clients\joseph-sardella\jpsrealtor\docs\` | The file was renamed to `src/proxy.ts` in Next.js 16. New contributors following the old docs grep for nothing. | Documentation refactor in progress under `docs-v2/`. Old `/docs/` to be archived as drift cleanup proceeds. |
| 🟡 medium | `NEXTAUTH_SECRET` is a single point of failure for the whole multi-apex network | `.env` / Vercel project env | Anyone who obtains it can mint a `/api/auth/transfer` JWT for any email in `ALLOWED_DOMAINS` and become any user on any platform apex. Effectively root for the platform. | Rotate aggressively if leaked. Eventual: per-apex transfer secrets, or move to short-lived asymmetric signing keys (KMS). |
| 🟡 medium | In-memory rate limiter doesn't survive across serverless instances | `F:\web-clients\joseph-sardella\jpsrealtor\src\lib\rate-limit.ts` | Vercel serverless functions cold-start fresh; an attacker who spreads requests across instances sidesteps the per-IP / per-email window. Mitigation today: traffic is low and most attacks fail Turnstile first. | Eventual: KV-backed (Upstash Redis works on Vercel edge runtime). Move the sliding-window logic behind a `RateLimitStore` interface so swap is trivial. |
| 🟢 low | Three "master" docs in `/docs/architecture/` predate Next.js 16, chat-v3, multi-tenant, ChatRealty | `F:\web-clients\joseph-sardella\jpsrealtor\docs\architecture\MASTER_SYSTEM_ARCHITECTURE.md`, `DATABASE_MODELS.md`, `FRONTEND_ARCHITECTURE.md` | All dated Jan 2025. Misleading for anyone (or any Claude) onboarding. | Rewrite as area docs under `docs-v2/` (cms/, listings/, chat/, etc.). Move originals to `docs-v2/archive/` when superseded. |
| 🟢 low | Mongoose strict mode silently drops unschema'd fields on save | all `src/models/*.ts` | When you add a field to an API payload or UI form without adding it to the Mongoose schema, the field just disappears at write time with no error. Frequent gotcha when iterating on a new feature. | Mitigation: `docs/MONGOOSE_SCHEMA_GUIDE.md` exists; add a checklist item to PR template — "If touching a model, sync schema → interface → API → UI." |
| 🟠 high | Existing OAuth / API credentials are stored **plaintext** in Mongo | `User.calendarSettings.refreshToken`, `User.adAccounts.google.{developerToken,refreshToken}`, `User.adAccounts.meta.{accessToken,pageAccessToken}` in `F:\web-clients\joseph-sardella\jpsrealtor\src\models\User.ts` | A database compromise or careless `find().lean()` log dump exposes every connected agent's third-party tokens. The new Anthropic BYOK feature (June 2026) ships its own encryption helper (`F:\web-clients\joseph-sardella\jpsrealtor\src\lib\secrets.ts`) — these older credentials should be migrated to use it. | Add `encryptSecret` / `decryptSecret` wrappers around the relevant read/write call sites (gcal-api.ts, google-ads-api.ts, meta-ads-api.ts). Backfill existing rows with a one-shot script that encrypts in place. Requires `SECRETS_ENCRYPTION_KEY` in all environments. |

---

## 2. Resolved issues (chronological)

Recent fixes from the May 2026 work. Format: `date — sha — one-liner`.

| Date | Commit | Fix |
|---|---|---|
| 2026-05-15 | `ced6d7ab` | Cloudflare Turnstile + per-IP/per-email rate limit added on auth and lead forms; killed the bot-signup spam wave. |
| 2026-05-15 | `61230328` | Meta Pixel suppression when URL contains lat/lng — avoids leaking buyer location to Meta on map deep-links. |
| 2026-05-17 | `0abb57e1` | Chained multi-domain signout — clicking sign-out on any platform apex now clears cookies on all of them, not just the current one. |
| 2026-05-17 | `186e9d89` | Signout-chain endpoint emits **two** real Set-Cookie headers via `headers.append()` — was previously calling `cookies.set()` twice with the same name, which overwrites; only one cookie variant was being cleared. |
| 2026-05-18 | `f04682bb` | `www.chatrealty.io` now rewrites to `/chat-landing` — old check was `!bareHost.includes(".chatrealty")` which is false for www, so www traffic was misrouted as a subdomain. |
| 2026-05-18 | `b891a509` | Agent branding endpoint resolves apex domains via `resolveDomainOwner` (was scoping by session — failed for unauthenticated visitors on `jpsrealtor.com`). |
| 2026-05-18 | `9f11c0e7` | `/api/articles/list` scopes by domain owner, not visitor session. Fixed the Bethany-Klier-article-showing-up-on-jpsrealtor bug. |
| 2026-05-19 | `b97bfdcf` | Backfilled `author.id` on 39 articles whose Joseph reference pointed at a stale `User._id`. |
| 2026-05-19 | `2633edac` | Inlined local image paths in MDX + migrated Mongo article images to Cloudinary; deleted one dead post. |
| 2026-05-19 | `b3321103` | Moved GSC service-account credentials out of project root into `src/.credentials/` so they stop appearing in dir listings. |
| 2026-05-19 | `ef2000be`, `375bd0a0` | Root directory cleanup — removed ~1.27 GB of stale root-level artifacts and rotated SSH keys. |
| 2026-05-21 | `106d0b9c` | docs-v2/ foundation + first 3 priority area docs (routing, auth, multi-tenant). |
| 2026-06-05 | _(pending)_ | `/api/insights/community-spotlight` + `/api/insights/favorite-spotlight` now stamp `Cache-Control: no-store` on every response (handler wrapper) and get a dedicated `/api/insights/(.*)` no-store rule in `vercel.json`. These render the homepage's per-user "Favorites Spotlight" + "Real Estate in {city}" sections from `swipeAnalytics`/`likedListings`; previously they inherited the immutable catch-all and could leak one user's favorites/preferred areas into a shared CDN node. |

---

## 3. Aspirational / not-yet-implemented

Things in `/docs/` planning files that haven't actually shipped. Source-of-truth: read the planning doc, then verify against `src/`.

| Feature | Source doc | Shipped? | Notes |
|---|---|---|---|
| Multi-tenant 24-week build (Weeks 1-24) | `F:\web-clients\joseph-sardella\jpsrealtor\docs\multi-tenant\index.md` | partial | Weeks 1-6 (data layer, asset upload, agent dashboard) substantially shipped (`User.agentProfile`, asset uploads via Cloudinary, agent settings wizard). Weeks 7-12 (landing-page transformation, custom backgrounds, subscription gates) partially shipped — landing page exists but custom themes and gate enforcement are partial. Weeks 13+ (representation agreements, agent matching, team features, territory/fee tracking) **not shipped.** |
| Tiered user subscriptions (Anonymous → Free → Pro $10 → Ultimate $20 → Investor $99) | `docs\multi-tenant\index.md` § "User Subscription Tiers" | no | Current Stripe product set is **agent** subscriptions (Beginner $125 / Experienced $500 / Top Agent $1000), not consumer tiers. The consumer ladder hasn't been built. |
| Agent-sponsored client subscriptions (deferred billing) | `docs\multi-tenant\index.md` § "Agent-Sponsored Subscriptions" | no | Concept only. No `SponsoredSubscription` model, no deferred-billing job, no agent UI to sponsor a client. |
| Representation Agreement model (30-day rolling, unlocks showing/offer/messaging) | `docs\multi-tenant\index.md` § "Representation Agreements" | no | No `RepresentationAgreement` model. Agent-client linkage today is implicit via `Contact.assignedAgentId`. |
| Data-broker fee distribution (5% to MLS contributor, automatic) | `docs\multi-tenant\index.md` § "Data Broker Fee" | no | Tracked conceptually in `agentProfile.mlsDataSources` but no payout pipeline. |
| Referral fee automation (15-25% out-of-area / swipe match) | `docs\multi-tenant\index.md` § "Referral Fees" | partial | Manual FUB-driven workflow exists. Automatic detection + Stripe Connect split is not built. |
| 8-agent React Native mobile app | `F:\web-clients\joseph-sardella\jpsrealtor\docs\mobile\agent-guides\AGENT_1_SCAFFOLD.md` through `AGENT_8_CAMPAIGNS_ANALYTICS.md` | no | Eight agent guides exist (scaffold, shared package, conversion script, listings/search, map, chat/messaging, CRM, campaigns). No `mobile/` directory in the repo yet. |
| Campaign panel refactor (split 1,324-line `CampaignDetailPanel.tsx` into pipeline wizard + per-tab components < 300 lines) | `F:\web-clients\joseph-sardella\jpsrealtor\docs\refactoring\CAMPAIGN_PANEL_REFACTORING.md` | unclear | Plan describes target architecture; verify against current `src/components/campaigns/CampaignDetailPanel.tsx` line count before treating as outstanding. |
| Package cleanup (remove 20 unused npm packages, ~200-300 MB) | `F:\web-clients\joseph-sardella\jpsrealtor\docs\optimization\PACKAGE_CLEANUP_ANALYSIS.md` | unclear | Dated Feb 6 2026. Three.js ecosystem (`@react-three/drei`, `@react-three/fiber`, `three`, `maath`) listed as removable; verify against current `package.json`. |
| ChatRealty hub-and-spoke domain network (cross-linking SEO, multi-site agent presences) | `docs\multi-tenant\domain-mapping.md` + MEMORY.md | partial | Domain Registry exists; cross-linking and agent custom domains work on the resolver side. The network effects (shared lead pool, cross-site SEO juice) aren't fully realized yet. |
| Database sessions (replace JWT strategy) | (mentioned in tech-debt above) | no | Aspirational. No `Session` collection yet. |

---

## See also

- `F:\web-clients\joseph-sardella\jpsrealtor\docs-v2\ARCHITECTURE.md` — cross-cutting invariants list (linked from "Known tech debt" section)
- `F:\web-clients\joseph-sardella\jpsrealtor\docs-v2\auth\README.md` § Gotchas — auth-specific debt
- `F:\web-clients\joseph-sardella\jpsrealtor\docs-v2\routing\README.md` § Gotchas — proxy-specific debt
- `F:\web-clients\joseph-sardella\jpsrealtor\docs-v2\multi-tenant\README.md` § Gotchas — scoping-specific debt
