---
title: CMS / Articles
status: current
last_verified: 2026-11-22
related: [./multi-tenant-articles.md, ../multi-tenant/README.md, ../auth/README.md, ../integrations/README.md, ../routing/README.md, ../mcp/tools.md, ../seo/README.md]
supersedes: docs/archive/cms/CMS_AND_INSIGHTS_COMPLETE.md
---

# CMS / Articles

## TL;DR

The CMS publishes articles (`articles` / `market-insights` / `real-estate-tips`),
landing pages (`landing-page`) and listing blog posts (`listing-post`, an
active listing or its open house with a registration form) — all one `Article`
Mongo model. **The
database is the only copy.** Publishing is validate → one upsert by slug; every
page reads the database on request, so a publish is live the moment it returns.
No MDX file, git commit, GitHub token or rebuild is involved (removed
2026-10-29). Public surfaces are **domain-scoped** via `resolveDomainOwner` and
show `status: published` only.

**Multi-tenant target:** admins (jpsrealtor.com / chatrealty.io) stay on Mongo;
every non-admin agent's articles move to their own Neon tenant DB. None of that
is built yet — see [multi-tenant-articles.md](./multi-tenant-articles.md).

## Files

| File | Purpose |
|---|---|
| `src/models/article.ts` | Mongoose model (file name is lowercase). `author.id` is the scoping field; `slug` is unique; `visibility` is `public`/`private` (default `private`). Schema enum and the TS type `ArticleCategory` include `landing-page` and `listing-post`. `listingPost` subdoc holds the listing reference (see "Listing blog posts"). |
| `src/lib/publishing-pipeline.ts` | `validateForPublish()`, `publishArticle()` (validate → upsert → IndexNow), `unpublishArticle()` (delete), `isArticlePublished()`. Same behaviour on localhost and Vercel. |
| `src/lib/articles/public-articles.ts` | **The read path for public surfaces.** `listPublishedPosts({ ownerId, category })` (owner + published only; no owner → empty), `getArticlePost(slug)`, `articleToPost()`, `resolvePageOwnerId()` for server components. Neon routing for non-admins plugs in here. |
| `src/lib/services/article.service.ts` | CRUD over the model. `convertFormDataToMongoDoc()` is where SEO keywords become `tags`. |
| `src/app/api/articles/` | `list`, `publish`, `unpublish`, `set-draft`, `load-published` (session routes); `generate` (Groq), `regenerate-field`; public `search`, `ai-search`, `topics`; deprecated `route.ts` (use `list`). |
| `src/app/api/skill/articles/`, `src/app/api/skill/landing-pages/` | Token-authed (`articles:*` / `landing_pages:*` scopes) routes behind the MCP tools `create_article`, `update_article`, `get_article`, `list_my_articles` and the `*_landing_page` equivalents — see [mcp/tools.md](../mcp/tools.md). |
| `src/app/admin/cms/`, `src/app/agent/cms/` | Admin CMS (all articles) and per-agent CMS (own articles). |
| `src/app/insights/[category]/[slugId]/page.tsx`, `src/app/lp/[slug]/page.tsx` | Article and landing-page renderers. The article route hands `category === "listing-post"` to `listing-post/ListingPostPage.tsx`. |
| `src/lib/listings/listing-post.ts`, `src/app/api/agent/listing-posts/{search,generate}`, `src/app/api/leads/listing-post`, `src/app/agent/cms/components/ListingPostOptions.tsx` | Listing blog posts — see below. |
| `src/app/utils/fetchPosts.ts` | `getPostBySlug()` and `getPostsBySection(section, page, limit, ownerId)` — thin wrappers over `public-articles.ts`. |
| `src/app/api/claude/draft-landing-page/route.ts`, `src/app/agent/cms/components/ClaudeLandingPageChat.tsx` | BYOK Claude landing-page builder (SSE + tool calls). |
| `src/app/api/claude/draft-article/route.ts` | BYOK Claude article drafter. No caller in `src/` was found. |
| `scripts/fix-article-authors-mongo.ts`, `scripts/fix-article-images.ts` | One-off backfills (orphan `author.id`; local image paths in `content`). |
| `packages/install-skill/` | `@chatrealty/install-skill` — legacy installer for the desktop skill (`npx @chatrealty/install-skill <token>`); the MCP server is the current path. |

## Publishing pipeline

