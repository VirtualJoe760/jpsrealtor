---
title: CMS / Articles — multi-tenant storage (design)
status: planned
last_verified: 2026-10-29
related: [./README.md, ../multi-tenant/README.md, ../multi-tenant/domain-owner-scoping.md, ../chatrealty-api/control-plane.md, ../chatrealty-api/connection-resolver.md, ../chatrealty-api/db-adapter.md, ../chatrealty-api/neon-setup.md]
---

# Articles on a multi-tenant platform

## TL;DR

**Target:** an agent publishes an article → it is saved to **that agent's
assigned database** → it shows on **that agent's home page**. Nothing else is
required for an article to be live.

**Assignment rule (decided 2026-10-29):** **admins** (which covers
`jpsrealtor.com` and `chatrealty.io`) keep using the shared MongoDB `articles`
collection. **Every non-admin agent stores articles in their own Neon Postgres
tenant database**, and their existing Mongo articles migrate there. A
non-admin without a Neon DB is a test account, not a customer.

**Today none of that is true.** Every article from every agent goes to the
shared Mongo collection, then is committed as MDX to the public
`VirtualJoe760/jpsrealtor` repo, and publishing fails if that commit fails. The
work below closes the gap.

## What happened on 2026-10-29 (why this doc exists)

One publish of "The Complete Guide to 55+ Communities in the Coachella Valley"
on jpsrealtor.com produced three separate failures:

| # | Failure | Cause | Temporary fix applied |
|---|---|---|---|
| 1 | Publish returned 500 | Step 3 (MDX → GitHub) got `GitHub API error (401): Bad credentials`; the production `GITHUB_TOKEN` is dead. The Mongo save in step 1 had already succeeded. | None yet. Replacing the token is blocked on a permission prompt. |
| 2 | Article posted twice | After the error, the editor's Save button called the deprecated `POST /api/articles`, which `Article.create`d a second doc (a draft with a different slug). The public feed has **no status filter**, so the draft showed too. | Draft `6ae3aefaba8be951ecbe1343` deleted (backup kept in the session scratchpad). |
| 3 | Article page crashed (`Application error`, digest `506066817`) | Content had `<josephsardella@gmail.com>`, a Markdown email autolink. MDX reads `<…>` as a JSX tag and refuses `@`. `validateForPublish`'s `validateMDX` did not catch it. | Mongo `content` rewritten to `[josephsardella@gmail.com](mailto:josephsardella@gmail.com)`. Page verified 200. |

All three are consequences of the current design, and each recurs for any agent
until fixed. #2 and #3 are fixed in the target design; #1 disappears once the
GitHub step is gone.

## Current flow (as built)

```
CMS editor ──POST /api/articles/publish──▶ publishArticle()
   1. validateForPublish (validateMDX ≠ the renderer's compiler)
   2. Mongo `articles` upsert by slug          ← every agent, one collection
   3. MDX → GitHub Contents API (GITHUB_TOKEN) ← public repo, every agent
   4. Vercel deploy hook
   5. IndexNow
   any throw after step 2 → 500, editor then calls POST /api/articles → duplicate
```

Reads: home feed `/api/articles/list` (Mongo, domain-owner scoped, **no status
filter**); article page `getPostBySlug` (Mongo then MDX); category index and RSS
(**MDX on disk only**); sitemap (Mongo). See [README.md](./README.md).

## Target design

### 1. Decide the store per agent: `resolveArticleStore(ownerUserId)`

One function, in `src/lib/tenant/`, that every article read and write calls.
Nothing else decides where articles live.

```
resolveArticleStore(ownerUserId):
  if User(ownerUserId).isAdmin                    → { kind: "mongo" }
  tenant = Tenant.findOne({ ownerUserId, status: "active" })
  if tenant                                       → { kind: "neon", tenantId }
  else                                            → throw ArticleStoreUnavailable (409)
```

