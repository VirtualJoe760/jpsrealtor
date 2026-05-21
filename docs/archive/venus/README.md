# Venus (Project Assistant)

Venus is the AI assistant used alongside this repository to help with:
- exploring and understanding the codebase
- writing and maintaining documentation
- proposing implementation plans and refactors
- generating scripts, migrations, and checklists (when requested)

This repo already contains a large amount of technical documentation under `docs/`.
Venus is intended to *use that documentation as the source of truth* and help keep it current.

## What Venus can do well

- **Docs navigation**: find the right doc for a system (chat, MLS pipeline, CRM, deployment).
- **Codebase orientation**: point you to the right directories/files for a feature.
- **Diff + drift checks**: compare docs vs code (scripts, configs, environment variables).
- **Docs upkeep**: create/update docs, consolidate scattered notes, and mark stale docs.

## How to use Venus effectively

### Give context + constraints
Examples:
- “Only touch documentation files.”
- “Don’t change runtime behavior.”
- “Assume production is Cloudflare Pages.”
- “Assume production is VPS.”

### Ask for outputs you can act on
Good requests:
- “Create a step-by-step runbook.”
- “Generate a checklist for verifying the MLS pipeline.”
- “Summarize all scripts that touch Twilio.”

### Preferred workflow
1. **Start with docs**: `docs/README.md` is the documentation hub.
2. **Verify in code**: confirm scripts/config/paths match current code.
3. **Capture drift**: if docs don’t match code, add an entry to `docs/OUTDATED.md`.
4. **Fix or archive**: update docs (preferred) or move old notes into an archive location.

## Safety / hygiene rules

- Never add real secrets to docs. Use placeholders.
- Avoid committing `.env*`, credentials, or local logs.
- When creating new docs, link them from `docs/README.md` (or the nearest topical README).

## Quick links

- Documentation hub: `docs/README.md`
- Codebase navigation: `docs/learning/LEARNING_GUIDE.md`
- Docs structure proposal: `docs/STRUCTURE.md`
- Known doc drift: `docs/OUTDATED.md`