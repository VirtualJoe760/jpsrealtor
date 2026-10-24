---
title: Publishing ChatRealty npm packages
status: current
last_verified: 2026-10-17
related: [./README.md, ./site-building.md, ../chatrealty-api/create-site-scaffolder.md]
---

# Publishing the ChatRealty npm packages

> **TL;DR.** Four packages publish from `packages/` to the public npm registry
> under the `jsardella` account. **Bump the version first** — the registry
> rejects a republish, and a fix sitting at an already-published version
> reaches nobody. Publishing matters for stdio users only: the hosted MCP at
> `/api/mcp/mcp` compiles `packages/mcp-server` from source on every Vercel
> build (root `prebuild` → `build:mcp-server`; the app depends on it as
> `file:packages/mcp-server`), so it never waits for npm.

| Package | Path | `package.json` (2026-10-17) | Who consumes it |
|---|---|---|---|
| `@chatrealty/mcp-server` | `packages/mcp-server/` | 0.26.0 | stdio installs (`npx -y @chatrealty/mcp-server`); the hosted route uses the in-repo source |
| `create-chatrealty-site` | `packages/create-chatrealty-site/` | 0.17.1 | `npx create-chatrealty-site@latest` (build guide step 2) |
| `@chatrealty/sync` | `packages/chatrealty-sync/` | 0.8.0 | `npx @chatrealty/sync …`; scaffolded sites depend on `^0.6.4` |
| `@chatrealty/install-skill` | `packages/install-skill/` | 0.1.1 | Legacy landing-page skill, offered in Settings → Integrations |

All four set `publishConfig.access: public` and run `npm run build` in
`prepublishOnly`. The registry itself was not checked when this page was
verified (no network); the versions above are what the repo declares.

**Unpublished change on record:** `get_site_claim_code` and the claim-code
build-guide text landed in `packages/mcp-server` on 2026-10-17 (`f991b21c`,
`2ccb7839`) after the 0.26.0 bump (`828fcbf3`, 2026-10-16). If 0.26.0 is
already on npm, stdio users need a 0.26.1 publish to get them.

## Before publishing

1. `npm whoami` → `jsardella`. Publishing uses a granular access token with
   "bypass 2FA" (noted in `docs/chatrealty-api/create-site-scaffolder.md`).
   Never paste that token into chat.
2. **Bump the version** (`npm version patch|minor` in the package dir).
   - New tool → minor. Description/schema additions that don't break callers,
     bug fixes → patch. Tool removed or renamed → major (avoid; renames break
     saved conversations).
3. For `mcp-server`, also bump the hard-coded `PKG_VERSION` in
   `packages/mcp-server/src/index.ts` — it is what stdio reports in
   `initialize`, and it is currently stale (`"0.21.0"`).
4. Clean build + tarball check from the package directory:

   ```bash
   rm -rf dist && npm run build
   npm pack --dry-run          # README, LICENSE, dist/ (+ template/ for the scaffolder)
   node dist/index.js          # mcp-server: exits with "CHATREALTY_API_TOKEN is not set"
   ```

5. End-to-end against a local app: set `CHATREALTY_API_BASE=http://localhost:3000`
   and a test `crt_live_` token in the shell, then run the binary.

## Publish

```bash
npm publish        # from the package directory
```

A `402 Payment Required` means `publishConfig.access: public` was dropped.

## After publishing

1. Smoke-test the install path users get: `npx -y @chatrealty/mcp-server`
   (missing-token error from a clean install),
   `npx create-chatrealty-site@latest --help`, `npx @chatrealty/sync --help`.
2. Update the version tables in this file, [README.md](./README.md) and
   [site-building.md](./site-building.md); bump `last_verified`.
3. Tool-surface change → update [tools.md](./tools.md). (The
   index-every-chat-tool rule and `docs/chat/TOOLS_INDEX.md` cover the
   on-site CHAP tools in `tools.ts`/`preview.ts`, not MCP tools.)
4. Remind hosted users that connectors cache the tool list — they must
   reconnect to see a new tool (see [scopes-and-safety.md](./scopes-and-safety.md)).

## Unpublishing

`npm unpublish <pkg>@<version>` only works within 72 hours and only when
nothing depends on it. Treat publishes as permanent; ship a patch instead.

## Tech debt

- No CI publish pipeline — releases happen from a workstation.
- No per-package `CHANGELOG.md`; release notes live in commit messages and in
  `docs/chatrealty-api/create-site-scaffolder.md` (scaffolder only).
- The package READMEs ship to npm with the tarball, so README fixes also need
  a publish to show on npmjs.com.