`publishArticle(article, slugId, { userId, userName, userEmail })`, identical on
localhost and Vercel:

| Step | What | Fails the publish? |
|---|---|---|
| 1. Validate | `validateForPublish` — title 10–200 chars, excerpt 50–300, content ≥ 500, featured image required, SEO title ≤ 60, MDX compiles (`validateMDX` runs `next-mdx-remote/serialize`, the same compile the page uses) | yes |
| 2. Save | `createArticle` — **upsert by slug**, so a retry never duplicates | yes |
| 3. IndexNow | `pingIndexNowForArticle` — only if `INDEXNOW_KEY` is set; resolves the **author's** domain | never |

`unpublishArticle` deletes the document; `POST /api/articles/set-draft` flips
`status`. Both are live immediately. The `publish` route also posts to the
author's Google Business Profile (non-blocking, skipped for drafts).

**Removed 2026-10-29:** the MDX file write, the GitHub commit (Contents API in
production, `git push` to `main` from localhost), the Vercel deploy hook, the
build-time `generate-mdx` step, and the CMS's 3-minute "deploying" timer. They
committed every agent's content to the public repo, and a dead `GITHUB_TOKEN`
500'd a publish that had already saved (see
[multi-tenant-articles.md](./multi-tenant-articles.md)). The `.mdx` files still
in `src/posts/` are leftovers; nothing reads them.

## Where each surface reads from

All from the database, via `src/lib/articles/public-articles.ts` unless noted.

| Surface | Scope |
|---|---|
| `/` (home feed) via `/api/articles/list` | Domain owner, published, no landing pages (the route queries through `article.service` `listArticles`) |
| `/insights/[category]/[slugId]`, `/lp/[slug]` | `getPostBySlug` (any status). Private articles 404 unless the domain belongs to the author (`canViewArticle`) |
| `/insights/[category]` (category index) | Domain owner (`resolvePageOwnerId`), published, that category |
| `/api/rss/[section]` | Domain owner, published; links use the request's canonical host |
| `/api/articles/topics`, `/api/articles/ai-search` | Domain owner, published |
| `/campaign/[slug]` | Published `landing-page` by slug |
| Sitemaps (`getArticleEntries` in `sitemap-sources.ts`, `getBlogPages` in `sitemap-generator.ts`) | Published; on agent domains filtered by author name |
| `/insights` | `permanentRedirect("/")` (308) |

## Article scoping (`/api/articles/list`)

| Mode | For | Scope |
|---|---|---|
| default | Public feed | **Domain owner** via `resolveDomainOwner(request)`, published only; null owner → empty list (never the whole network) |
| `?mine=true` | Agent CMS, campaign wizards | **Logged-in user** (`session.user.id`; 401 if none) |
| `?all=true` | Admin CMS | Everything — honoured only for a real admin, not an impersonating session |

Rule of thumb: **portal surface → `mine=true`; public surface → default.** The
route sets `Cache-Control: no-store` itself. `landing-page` is excluded unless
`excludeLandingPages=false`. Production returns at most 100 rows. See
[multi-tenant/README.md](../multi-tenant/README.md) for `resolveDomainOwner`.

History: 2026-05-19 — Joseph's `User._id` changed and 39 articles were orphaned;
`scripts/fix-article-authors-mongo.ts` re-links them (rerun if it recurs). Images
must be Cloudinary URLs (`{ url, publicId }`, append `f_auto,q_auto`); a local
`/public/...` path in `content` breaks in production.

## Landing-page AI builders

All write drafts to the same model with `category: "landing-page"`.

| Path | Surface | Notes |
|---|---|---|
| Groq | `/agent/cms/new` Generate panel; `POST /api/articles/generate` | `openai/gpt-oss-120b` (`GROQ_MODELS.PREMIUM`), platform `GROQ_API_KEY`. Default. |
| Claude BYOK, in-site | Same page, "Claude · chat" toggle — **only shown with `?advanced=1`**, landing-page category, and a connected key | `anthropicCfg.model` or `claude-sonnet-4-5-20250929`. Tools: `set_article_field`, `set_landing_page_option`, `add_form_field`, `remove_form_field`, `finalize`. |
| MCP / skill | Claude Code or Desktop via the ChatRealty MCP server | Bearer `crt_live_` token → `/api/skill/landing-pages` (draft-only) and `/api/skill/articles`. |

