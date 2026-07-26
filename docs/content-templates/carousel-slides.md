---
title: Carousel slides 2-10 (hosted / MCP)
status: current
last_verified: 2026-07-26
last_verified_note: Builders moved to src/ and exposed via /api/skill/images/carousel-slide + create_carousel_slide MCP tool.
owner: content
related: [./README.md, ./cover-slide.md]
---

# Carousel slides 2-10

The four non-cover slide layouts, and how an agent's Claude session reaches
them.

## Why this doc exists

Until 2026-07-26 these four builders lived only in
`scripts/lib/slide-templates.js`. That file is plain Node tooling; the Next
app cannot import it. The cover had a route (`/api/skill/images/cover-slide`)
from day one, so the hosted surface could render **slide 1 and nothing else**.
Four production carousels shipped from these builders — but only ever by
running `scripts/carousel-build.js` locally against a hand-authored config.

They now live in
[`src/lib/cover-templates/carousel-slides.js`](../../src/lib/cover-templates/carousel-slides.js),
and `scripts/lib/slide-templates.js` **re-exports** from there. There is one
implementation of each layout. Edit it in `src/`.

> Duplicating the cover across those two files is what let them drift into
> shipping *different* layouts (the floating-headshot regression, `ad348995`).
> The other four are not repeating that.

## Anatomy of the 10-slide post

| Slide | What | Produced by |
|---|---|---|
| 1 | Cover | `create_listing_cover` |
| 2-5 | Room photos, agent composited in | `stage_listing_with_agent`, then `create_carousel_slide` `kind:"banner"` on each |
| 6 | Subdivision CMA stat card | `create_carousel_slide` `kind:"cma"` |
| 7-9 | Copy slides | `create_carousel_slide` `kind:"text"` |
| 10 | Closing CTA | `create_carousel_slide` `kind:"cta"` |
| — | Publish | `post_instagram_carousel` (`social:post`) |

**Staging generates no text.** `stage_listing_with_agent`'s prompt ends
`"no text overlays"` — correct, because image models render type badly. The
room label and caption are composited afterwards by `kind:"banner"`. A staged
photo that never gets banded is a bare photo; that is the missing step, not a
model failure.

## Route

`POST /api/skill/images/carousel-slide` — scope `landing_pages:write`, the same
tier as the cover route. Rendering is not publishing.

### Fixed-position layouts validate arity

Several of these layouts place elements at absolute `y` offsets rather than
flowing them, so the route refuses out-of-range input instead of rendering
off-canvas:

- `cma` requires **exactly 4** stats — the grid is 2x2 at fixed columns.
- `cta` requires **exactly 2** paragraphs — both sit at fixed `y`.
- `text` paragraphs are capped at **220 chars**. Vertical flow advances `y` by
  an *estimated* line count (32 chars/line) because Cloudinary wraps
  server-side and cannot report rendered height back. A long paragraph pushes
  the closing italic line off the slide.

### Compliance: CTA identity is server-resolved

The closing slide prints the agent's name and DRE number. Those — plus the
headshot and brokerage logo — are read from the authenticated `User` record and
are **not accepted from the request body**. A caller cannot stamp another
agent's license onto a card. This is the same failure mode that put the wrong
agent's DRE on a tenant site in July 2026.

## Feeding the CMA slide

`kind:"cma"` takes formatted strings, not raw numbers — it is a renderer, not a
calculator. Pull real figures first (`get_subdivision_cma` / `get_market_stats`)
and format them:

```
scope:        "THE CITRUS"
period:       "4BR+ · $1.5M-$3.5M · LAST 12 MONTHS"
stats:        [ {value:"6",      label:"HOMES SOLD"},
                {value:"$2.36M", label:"MEDIAN CLOSE"},
                {value:"$570",   label:"PRICE / SQFT"},
                {value:"$3.06M", label:"TOP CLOSE"} ]
listingLabel: "THIS LISTING"
listingPrice: "$2,599,000"
pitch:        "Above the recent median in The Citrus. Below the top close."
```

Keep `pitch` factual. It positions the subject listing against real comps and
must not characterize another agent's pricing.

## Known gap: authoring is still manual

Rendering is now reachable end-to-end. **Assembly is not.** Nothing takes a
`listingKey` and returns ten slides — the copy, room labels, pose direction and
CMA framing are still written per listing, exactly as the
`scripts/data/carousels/*.js` configs were. The MCP path replaces the config
file with a Claude session; it does not yet replace the authoring.

`scripts/carousel-build.js` also supports per-room `pose` and `expression`
direction that the hosted `stage_listing_with_agent` route does not — it uses
one fixed prompt for every photo. That is why the script-built carousels vary
the agent's stance room to room and hosted output does not.
