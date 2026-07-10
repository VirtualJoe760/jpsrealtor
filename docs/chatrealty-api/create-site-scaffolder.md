---
title: create-chatrealty-site (frontend scaffolder)
last_verified: 2026-07-10
owner: platform
status: shipped (v0.1, unpublished to npm)
---

# create-chatrealty-site

The frontend on-ramp for the ChatRealty API. One command scaffolds a working
Next.js real-estate site wired to a tenant's `/api/skill/*` endpoints, which the
developer then customizes. This is the starter UI the [build plan](build_plan.md)
§8.2 deliberately left out of scope ("the customer builds their own UI; we ship
the data + build-guide") — now shipped as a `create-next-app`-style generator so
customers don't start from a blank page.

Source: `packages/create-chatrealty-site/`.

## Usage

```bash
npm create chatrealty-site@latest my-site
# or
npx create-chatrealty-site my-site
# non-interactive (CI / scripting):
npx create-chatrealty-site my-site --token crt_live_xxx --api-base http://localhost:3000
```

Inputs (prompted, or via `--token`/`--api-base` flags or `CHATREALTY_API_TOKEN`/
`CHATREALTY_API_BASE` env): target directory, API base (default
`https://www.chatrealty.io`), and the tenant API token (`crt_live_…`). The CLI
verifies the token against `GET /api/skill/me` (warns + continues on failure so a
bad token doesn't block scaffolding), copies `template/`, and writes `.env.local`
(mode 0600) with the token + base.

## What the CLI is

`packages/create-chatrealty-site/src/cli.ts` — a **zero-dependency** Node CLI
(matches the `install-skill` conventions: readline prompts, `fetch`-based verify,
`tsc` build to `dist/`, CommonJS). It recursively copies `template/`, renaming the
dotfile stand-ins `gitignore`→`.gitignore` and `env.example`→`.env.example` (npm
strips some dotfiles from published tarballs). A single shared readline interface
is reused for all prompts so piped/non-interactive stdin works.

## What the template ships (full build-guide scope)

A Next.js 15 App Router site (`template/`) covering the whole build guide:

- **Listings search** — `ListingsBrowser` (client) with filters (city, price, beds,
  baths, pool), grid/map toggle, and Load-more, fetching the app's own
  `/api/listings` proxy.
- **Interactive map** — Leaflet price-pin markers with popups. `dynamic(…,
  {ssr:false})` lives in a client wrapper (`ListingMapClient`) so server pages can
  render it; Leaflet CSS is imported in the map component, not `globals.css`.
- **Listing detail** — server page (`getListing`) with full facts, remarks, a map,
  the inquiry form, and **IDX attribution** on every view ("Listed by {office} —
  {agent}"). The attribution rule is honored on cards, popups, and detail.
- **Favorites** — `useFavorites` (localStorage, custom-event sync) mirroring the
  platform's guest model.
- **Lead capture** — `/api/lead` proxy → `POST /api/skill/contacts/from-signup`,
  with a honeypot field + in-memory rate limit.
- **Neighborhoods** — server page combining `getMarketStats` + `searchListings`.

## Security model

The tenant token is **server-side only**: read from `CHATREALTY_API_TOKEN` (no
`NEXT_PUBLIC_` prefix, so Next never bundles it), used exclusively by
`lib/chatrealty.ts` (the typed server client), and every browser-facing call goes
through the app's own `/api/*` route handlers. Client components never import the
server client or see the token. `.env.local` is git-ignored by the generated
`.gitignore`.

## Verification (v0.1)

Both the CLI and the emitted template are proven:

- CLI compiles (`tsc`), scaffolds 28 files, renames dotfiles, writes `.env.local`,
  exercises the token-verify path (401 → warn → continue).
- Template `tsc --noEmit` is clean and `next build` succeeds — 6/6 pages, correct
  static/dynamic split (home + favorites static; listings/detail/neighborhoods
  server-rendered on demand).

## Relationship to the other packages

- [`packages/chatrealty-sync`](build_plan.md) — customer MLS→Postgres CLI (the
  backend bookend).
- `packages/install-skill` / `packages/mcp-server` — connect the tool catalog to a
  Claude client. The docs-site `<ClaudePrompt>` "scaffold a listings page" step
  (build plan §8.4) can point at this generator instead of hand-built snippets.

## Not yet done

- Not published to npm (build + `npm publish` from the package dir when ready;
  `files` is `["dist","template","README.md","LICENSE"]`).
- Endpoints consumed match the current `/api/skill/*` shapes; if those routes move
  to the productized OData surface (build plan Spec 6), update `lib/chatrealty.ts`.