- **Admins stay on Mongo** (Joseph's decision, 2026-10-29). Read `isAdmin` from
  the **owner's** `User` record, not from the session: an admin impersonating an
  agent, or an admin editing an agent's article, must still write to that
  agent's Neon DB.
- **Caveat:** making someone admin later moves where *new* reads look. Their
  Neon articles would stop showing on their site. Granting admin to an agent
  with a tenant needs a migration to go with it.
- **Lookup key is `ownerUserId`**, which `Tenant` already carries with a unique
  index (`src/models/control/Tenant.ts`). Session-authed CMS requests have a user
  id but no API token, so the token-hash lookup in `skill-auth.ts` does not apply.
  Token-authed `/api/skill/articles*` requests already carry `auth.tenantId` and
  should use it directly.
- **No fallback to Mongo for a non-admin without a tenant.** Those are test
  accounts. Same reasoning as the listings BYOD gate (connection-resolver.md,
  step 2): falling back would mix their content into the admin store. The CMS
  shows "your site database isn't set up yet" instead.
- Cache the result per request; the Tenant lookup is one indexed read.

### 2. One repository interface, two implementations

Add `ArticleRepo` to `DbAdapter` (`src/lib/db/adapter.ts`), alongside
`ListingRepo` / `ContactRepo`:

| Method | Notes |
|---|---|
| `upsertBySlug(doc)` | The only write a publish does. Idempotent, so a retry never duplicates. |
| `getBySlug(slug, { includeDrafts })` | Article page. |
| `listPublished({ category?, limit, cursor })` | Home feed, category index, RSS, sitemap. **Always `status = 'published'`.** |
| `listMine({ status? })` | Agent CMS. |
| `setStatus(slug, status)` / `delete(slug)` | Unpublish / draft. |

- **Mongo implementation** wraps `src/lib/services/article.service.ts` and the
  existing `Article` model. Behaviour for jpsrealtor.com stays the same.
- **Postgres implementation** needs a new Drizzle table in
  `src/lib/db/schema/articles.ts`: `id`, `slug` (unique), `title`, `excerpt`,
  `content`, `category`, `status`, `visibility`, `featured_image` (jsonb:
  `{url, publicId}`), `seo` (jsonb), `tags` (text[]), `author_name`,
  `published_at`, `created_at`, `updated_at`, plus an index on
  `(status, published_at desc)`. No `author_id` column is needed for scoping:
  the whole database belongs to one agent.
- Mapping goes through `to-dto.ts` like listings, so both stores return the same
  `ArticleDTO`.

### 3. Get the table into existing tenants

The self-serve provisioner applies only `0000_supreme_maginty.sql`
(neon-setup.md, "Which migration a tenant gets"). A new migration reaches **new**
tenants only. Existing tenants need a migration runner that loops active tenants
and applies pending migrations using the `direct` connection string. This is a
prerequisite, not a nice-to-have: without it the first publish on an existing
tenant fails on a missing table.

### 4. Publishing = one database write

```
publishArticle(article, owner):
  1. validate  — compile with the SAME MDX compiler the page uses
  2. store = resolveArticleStore(owner); store.articles.upsertBySlug(...)
  3. after the write succeeds, best-effort and never fatal:
     revalidatePath for the owner's home + article URL, IndexNow, GBP
```

- **Drop the MDX → GitHub step for everyone.** Committing every agent's content
  to a public repo is a data-ownership problem in its own right, and a dead token
  should not be able to fail a publish that already succeeded. If Joseph wants a
  git mirror of his own articles, run it as a separate job off Mongo.
- **Drop the deploy hook.** Pages that read the DB need a revalidation, not a
  rebuild.
- **Return success whenever step 2 succeeded.** Report step-3 problems as
  warnings in the response.

### 5. Reads go through the same resolver

| Surface | Today | Target |
|---|---|---|
| Home feed `/api/articles/list` | Mongo, owner-scoped, no status filter | `resolveDomainOwner(host)` → `resolveArticleStore(owner)` → `listPublished` |
| Article page | Mongo then MDX | `getBySlug`, same resolution |
| Category index `/insights/[category]` | MDX on disk | `listPublished({ category })` |
| RSS `/api/rss/[section]` | MDX on disk | `listPublished({ category })` |
| Sitemap | Mongo | per-host `listPublished` |
| External agent sites (`/api/skill/articles*`) | Mongo | `auth.tenantId` → Neon adapter |

Once every surface reads the DB, `src/posts/` and `getPostsBySection` can be
retired.

### 6. Fix in the same pass

- **Public feed must filter `status: 'published'`** (`src/app/api/articles/list/route.ts`
  filters by owner only). This is what made the duplicate draft public.
- **Editor must not fall back to `POST /api/articles` after a failed publish**
  (`src/app/agent/cms/new/page.tsx` and `edit/[slugId]/page.tsx`, admin
  equivalents). Remove the deprecated route once nothing calls it.
- **Validation must use the renderer's compiler.** `validateMDX`
  (`src/lib/mdx-processor.ts`) passed `<email@host>`; the next-mdx-remote compile
  on the page did not. Compiling with the same function closes the gap.
- **The article page should not crash on bad MDX.** Catch the compile error and
  render a fallback (plain Markdown, or a "being updated" notice) so one bad
  article can't take a page down with a server exception.

## Rollout order

1. Quick fixes that need no new storage: the status filter, the editor fallback,
   making the GitHub step non-fatal, and the validator/compiler match. These also
   stop the 2026-10-29 failures from recurring on jpsrealtor.com.
   **Done on `fix/cms-publish-hardening` (not yet deployed).** Still open from
   §6: the article page's fallback for bad MDX, and removing the deprecated
   route (the editors' Save Draft still calls it, now slug-guarded).
2. `ArticleRepo` interface + Mongo implementation; move all callers onto
   `resolveArticleStore`. jpsrealtor.com behaviour is unchanged.
3. Postgres table + migration runner for existing tenants.
4. Postgres implementation; turn on Neon routing for non-owner agents.
5. Move category index, RSS and sitemap off MDX; remove the GitHub/MDX step and
   `src/posts/`.

## Decisions (Joseph, 2026-10-29)

- **Admins stay on Mongo.** That covers jpsrealtor.com and chatrealty.io.
- **Non-admin agents migrate.** At step 4, a one-off script copies each
  non-admin author's Mongo articles into their tenant DB (upsert by slug), checks
  the counts match, then deletes the Mongo copies. Routing for that agent flips
  only after their copy is verified, so their home page never goes empty.
- **No Neon DB means admin or test account.** A non-admin without a tenant is a
  test account. Publishing refuses with 409, and nothing falls back to Mongo.
