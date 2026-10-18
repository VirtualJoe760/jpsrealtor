// 80519 Avenida Santa Isadora, Indio — $468,900 (Ashley N Robertson / The Obsidian Group)
//
// WHY THIS LISTING. First build in four weeks; the pool refilled while nothing
// ran. tmp-pool4.js returns 40 broad actives / 33 key-matched and twelve FRESH
// stageable rows, up from five. Nine of the twelve are disqualified before any
// spend:
//
//   3010 Chuperosa    K6 relisted — scripts/data/pending/chuperosa-road.ts
//   7798 Acoma        E4 relisted — scripts/data/pending/acoma-trail.ts
//   5803 Los Santos   A8 relisted — scripts/data/pending/los-santos.ts
//   56616 Mountain View  44 ph — standing strike, interiors #3-#28 all bare
//   58540 Barron         29 ph — standing strike, photography and condition
//   2502 Harbor          17 ph — standing strike, "CASH ONLY. INVESTOR ONLY"
//
// That leaves six genuinely never-built rows: Avenida Rubio (40 ph), Willow
// (27), Lugo (35), THIS (52), Latham (34), Calle Bosque (41). Santa Isadora has
// the deepest photo set of the six, which is what the stager wants — it rejects
// frames freely and this one can afford it.
//
// NOT A RENDERED SET. furnished: "Furnished" agrees with the photographs
// (actor-generation.md §10 — Sea Life and Warren Vista are the inverse pair,
// "Unfurnished" on furnished frames). Remarks disclose no virtual staging, and
// both corner strips were read across all 52 frames: tmp-watermark-strip.py
// (top-left) and tmp-corner-strip.py (bottom-right) are clean end to end.
//
// EXCLUSIONS: 7,21,25,27,39,40,42,43,44. Read off tmp-selector-dump.ts, not the
// contact sheet. The shortlist is #15 living, #22 kitchen, #39 pool, #41
// outdoor_living, #27 primary_bedroom, #18 dining, #32 bedroom, #7 exterior,
// #14/#16/#24/#25 living, #20/#21 kitchen. Taken in order:
//
//   #39  POOL WATER IN THE LOWER HALF. actor-generation.md §9 — the water fills
//        the left-centre below the midline and the proposed spot is "the
//        concrete patio to the right of the small green bush". Cantata's #60
//        was the same bet and shipped the agent standing on a tanning shelf.
//   #40, #42, #43, #44 — same category, not on the shortlist, excluded anyway
//        so a re-rank cannot promote one.
//   #21  kitchen island shot ACROSS the island, dishwasher's near face filling
//        the bottom. The galley-across-the-counter category, §9.
//   #27  primary bedroom shot from the doorway, the bed filling the whole lower
//        left. Doorway-bedroom category, and the armchair it proposes is shot
//        from the side — the Azzura "seated beside the sectional" shape.
//   #7   front elevation: garage door, driveway, street. §3's documented gap —
//        the reader has no front-exterior key and Chuperosa shipped a closed
//        garage door captioned OUTDOOR LIVING.
//   #25  an empty tile passage with the living room distant at one end. §3,
//        "corridors and empty circulation space — nothing to do."
//
// WHAT SURVIVES, in rank order: #15 living, #22 kitchen, #41 outdoor_living,
// #18 dining, then #32 bedroom and #14/#16/#24 living and #20 kitchen as the
// nine staged candidates for four slots. Checked frame by frame at full size:
// #22's bar stool has its seat facing the lens on open tile (not the Azzura
// shape), #18 is a GLASS table on open tile with every chair clear of the
// foreground (not the dressed-table shape), #15 keeps clean tile running to the
// bottom edge left of the sectional.
//
//   #41 IS THE ONE I AM NOT SURE OF. It is the covered patio — a very large
//   concrete slab filling the bottom 45% of the frame, which is what RANSAC
//   should fit — but a small patch of pool water sits just BELOW the midline,
//   seen through the far archway. §9's test is absolute ("any water at all in
//   the lower half"), so by the letter this frame is a candidate for the
//   Cantata failure. It is kept because the alternative is no outdoor slide at
//   all on a south-facing-patio house, and because the failure is the cheap
//   kind: tmp-drop-slide.js removes one slide without re-rolling the other
//   three. Look at slide 3 before approving.
//
// WHAT THE BUILD ACTUALLY DID (2026-10-17, code G6). The selector re-ranked
// between the dump and the build and handed staging a DIFFERENT nine: #17,
// #18, #37, #14, #15, #16, #24, #20, #22. #17 and #37 were never in the dump;
// #41 and #32 were in the dump and were never offered. So the exclusion list
// above is a filter on a set that moved under it — see auto-posting.md
// "Built 2026-10-17". Consequences for anyone rebuilding this listing:
//
//   - The #41 worry above was never tested. It is not retired, it is unspent.
//   - #17 and #18 both passed and are THE SAME GLASS TABLE with the same
//     action. #18 was dropped (tmp-drop-slide.js ... 3) and #17 kept, because
//     #17 is the only frame in the post that contains the great room. If you
//     rebuild, exclude one of the two up front.
//   - #37 is the laundry room; the reader refused it as utility space.
//
// Shipped: slide 2 #17 THE GREAT ROOM, slide 3 #20 THE KITCHEN. The `living`
// line below is the one printing over #17, and it is deliberately still the
// invariant rather than rebanded to that frame — copy-voice.md's Cantata note,
// a caption made specific to a render is a loaded gun for the next build.
export default {
  listingKey: "20261011210159533281000000",
  // #43 over #0. The twilight hero reads beautifully in landscape and does not
  // survive the crop: buildCoverTransformation applies ar_4:5 + g_auto FIRST,
  // and what is left on the visible right side is two power poles, overhead
  // wires and cracked asphalt. Rendered both before choosing (copy-voice.md §8,
  // "judge a cover frame by its right half" — against the 4:5 crop, not the
  // original). #43 keeps the pool, the stacked-stone waterfall, the hedge and
  // the roofline on the visible side.
  coverPhotoIndex: 43,
  // Deep rust off the tile roof and the waterfall stone in that same frame.
  // Teal was drafted first — it is the house's own accent wall — and rendered
  // as the same family as the pool water it sits beside, which is the Ridge
  // Road champagne-on-tile-roof failure. Terracotta is the one colour in this
  // photograph that the turquoise sets off instead of absorbing.
  accentColor: "8C3A1F",
  hook: "WINTER SUN",
  // No bed or bath count here — the spec strip three lines up prints the feed's
  // own numbers (Jamaica Sands, copy-voice.md §8).
  coverBody:
    "A south-facing patio that holds the sun all winter, a private pool with a waterfall behind it, and a golf cart bay with its own door. Offered furnished, in Del Webb Sun City Shadow Hills.",
  // Captions keyed by ROOM. great_room/office/other collapse into `living`,
  // outdoor/outdoor_living into `pool`, bedroom into `primary_bedroom` — the
  // first matching row answers for the whole group, so no aliased key gets its
  // own row here (Roadrunner Lane shipped a secondary bedroom under the primary
  // suite's line because it did).
  rooms: [
    // Answers for #15, #14, #16, #24 and #25. The tile, the vaulted ceiling and
    // the open plan are in all five. Nothing names the teal accent wall, the
    // fireplace or the TV: the wall is out of shot in #14, and Hombria and
    // Apache are the pair that lost that bet from opposite sides. Reband once
    // the build log says which frame shipped — it costs no Gemini.
    { room: "living", caption: "Tile underfoot, vaulted ceilings, and one open room from end to end." },
    // Holds over #20, #21, #22 and #23. Granite and the maple runs are in every
    // one of them; the island and the bar stools are not in #20, so the line
    // closes on the cabinets rather than the island.
    { room: "kitchen", caption: "Granite counters, GE appliances, and cabinets the whole way down." },
    // #18 and #17 are the same glass table from two angles, both with the
    // slider in shot.
    { room: "dining", caption: "Glass-top table, tile underfoot, and the patio a few steps through the slider." },
    // outdoor/outdoor_living collapse into `pool`, and poolYN is true with
    // poolFeatures "In Ground, Private", so ROOM_LABELS.pool stays THE POOL
    // DECK and the stager's own key decides between that and OUTDOOR LIVING.
    // The line has to be true under either label and over the covered patio,
    // the lawn and the pool deck alike. So it names no object and no time of
    // day — Cantata's outdoor line is the cautionary case in both directions —
    // only the orientation, which is a listing fact and cannot be cropped out.
    { room: "pool", caption: "The back of the house faces south, so the patio holds its sun all winter." },
    // `bedroom` collapses in here for the CAPTION while the LABEL still comes
    // off the stager's key, so a guest-room frame prints THE BEDROOM and not
    // THE PRIMARY. #27 is excluded and #32 is the only bedroom left in the
    // stageable set; the line is a listing fact about both rooms rather than a
    // claim about anything in the frame.
    { room: "primary_bedroom", caption: "Both bedrooms have their own bath, so nobody is sharing with the guests." },
    // Insurance only — #7 is excluded, but `exterior` has no alias and would
    // otherwise fall through to the spare line.
    { room: "exterior", caption: "Corner lot, desert planting, and the mountains sitting on the horizon." },
  ],
  fallbackCaption: "Del Webb Sun City Shadow Hills, on a corner lot in Indio.",
  textPosts: [
    {
      // Paragraph 1 kept short — Sea Life's 95-character opener wrapped to
      // three lines and ran into paragraph 2's fixed offset.
      paragraphs: [
        "Fully furnished means the furniture conveys.",
        "You close, you get the keys, and what you need the first night is a suitcase and groceries. Nothing to move, nothing to buy, nothing sitting in storage.",
      ],
      italicLast: "Bring the suitcase. That is genuinely the list.",
    },
    {
      paragraphs: [
        "The den behind the double doors is the room that decides this one.",
        "Office, hobby room, or where the grandkids sleep when they visit. Both bedrooms have their own bath, so that works without anyone negotiating.",
      ],
      italicLast: "Ask which rooms a buyer actually uses.",
    },
    {
      // associationFee 398, associationFeeFrequency Monthly, and
      // associationAmenities "Clubhouse, Fitness Center, Golf Course, Paddle
      // Tennis" with communityFeatures "Golf Course Within Development" — every
      // item here is a feed field, not a claim about the photographs.
      paragraphs: [
        "The dues here are $398 a month, and buyers always ask what that buys.",
        "Clubhouse, fitness center, paddle tennis, and a golf course inside the same gates. That is the number doing something rather than just sitting there.",
      ],
      italicLast: "Worth asking before you decide the dues are high.",
    },
  ],
  // Both paragraphs under ~110 characters — buildCtaTransformation places
  // paragraph 2 at a fixed three-line offset and a fourth line is overprinted
  // (Hepburn Drive).
  cta: {
    paragraphs: [
      "In a community like this one, half of what you are buying sits outside the lot lines.",
      "Which amenities, which dues, which rules. Better I walk you through it than hand you a packet.",
    ],
    italicLast: "DM me. I will tell you what to ask.",
  },
  caption: `Fully furnished San Sebastian plan in Del Webb Sun City Shadow Hills, on a corner lot in Indio with mountain views.

Granite counters and GE appliances in an open kitchen, a den behind double doors, both bedrooms en suite, and a south-facing backyard with a private pool, a waterfall and a spa. Golf cart bay with its own door. Built 2005. HOA $398/mo covers the clubhouse, fitness center, paddle tennis and golf inside the gates.

2 BD · 3 BA · 1,753 SQFT · $468,900

Listed by Ashley N Robertson · The Obsidian Group · eXp Realty Of Southern California Inc

#indio #delwebb #suncityshadowhills #coachellavalley #desertliving`,
};