The skill routes are **draft-only for landing pages**. For **articles**,
`PATCH /api/skill/articles/[slugId]` with `{ "status": "published" }` on a draft
runs the same `publishArticle` pipeline plus the GBP post (added 2026-07-23, so
Claude can publish an agent-approved draft); content edits to an already
published article are refused (409).

The Anthropic key is AES-256-GCM encrypted by `src/lib/secrets.ts`
(`SECRETS_ENCRYPTION_KEY`) at `User.agentProfile.aiIntegrations.anthropic.apiKeyEncrypted`;
API tokens are sha256-hashed in `aiIntegrations.apiTokens[]` and shown once. See
[integrations/README.md](../integrations/README.md).

## Listing blog posts (`listing-post`)

An agent advertises one **active** listing, or its open house, as a blog post
that captures registrations. Added 2026-11-03.

**Generate (agent).** `/agent/cms/new` → Category "Listing Post". The address
field autocompletes over Active `unified_listings` via
`GET /api/agent/listing-posts/search` (session-only; anchored prefix on the
indexed `slugAddress` only — an unindexed `unparsedAddress` fallback scanned the
whole collection for ~30s on a miss and was removed). The agent can add an
optional open-house date and times to the listing ad. An MLS open house on the
listing pre-fills these fields. `POST /api/agent/listing-posts/generate` writes the
copy with Groq from the listing's facts only (no invented claims, no
editorializing about another brokerage's listing) and returns form fields plus
`listingPost`. Nothing is saved until the agent saves.

The public ad reads scheduled events from the MLS `openhouses` collection,
joined by `listingId` as in `/api/mls-listings`, with the listing's embedded
MLS events used when the collection has no rows for that listing. When stored
data has no upcoming dates, the ad and RSVP routes check Spark by listing key
with a five-minute cache. Both ISO dates and Spark's month/day/year dates are
normalized before filtering. The ad displays every event from
the current Pacific calendar date forward, and the registration gate lets
visitors choose an event. The saved CMS date remains a historical reference
for attendance feedback.
The public schedule uses horizontally scrollable event cards. Cards with
complete hours open a prefilled Google Calendar event in Pacific time and
include the property address.

