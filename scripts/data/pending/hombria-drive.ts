// 27305 Hombria Drive, Cathedral City — $429,000 · Rio Vista
// (Jack Rook · eXp Realty Of Southern California Inc)
//
// WHY THIS ONE, AND WHY IT IS THE LAST ONE. The never-queued pool is down to
// seven names once the land parcels are dropped, and this run checked every
// one of them rather than trusting the earlier notes:
//
//   27305 Hombria Dr, Cathedral City, $429k, 32   → BUILT. Furnished and
//        lived-in in every room, professionally lit, and the only remaining
//        listing where the stager gets real furniture to place against.
//   4140 E Calle San Antonio, Palm Springs, $570k, 49 → re-checked, still out.
//        The house is vacant: bare rooms, a handful virtually staged, and the
//        remarks disclose the staging. Nothing to render an agent into.
//   1321 Sea Life Ave, Thermal, $315k, 48         → re-checked, still out.
//        Olive walls, empty rooms, painted wall murals, bare desert lot.
//   58540 Barron Dr / 76434 Encanto Dr             → on record as vacant.
//   66550 San Diego Dr, Desert Hot Springs, $599k, 34 → CHECKED THIS RUN, and
//        it had never been looked at. Out: a duplex packed with the owner's
//        plants, exercise equipment and personal effects in every interior
//        frame, blown-out white walls, and nine of the 34 are aerials.
//   2502 Harbor Dr, Thermal, $230k, 17            → CHECKED THIS RUN, also
//        never looked at. Out: it is a gut renovation photographed on a phone.
//        Studs, bare subfloor, no drywall in four frames.
//
//   3470 Warren Vista and 7526 Apache Trail, both held in reserve by earlier
//   runs, are NO LONGER ACTIVE TEAM LISTINGS. They return nothing on the team
//   key now. The reserve is empty; do not go looking for them again.
//
// So Hombria, which 28 Oak Tree set aside on 2026-08-22 for heavy wide-lens
// distortion. That note was a ranking against better listings, not a defect
// finding, and both of those listings are now built. The distortion is real —
// floor tile lines bow, the refrigerator in #9 is stretched — but the 4:5
// crop takes the middle and drops the barrel-distorted edges, and #2, #6 and
// #10 are close to straight. Two ever posted, so nothing here risks a repeat.
//
// GEOGRAPHY. Cathedral City is not in the review queue at all — 23 waiting
// posts and not one of them. Palm Springs has seven. That is the argument in
// this listing's favour and it is a real one.
//
// coverPhotoIndex 0, measured. Rendered the real simple-luxury transformation
// over 0, 1, 2, 3, 22, 29 and 30 first — free, because the cover is a pure
// Cloudinary transform, and `gravity: auto` re-crops so copy-voice.md §8's
// right-half rule cannot be applied to the original by eye:
//   29  the backyard, and the obvious pick by subject. The crop landed on the
//       mesquite trunk with the trash bins behind it. See the exclusion note.
//   30  the aerial over the lawn. Survives as tree canopy and a stretch of
//       roof — pretty, and it does not say which house this is.
//   2   the living room. The surviving half is the sellers' gallery wall,
//       forty-odd family photographs at thumbnail size. Not a cover.
//   3, 22  a recliner against a blank wall, and a child's bed.
//   1   the aerial over the front. Neighbours' roofs and gravel.
//   0   the front elevation, and the only frame whose surviving half reads as
//       a house: the right wing, its windows, the topiary and the gravel. The
//       mountains and the palms are in the half the panel covers, which cannot
//       be helped — they are the only exterior frames this listing has.
//
// accentColor 5A1F2A, oxblood, chosen against the cover rather than sampled
// from it. Sampling was tried: the living room's accent wall averages #5F5F5B,
// a neutral warm grey that would render as a dead panel. So the choice is by
// separation instead, rendered against violet 3C1A4B and teal 14464F. Teal
// sits in the same family as the large area of blue sky and goes soft. Violet
// works and is 5803 Los Santos Drive's own, queued yesterday. Oxblood
// separates from all three large areas here — blue sky, tan gravel and stucco,
// green foliage — and is not the same panel twice running.
//
// hook NO HOA. It is the listing agent's own lead, `associationYN` is false
// and `associationFee` is 0, and it is a fact no photograph can state — which
// is what leaves the text slides something to do. Five characters, so it sets
// on one line at 96pt inside the 480px panel with room to spare.
//
// EXCLUSIONS, aimed at the selector's ranked thirteen and dumped with
// tmp-selector-dump.ts first. The ranked list was 2, 6, 29, 18, 28, 3, 4, 5,
// 10, 11, 8, 7, 9. Three struck, ten kept:
//
//   29  outdoor_living, and the only outdoor frame offered. Struck on what a
//       zoom found rather than on geometry: there is a toilet sitting on the
//       patio against the house wall, next to a lumber pile, a mop and three
//       wheeled bins — and the lawn in that half of the frame is patchy and
//       browning. The stager's spot is left of all of it, but the band is a
//       4:5 `gravity: auto` crop of a 16:9 frame and I cannot pin which
//       vertical slice survives. Losing the outdoor slide costs less than
//       shipping one with a toilet in it. This is the category the skill's
//       "look at what you made" step is for, caught before the render instead
//       of after — the gates would have passed it.
//   28  the garage, ranked on `other`, which ROOM_ALIASES collapses to
//       `living`. It would have printed THE GREAT ROOM over bicycles and a
//       scooter. Lowest appeal in the thirteen at 0.4 anyway.
//    7  the kitchen shot across the island, placement "standing on the tiled
//       floor in front of the kitchen island" — the opaque near face at waist
//       height, which is the one category actor-generation.md says to strike.
//       Same frame family that put him through the island at 1950 S Palm
//       Canyon #128. #6, #10 and #11 are the kitchen frames with open tile
//       between the lens and the standing spot, so they stay.
//
// NOT excluded, deliberately: #5, seated on the sectional. Los Santos struck
// its sofa frame because the placement was STANDING beyond an opaque sofa
// back; a `seated_sofa` placement on the sofa itself is the geometry working,
// not the failure. And #18, the only bedroom offered, is kept despite a
// full-length mirror standing in shot behind the placement — a render that
// puts a figure on the bed and nothing in the glass is a real risk, and the
// answer to it is tmp-drop-slide.js afterwards, not throwing the slide away in
// advance. Struck it and the carousel has two room kinds.
//
// WHAT TO EXPECT. Three room kinds survive — living, kitchen, bedroom — for
// four slots, so the fourth is a duplicate the builder will skip and this is
// likely an 8-slide post. That is the cost of #29, and it was paid knowingly.
export default {
  listingKey: "20260821015844740586000000",
  accentColor: "5A1F2A",
  coverPhotoIndex: 0,
  hook: "NO HOA",
  // No bed or bath count in here — the spec strip three lines above is built
  // from the feed and already says 3 BD | 2 BA (copy-voice.md §8).
  coverBody:
    "A 1965 single-story in Rio Vista, north Cathedral City. No dues and no board. The land is fee, not leased. Attached two-car garage, tile through the living end, and a fenced back yard on a 7,405 square foot lot.",
  // Keyed by ROOM, never by position, and written to the SPACE rather than to
  // the frame I hope the stager picks — the key is not stable across runs
  // (copy-voice.md §8). Aliases collapse before the lookup, so only the
  // canonical key of each group appears: great_room/office/other → living,
  // outdoor and outdoor_living → pool, bedroom → primary_bedroom.
  //
  // Nothing below names a ceiling, a time of day, or an object that sits in
  // some frames of a room and not others.
  rooms: [
    // Answers for great_room, office and other, and per Acoma Trail it also
    // has to hold for a kitchen or dining frame that comes back `living`. All
    // three claims are house-wide rather than crop contents: the wood-look
    // tile runs through the whole open end in every frame that shows floor,
    // the walls are white everywhere but the one accent wall, and the living,
    // dining and kitchen are one connected space in every frame containing
    // more than one of them. Deliberately NOT named: the dark accent wall, the
    // wall-mounted television and the sectional, each of which is in some
    // frames of this space and not others.
    // REBANDED AFTER THE BUILD. The original line — "Wood-look tile end to end,
    // white walls, and no wall between the rooms" — was written to the space,
    // correctly, and the frame the stager returned (#3) then argued with it: the
    // 4:5 crop is filled by the ONE charcoal accent wall this house has, the
    // white walls are out of shot, and no second room is visible past it. A
    // caption contradicted by its own frame (9223 N Star Trail), and the cheap
    // fix — the band is a pure Cloudinary transform. Rewritten to the three
    // things this crop actually holds.
    { room: "living", caption: "A charcoal accent wall, a floating console, and wood-look tile underfoot." },
    // Oak cabinets, stone counters and the tile floor are in all six kitchen
    // frames and survive the key moving. Deliberately NOT named: the fuel the
    // range burns, which no field states, and the window over the sink, which
    // #8 and #9 do not contain.
    { room: "kitchen", caption: "Oak cabinets, stone counters, and tile that carries through from the living end." },
    // Answers for `bedroom` too, so it has to hold over the primary and over
    // any of the four secondary bedrooms. Every claim is off the record: three
    // bedrooms, carpet in the bedrooms, `levels: Ground`.
    { room: "primary_bedroom", caption: "Three bedrooms, carpet underfoot, and every one of them on one level." },
    // Only reachable if #8 comes back `dining` rather than `kitchen`. Written
    // to the layout, which that frame plainly shows.
    { room: "dining", caption: "A table at the end of the kitchen, and the living room open behind it." },
    // Answers outdoor and outdoor_living. The only outdoor frame is excluded,
    // so this should be unreachable — kept because the selector emits the key
    // and a caption costs nothing. Names no object and no time of day. The
    // label will read OUTDOOR LIVING, not THE POOL DECK: `poolYN` is false and
    // build-pending-post.ts rewrites the label for that (46109 Roadrunner Lane).
    { room: "pool", caption: "Block wall and fence the whole way around, on a 7,405 square foot lot." },
  ],
  fallbackCaption: "A single-story on a 7,405 square foot lot in Rio Vista, Cathedral City.",
  textPosts: [
    {
      paragraphs: [
        "No HOA is the line on this listing I would not skip past.",
        "No dues, no board, no one telling you what color the door is. It also means the yard, the roof and the paint are yours to keep up. That trade is the whole decision.",
      ],
      italicLast: "Some buyers want exactly that. Some want the opposite.",
    },
    {
      paragraphs: [
        "Ask about the land before you ask about anything else out here.",
        "A lot of homes in this valley sit on leased land, with a rent that resets on a schedule. The land under this one is fee. You own it, and there is no lease payment behind the mortgage.",
      ],
      italicLast: "It is the first thing I check on every listing I show.",
    },
    {
      paragraphs: [
        "Built in 1965, which tells you something useful.",
        "Lots were bigger then, and this one is 7,405 square feet with the house sitting on 1,531 of it. It also means the roof, the electrical panel and the ducting are worth a close look.",
      ],
      italicLast: "Age tells you what to inspect. It does not tell you whether to buy.",
    },
  ],
  // Two paragraphs, both under ~110 characters. buildCtaTransformation places
  // paragraph 2 at a fixed three-line offset and does not reflow, so a
  // four-line first paragraph gets overprinted (48423 Hepburn Drive).
  cta: {
    paragraphs: [
      "A sixty-year-old house tells you more in twenty minutes than in thirty photos.",
      "I will have the disclosures, the solar paperwork and the permit history pulled first.",
    ],
    italicLast: "DM me and we will pick a time.",
  },
  caption: `Three bedrooms on a 7,405 square foot lot in Rio Vista, north Cathedral City — no HOA, no dues, and the land under it is fee, not leased.

Inside: an open living end with wood-look tile running through it, a kitchen with oak cabinets and stone counters off the same space, carpet in the bedrooms, two full baths, central air with ceiling fans. One story, ground level, attached two-car garage and a long driveway. Built 1965.

Outside: block wall and fence the whole way around, a mature shade tree over the back lawn, and a peek-a-boo mountain view off the front. FHA, VA, conventional and 1031 all on the table.

3 BD · 2 BA · 1,531 SQFT · $429,000

Listed by Jack Rook · eXp Realty Of Southern California Inc

#cathedralcity #coachellavalley #desertrealestate #nohoa #firsthome #palmspringsarea`,
};
