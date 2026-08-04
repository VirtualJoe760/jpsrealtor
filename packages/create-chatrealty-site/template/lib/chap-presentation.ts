// Which CHAP presentation this site uses — the single source of truth.
//
// CHAP ships three presentations (floating widget · inline panel · full-page
// /search) over one transport. Exactly ONE may be reachable by a visitor: two
// front doors to the same feature is a worse site than either door alone.
//
// This used to be enforced by instruction — "mount one, delete the others" —
// and it failed in the field. A build put <HeroSearch /> in the hero (which
// routes to /search, the full-page presentation) and left the widget mounted
// in app/layout.tsx, because the widget ships mounted and choosing anything
// else meant remembering to go delete it. That site shipped with a floating
// chat bubble AND a full-page search, both live.
//
// So the choice is a constant instead of a deletion. Set it once here and
// every presentation obeys: the ones you did not choose render nothing,
// /search 404s unless it IS the choice, and HeroSearch refuses to render
// unless it has a /search to hand its query to. Nothing to remember.
//
//   "widget"  floating bubble, bottom-right, on every page      (default)
//   "panel"   inline block — drop <ChapPanel /> into any page
//   "search"  full-page /search — link it in the nav, and
//             optionally put <HeroSearch /> in the hero

export type ChapPresentation = "widget" | "panel" | "search";

export const CHAP_PRESENTATION: ChapPresentation = "widget";

// Dev-only nudge for the case the constant cannot catch: a presentation
// component rendered while a different one is selected. Silent in production —
// the component already returns null, and a visitor is owed nothing here.
export function warnWrongPresentation(component: string, requires: ChapPresentation): void {
  if (process.env.NODE_ENV === "production") return;
  console.warn(
    `[CHAP] <${component} /> is mounted but CHAP_PRESENTATION is "${CHAP_PRESENTATION}", so it renders nothing. ` +
      `Either set CHAP_PRESENTATION = "${requires}" in lib/chap-presentation.ts, or remove <${component} />.`
  );
}