**Preview / publish.** Both go through `/api/articles/publish` (upsert by
slug): Preview saves `draft: true` and opens `/insights/listing-post/{slug}` in
the modal — drafts render **only for their author** and are `noindex`. Add
`?previewGate=1` to a draft URL to see its visitor gate with submissions
disabled. Publish
is the same call without `draft`. Listing posts skip the GBP auto-post (the
image is the listing brokerage's MLS photo) and drafts skip IndexNow.
The signed-in author can append `?authorPreview=1` to a published listing
post to review its full layout. The preview is noindex and skips the listing
view conversion event. Other visitors follow the normal access checks.

The original Catalina open-house link under `/lp/` forwards to the Catalina
listing post once the replacement is published on the author's domain.
The author can also follow the link in a signed-in draft preview.
Campaign query parameters carry through the redirect.

**Slug.** `{slugAddress}[-open-house-{date}]-{last 6 of author id}` —
deterministic and per agent, because slugs are global and the publish upserts
by slug: a title-derived slug would let a second agent posting the same address
overwrite the first agent's post.

**What is stored vs read live.** The article stores only
`listingPost: { listingKey, slugAddress, address, postType, openHouse, videoUrl, gate }` plus
the copy. Price, facts, photos, subdivision (`subdivisions`), community
(`cities`), map and nearby listings are read at render time by
`loadListingPostData()`. Photos are the listing's synced MLS media, never
rehosted or edited (the featured image is the primary photo URL with
`publicId: "mls-listing/{listingKey}"` — not a Cloudinary asset). If the listing
leaves Active, the page says so.

**Page layout** (`listing-post/ListingPostView.tsx`): shared `CollageHero` carousel
(the walkthrough video from `listingPost.videoUrl` first, then photos) → title /
price / optional open-house banner → property facts → MLS description →
subdivision → community → map (`ListingPostMap`, react-maplibre) → MLS
attribution (`ListingAttribution`). The map centers the subject and shows nearby
active listings and sales closed in the past year. Pins match the subject's
MLS property type and subtype, apply the CMA tier's living-area range and
allow one bed and bath of variation when those facts are available. Known land
tenure and senior-community status also inform eligibility. Recent
sales come from the subject subdivision when matching mapped sales exist.
Nearby active listings and fallback closed sales use a one-mile radius.
The Location section lists
up to four properties of each status below the map. Selecting a row centers
its pin and opens the listing details popup. Unlocked ads show the MLS page’s
CMA report when the subject has precomputed `cmaStats`. The CMA action row
appears only in Chap, where its buttons can open chat tools and the listing panel.

### The registration gate

**The server, not the overlay, is what keeps gated data private.**
`ListingPostPage` resolves the gate, checks access, then projects the record
through `toTeaser()` or `toGated()` (`listing-post-teaser.ts`). An unregistered
visitor is only ever *sent* the teaser, so a 0-second gate and a 60-second gate
ship identical HTML and removing the overlay from the DOM reveals nothing. If a
field is not named in `TeaserListing`, they do not get it. Public by design, so
the gate does not cost the SEO that fills it: address, price, the core facts,
the open-house date, the first 5 photos, and the MLS attribution — which is
never gated, registered or not.

The headline uses the listing's street address when available. The server
sends a short MLS description in the teaser and the full public remarks,
event notes, and map pins to unlocked views, including the default author
preview. Saved post copy serves as a fallback when MLS remarks are unavailable.
Unlocked listing ads reuse the MLS detail page's Features & Amenities and
Property Details panels, and show its mortgage calculator for active
residential sale and residential income listings.

**Config** resolves most-specific-wins in `lead-gate.ts`:
`PLATFORM_DEFAULT_LEAD_GATE` → `agentProfile.leadGate` → `listingPost.gate`.
The post layer applies only when it says `inherit: false`; an absent `inherit`
reads as inherit, so posts written before the field existed do not start
overriding. When the CMS leaves "use my setting" ticked it stores **only**
`{ inherit: true }` — never a snapshot of the agent's settings, which would
freeze each post on the day it was written and make the setting look broken.

Resolution reads the **post author's** profile, never the domain owner's — same
rule as the CRM the registration lands in. `mode` is `off | immediate | delay |
scroll`; the platform default is a 20-second delay (not `immediate`: a wall
before the visitor has seen anything reads as a paywall). `allowReturning`
scopes the grant to the agent rather than the one post.

**Access** (`listing-post-access.ts`): an HMAC-signed, httpOnly `lp_access`
cookie (90 days) for signed-out visitors. Visitors with an authenticated session
can open the full listing immediately.
Unlike `oauth-state.ts` there is **no `'fallback-secret'` default** — a
predictable key would mint access to every agent's gated content, so a missing
`NEXTAUTH_SECRET` fails closed.

**UI:** `/agent/settings` → Lead Capture (`LeadGateStep.tsx`) for the tenant
default and `ListingPostOptions.tsx` for the per-post override. Registration
appears only in the gate dialog. Agents can upload or remove one banner in
Lead Capture settings and save it for all of their listing gates. The image
spans the dialog header and keeps its original aspect ratio. Visitors can continue with Google, Facebook,
or the contact form. A scheduled event adds an unchecked **Register for Open
House** option shared by all three paths. Checking it reveals an optional
attendance date and feedback, both saved in the agent's CRM note. Social
registration carries those fields in the signed pending cookie and records
email consent.

When a published listing has a current or past open house date, a dismissible
prompt asks signed-in visitors about the most recent eligible event. The visitor can share an
optional date and feedback. Submitting saves a note in the post author's CRM
without changing marketing consent. The prompt uses the browser's calendar
date and never requests location permission.

**Registration** (`POST /api/leads/listing-post`, public in
`PUBLIC_API_EXACT`): name, email, phone, optional "send me recently sold
comps", optional open-house RSVP, and required consent checkbox (email + call/text, links to
`/terms-of-service` and `/privacy-policy`). Turnstile + 10/h per-IP rate limit,
like the buy/sell intake forms. On submit:

1. Contact upserted in the **post author's** CRM (not the domain owner's),
   tagged `Web Generated Leads`, `Open House RSVP` or `Listing Post`, the
   address, and `Requested Sold Comps`; consent date/IP recorded; a
   `noteHistory` line logs the registration. The agent gets the usual lead SMS
   (`notifyAgentLead`).
2. A **partial User** if none exists: no password, `emailVerified: null`,
   `roles: ["endUser"]`, `signupOrigin.method: "listing_post"`. An existing
   account is never modified.
