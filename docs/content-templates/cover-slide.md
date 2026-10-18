---
title: Cover Slide Template (MCP / API)
status: current
last_verified: 2026-10-17
related: [./README.md, ./carousel-slides.md, ./copy-voice.md, ../mcp/README.md]
---

# Cover Slide Template (`simple-luxury`)

> The 4:5 Instagram cover an agent's Claude can generate on demand via the
> `create_listing_cover` MCP tool. Distinct from the 10-slide carousel pipeline
> in [README.md](./README.md) — same visual design, different delivery path.

## TL;DR

`create_listing_cover` renders a single 1080×1350 branded cover for one MLS
listing and returns a Cloudinary delivery URL. The MCP tool is a thin transport
adapter; all layout lives in the template module. Accent color is per-call, so
one layout serves every agent's palette.

## Call chain

| Step | File |
|---|---|
| MCP tool (schema only, no logic) | `packages/mcp-server/src/tools/create_listing_cover.ts` |
| REST route (data resolution, Cloudinary upload) | `src/app/api/skill/images/cover-slide/route.ts` |
| Template registry | `src/lib/cover-templates/index.ts` |
| Layout (the transformation array) | `src/lib/cover-templates/simple-luxury.ts` |
| Hook fitter (shared with the script cover) | `src/lib/cover-templates/fit-headline.js` |

The route resolves the listing from `UnifiedListing` (Active only) and the
agent's `agentProfile.headshotPublicId`, uploads one listing photo
(`photoIndex`, default 8) to `jpsrealtor/ai-staged/{listingKey}/covers` as the
base asset, then calls `template.build(data)` and hands the array to
`cloudinary.url()`. `accentColor` must be 6–8 hex digits; `hook`, `body` and
`city` are optional overrides with defaults derived from the listing. **Layout
changes belong in the template module — never in the MCP tool wrapper.** Auth is
`landing_pages:write` plus the write rate tier; a tenant-bound token is refused
(`tenantNotReadyResponse`) because the route still reads the shared dataset.

## Gotchas

**The headshot must bleed flush at `x:0, y:0`.** Agent headshots are
background-removed cutout PNGs whose source frame ends mid-torso, so each asset
carries a hard horizontal crop edge. Anchored flush, that edge runs off-canvas
and reads as an intentional bleed. Given *any* positive `y` offset it floats over
the accent panel as a visible seam and the agent renders as a chopped-off
rectangular slab.

**No bottom banner.** A full-width band at `gravity: south` terminates the torso
against a solid color and reads as a sliced headshot. A banner previously sat
here and was *masking* the seam above rather than fixing it — removing the banner
alone makes the defect worse, because it exposes the floating cut edge. The two
changes only work together: flush headshot **and** no banner.

**The listing credit wraps.** `"Listed by <Agent>  ·  <Full Office Name>"` runs
long (e.g. "Fathom Realty Group, Inc."; a competing brokerage's legal name is
longer still). It renders as a `crop: fit` block capped at width 360 and wraps
to two lines. Specs sit at
`y:605` to budget for that second line — don't tighten it back toward the address.

**Two copies of this layout exist.** `scripts/lib/slide-templates.js`
(`buildCoverTransformation`) builds slide 1 of the carousel pipeline with the same
design. It is the older, proven implementation — 4 shipped carousels. The
template module here is the newer port. Both take their hook from the shared
`fitHeadline()`; the rest is hand-synced (see the tech-debt entry). They are not
identical: the script cover places specs at `y:590` and body at 18pt, the
template at `y:605` and 19pt.

**The hook is auto-fitted, not fixed.** `fitHeadline()` returns `fontSize`, `y`,
`maxWidth` (390) for the hook overlay, which also carries `crop: "fit"`. A short
one-line hook still resolves to 96pt at `y:110`; a longer one shrinks (floor
44pt) and the block is bottom-anchored at `y:230` so it grows upward and never
reaches the city line at `y:240`. Do not hardcode `font_size`/`y` back.

**City and address lines are not width-capped on `main`.** The fix that gives
the city subtitle (wraps at `y:274`) and both address lines the same 390px cap —
and moves a unit number onto address line 2 — is commit `9288a302`, which as of
2026-10-17 is only on `feat/mls-feed-key`. Until that merges, `main` renders a
long city name ("DESERT HOT SPRINGS") across the panel edge. See
[copy-voice.md](./copy-voice.md) §8.

## Vertical rhythm (1080×1350 canvas)

| Element | Gravity | y | Notes |
|---|---|---|---|
| Hook | north_west | 110 (short hooks) | 96pt light; `fitHeadline()` shrinks/raises long ones, width cap 390 |
| City | north_west | 240 | 28pt, letter-spaced 8 |
| Price | north_west | 360 | 60pt medium |
| Divider rule | north_west | 445 | 160×1px |
| Address line 1 | north_west | 470 | 28pt light |
| Address line 2 | north_west | 510 | 20pt light |
| **Listing credit** | north_west | **548** | 14pt light italic, `crop: fit` w360, wraps to 2 lines |
| Specs | north_west | **605** (script cover: 590) | budgeted for a 2-line credit above |
| Body copy | north_west | 660 | 19pt light italic (script cover: 18pt), `crop: fit` w360 |
| Headshot | south_west | **0** | width 480 = panel width, `x:0` — flush bleed |

Left accent panel is 480×1350 at 75% opacity, `gravity: west`.

## History

- **2026-07-26** — Fixed a layout regression: the template had a full-width
  bottom banner and the headshot lifted to `y:40`, which rendered the agent as a
  sliced/floating cutout. Restored the flush-headshot + credit-under-address
  layout that `scripts/lib/slide-templates.js` already shipped. Filed from the
  field as ChatRealty bug `6a66558942b95c3d21246522`.
