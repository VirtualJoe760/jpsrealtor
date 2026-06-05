---
title: CMS / Articles
status: current
last_verified: 2026-06-05
related: [../multi-tenant/README.md, ../auth/README.md, ../integrations/README.md]
supersedes: docs/cms/CMS_AND_INSIGHTS_COMPLETE.md
---

# CMS / Articles

## TL;DR

The CMS publishes articles (blog posts, market insights, real estate tips) and
landing pages. **MongoDB is the source of truth.** MDX files in `src/posts/`
exist for git history and as a localhost dev fallback only — production reads
from Mongo. Publishing goes Mongo → MDX file → push to `main` → Vercel rebuild.
Article visibility is **domain-scoped** via `resolveDomainOwner`: each branded
site only displays its owner's articles.

## Files

| File | Purpose |
|---|---|
| `F:\web-clients\joseph-sardella\jpsrealtor\src\models\Article.ts` | Mongoose model. `author.id` is the scoping field. Categories: articles / market-insights / real-estate-tips / landing-page |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\lib\publishing-pipeline.ts` | `publishArticle()` / `unpublishArticle()`. Branches on `IS_PRODUCTION` for filesystem vs. GitHub Contents API. |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\lib\services\article.service.ts` | CRUD over the Article model. `convertFormDataToMongoDoc()` is where SEO keywords become `tags`. |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\app\api\articles\list\route.ts` | Canonical example of `resolveDomainOwner` scoping. |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\app\api\articles\publish\route.ts` | Auth + validation + `publishArticle()` + non-blocking GBP cross-post. |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\app\insights\page.tsx` | Redirects `/insights` → `/` (the root home renders the insights feed). |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\app\admin\cms\` | Admin CMS (sees all articles when calling list with `?all=true`). |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\app\agent\cms\` | Per-agent CMS (sees only their own via `resolveDomainOwner`). |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\app\lp\[slug]\page.tsx` | Landing page renderer (category=landing-page articles). |
| `F:\web-clients\joseph-sardella\jpsrealtor\scripts\fix-article-authors-mongo.ts` | Backfill for orphan `author.id` values. |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\app\api\claude\draft-landing-page\route.ts` | Streaming Claude landing-page builder. Uses **agent's own** Anthropic API key (BYOK). Tool-call architecture (`set_article_field`, `set_landing_page_option`, etc.). |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\app\agent\cms\components\ClaudeLandingPageChat.tsx` | In-CMS chat UI for the BYOK flow. SSE event loop, fills the article form via tool_use events as Claude talks. |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\app\api\skill\landing-pages\route.ts` | Token-authenticated landing-page draft creation for the Claude Code / Claude Desktop skill. Draft-only. |
| `F:\web-clients\joseph-sardella\jpsrealtor\packages\install-skill\` | npm package (`@chatrealty/install-skill`) — agents run `npx @chatrealty/install-skill <token>` to install the skill into `~/.claude/skills/chatrealty-landing-page/`. |

## MongoDB is source of truth

The `articles` collection holds the canonical article state. The MDX files in
`src/posts/{slugId}.mdx` are written alongside Mongo for two reasons:

1. **Git history** — every publish/edit/unpublish lands as a commit on `main`,
   which gives free version history and audit trail.
2. **Localhost dev fallback** — in dev, `/api/articles/list` reads MDX off disk
   (the `IS_PRODUCTION === false` branch).

In production, `/api/articles/list` reads from Mongo and never touches the
filesystem. The MDX file is still pushed to `main` so the git history reflects
reality and so a future rebuild from a clean clone would have content to seed.
**Do not treat the MDX as authoritative.** If they ever diverge, Mongo wins.

## Publishing pipeline

`publishArticle(article, slugId, { userId, userName, userEmail })` in
`publishing-pipeline.ts` runs the same workflow with an environment branch:

| Step | Localhost | Production |
|---|---|---|
| 1. Validate | `validateForPublish` (title length, MDX parse, image required, SEO caps) | same |
| 2. Save to Mongo | `createArticle` (upsert by slug) | same |
| 3. Write MDX | `writeArticleToFilesystem` then `git add/commit/push origin main` | `publishMDXViaGitHub` (Contents API PUT) |
| 4. Trigger deploy | Implicit via the git push | Explicit POST to `DEPLOY_HOOK_URL`; on failure, the git push itself triggers Vercel anyway |

Localhost uses `child_process` git directly. Production can't (Vercel's
filesystem is read-only), so it uses the GitHub Contents API with a PAT in
`GITHUB_TOKEN`. Unpublish mirrors this with `DELETE` instead of `PUT`.

`deployToMain` handles being on a feature branch by committing on the current
branch, cherry-picking onto `main`, pushing, and switching back. The branch
juggling is one reason this code is fragile — see Gotchas.

## Article scoping

`/api/articles/list` resolves the **domain owner** (not the visitor) and
filters by `author.id`. The canonical pattern:

- Call `resolveDomainOwner(request)` to get the owner of the hostname.
- Admins can pass `?all=true` to bypass and see the whole network.
- If `ownerId` is null (PRIMARY_AGENT_EMAIL misconfigured), return empty
  rather than leaking every agent's articles.
- Set `filters.authorId = ownerId` and pass to `listArticles`.

See `multi-tenant/README.md` for the full `resolveDomainOwner` contract.

**May 19, 2026 incident:** Joseph's User `_id` had changed at some point
(account recreation), leaving 39 articles whose `author.id` pointed at a
dead ObjectId. They stopped appearing on jpsrealtor.com because the new
domain-owner id didn't match. Fix:
`F:\web-clients\joseph-sardella\jpsrealtor\scripts\fix-article-authors-mongo.ts`
backfilled the orphans. Re-run that script if the same symptom recurs after
an account change.

## Image conventions

All article images live on Cloudinary. Featured image is stored as `{ url,
publicId }` so the publicId is available for transforms and deletes. Inline
images embedded in `content` MDX must also be Cloudinary URLs — local
`/public/...` paths break in production because the MDX is rendered from Mongo,
not from disk, and the `/public` directory of the publishing machine isn't
accessible to readers.

Transform pattern: append `f_auto,q_auto` to the Cloudinary delivery URL
(format and quality auto-negotiation). Width/height transforms layer on top.

**May 19 fix:** `scripts/fix-article-images.ts` corrected a class of articles
whose `content` field contained local image paths. Both the `content` field in
Mongo and the MDX file in `src/posts/` had to be updated — touching only one
left the other stale and the production render showed broken images.

## Routes

| Route | Who sees it | Source |
|---|---|---|
| `/` (root home) | Public — renders insights feed | `/api/articles/list` (domain-scoped) |
| `/insights` | Public — redirects to `/` | n/a |
| `/insights/[category]/[slugId]` | Public — single article view | Mongo via slug |
| `/admin/cms` | Admins only — sees all articles | `/api/articles/list?all=true` |
| `/admin/cms/new`, `/admin/cms/edit/[slugId]` | Admins only — author/edit | `/api/articles/publish` |
| `/agent/cms` | Signed-in agents — sees only their own | `/api/articles/list` (no bypass) |
| `/lp/[slug]` | Public — landing pages | Mongo, `category: "landing-page"` |

Landing pages have their own renderer and layout
(`F:\web-clients\joseph-sardella\jpsrealtor\src\app\lp\layout.tsx`,
`F:\web-clients\joseph-sardella\jpsrealtor\src\app\lp\[slug]\LandingPageClient.tsx`)
and aren't shown in the insights feed. The list route excludes them by default
(`excludeLandingPages=true` is the default).

## Landing-page AI builders

Three paths for generating a landing page draft, all writing to the same
`Article` model with `category: "landing-page"`:

| Path | Surface | Model | Auth | Notes |
|---|---|---|---|---|
| Groq | `/agent/cms/new` "Generate" panel (default) | `openai/gpt-oss-120b` via Groq | session | Single-shot. Topic textarea → full JSON response → form fills. Uses platform `GROQ_API_KEY`. Free for the agent. |
| Claude (BYOK, in-site) | `/agent/cms/new` "Generate" panel with model toggle = "Claude · chat" | `claude-sonnet-4-5-*` via Anthropic | session + per-agent key | Multi-turn chat with tool calls. Claude asks questions and uses `set_article_field` / `set_landing_page_option` / `add_form_field` / `finalize` to populate the form live. Requires the agent to have saved their Anthropic key in Settings → Integrations. |
| Claude (BYOK, desktop skill) | Claude Code / Claude Desktop, via `@chatrealty/install-skill` | Whatever model the agent's local Claude is using | bearer token (`crt_live_*`) | The agent runs `npx @chatrealty/install-skill <token>` once; afterwards any Claude window can create drafts by calling `POST /api/skill/landing-pages`. Draft-only — no publish endpoint v1. |

**Storage of the Anthropic key**: encrypted at rest with AES-256-GCM via
`F:\web-clients\joseph-sardella\jpsrealtor\src\lib\secrets.ts`, keyed by
`SECRETS_ENCRYPTION_KEY` env. Stored on
`User.agentProfile.aiIntegrations.anthropic.apiKeyEncrypted`. The plaintext
never leaves the server (test/save endpoints return only status + last4).

**ChatRealty API tokens**: stored as sha256 hash on
`User.agentProfile.aiIntegrations.apiTokens[]`. The plaintext is returned
ONCE on creation and shown to the agent in a single-time reveal modal in
Settings → Integrations. See `../integrations/README.md` for the auth contract.

## Newsletter (backend — June 2026)

A native newsletter system (Resend + Mongo), domain-scoped like articles. The
public signup replaces the formerly-dead `/newsletter-signup` sidebar link. **v1
ships the backend + signup page only** — the in-CMS composer and AI-generated
newsletter workflow are a deliberate follow-up.

| Piece | File |
|---|---|
| Subscriber model (per-owner list, unique `{ownerId,email}`, `unsubscribeToken`) | `src/models/NewsletterSubscriber.ts` |
| Issue model (draft → sending → sent/failed) | `src/models/Newsletter.ts` |
| Public signup (Turnstile + rate-limit + `resolveDomainOwner` + `no-store`) | `POST /api/newsletter/subscribe` |
| One-click unsubscribe (GET page + RFC 8058 POST) | `/api/newsletter/unsubscribe?token=` |
| Subscriber list + status counts (auth, owner-scoped) | `GET /api/newsletter/subscribers` |
| Issue CRUD (auth, draft-only edits) | `GET/POST /api/newsletter/issues`, `GET/PATCH/DELETE /api/newsletter/issues/[id]` |
| Send via Resend (batched 100s, per-recipient unsubscribe + `List-Unsubscribe` headers) | `POST /api/newsletter/issues/[id]/send` |
| Public signup page | `src/app/newsletter-signup/page.tsx` |

- **Subscribers are scoped to `resolveDomainOwner`** at signup (the domain owner
  builds their own list); the CMS routes scope to `session.user.id` (the agent
  manages their own). On `jpsrealtor.com` these are the same user.
- **Turnstile can't be exercised on localhost** — the sitekey is registered for
  `chatrealty.io` / `jpsrealtor.com` / `josephsardella.com` only (error 110200),
  so the captcha-gated subscribe only completes on those domains. Same limit as
  every other captcha form.
- **Sending uses Resend** (`RESEND_API_KEY`), `from` = `EMAIL_FROM` (fallback
  `newsletter@jpsrealtor.com`). Each email carries a per-recipient unsubscribe
  link + `List-Unsubscribe`/`List-Unsubscribe-Post` headers for bulk-sender
  compliance. The send route claims the issue (`status: sending`) before sending
  so a double-click can't double-send.
- **Not yet built:** the CMS UI (compose/preview/send) and AI-generated drafts.
  Issues are HTML in `bodyHtml`; the future composer/AI fills that field.

## Gotchas

- **MongoDB is canonical, NOT MDX.** Treat `src/posts/*.mdx` as a build/git
  artifact. If you fix something, update Mongo too — preferably first.
- **`author.id` stamping happens server-side from `session.user.id`** in the
  publish route. If a user's `_id` changes (account recreation, migration),
  every article they authored becomes orphaned from a domain-scoping
  perspective. Recovery script:
  `F:\web-clients\joseph-sardella\jpsrealtor\scripts\fix-article-authors-mongo.ts`.
- **`/api/articles/list` must set `Cache-Control: no-store`.** `vercel.json`'s
  catch-all otherwise stamps `immutable, max-age=31536000` on API responses,
  freezing per-user scoped data in the browser for a year. Same rule applies
  to any `/api/*` returning dynamic, per-domain data until vercel.json's
  immutable rule is scoped to `/_next/static/*`.
- **Inline images in the `content` field need fixing in Mongo, not just MDX.**
  Production renders from Mongo, so a local path in `content` will be broken
  on production even after you update the MDX file. May 19 lesson.
- **Branch-juggling in `deployToMain` is fragile.** When publishing from a
  feature branch, the pipeline stashes / cherry-picks / pops to push to main.
  Hook failures or merge conflicts in that flow leave the working tree dirty.
  Publish from main when possible.
- **`GITHUB_TOKEN` PAT is the production publish credential.** If it expires
  or loses `repo` scope, production publish silently breaks at step 3.
- **Mongoose strict mode drops unschema'd fields silently.** When extending
  the Article model (e.g. adding new landing-page fields), update the schema
  before writing to it or the field disappears at save time.
- **`Article.slug` is unique.** `createArticle` upserts by slug, so re-publishing
  the same slug updates in place rather than creating a duplicate.
- **BYOK requires `SECRETS_ENCRYPTION_KEY`** in every environment that
  reads/writes Anthropic keys. Missing the env var means the save endpoint
  throws on encrypt and the draft route throws on decrypt. Generate one with
  `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.
- **Skill API tokens are draft-only by design.** `/api/skill/landing-pages`
  cannot publish — agents must review in the CMS first. If you add a publish
  endpoint later, gate it behind a per-token `scopes: ["publish"]` capability
  rather than enabling it globally.

## Reference implementation

`F:\web-clients\joseph-sardella\jpsrealtor\src\app\api\articles\list\route.ts`
is the canonical example for any new domain-scoped content endpoint: resolves
the owner, allows admin `?all=true` bypass, returns empty defensively on null
owner, sets `Cache-Control: no-store`.

## Related

- [multi-tenant/README.md](../multi-tenant/README.md) — `resolveDomainOwner` contract
- [auth/README.md](../auth/README.md) — session, `session.user.id` vs domain owner
- [routing/README.md](../routing/README.md) — host detection that feeds `resolveDomainOwner`

## Migration log

Audit of `/docs/cms/` and related files. Per `docs-v2/CLAUDE.md` refactor
classifications. **No files were moved or deleted as part of this migration**
— this is a classification record only.

| Legacy doc | Classification | Action |
|---|---|---|
| `F:\web-clients\joseph-sardella\jpsrealtor\docs\cms\CMS_AND_INSIGHTS_COMPLETE.md` | CURRENT (mostly) — accurate as of May 1, 2026 but pre-dates the May 19 orphan-author and Cloudinary inline-image work | SUPERSEDED by this README. Move to `docs/archive/` next pass. |
| `F:\web-clients\joseph-sardella\jpsrealtor\docs\cms\DUAL_ENVIRONMENT_PUBLISHING_TODO.md` | OUTDATED — shipped. Reads as a planning TODO; everything described is now live in `publishing-pipeline.ts`. | Move to `docs/archive/`. Content already captured in the "Publishing pipeline" table above. |
| `F:\web-clients\joseph-sardella\jpsrealtor\docs\cms\PHASE_6_UI_IMPROVEMENTS.md` | OUTDATED — shipped. Audits browser-alert replacements with modals; CMS UI now uses modals throughout. | Move to `docs/archive/`. No content worth retaining in canonical doc. |
| `F:\web-clients\joseph-sardella\jpsrealtor\docs\cms\LANDING_PAGES_ROADMAP.md` | OUTDATED — shipped April 10-12 2026. Landing-page schema fields, `/lp/[slug]` route, and CMS UI are all live. | Move to `docs/archive/`. Brief mention retained in Routes table here. |
| `F:\web-clients\joseph-sardella\jpsrealtor\docs\cms\CMS_ROUTE_CLEANUP_AND_REFACTOR_PLAN.md` | OUTDATED — describes the now-completed unification of MongoDB and MDX systems. Current state matches the "after" state in this plan. | Move to `docs/archive/`. |
| `F:\web-clients\joseph-sardella\jpsrealtor\docs\cms\ARTICLE_GENERATION_GROQ.md` | CURRENT — Groq GPT-OSS-120B article generation is still live at `/api/articles/generate`. Agent-aware prompt (uses serviceAreas/bio/specializations) shipped May 2026. | Keep as-is. Out of scope for this README. Add frontmatter on next pass. |
| `F:\web-clients\joseph-sardella\jpsrealtor\docs\CRM_DOCUMENTATION.md` | UNRELATED to CMS. Mentions "articles" only in passing re: linking from CRM. | No action. Not a CMS doc. |
| `F:\web-clients\joseph-sardella\jpsrealtor\docs\ARCHITECTURE.md` | PARTIAL — references the CMS as one of several subsystems. The CMS section is brief and broadly accurate. | No action here. Update when ARCHITECTURE.md gets its own pass. |

### What was NOT migrated

- Detailed UI component docs (FilterTabs, CategoryFilter, AISearchBar,
  ArticleAccordion, TopicCloud, MarketStats) from `CMS_AND_INSIGHTS_COMPLETE.md`.
  Those are pure UI specs that drift fast; the code is the source of truth.
  If a future doc is needed, put it under `docs-v2/cms/insights-ui.md`.
- The Groq AI article generation flow — kept as its own doc per "keep separate"
  guidance, since it has independent operational concerns (Groq API key,
  model selection, prompt evolution).
