// 4140 E Calle San Antonio, Palm Springs — $570,000 · Demuth Park
// (Susanna A Stone · eXp Realty Of Southern California Inc, co-listed by The
// Obsidian Group)
//
// WHY THIS ONE, AND WHY IT WAS PREVIOUSLY DECLINED. 27305 Hombria Drive's
// header (2026-08-29) recorded this listing as re-checked and still out: "the
// house is vacant: bare rooms, a handful virtually staged, and the remarks
// disclose the staging. Nothing to render an agent into."
//
// Half of that is right and half of it is the wrong test. The house IS vacant.
// But the stager does not place a person into furniture, it fits a floor plane
// and stands them on it, and tmp-selector-dump.ts hands back fourteen frames
// with concrete spots — "standing on the light-colored wood-look tiled floor,
// to the left of the fireplace", "to the right of the kitchen island, between
// the island and the window". Empty and well-lit is a better render target than
// furnished and cluttered, which is what took 66550 San Diego Drive out.
//
// The pool it was ranked against is now down to five names and this run looked
// at all of them again rather than trusting the notes:
//
//   76434 Encanto Dr, 29 Palms, $325k, 26   → contact sheet pulled. Confirmed
//        out: bare renovated shell, phone-shot, mixed portrait/landscape
//        aspect ratios, thirteen of the 26 are the same beige exterior.
//   58540 Barron Dr, Yucca Valley, $285k, 29 → contact sheet pulled. Confirmed
//        out: pink stucco, worn brown carpet, patterned linoleum, portrait
//        phone frames throughout.
//   66550 San Diego Dr, DHS, $599k, 34      → on record, duplex packed with
//        the owner's effects; and two of everything, so every room caption is
//        ambiguous about which unit it is describing.
//   1321 Sea Life Ave / 2502 Harbor Dr, Thermal → on record. Olive walls and
//        wall murals; and a gut renovation shot on a phone, studs showing.
//
// Everything else in the never-queued pool is raw land (propertyType D, four to
// thirteen photos of dirt). So this is the field, and this listing is the only
// professionally photographed 16:9 set left in it.
//
// THE THING THAT ACTUALLY MATTERS HERE, AND IT IS NEW. Six of the 49 photos
// carry a "Digitally Altered" watermark burned into the top-left corner:
//
//   #7   a rendered POOL, spa, waterfall, path lighting and desert planting in
//        the back yard. There is no pool. The real back yard is #30–#36: a
//        poured slab under a corrugated shade structure. The selector ranked
//        this frame THIRD, appeal 0.9, and offered it as the `pool` slide —
//        "seated on the left white lounge chair within the pool's shallow end".
//        A run that trusted the shortlist would have queued a fabricated pool
//        onto another brokerage's listing.
//   #5   a rendered green front LAWN. The real front yard is #0–#4: bare
//        decomposed granite.
//   #20, #27, #34, #44  virtual furniture staging, disclosed in the remarks.
//        Ordinary and legitimate, but the watermark itself would print on the
//        slide, so they are out too.
//
// Found by cropping the top-left 30%×6% of all 49 frames into one strip and
// reading it — the watermark is white text on whatever is behind it and is
// invisible at contact-sheet size. Worth doing on any listing whose remarks
// disclose staging: the ROOM_LABELS pool guard at build-pending-post.ts:317
// reads `poolFeatures`, and a pool that exists only in a rendering leaves that
// field empty, so nothing downstream can catch this one.
//
// EXCLUSIONS 5,7,15,20,27,34,44. Six watermarked frames, plus #15 because it is
// the cover and a cover repeated as slide 2 is a wasted slot. Against the
// ranked fourteen (15, 11, 7, 30, 27, 0, 21, 16, 17, 18, 19, 20, 22, 26) that
// strikes four and keeps ten for four slots — kitchen #11, outdoor #30,
// exterior #0, the paneled room #21, and six more living frames behind them.
// Counted after the dump, not off the contact sheet (84146 Azzura Way).
//
// COVER #15, chosen by rendering the real transformation over 0, 4, 6, 15 and
// 16 first — free, and `gravity: auto` re-crops, so copy-voice.md §8's
// right-half rule cannot be applied to the original by eye:
//   4   the crop is two-thirds blank sky over a strip of dirt.
//   0   the front elevation. Survives as the right wing and a large flat lot;
//       reads as a house, but a house with nothing around it.
//   6   the side view. Survives as roofline, a parked car and a neighbour's
//       fence, with the mountains and palms in the half the panel hides.
//   16  the fireplace wall shot straight on. Handsome, and it reads as a wall
//       rather than a room.
//   15  the great room down its length: the reclaimed-wood fireplace wall lit,
//       tile floor running to the frame edge, skylight. It is the best frame in
//       the set and it is what the hook is about.
//
// ACCENT 1E3A4C, deep slate blue, rendered against plum 4A2E52, violet 3B2B4F,
// charcoal-blue 24313F, forest 1F3A2E and terracotta 6B3A2A over the chosen
// cover. Terracotta sits in the same family as the wood wall and disappears
// into it. Forest goes olive against warm wood. Violet is 5803 Los Santos
// Drive's own panel and plum is a neighbour of it — both queued this month.
// Slate blue is the complement of the wood, has the cleanest white text on it,
// and the cover is an interior, so the blue-sky clash that ruled teal out on
// Hombria does not arise here.
//
// HOOK "WOOD AND LIGHT". Fourteen characters, sets on two lines at 96pt inside
// the 480px panel. It is the through-line of every interior frame — wood-look
// tile, the reclaimed-wood fireplace wall, the paneled bonus room, white walls,
// skylights and recessed cans — rather than a claim about one room.
//
// NO BED OR BATH COUNT IN THE COVER BODY (copy-voice §8, 41481 Jamaica Sands).
// The strip three lines above it already reads 3 BD | 2 BA | 1,807 SQFT off the
// feed.
//
// CAPTIONS ARE WRITTEN TO SURVIVE THE ALIAS COLLAPSE AND THE CROP. `other`
// normalises to `living` (build-pending-post.ts:217) and #21 — the frame that
// shows the white living end opening into the wood-paneled room — is ranked
// AHEAD of every plain living frame, so the `living` line has to be true of
// both spaces and of whichever one the run hands over. It names the tile and
// the fact that the rooms open into each other, which holds in #16–#26 and in
// #21. It deliberately does not name the walls: this room has one mauve accent
// wall and a tight crop can land on it alone, which is exactly what shipped a
// false line on 27305 Hombria Drive.
//
// No caption names furniture, a plant, a time of day or a view. The house is
// empty and the run picks the hour (9223 N Star Trail).
export default {
  listingKey: "20260713184952904517000000",
  accentColor: "1E3A4C",
  coverPhotoIndex: 15,
  hook: "WOOD AND LIGHT",
  coverBody:
    "A 1947 ranch in Demuth Park with newer wood-look tile through the main rooms, reclaimed wood wrapping the fireplace, and a wood-paneled bonus room off the living area. Mountain views from the front.",
  rooms: [
    // `living` answers for great_room, office and `other` — see the header.
    { room: "living", caption: "Wood-look tile through the main rooms, and each one opens into the next." },
    { room: "kitchen", caption: "An island in the middle of it, and room for more than one cook." },
    { room: "dining", caption: "Room enough for a long table and everyone who shows up to it." },
    // The paneled room may come back as game_room rather than collapsing into
    // living. The listing agent's own remarks call it office / game room / flex.
    { room: "game_room", caption: "Wood paneling floor to ceiling, and nobody has decided what it is yet." },
    { room: "primary_bedroom", caption: "Its own end of the house, and its own bathroom." },
    // Normalises to `pool`, so this one line answers for outdoor, outdoor_living
    // and pool. There is no pool; ROOM_LABELS.pool is rewritten to OUTDOOR
    // LIVING because poolYN is falsy.
    { room: "outdoor_living", caption: "Shade already built over the patio, for the months you'll want it." },
    { room: "exterior", caption: "A flat, open lot, and nothing planted on it yet. Your call." },
  ],
  fallbackCaption: "Newer floors, fresh paint, and a 1947 floor plan that still works.",
  textPosts: [
    {
      paragraphs: [
        "Most of these rooms are empty, and I would rather show you that than not.",
        "An empty house is the honest version of itself. You see the floors, the light, the corners, and where the walls actually are.",
      ],
      italicLast: "You can see exactly what you're buying.",
    },
    {
      paragraphs: [
        "The floor plan splits: primary suite at one end, the other two bedrooms at the other.",
        "That is the thing people notice a year in, not on the tour. Guests, a night shift, a kid who practices drums — all easier when there is a house in between.",
      ],
      italicLast: "Layout outlasts finishes.",
    },
    {
      paragraphs: [
        "Built in 1947, and there is no HOA on it.",
        "Newer wood-look tile through the main rooms, newer carpet in the bedrooms, an updated guest bath. The old part is the frame and the floor plan, and that is the part I would keep.",
      ],
      italicLast: "Ask me what a 1947 house needs looked at.",
    },
  ],
  cta: {
    // Two paragraphs, both under ~110 characters. buildCtaTransformation places
    // paragraph 2 at a fixed three-line offset and does not reflow, so a
    // four-line first paragraph gets overprinted (48423 Hepburn Drive).
    paragraphs: [
      "Buying a 79-year-old house is a different job than buying a new one.",
      "I walk these with you room by room, before anybody writes anything.",
    ],
    italicLast: "DM me. Let's go see it.",
  },
  caption: `A 1947 ranch in Demuth Park, Palm Springs. Newer wood-look tile through the main rooms, a reclaimed-wood fireplace wall, and a wood-paneled bonus room off the living area.

Split floor plan, covered patio out back, two-car garage, no HOA. Mountain views from the front.

3 BD · 2 BA · 1,807 SQFT · $570,000

Listed by Susanna A Stone & The Obsidian Group · eXp Realty Of Southern California Inc

#palmsprings #demuthpark #palmspringsrealestate #palmspringshomes #coachellavalley`,
};
