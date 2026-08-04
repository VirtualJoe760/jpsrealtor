---
title: create-chatrealty-site (frontend scaffolder)
last_verified: 2026-08-04
owner: platform
status: shipped — PUBLISHED to npm as create-chatrealty-site@0.1.0 (2026-07-10)
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

**v0.10.0 (2026-08-04) — `--radius` stops being a decoy, named markets stop
being dead ends.** `DESIGN.md` advertised `--radius` as *the* shape knob, but
every surface in the template shaped itself with a hardcoded Tailwind class
(`rounded-xl`, `rounded-2xl`), which ignores the token entirely. A judged build
set `--radius: 0` for an architectural look and shipped sharp everywhere except
the listing-detail hero, the spec box, the inquiry sidebar and the CHAP result
cards — the knob moved nothing on the surfaces nobody had hand-edited. Fixed at
the source: `template/tailwind.config.ts` now maps the whole `borderRadius`
scale onto `calc(var(--radius) * n)`, with ratios chosen so the default token
(`0.75rem`) reproduces stock Tailwind to the pixel — so `rounded-*` anywhere,
including code a builder writes later, follows the token. `rounded-full` stays
`9999px` (circles are shape, not theme) and `rounded-none` is the escape hatch.
Leaflet's own hardcoded control/popup radii are overridden too, at
`.leaflet-container.leaflet-container` specificity — leaflet.css is imported
inside `ListingMap.tsx` and lands after `globals.css`, so a single-class
override ties and loses, which is exactly what the first attempt did.

Same release: `/neighborhoods` now honors `?q=`. The judged build linked its
homepage tiles ("Balboa Peninsula → Explore") at `/neighborhoods?q=…` and the
index silently discarded the param, landing every named market on the same
undifferentiated page. The index filters on `q`, and when nothing in the feed
matches the name it says so plainly and still shows the full index rather than
rendering empty. `DESIGN.md` and the build guide now state the rule: link a
named market to `/neighborhoods/<slug>`; the `q` filter is the safety net, not
the destination.

**v0.9.0 (2026-08-04) — one CHAP presentation, enforced in code.** Choosing a
CHAP presentation used to be a deletion ("mount one, delete the others"), and
the widget shipped pre-mounted in `app/layout.tsx` — so choosing anything else
meant remembering to go remove it. A judged test build put `<HeroSearch />` in
the hero (which routes to `/search`, the full-page presentation) and left the
widget mounted: one site, two live CHAP front doors. The choice is now a single
constant, `CHAP_PRESENTATION` in `template/lib/chap-presentation.ts`
(`"widget" | "panel" | "search"`). Presentations that are not the choice render
nothing, `/search` `notFound()`s unless it *is* the choice, and `<HeroSearch />`
refuses to render without a `/search` to hand off to (dev-only console warning
explains why). `<ChapWidget />` now stays in the layout under every choice.
Same release fixes the scaffolder writing `persona.serviceAreas = [market]` —
a bare string against a `{ name, type? }[]` type, which rendered an **empty**
chip on `/about`, logged a React duplicate-key warning, and silently dropped the
market name from the homepage CTA. The CLI now writes the object form, and
`getAgentProfile()` — the one door every consumer comes through — normalizes
both shapes and drops nameless entries.

**v0.3.0 (2026-07-23) — the flagship release:** **CHAP on-site** (floating chat
widget + `/api/chat` tool loop; BYOK OpenAI-compatible, Groq default; tools call
the site's own data layer so it works in test AND real modes; listing cards with
attribution; hides until `CHAT_API_KEY` set). **Rich test data**: 47 listings
anonymized from live Palm Desert-area Actives (5 cities, 44 real subdivisions,
real geo, fictional streets/agents, scrubbed remarks) + real photos with a
burned-in "SAMPLE DATA — NOT ACCURATE" watermark. **Agent hydration**: metadata,
header, footer, About, Contact, homepage all pull `/api/skill/me/profile`
(bundled sample agent in test mode); `public/logo.png|svg` auto-wires the
header. **Blog shipped** (`/blog` + posts from published CMS articles; sample
posts in test mode) — the CMS→site loop is closed. **Neighborhoods index**
derived from live data; homepage rebuilt as a sectioned neutral canvas for the
guide's design step.

**TEST DATA mode (v0.2.0, 2026-07-23):** `--test-data` (or Enter at the token
prompt) scaffolds with **zero token, zero network** against 25 fictitious sample
listings bundled in `template/data/test-listings.json` (fake cities in empty
Mojave desert, `public/test-photos/*.svg` placeholder art, "Demo Realty — Test
Data" attribution, remarks that self-identify as fictitious).
`lib/chatrealty.ts` branches on `CHATREALTY_TEST_DATA=true` into
`lib/test-data.ts` (in-memory filter/paginate/stats; lead submit no-ops); a
permanent `<TestDataBanner>` marks every page. Purpose: the BYOD preview path —
see the site working while the data-key/VPS/tenant setup is in progress
(ship-strategy Phase P + build-guide step 1). **Never launched publicly on test
data** — the guide, the CLI output, the env file, and the banner all say so.

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

- ~~Not published to npm~~ **Published 2026-07-10**: `create-chatrealty-site@0.1.0`
  live on the registry, verified end-to-end via `npx create-chatrealty-site@latest`.
  npm account `jsardella`; org `chatrealty` reserved for `@chatrealty/*` libs.
  Republish = bump version + `npm publish` (needs the bypass-2FA granular token).
- Endpoints consumed match the current `/api/skill/*` shapes; if those routes move
  to the productized OData surface (build plan Spec 6), update `lib/chatrealty.ts`.
- v0.2 direction per [ship-strategy.md](ship-strategy.md): template becomes a thin
  shell importing `@chatrealty/ui` + `@chatrealty/auth` (three-layer update model).
