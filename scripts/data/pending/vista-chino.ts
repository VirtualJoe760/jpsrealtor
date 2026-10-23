// 2800 E Vista Chino, Palm Springs — $999,500 (Peyson Robertson · The Obsidian
// Group), Desert Park Estates.
//
// Rewritten 2026-08-03. The previous version of this file was never generated
// and would not have passed review. What changed and why:
//
//   schema   rooms[] keyed by `label` ("THE LIVING ROOM") → keyed by `room`
//            ("living"). Label matching is the bug ridge-road.ts documents:
//            config rows carry no label the reader ever emits, so the lookup
//            was undefined === undefined and every slide inherited the FIRST
//            caption. Room keys are the only thing both sides agree on.
//   slide 3  "you are not inheriting someone else's 1960s electrical" and
//            "Character is wonderful. Rewiring is not." both cut. Mid-century
//            stock IS the Palm Springs market — a large share of it listed by
//            other agents — so implying it needs rewiring disparages other
//            people's listings by category (copy-voice.md §3).
//   slide 3  replaced with the furnished angle, which is a real differentiator
//            here and is in the MLS record rather than inferred.
//   colour   1C4A5A teal → 7A2740 deep berry. Every frame of this house is
//            pool blue and sky blue; a teal accent sits in the same family and
//            disappears, which is exactly the failure ridge-road.ts logged with
//            champagne against a tile roof. The berry is pulled from the
//            property's own coral/flamingo bedrooms and the lounge neon.
//   cover    photo 38 — pool, raised stone spa, house and the mountain all in
//            one frame, with clean sky top-left for the hook to sit in.
//
// "Listed furnished" is phrased that way on purpose. The MLS record says
// `furnished: Furnished`, which is the listing's own claim about itself; what
// actually conveys is a contract term. Reporting the listing rather than
// promising the outcome.
export default {
  listingKey: "20260512224233607279000000",
  accentColor: "7A2740",
  coverPhotoIndex: 38,
  hook: "POOL HOUSE",
  coverBody:
    "Single story on a 10,000 square foot lot in Desert Park Estates. A private pool with a heated in-ground spa, a pergola strung with lights, and the mountains over the back hedge. Listed furnished.",
  // Keyed by ROOM, never by position — a rejected take promotes a different
  // room into that slot and positional captions then mislabel it.
  //
  // The builder aliases great_room/office/other → living, bedroom →
  // primary_bedroom, and outdoor/outdoor_living → pool. That aliasing is the
  // trap: a caption written for the SPECIFIC room it is keyed to will land on
  // whatever else got aliased into that bucket. First build proved all three —
  //
  //   pool             banded the covered patio "THE POOL DECK" and promised an
  //                    in-ground pool, a spa and mountains, none of them in frame
  //   primary_bedroom  put "a freestanding tub through the far door" under the
  //                    flamingo GUEST bedroom
  //   living           promised a gas fireplace and vaulted ceiling on a crop of
  //                    the kitchen end of the same open room
  //
  // So every caption below has to be true of ANY frame that can reach its
  // bucket, not just the room it is named after. That constraint is why these
  // read wider than the ridge-road ones do — specificity here is a liability.
  rooms: [
    { room: "living", caption: "One open room — kitchen at one end, sofa at the other." },
    { room: "kitchen", caption: "Waterfall quartz island, navy cabinetry, and stools facing the room." },
    { room: "dining", caption: "Set the table, open the doors, let dinner run long." },
    { room: "primary_bedroom", caption: "Four bedrooms, and every one of them on this floor." },
    { room: "game_room", caption: "Sectional, neon, and nobody telling anyone to keep it down." },
    { room: "pool", caption: "Pool, spa, fire pit, pergola — the backyard is the whole argument." },
    { room: "exterior", caption: "Ten thousand square feet of lot, and the palms came with it." },
  ],
  fallbackCaption: "A single-story pool home in Desert Park Estates.",
  textPosts: [
    {
      paragraphs: [
        "Everybody asks about the pool. Almost nobody asks about the spa.",
        "This one is in-ground and heated, which makes it a December feature instead of a July one. Out here that is most of the year.",
      ],
      italicLast: "The spa is the part you use in January.",
    },
    {
      paragraphs: [
        "Four bedrooms, three full baths, and every one of them on one level.",
        "That reads like a footnote until you are hosting people who cannot do stairs, or carrying a cooler out to the pool for the sixth time that afternoon.",
      ],
      italicLast: "Where the rooms sit matters more than how many there are.",
    },
    {
      paragraphs: [
        "It is listed furnished, which is a bigger deal than it sounds.",
        "Furnishing a house this size is a season of weekends and a real line in the budget. Here you get the keys and the beds are already made.",
      ],
      italicLast: "Some houses you move into. This one you show up to.",
    },
  ],
  cta: {
    paragraphs: [
      "Palm Springs is a block-by-block town. Two streets apart can be two completely different decisions.",
      "Knowing which is which is most of what I do. I would rather talk you out of a house than sell you the wrong one.",
    ],
    italicLast: "DM me. Let's talk before you tour another house.",
  },
  caption: `Single-story pool home on a 10,000+ sqft lot in Desert Park Estates.

Private in-ground pool with a heated in-ground spa, pergola and string lights over the turf, a fire pit, and mountain views past the hedge. Inside: vaulted ceilings, a gas fireplace, waterfall quartz island, and all four bedrooms on the main level. Built 2005. No HOA. Listed furnished.

4 BD · 3 BA · 1,990 SQFT · $999,500

Listed by Peyson Robertson · The Obsidian Group · eXp Realty Of Southern California Inc

#palmsprings #desertparkestates #poolhome #palmspringsrealestate #desertliving`,
};
