---
title: Publishing ChatRealty npm packages
status: current
last_verified: 2026-06-04
related: [./README.md, ./rollout-plan.md]
---

# Publishing the ChatRealty npm packages

Two packages ship from this repo to the `@chatrealty` npm scope:

| Package | Path | What it does |
|---|---|---|
| `@chatrealty/mcp-server` | `F:\web-clients\joseph-sardella\jpsrealtor\packages\mcp-server\` | Stdio MCP server (Claude Desktop / Code / .ai). The headline path. |
| `@chatrealty/install-skill` | `F:\web-clients\joseph-sardella\jpsrealtor\packages\install-skill\` | Legacy Markdown-skill installer. Still wired in the Integrations UI as a fallback. |

The `IntegrationsStep` UI hands users `npx -y @chatrealty/mcp-server` and
`npx @chatrealty/install-skill <token>` install commands. Those resolve only
after each package is on the public npm registry.

## One-time setup

1. **Create the org** at https://www.npmjs.com/org/create — pick `chatrealty`,
   Free plan, **Public packages only** (we set `publishConfig.access: public`
   on each package, but the org has to allow it).
2. **Verify your npm login locally:**

   ```bash
   npm whoami
   # → joeysardella   (or whichever user owns the @chatrealty org)
   ```

   If not logged in:

   ```bash
   npm login
   ```

3. **2FA for publishes (recommended).** Set `auth-and-writes` in your npm
   account settings so a code is required to publish. The publish commands
   below will prompt for the code.

## Pre-publish checklist (per package)

Run from the package directory.

```bash
cd F:\web-clients\joseph-sardella\jpsrealtor\packages\mcp-server

# 1. Clean build
rm -rf dist && npm run build

# 2. Verify what will be in the tarball — README, LICENSE, dist/, nothing else
npm pack --dry-run

# 3. Smoke-test the binary
node dist/index.js
# Expected: graceful exit with "CHATREALTY_API_TOKEN is not set" message

# 4. (mcp-server only) End-to-end test against staging
$env:CHATREALTY_API_TOKEN = "crt_live_..."
$env:CHATREALTY_API_BASE = "https://staging.chatrealty.io"
node dist/index.js
# In another shell, send an MCP initialize over stdio if you want the full check.
```

## Publish

```bash
# From the package directory
npm publish
```

`prepublishOnly` reruns `npm run build` first, so the dist is fresh.

On first publish for a scoped package the registry needs the explicit
public flag — `publishConfig.access: public` in `package.json` already
covers this. If you ever see `402 Payment Required`, that flag was dropped.

## Versioning

Bumps follow semver, but be conservative — tool **renames** break every
saved Claude conversation that references the old name. Prefer:

| Change | Bump |
|---|---|
| New tool added | minor (0.2.0 → 0.3.0) |
| Tool description tightened, schema additions that don't break old callers | patch |
| Tool removed or renamed | major (avoid until 1.0.0) |
| Bug fix | patch |

Use `npm version <patch|minor|major>` to bump + tag in one shot.

## After publish

1. Verify the page at:
   - https://www.npmjs.com/package/@chatrealty/mcp-server
   - https://www.npmjs.com/package/@chatrealty/install-skill

2. Smoke-test the install path the UI gives users:

   ```bash
   npx -y @chatrealty/mcp-server
   # Should print the missing-token error from a clean install
   ```

   And for the skill:

   ```bash
   npx -y @chatrealty/install-skill
   # Should print the installer banner and prompt for token
   ```

3. Bump `last_verified` on `docs/mcp/README.md` and on this file.

4. If this was a tool-surface change, update `docs/chat-production/TOOLS_INDEX.md`
   per the index-every-chat-tool rule.

## Unpublishing / yanking

npm allows `npm unpublish @chatrealty/<pkg>@<version>` only within 72 hours
of publish, and only when no other package depends on the version. Treat
publishes as permanent after the grace window. If a release is broken,
publish a patch — don't try to yank.

## Tech-debt items related to publishing

- **No CI pipeline.** Publishes happen from a workstation. A GitHub Action
  that runs `npm publish` on tag push is the eventual fix; we want manual
  control while the surface is changing fast.
- **No automated changelog.** Add `CHANGELOG.md` per package once the surface
  stabilizes (post v1.0).
- **`@chatrealty/install-skill` ships almost the same content as
  `chatrealty-mcp-server`'s simpler tools.** Once MCP adoption ≥ skill adoption,
  retire the skill package per the rollout plan.
