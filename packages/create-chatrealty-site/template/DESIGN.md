# Design contract

This site is a **framework, not a template**. Two layers:

- **Presentation (yours — change freely):** every visual choice. The goal is a
  site that looks unmistakably like the agent's brand, not like this starter.
  If your finished build resembles the neutral scaffold, you haven't designed
  it yet.
- **Plumbing (locked — never edit to restyle):** `lib/` and `app/api/` (the
  server-side ChatRealty token boundary, favorites, CHAP, lead capture, auth),
  and the compliance/IDX rules below. Restyle the components that *use* them,
  never the boundary itself.

## The knobs

| Knob | Where | What it changes |
|---|---|---|
| Brand scale | `--brand` / `--brand-600/700` in `globals.css` **+** `brand` in `tailwind.config.ts` | buttons, links, map pins, accents |
| Surfaces | `--surface`, `--surface-2`, `--border` | page bg, cards, fills |
| Text ramp | `--text`, `--text-muted` | copy contrast |
| Shape | `--radius` | 0 = editorial/sharp · 0.75rem = friendly · 1.25rem = soft/luxury |
| Type | `--font-display`, `--font-body` (load via `next/font` in `layout.tsx`) | whole personality |
| Rhythm | `--section-gap` | tight = data-forward · airy = luxury |

## Variant axes — vary these so no two builds match

Pick per the agent's market and feel; don't default to the scaffold's choice.

- **Hero:** full-bleed photo · split (copy + image) · video · search-bar-in-hero · minimal type-only.
  - *Full-bleed:* wrap the hero in `.cr-bleed` and `main.cr-shell` stands its
    max-width and padding down for that route alone. Do **not** unwrap `<main>`
    in `app/layout.tsx` — that strips padding from every other route. Contain
    the rest of the page's sections with `.cr-page`.
  - *Search-bar-in-hero:* `components/HeroSearch.tsx` hands the query to
    `/search?q=…`. It is **not** a standalone hero option — it only renders when
    the CHAP presentation below is set to `"search"`, because that is the only
    setting under which `/search` exists.
- **Homepage sections + order:** featured listings, market-stats strip, about/credibility, testimonials, blog rail, CTA — include what the agent checked, in an order that fits their positioning (luxury leads with photography; investment leads with stats).
- **Listing cards:** image-top · horizontal · photo-overlay text. Every variant keeps the "Listed by {office} — {agent}" attribution (IDX).
- **CHAP presentation:** floating chat widget · inline panel on a page · full-page search experience.
  All three ship as components over one shared hook (`lib/use-chap.ts`) and one
  shared conversation renderer (`components/ChapMessages.tsx`, which carries the
  IDX attribution).

  **Exactly one may be reachable, and you choose it by setting one constant** —
  `CHAP_PRESENTATION` in `lib/chap-presentation.ts`. There is nothing to delete:
  the presentations you did not choose render nothing, and `/search` 404s unless
  it *is* the choice.

  | Choice | `CHAP_PRESENTATION` | Then |
  |---|---|---|
  | Floating widget *(default)* | `"widget"` | nothing — it is already mounted in `app/layout.tsx` |
  | Inline panel | `"panel"` | drop `<ChapPanel />` into any page |
  | Full-page search | `"search"` | add `/search` to the nav; optionally put `<HeroSearch />` in the hero |

  Leave `<ChapWidget />` in the layout regardless — it stands itself down when
  it is not the choice. This replaces an earlier "mount one, delete the others"
  instruction that a build followed halfway: `<HeroSearch />` went in the hero
  (which routes to the full-page `/search`) while the widget stayed mounted, and
  the site shipped with two live CHAP front doors. The constant makes that
  unreachable.
- **Map:** pin style (pill / dot / teardrop), tile theme, cluster behavior.
- **Nav:** the hamburger drawer is standard on all breakpoints — restyle it, don't replace it with a link row.

## Never remove (compliance / plumbing)

- License number, brokerage, and team name — displayed and easily viewable, including the footer, on every page.
- "Listed by {office} — {agent}" attribution on every card, detail, and map popup (IDX).
- The test-data banner while in test-data mode.
- Favorites, lead capture (honeypot + rate limit), and the server-side token boundary (`lib/`, `app/api/`).
- Contact info (phone/email) honors the agent's public-vs-gated choice; license/brokerage/team are never gated.
