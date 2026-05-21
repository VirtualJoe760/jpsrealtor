---
title: Documentation Policy
status: current
last_verified: 2026-05-21
audience: Claude Code sessions + contributors
---

# Documentation policy for jpsrealtor / ChatRealty

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
├── ARCHITECTURE.md            ← thin index, points to area docs
├── README.md                  ← regenerated index
├── CLAUDE.md                  ← this file (the docs policy)
├── tech-debt.md               ← live list of known issues
├── {area}/                    ← one folder per feature area
│   ├── README.md              ← area overview (the entry point)
│   └── {topic}.md             ← deep dives for specific topics
└── archive/                   ← retired docs (don't delete, don't load as truth)
    └── README.md              ← lists what's here and why
```

**Naming rules:**
- kebab-case filenames
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
