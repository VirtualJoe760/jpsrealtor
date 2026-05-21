# Docs Drift / Outdated Notes

This file tracks documentation that appears **out of sync** with the current repository state.

> Goal: make drift visible so it gets fixed (or archived) instead of silently confusing future work.

## Confirmed drift

### Deployment target (VPS vs Cloudflare Pages)

- Root `README.md` claims **Deployment: VPS (DigitalOcean)**.
- `docs/README.md` ΓÇ£Technology StackΓÇ¥ section lists **Deployment: Cloudflare Pages**.

Both may have been true at different times, but the repo should have one clear ΓÇ£current productionΓÇ¥ statement.

**Suggested fix**:
- Decide current truth (VPS, Cloudflare Pages, or both with clear separation).
- Update `README.md` + `docs/deployment/*` to match.

## Scattered / hard-to-discover docs

### Many root-level status/task markdown files

There are many `*.md` files in repo root that look like:
- session summaries
- bug reports
- one-off implementation completion notes

These are useful, but they are not easy to browse and donΓÇÖt follow the `docs/` taxonomy.

**Suggested fix**:
- Move historical/session-style docs into an archive directory (see `docs/STRUCTURE.md`).
- Keep only the main `README.md` (and possibly a small set of top-level operational runbooks) at root.

## Needs review (not fully verified)

- Any doc that references scripts that no longer exist or paths that changed should be added here as discovered.

### Root README links to missing docs

`README.md` links to several files that do **not** exist in this repo:

- `docs/QUICKSTART.md`
- `docs/DOCUMENTATION_INDEX.md`
- `docs/VPS_SETUP_INSTRUCTIONS.md`
- `docs/IMPLEMENTATION_SUMMARY.md`
- `docs/FOR_VPS_CLAUDE.md`
- `docs/VPS_CLAUDE_CONTENT_WRITER.md`

**Suggested fix**:
- Update `README.md` to point to the correct current docs (likely `docs/README.md` and the appropriate deployment runbooks under `docs/deployment/`).
- Or restore/migrate the missing docs if they existed in a prior history.

