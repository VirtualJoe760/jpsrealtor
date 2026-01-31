# Learning Guide (Codebase Navigation)

This guide is for developers (and assistants) who need to quickly orient themselves in the **jpsrealtor** repository.

## Start here

- Documentation hub: `docs/README.md`
- Repo root README: `README.md`

If youΓÇÖre new, read these in order:
1. `docs/architecture/MASTER_SYSTEM_ARCHITECTURE.md`
2. `docs/architecture/FRONTEND_ARCHITECTURE.md`
3. `docs/listings/UNIFIED_MLS_ARCHITECTURE.md`
4. `docs/chat/README.md` (if youΓÇÖre touching AI chat)

## What this repo is

A Next.js (App Router) application with:
- a custom Node server entry (`server.js`) used for local/prod startup (and optional Socket.io)
- a large set of scripts (TypeScript + Python) for MLS data ingestion/maintenance, analytics, content tooling, etc.

## Key top-level directories

- `src/`
  - Main application code.
- `public/`
  - Static assets.
- `docs/`
  - Primary documentation (architecture, deployment, chat, CRM, etc.).
- `scripts/`
  - Utility scripts (JS/TS/Python) used for maintenance and one-offs.
- `cloudflare/`
  - Cloudflare-related deployment notes/config.
- `payload-cms/`
  - Payload CMS project area (if in use).

## Runtime entrypoints

### Development

- `npm run dev` runs `node server.js` (custom Next server).
- `npm run dev:next` runs vanilla `next dev`.

### Production

- `npm run start` runs `NODE_ENV=production node server.js`.
- `npm run start:next` runs vanilla `next start`.

If documentation references only `next dev`/`next start`, note that this repo often uses `server.js` instead.

## Core app structure (Next.js App Router)

The Next.js application is under `src/app/`.

Common places to look:
- `src/app/(site)/...` or `src/app/...` route groups/pages
- `src/app/api/...` API routes
- `src/app/components/...` UI components
- `src/app/contexts/...` React context providers

Look for in-folder READMEs, for example:
- `src/app/api/analytics/README.md`
- `src/app/api/stats/README.md`
- component-level READMEs under `src/app/components/...`

## Configuration

- `next.config.mjs`
  - MDX enabled (`@next/mdx`)
  - Production-only PWA integration (`next-pwa`)
  - Custom Webpack chunking and import modularization
- `tailwind.config.ts`, `postcss.config.mjs`
- `tsconfig.json`

## Data + pipelines (scripts)

There are **many** scripts, in both TypeScript and Python.

### TypeScript scripts
- Commonly run via `npx tsx ...` (see `package.json` scripts)
  - e.g. `db:optimize-indexes`: `npx tsx src/scripts/optimize-indexes.ts`

### Python scripts
- Many MLS/data pipeline utilities live under:
  - `src/scripts/mls/...`
  - `scripts/*.py`

If you are changing MLS ingestion, start with:
- `docs/listings/UNIFIED_MLS_ARCHITECTURE.md`
- `src/scripts/mls/backend/unified/README.md`

## Environment variables / secrets

- Do **not** commit secrets.
- Repo has local `.env.local` in some environments; use placeholders in docs.
- Environment setup docs are scattered across deployment docs (see `docs/deployment/`).

## How to answer ΓÇ£where is X?ΓÇ¥ quickly

- Search by feature area in `docs/` first.
- Then search by path:
  - Chat: `src/app/...chat...`, `docs/chat/`, `docs/chat-v2/`
  - MLS: `src/scripts/mls/`, `docs/listings/`
  - Map: `src/app/...map...`, `docs/map/`
  - CRM: `src/app/...crm...`, `docs/contacts/`, `docs/features/`

## When adding new docs

- Prefer adding to `docs/<topic>/...` and link it from `docs/README.md`.
- If a doc is an ΓÇ£outcome reportΓÇ¥ or ΓÇ£session logΓÇ¥, put it under an archive location (see `docs/STRUCTURE.md`).
