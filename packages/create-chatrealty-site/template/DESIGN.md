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
| **Light / dark** | `--background` **+** `--text` in `globals.css` | the whole page, **and Tailwind's entire `gray` scale** — see below |
| Surfaces | `--surface`, `--surface-2`, `--border` (all derived from the two above; override only to lift a card *off* the page) | cards, fills, hairlines |
| Text ramp | `--text-muted` (derived) | secondary copy |
| Shape | `--radius` | 0 = editorial/sharp · 0.75rem = friendly · 1.25rem = soft/luxury. Tailwind's whole `rounded-*` scale is mapped to it, so this one value shapes every surface — including the ones you write. `rounded-full` is exempt (circles stay circles); `rounded-none` is the per-element escape hatch. **Never** shape a container with `rounded-[14px]` or an inline `borderRadius` — that is precisely how a build ships sharp everywhere except the four places someone hand-rounded. |
| Type | `--font-display`, `--font-body` (load via `next/font` in `layout.tsx`) | whole personality |
| Rhythm | `--section-gap` | tight = data-forward · airy = luxury |

### Going dark is two lines

```css
:root { --background: #0f0b2c; --text: #f5f2ea; }
```

That is the entire change. `tailwind.config.ts` derives the whole `gray`
scale from those two tokens, so every `text-gray-900`, `text-gray-500`,
`border-gray-200` and `bg-gray-50` in the site — including the ones you write
next — inverts with them. This is the same trick as `--radius`, and it exists
for the same reason: a build once set `--background: #0f0b2c` while the pages
kept Tailwind's stock near-black grays, and `/about` rendered the agent's own
name at ~1.2:1 against the page. A judged session called it invisible.

Two rules that come with it:

- **`bg-surface`, never `bg-white`, for a card or panel.** `white` and `black`
  are deliberately *not* theme-derived, because `text-white` on `bg-brand` must
  stay white in every theme. `bg-white` on a page-level surface is the one way
  back into the bug above.
- **Inverted blocks are `bg-ink text-surface`, not `bg-gray-900 text-white`.**
  In a dark theme `bg-gray-900` is a *light* slab; white text vanishes on it.
  The homepage CTA shows the pattern.

Token-named utilities available for new surfaces: `surface`, `surface-2`,
`line` (borders), `ink` (primary text), `muted` (secondary). Prefer them —
they say what the colour is *for*. Note that Tailwind 3 cannot apply an alpha
modifier to a raw `var()` colour: write `text-surface opacity-80`, not
`text-surface/80` (the modifier is silently dropped).

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
- **Named markets:** naming the agent's specific areas on the homepage is good
  copy — but every name you print has to be a working link. Link it to
  `/neighborhoods/<slug>` (the slug route resolves any name against the feed and
  renders stats + active homes, with an honest empty state if the feed has none
  under that name). `/neighborhoods?q=<name>` also works as a fallback filter,
  but it is the safety net, not the destination. What is *not* acceptable is a
  named tile whose link discards the name: one build shipped
  "Balboa Peninsula → Explore" pointing at `/neighborhoods?q=Balboa Peninsula`
  back when the index ignored `q`, and every tile landed on the same
  undifferentiated page. Click each one before you call the homepage done.
- **Service areas drive `/neighborhoods`:** the index is built from the agent's
  service areas (ChatRealty profile, or `AGENT_SERVICE_AREAS` in `.env.local`),
  each annotated with live counts — not from a sample of the feed. Set them.
  A single-market agent whose token can see a wider feed previously got an
  index of whatever cities happened to land in the first 50 rows; with no
  service areas set, that sample-derived list is still the fallback.
- **Identity:** name, license, brokerage, bio and headshot come from the
  ChatRealty profile. Any of them can be overridden per-field with the `AGENT_*`
  vars in `.env.local` (see `env.example`) — that is the supported way to build
  for someone other than the token holder, or to put a license number on the
  site before it reaches the profile. Do not hardcode identity into components:
  a fallback like `agent.name || "Jane Smith"` never fires when the API returns
  a real — and wrong — name, which is exactly how a build shipped with the
  wrong agent on every page.

  **There is one identity function: `getAgentProfile()` in `lib/chatrealty.ts`,
  and it applies the overrides itself.** Every page calls it. Do not add a
  second "but with overrides" wrapper next to it — a session did exactly that,
  used the wrapper on `/contact` only, and shipped a site with one agent in the
  header and a different agent on the contact page. If a page shows the wrong
  person, the fix is a `.env.local` value or the token, never a new helper.

  **The overrides cannot save you from the wrong token.** They cover the fields
  you set; the ones you don't (headshot, bio, service areas, specializations)
  stay the token holder's, and leads land in the token holder's CRM. Confirm the
  account with the ChatRealty MCP's `whoami` before building. In development the
  site now warns on the server console when `AGENT_NAME` and the token's profile
  name disagree — if you see that line and did not intend it, stop and re-token.
- **Map:** pin style (pill / dot / teardrop), tile theme, cluster behavior.
- **Nav:** the hamburger drawer is standard on all breakpoints — restyle it, don't replace it with a link row.

## Never remove (compliance / plumbing)

- License number, brokerage, and team name — displayed and easily viewable, including the footer, on every page. Run it through `license()` (`lib/format.ts`) so it reads "License #01234567", not a bare number nobody recognizes.
- **The market scope.** The unfiltered `/listings` browse and the homepage's featured homes are scoped to the agent's cities (`MARKET_CITIES`, else `AGENT_SERVICE_AREAS`, else the profile's service areas — see MARKET SCOPE in `lib/chatrealty.ts`). The feed is wider than the market: a judged Coachella Valley build opened on Camarillo, Oakland and Stockton listings because the default browse had no scope. Restyle the browse freely; don't remove the scope.
- **Every listing link stays on this site.** Use `listingHref(listingKey)` (`lib/links.ts`), never `listing.detailUrl` — that field is the ChatRealty hub URL. CHAP result cards, the swipe deck and the photo gallery all used to send buyers to chatrealty.io.
- "Listed by {office} — {agent}" attribution on every card, detail, and map popup (IDX).
- The test-data banner while in test-data mode.
- Favorites, lead capture (honeypot + rate limit), and the server-side token boundary (`lib/`, `app/api/`).
- Contact info (phone/email) honors the agent's public-vs-gated choice; license/brokerage/team are never gated.
