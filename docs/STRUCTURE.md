# Documentation Structure Proposal

This repo already has a large `docs/` directory. The main opportunity is to:
- make it easier to find the **current** truth
- separate ΓÇ£design docsΓÇ¥ from ΓÇ£work logs / session notesΓÇ¥
- prevent root-level markdown sprawl

## Goals

1. **Single source of truth** for architecture + runbooks.
2. **Stable paths** for core docs (links donΓÇÖt break).
3. **Fast onboarding** for new developers.
4. **Easy drift detection** (docs vs code).

## Proposed structure

Keep most existing topical directories (theyΓÇÖre good). Add a clear place for ΓÇ£work logsΓÇ¥ and ΓÇ£assistant guidanceΓÇ¥.

```
docs/
  README.md                 # Documentation hub / table of contents
  STRUCTURE.md              # This file (rules + taxonomy)
  OUTDATED.md               # Doc drift tracker

  learning/
    LEARNING_GUIDE.md       # Codebase navigation + onboarding

  venus/
    README.md               # Who/what Venus is + how to use the assistant

  architecture/
  deployment/
  integrations/
  chat/
  chat-v2/
  listings/
  map/
  features/
  contacts/
  campaigns/
  cms/
  photos/
  debugging/
  misc/

  archive/
    YYYY/                   # work logs/session summaries grouped by year
      2026-01-xx-...md
```

## Placement rules

### ΓÇ£Active docsΓÇ¥ (should stay current)

Put in topical directories (architecture/deployment/chat/etc):
- how systems work
- runbooks
- integration contracts
- troubleshooting guides

These docs should:
- include ΓÇ£Last UpdatedΓÇ¥ at top
- link to relevant code paths
- avoid narrative session chatter

### ΓÇ£Work logsΓÇ¥ (historical)

Move into `docs/archive/`:
- ΓÇ£COMPLETEΓÇ¥ reports
- session summaries
- one-off investigations

Keep them for archaeology, but donΓÇÖt let them masquerade as current truth.

### Root-level docs

Prefer only:
- `README.md`
- possibly `RESTART_INSTRUCTIONS.md` (if truly operational)

Everything else belongs in `docs/` (active) or `docs/archive/` (historical).

## Keeping docs fresh (guidelines)

1. **Docs change with code**: if a PR changes config/scripts/env vars, update docs in same PR.
2. **Link to code**: reference file paths so readers can verify quickly.
3. **Add to the hub**: when adding a new doc, link it from `docs/README.md`.
4. **Track drift**: if you notice drift but canΓÇÖt fix it now, add it to `docs/OUTDATED.md`.
5. **Archive aggressively**: when a doc is primarily a work log, move it to `docs/archive/`.
