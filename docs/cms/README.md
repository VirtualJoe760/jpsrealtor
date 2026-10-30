---
title: CMS / Articles
status: current
last_verified: 2026-10-29
related: [./multi-tenant-articles.md, ../multi-tenant/README.md, ../auth/README.md, ../integrations/README.md, ../routing/README.md, ../mcp/tools.md, ../seo/README.md]
supersedes: docs/archive/cms/CMS_AND_INSIGHTS_COMPLETE.md
---

# CMS / Articles

## TL;DR

The CMS publishes articles (`articles` / `market-insights` / `real-estate-tips`)
and landing pages (`landing-page`) — all one `Article` Mongo model. **The
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
| `src/models/article.ts` | Mongoose model (file name is lowercase). `author.id` is the scoping field; `slug` is unique; `visibility` is `public`/`private` (default `private`). Schema enum includes `landing-page`; the TS type `ArticleCategory` does not. |
| `src/lib/publishing-pipeline.ts` | `validateForPublish()`, `publishArticle()` (validate → upsert → IndexNow), `unpublishArticle()` (delete), `isArticlePublished()`. Same behaviour on localhost and Vercel. |
| `src/lib/articles/public-articles.ts` | **The read path for public surfaces.** `listPublishedPosts({ ownerId, category })` (owner + published only; no owner → empty), `getArticlePost(slug)`, `articleToPost()`, `resolvePageOwnerId()` for server components. Neon routing for non-admins plugs in here. |
| `src/lib/services/article.service.ts` | CRUD over the model. `convertFormDataToMongoDoc()` is where SEO keywords become `tags`. |
| `src/app/api/articles/` | `list`, `publish`, `unpublish`, `set-draft`, `load-published` (session routes); `generate` (Groq), `regenerate-field`; public `search`, `ai-search`, `topics`; deprecated `route.ts` (use `list`). |
| `src/app/api/skill/articles/`, `src/app/api/skill/landing-pages/` | Token-authed (`articles:*` / `landing_pages:*` scopes) routes behind the MCP tools `create_article`, `update_article`, `get_article`, `list_my_articles` and the `*_landing_page` equivalents — see [mcp/tools.md](../mcp/tools.md). |
| `src/app/admin/cms/`, `src/app/agent/cms/` | Admin CMS (all articles) and per-agent CMS (own articles). |
| `src/app/insights/[category]/[slugId]/page.tsx`, `src/app/lp/[slug]/page.tsx` | Article and landing-page renderers. |
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
- **Editor saves go by slug.** "Save Draft" on a new article sends the publish `slugId`, and `POST /api/articles` returns 409 if that slug exists. "Save to Database" on the edit pages runs the publish (upsert). Both used to insert a second copy under a title-derived slug.
- **`<user@host>` is not a link in MDX.** MDX reads it as a JSX tag (`Unexpected character '@'`) and the page crashes. `validateMDX` now rejects it; write `[user@host](mailto:user@host)`.
- **`SECRETS_ENCRYPTION_KEY`** must exist wherever Anthropic keys are saved or used.

## Related

- [multi-tenant/README.md](../multi-tenant/README.md) — `resolveDomainOwner` contract
- [auth/README.md](../auth/README.md) — `session.user.id` vs domain owner
- [routing/README.md](../routing/README.md) — host detection that feeds `resolveDomainOwner`
- Retired CMS docs (Groq article generation, landing-page roadmap, cleanup plan): `docs/archive/cms/`

## Dialer newsletter invitations (planned)

The [dialer email follow-up plan](../crm/dialer/email-follow-ups.md) links to the agent-owned newsletter signup flow. An invitation is an email draft containing a signup link; it does not add or reactivate a subscriber. The existing public subscribe route can reactivate unsubscribed entries, so it must not be called automatically from an Invite action.
