---
title: Legacy Docs Archive
status: current
last_verified: 2026-05-21
---

# Archive — Legacy `/docs/` content

This folder contains the entire previous `/docs/` tree as it existed before the
2026-05-21 documentation refactor. Files here are **kept for historical
reference but no longer represent current architecture**. Don't read them as
truth — they pre-date the new docs structure.

## Why everything's here

The refactor moved the canonical documentation into the new structure
(`docs/ARCHITECTURE.md` + per-area folders). Rather than delete the old
`/docs/` tree, every file was moved into this archive so:

- Nothing is lost — old context, decision history, and one-off plans remain accessible
- The new `/docs/` tree is uncluttered
- Anyone hunting for the old version of a doc can find it here

## How to use this archive

- **Looking for current docs?** Go up one level to `/docs/` — start with `ARCHITECTURE.md`.
- **Looking for a specific legacy doc?** Browse by subdirectory below (preserved from the old structure).
- **Curious about the migration?** Each area doc under `/docs/{area}/README.md` has a "Migration log" section listing the legacy files it superseded.
- **Found something current that got moved here by accident?** Move it back up into the appropriate `/docs/{area}/` folder. Don't sweat data loss — git history is intact.

## Structure preserved from old `/docs/`

Top-level legacy directories (each a self-contained pile from the prior era):

- `ad-campaign-setup/`, `agent-profile/`, `architecture/`, `bugs/`, `buy-page/`,
  `calendar/`, `campaigns/`, `chat/` (chat-v1 era), `chat-production/` (mixed,
  includes the canonical `CHAT_V3.md`), `chat-v2/`, `chatrealty/`, `cma/`,
  `cms/` (largely superseded by `docs/cms/`), `contact-cleaning/`, `contacts/`,
  `debug/`, `deployment/`, `features/`, `fub/`, `google-ads/`, `images/`,
  `integrations/`, `known-bugs/`, `learning/`, `listings/`, `map/`, `misc/`,
  `mobile/`, `multi-tenant/`, `optimization/`, `photos/`, `pitch-deck/`,
  `pwa/`, `refactoring/`, `search/`, `security/`, `seo/`, `tenant/`,
  `theme-context/`, `thanks/`, `trello/`, `venus/`.

Plus loose root-level files (`ADMIN_DASHBOARD.md`, `STRIPE_BILLING_SYSTEM.md`,
`MONGOOSE_SCHEMA_GUIDE.md`, etc.) — see the directory listing.

Some of these files are still **CURRENT** (mainly `MONGOOSE_SCHEMA_GUIDE.md`,
`STRIPE_BILLING_SYSTEM.md`, `chatrealty/BUSINESS_ARCHITECTURE.md`,
`chat-production/CHAT_V3.md`, `chat-production/TOOLS_INDEX.md`,
`agent-profile/*`). If you reference them, prefer them over outdated peers
in the same folder. The migration logs in each `/docs/{area}/README.md`
classify what's still accurate.

## Original `/docs/README.md`

Preserved as `LEGACY_INDEX.md` in this folder (renamed to avoid collision
with this archive README).

## Reverse-lookup: which new doc replaces which legacy doc?

Each new area doc declares its `supersedes:` frontmatter:

| New doc | Supersedes (in this archive) |
|---|---|
| `docs/auth/README.md` | `features/AUTHENTICATION.md` |
| `docs/multi-tenant/README.md` | `multi-tenant/index.md` |
| `docs/crm/README.md` | `CRM_DOCUMENTATION.md` |
| `docs/cms/README.md` | `cms/CMS_AND_INSIGHTS_COMPLETE.md` |
| `docs/chat/README.md` | `chat-production/CHAT_V3.md` |
| `docs/commerce/README.md` | `STRIPE_BILLING_SYSTEM.md` |

Other new docs (`routing/`, `listings/`, `integrations/`, `tech-debt.md`) are new
syntheses without a single direct predecessor.
