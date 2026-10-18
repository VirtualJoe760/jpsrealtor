---
title: Documentation Policy
status: current
last_verified: 2026-10-17
audience: Claude Code sessions + contributors
related: [../AGENTS.md, README.md, ARCHITECTURE.md]
---

# Documentation policy for jpsrealtor / ChatRealty

> Scoped to `docs/`. The repo-wide rules and the project map live in the root
> `AGENTS.md`. Renamed from `CLAUDE.md` so every instruction file in this repo
> uses one convention — see the note in the root `CLAUDE.md` for why the root
> keeps a thin Claude Code shim (just an `@AGENTS.md` import).

When you work in `/docs/` — or update any architecture-affecting code — follow these rules.

## Frontmatter (required on every .md)

```yaml
---
title: <human-readable name>
status: current | partial | outdated
last_verified: YYYY-MM-DD
related: [path/to/related.md, ...]    # optional
supersedes: path/to/older-doc.md      # only when replacing another doc
---
```

**Status meanings:**

| Status | Meaning | Trust level |
|---|---|---|
| `current` | Matches today's code | Safe to trust |
| `partial` | Mostly right, but missing recent changes (flag what's missing in the body) | Trust the marked-current sections only |
| `outdated` | Significantly drifted | Don't trust without verifying against code |

## Folder structure

```
docs/
├── AGENTS.md                  ← this file (the docs policy; renamed from CLAUDE.md)
├── ARCHITECTURE.md            ← thin index, points to area docs
├── README.md                  ← hand-maintained index of the area folders
├── tech-debt.md               ← live list of known issues
├── merge-to-main-test-plan.md ← a finished 2026-07 one-time plan (status: outdated)
├── {area}/                    ← one folder per feature area
│   ├── README.md              ← area overview (the entry point)
│   └── {topic}.md             ← deep dives for specific topics
└── archive/                   ← retired docs (don't delete, don't load as truth)
    └── README.md              ← lists what's here and why
```

The area folders that exist today (new areas get a folder + `README.md` and a
row in **both** `docs/README.md` and `docs/ARCHITECTURE.md`):

| Folder | Covers |
|---|---|
| `admin/` | Admin dashboard, "Log in as", moderation, the Loop Console entry |
| `agent-identity/` | Agent profile data flow, brokerage / affiliation / team model |
| `agent-onboarding/` | Agent signup, application review, approval emails |
| `auth/` | NextAuth, sessions, cross-domain transfer/receive, 2FA |
| `campaigns/` | Ads, co-marketing, Google Ads go-live |
| `chat/` | CHAP chat, map intents; tool index in `TOOLS_INDEX.md` |
| `chatrealty-api/` | API productization — `/api/skill/*`, BYOD tenant DBs, packages, ship strategy |
| `cms/` | Articles, publishing pipeline, newsletter |
| `commerce/` | Stripe, subscriptions, credits, free-tier gating |
| `content-templates/` | Instagram carousels, cover slides, staging/reels (also holds the example images) |
| `crm/` | Contacts, import, FUB |
| `integrations/` | External APIs (Cloudinary, Twilio, Resend, Meta, Google …) |
| `listings/` | MLS data, photos, VPS cron, subdivisions |
| `mcp/` | The MCP server — tools, hosting, scopes, the site-building flow |
| `multi-tenant/` | Host-based scoping, custom domains, agent directory |
| `review/` | **The bug queue** — inconsistencies awaiting Joseph's decision, not yet tech debt |
| `routing/` | `src/proxy.ts`, host rewrites |
| `seo/` | Canonicals, sitemaps, structured data |
| `testing/` | The judge loop (Tom, repairer, tickets, Loop Console); `testing/mcp/web-design/` is the operational reference |
| `theming/` | Theme system, system-preference default |

`testing/agents/tom/` is the exception to the frontmatter rule below: those are
the judge agent's own instruction files (his `AGENTS.md`, `SOUL.md`, `MEMORY.md`
…), copied into his runtime by `git pull`, so they carry none.

**Naming rules:**
- kebab-case filenames (existing exceptions — `chat/TOOLS_INDEX.md`,
  `chatrealty-api/build_plan.md`, the convention-named `AGENTS.md` /
  `README.md` / `ARCHITECTURE.md`, and Tom's persona files — stay as they are
  because other files link to them)
- No dates in filenames (frontmatter `last_verified` carries the date)
- No `PHASE_1/2/3` style — use descriptive names

## Per-doc refactor checklist

When you encounter a legacy doc:

1. **Read it.** Note its claims and file references.
2. **Cross-check against code.** Do the referenced paths exist? Are described models/endpoints/flows still that way? Are recent commits represented?
3. **Classify and act:**

| Classification | Action |
|---|---|
| CURRENT | Add frontmatter, set `last_verified`, no body change |
| PARTIAL | Add frontmatter `status: partial`, update the drifted sections, set `last_verified` |
| OUTDATED, system still exists | Rewrite against current code |
| Superseded by another doc | Add `supersedes:` frontmatter, move to `archive/` |
| Duplicate | Merge useful content into the canonical, move duplicate to `archive/` |
| System retired | Move to `archive/` with one-line note in archive index |

## When to update docs

- **Before any non-trivial task:** read the relevant area's `README.md`.
- **In the same commit as code changes:** update the docs you read.
- **When you touch an area with no doc:** create one (start with `README.md`).
- **When you spot drift:** fix the doc the same session you noticed.

## Writing style for area docs

- **Lead with a TL;DR paragraph** — what is this subsystem in 2-4 sentences.
- **Use tables for lookups.** "Here's the entity, here's the file, here's the rule."
- **Call out known gotchas explicitly.** A "Gotchas" section near the top.
- **Link to linchpin files with full paths.** Future Claude will Read them.
- **Don't dump code blocks.** Reference the file. The code is the source of truth; the doc explains the why.
- **Keep area READMEs under 200 lines.** Deep-dive into separate files if needed.
