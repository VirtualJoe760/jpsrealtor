// 84146 Azzura Way, Indio — $625,000 · Terra Lago
// (Ashley N Robertson & Parker Jaeger · eXp Realty Of Southern California Inc)
//
// WHY THIS ONE. 40 team actives, 20 ever queued, 21 never queued; 11 of the
// never-queued are sales with >=12 photos. Four of those eleven are already on
// record as unusable — Calle San Antonio, Encanto and Barron vacant, Hombria
// set aside 2026-08-22 for heavy wide-lens distortion — which leaves seven
// genuinely open names. Azzura Way is the one auto-posting.md
// §"Re-measured 2026-08-25" already named as the next fallback, and it is the
// top of the remaining list on price, photo count and furniture at once:
//
//   84146 Azzura Way, Indio, $625k, 75 photos     → BUILT. Furnished, bright,
//        professionally lit, undistorted, and every room styled. The kind of
//        photography §"Re-measured 2026-08-22" found predicts staging yield
//        better than anything else in the selection filter.
//   3470 Warren Vista, Yucca Valley, $399k, 64    → unchecked, next fallback
//   28 Oak Tree, Rancho Mirage, $479,900, 41      → unchecked
//   5803 Los Santos Dr #19, Palm Springs, $415k, 56 → unchecked
//   1321 Sea Life Ave, Thermal, $315k, 48         → unchecked, new 2026-08-26
//   7526 Apache Trail, Yucca Valley, $295k, 31    → unchecked
//   2502 Harbor Drive, Thermal, $230k, 17         → unchecked, new 2026-08-26
//
// Only 53806 Ridge Road has ever reached status "posted", so nothing here
// risks a repeat.
//
// Visually unlike the last several queued: emerald-green cabinets, gold
// curtains, a brown velvet sectional and a paint-splash rug, against a
// white-and-tile Bermuda Dunes contemporary, a Lancaster tract home and a
// Palm Springs tower unit.
//
// coverPhotoIndex 56, measured rather than guessed. Rendered the real
// simple-luxury transformation over 58, 56, 60, 48 and 36 first — free,
// because the cover is a pure Cloudinary transform, and `gravity: auto`
// re-crops the frame so copy-voice.md §8's right-half rule cannot be applied
// to the original by eye:
//   58  the postcard pool shot by subject. gravity:auto pulled hard right and
//       what survives the panel is a gravel bed, a block wall and a
//       bougainvillea. The pool is gone. §8 in its purest form again.
//   60  yellow loungers on turf with the house behind. Handsome, but no water
//       survives, so any hook about the pool would be unsupported.
//   48  the covered patio. Half the surviving frame is patio ceiling.
//   36  the green kitchen, and the most distinctive photograph in the set —
//       but an interior cover buries the pool, and the hook then has to carry
//       the kitchen instead of the house.
//   56  keeps the pool down its own length, the raised spa at the far end, the
//       covered patio, the house and open sky, all in the surviving half.
//
// hook TURNKEY rather than POOL AND SPA. Both rendered. "POOL AND SPA" wraps
// to two lines at 96pt and restates what the photograph already shows; TURNKEY
// sets on one line and adds the thing the picture cannot say — it has been an
// active short-term rental, and the furniture in every frame conveys.
//
// accentColor 216D3F, sampled off the kitchen cabinet shadows rather than
// picked. Also rendered against the teal 0E5B63 that Jamaica Sands used: over
// this cover the teal sinks into the pool water and the panel edge disappears,
// while the green separates cleanly from the turquoise and carries the
// listing's own signature colour through every later slide.
//
// Exclusions passed on the build. Read as categories, not indexes:
//   0,1,2        front elevation, driveway, garage doors. actor-generation.md
//                §3 — no front-elevation key, so these return `outdoor`,
//                normalise to `pool` and print under THE POOL DECK.
//   3-11,63-74   drone and elevated aerials, twenty of them. The lake is the
//                best thing in this set and it is only ever shot from 200 ft,
//                so it goes in a text slide instead.
//   13,19,20,21  bedrooms shot across the foot of the bed. actor-generation.md
//                §9: the composite has no depth ordering, and this is the exact
//                frame that put him on the mattress at 1950 S Palm Canyon #128.
//   14,15        the bunk room. Not depth — de-duplication. `bedroom` collapses
//                into `primary_bedroom`, so exactly one bedroom slide survives
//                and these would compete with 18 for it.
//   16,22,23,24,25  bathrooms. §3, never.
//   17           the laundry alcove.
//   32,33,42,47  great-room frames whose sectional runs across the bottom edge
//                as an opaque near face, and whose placement comes back
//                `seated_sofa`. Same §9 category as the bedrooms above.
//   37,39,40,41,43,44  kitchen frames shot across the island or the counter,
//                plus the range and sink close-ups. Galley-across-the-peninsula,
//                the category §9 says to exclude up front. 35, 36 and 38 are
//                shot from the living room with floor between lens and island.
//   46           the dining table shot down its own length.
//   49           the patio table shot across its own top.
//   52,53,54,55,56,57,58,60,61,62  every backyard frame where the pool fills
//                the lower half. actor-generation.md §9: still water in flat
//                light is a cleaner plane than most floors and RANSAC fits it
//                first — 41481 Jamaica Sands shipped the agent standing on the
//                surface of the water with every gate passing. 59 goes too: it
//                is a blank block wall and an outdoor shower. That leaves 48,
//                50 and 51, where the largest horizontal surface is concrete.
//   56           also the cover, so it cannot return as a room slide as well.
//
// NOT excluded, and this is the correction that build W3 cost: 27,28,29,30,31,
// the great-room frames whose only foreground object is the GLASS coffee table.
// W3 treated those as the same §9 depth category as the island and the bed and
// excluded all of them, which left the stager two candidates for four slots and
// shipped a one-room carousel. A low glass table is not that category — it
// occludes a standing figure from the shin down, through glass, and the floor
// plane still wins the RANSAC fit because the fit takes the LOWEST strong
// horizontal plane. The category to exclude is an OPAQUE near face at waist
// height, not any object in the foreground.
//
// That leaves 14 eligible frames — seven living, three kitchen, one dining and
// three outdoor. It matters that the number is close to 14: the selector
// returns its own top 14 of all 75, `--exclude` is applied to that result
// afterwards, and W3 removed 12 of the 14 it was handed.
export default {
  listingKey: "20260818204024734236000000",
  accentColor: "216D3F",
  coverPhotoIndex: 56,
  hook: "TURNKEY",
  // No bed or bath count in here — the spec strip three lines above is built
  // from the feed and already says 3 BD | 2 BA (copy-voice.md §8). This one has
  // no half bath, so there is nothing to contradict, but the rule stands.
  coverBody:
    "Furnished and ready in Terra Lago. Pool with a tanning deck, heated spa, covered patio, and a private lake and fitness center a few streets away.",
  // Keyed by ROOM, never by position, and written to the SPACE rather than to
  // the frame I hope the stager picks — the key is not stable across runs
  // (copy-voice.md §8). Aliases collapse before the lookup, so only the
  // canonical key of each group appears: great_room/office/other → living,
  // outdoor and outdoor_living → pool, bedroom → primary_bedroom.
  //
  // No time of day anywhere below. Every exterior frame here is midday, but the
  // run picks the hour as freely as it picks the crop (9223 N Star Trail).
  rooms: [
    // Answers for great_room, office and other, so it has to hold for any frame
    // of the open plan — and, per Acoma Trail, for a dining or kitchen frame
    // that comes back `living`. Both claims are house-wide: the record says
    // Laminate flooring and every interior photo shows the same plank, the
    // walls are white in all thirty-odd of them, and Furnished is a field on
    // the listing rather than something in a crop. Deliberately NOT named: the
    // velvet sectional, the wall TV, the gold curtains and the paint-splash
    // rug, each of which is in some open-plan frames and not others.
    { room: "living", caption: "Wood-look floors, white walls, and it sells furnished the way you see it." },
    // Green cabinets and gold pulls are in every kitchen frame AND in the wide
    // living frames that see through to the kitchen, so this survives the key
    // moving. The granite counters are in all of them too. Deliberately NOT
    // named: the stools at the island — 41481 Jamaica Sands shipped "stools
    // pulled up to it" over a frame whose stools were around the far corner and
    // out of the crop.
    { room: "kitchen", caption: "Emerald green cabinets, gold hardware, and granite counters right through it." },
    // `dining` is the one key here with no alias feeding into it —
    // great_room/office/other collapse to living, outdoor to pool, bedroom to
    // primary_bedroom — and #46 is excluded, so #45 is effectively the only
    // frame that can land under this label. So this one caption is written to
    // the frame rather than the space, and both objects it names are in it: the
    // three canvases on the right wall and the curtained patio slider on the
    // left.
    //
    // Build W3's version — "the table sits in the same room as the kitchen" —
    // was the copy-voice.md §8 failure of being contradicted by a frame without
    // naming anything absent. The crop is a table against a blank wall hung with
    // art and reads as a closed dining room; a line insisting the kitchen is in
    // the same room argues with the picture even though it is true of the house.
    { room: "dining", caption: "Six at the table, art on the wall, and the patio through the door beside it." },
    // Answers for `bedroom` too, so it has to survive the primary and the
    // secondary. Both claims are listing facts rather than crop contents: three
    // bedrooms on the record, Furnished on the record, and the same laminate
    // plank runs through the bedrooms as the rest of the house.
    { room: "primary_bedroom", caption: "Three bedrooms, all furnished, all on the same floors as the rest of it." },
    // Answers for outdoor and outdoor_living, so it names only what is in all
    // three surviving backyard frames: concrete deck and block wall. The pool,
    // the spa, the fire pit and the covered patio are each in some of them and
    // not others, so they are in the text slides instead.
    { room: "pool", caption: "Block wall on every side and enough deck out here to put everybody somewhere." },
    // Only reachable if a front elevation slips through the exclusions. Both
    // facts are off the record — Block fencing, parkingTotal 6 — and true of
    // the front.
    { room: "exterior", caption: "Two-car garage, room for six on the driveway, and block wall around the lot." },
  ],
  fallbackCaption: "Three bedrooms and a heated pool, furnished and ready, in Terra Lago.",
  textPosts: [
    {
      paragraphs: [
        "There is a lake in the middle of this neighborhood.",
        "Terra Lago is built around it, and the HOA is $325 a month for the lake, the fitness center, the community pool, the parks and a golf course inside the development.",
      ],
      italicLast: "A lap around the water before it gets hot.",
    },
    {
      paragraphs: [
        "It has been running as a short-term rental, and it sells furnished.",
        "The furniture in these photos stays — beds, sofa, dining table, the patio set and the loungers by the pool. You get the keys and the house already works.",
      ],
      italicLast: "Ask me what the booking calendar looked like.",
    },
    {
      paragraphs: [
        "The pool is heated and so is the spa.",
        "There is a tanning deck in the pool, a covered patio with a fan over the table, an outdoor shower on the side of the house, and turf instead of grass so there is nothing to mow.",
      ],
      italicLast: "Everyone is going to end up out here.",
    },
  ],
  // Two paragraphs, both under ~110 characters. buildCtaTransformation places
  // paragraph 2 at a fixed three-line offset and does not reflow, so a
  // four-line first paragraph gets overprinted (48423 Hepburn Drive).
  cta: {
    paragraphs: [
      "A heated pool and a lake down the street read better in person than on a phone.",
      "I will meet you at the house, and we can walk down to the water after.",
    ],
    italicLast: "DM me and we will pick a time.",
  },
  caption: `Three bedrooms, two baths and a heated pool in Terra Lago, and it sells furnished.

Out back: a pool with a tanning deck, a heated spa, a covered patio with a fan over the table, an outdoor shower, block wall on every side and turf instead of grass.

Inside, an open plan with emerald green cabinets, gold hardware and granite counters in the kitchen, wood-look floors throughout, and everything in these photos included. It has been an active short-term rental.

Terra Lago itself has the private lake, a fitness center, a community pool, parks and a golf course in the development. HOA $325 a month.

3 BD · 2 BA · 1,637 SQFT · $625,000

Listed by Ashley N Robertson & Parker Jaeger · eXp Realty Of Southern California Inc

#terralago #indio #coachellavalley #poolhome #turnkey #desertrealestate`,
};
