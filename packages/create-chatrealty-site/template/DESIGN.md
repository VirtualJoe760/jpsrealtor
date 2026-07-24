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
- **Homepage sections + order:** featured listings, market-stats strip, about/credibility, testimonials, blog rail, CTA — include what the agent checked, in an order that fits their positioning (luxury leads with photography; investment leads with stats).
- **Listing cards:** image-top · horizontal · photo-overlay text. Every variant keeps the "Listed by {office} — {agent}" attribution (IDX).
- **CHAP presentation:** floating chat widget · inline panel on a page · full-page search experience.
- **Map:** pin style (pill / dot / teardrop), tile theme, cluster behavior.
- **Nav:** the hamburger drawer is standard on all breakpoints — restyle it, don't replace it with a link row.

## Never remove (compliance / plumbing)

- License number, brokerage, and team name — displayed and easily viewable, including the footer, on every page.
- "Listed by {office} — {agent}" attribution on every card, detail, and map popup (IDX).
- The test-data banner while in test-data mode.
- Favorites, lead capture (honeypot + rate limit), and the server-side token boundary (`lib/`, `app/api/`).
- Contact info (phone/email) honors the agent's public-vs-gated choice; license/brokerage/team are never gated.