3. Email via `sendListingPostRegistrationEmail()` (`renderBrandedEmail`, platform
   sender, reply-to the agent). Partial accounts get a 7-day
   `VerificationToken` and a "Complete registration" button to the existing
   `/auth/welcome?token=` flow (set password or Google), on the host the visitor
   registered on. Comps, when asked for, come from `unified_closed_listings` —
   same subdivision (else city) and property type, ±20% price, ±1 bed/bath,
   closed in the last 6 months.

## Newsletter (backend only)

Resend + Mongo, domain-scoped like articles. **No composer UI exists** (grep of
`src/app` finds only the public `/newsletter-signup` page and sidebar link).

| Piece | File |
|---|---|
| Models (subscriber unique on `{ownerId,email}`; issue `draft`/`scheduled`/`sending`/`sent`/`failed`) | `src/models/NewsletterSubscriber.ts`, `src/models/Newsletter.ts` |
| Public signup (Turnstile, per-IP rate limit, `resolveDomainOwner`, `no-store`) | `POST /api/newsletter/subscribe`, `src/app/newsletter-signup/page.tsx` |
| One-click unsubscribe (GET page + RFC 8058 POST) | `/api/newsletter/unsubscribe?token=` |
| Subscribers / issue CRUD (session, owner-scoped) | `/api/newsletter/subscribers`, `/api/newsletter/issues[/id]` |
| Send (batches of 100, per-recipient unsubscribe link + `List-Unsubscribe` headers; claims the issue as `sending` first) | `POST /api/newsletter/issues/[id]/send` |

Sender is `EMAIL_FROM`, else `newsletter@${EMAIL_FROM_DOMAIN || "chatrealty.io"}`
(a code comment says `EMAIL_FROM` is unset in every environment, so the fallback is the sender). Turnstile only completes on
`chatrealty.io`, `jpsrealtor.com`, `josephsardella.com`, not localhost.

## Gotchas

- **Fix content in the database.** There is no second copy; editing a `src/posts/*.mdx` file changes nothing on the site.
- **`author.id` is stamped server-side** from `session.user.id` in the publish route.
- **Mongoose strict mode** drops undeclared fields — extend the schema before writing a new landing-page field.
- **Re-publishing resets `publishedAt` and `metadata.views`** (the upsert `$set`s them) and rewrites `author`.
- **Publishing needs no `GITHUB_TOKEN` or deploy hook.** The CMS stopped using both on 2026-10-29.
- **Localhost publishes to whatever `MONGODB_URI` points at.** With `.env.local` on the production database, a local publish is a live publish.
- **Editor saves go by slug.** "Save Draft" on a new article sends the publish `slugId`, and `POST /api/articles` returns 409 if that slug exists. It used to insert a second copy under a title-derived slug.
- **`<user@host>` is not a link in MDX.** MDX reads it as a JSX tag (`Unexpected character '@'`) and the page crashes. `validateMDX` rejects it; write `[user@host](mailto:user@host)`. The editor's `htmlToMdx` used to *generate* it: remark-stringify writes a link whose text equals its URL as an autolink, so every save turned `[email](mailto:email)` back into `<email>` (and `[https://x](https://x)` into `<https://x>`). Fixed with `resourceLink: true` (2026-10-30).
- **The edit pages have two buttons:** "Save as Draft" and "Update on Site", both through the publish route's upsert. "Backup to DB" was removed (2026-10-30); it was the same upsert under a third name.
- **`SECRETS_ENCRYPTION_KEY`** must exist wherever Anthropic keys are saved or used.

## Related

- [multi-tenant/README.md](../multi-tenant/README.md) — `resolveDomainOwner` contract
- [auth/README.md](../auth/README.md) — `session.user.id` vs domain owner
- [routing/README.md](../routing/README.md) — host detection that feeds `resolveDomainOwner`
- Retired CMS docs (Groq article generation, landing-page roadmap, cleanup plan): `docs/archive/cms/`

## Dialer newsletter invitations (planned)

The [dialer email follow-up plan](../crm/dialer/email-follow-ups.md) links to the agent-owned newsletter signup flow. An invitation is an email draft containing a signup link; it does not add or reactivate a subscriber. The existing public subscribe route can reactivate unsubscribed entries, so it must not be called automatically from an Invite action.
