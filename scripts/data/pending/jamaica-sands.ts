// 41481 Jamaica Sands Drive, Bermuda Dunes — $999,999
// (Jack A Rook & The Obsidian Group · eXp Realty Of Southern California Inc)
//
// WHY THIS ONE. The pool refilled again, exactly the "bursty" pattern
// auto-posting.md §"Re-measured 2026-08-22" describes. 38 team actives now,
// 19 ever queued, 20 never queued, of which 10 are sales with ≥12 photos.
// Six of those ten are already on record as unusable — Calle San Antonio,
// Encanto and Barron are vacant, Hombria was set aside on 2026-08-22 for heavy
// wide-lens distortion — leaving four genuinely new names. Jamaica Sands is the
// top of that list on every axis at once and it is a day old on market:
//
//   41481 Jamaica Sands, Bermuda Dunes, $999,999, 49 photos → BUILT. Furnished,
//        bright, professionally shot, and the most distinctive feature set in
//        the pool: a painted basketball court, a lap-length pool with a raised
//        spa, paid-off solar, RV parking, no HOA, sold furnished.
//   84146 Azzura Way, Indio, $625k, 75 photos      → next fallback, unchecked
//   28 Oak Tree, Rancho Mirage, $479,900, 41       → unchecked
//   3470 Warren Vista, Yucca Valley, $399k, 64     → unchecked
//
// Only one listing in `pendingposts` has ever reached status "posted"
// (53806 Ridge Road), so nothing here risks a repeat.
//
// Visually unlike the last several queued: a 2021-built desert contemporary,
// all white walls and large-format tile, against a Lancaster tract home, a
// Palm Springs tower unit and an Indian Wells studio.
//
// coverPhotoIndex 42, measured rather than guessed. Rendered the real
// simple-luxury transformation over candidates 42, 0, 4 and 45 first — free,
// because the cover is a pure Cloudinary transform, and `gravity: auto`
// re-crops the frame so copy-voice.md §8's right-half rule cannot be applied
// to the original by eye:
//   4   the ground-level sport-court shot, and the obvious choice by subject.
//       gravity:auto cropped to a tall portrait and put the ENTIRE court behind
//       the panel. What survives is hedge and a strip of turf — the §8 failure
//       in its purest form, on the one frame whose subject is the hook.
//   45  covered patio, spa and turf. The surviving half is a utility pole and
//       four power lines across open sky.
//   0   the prettiest photograph of the four: bright turquoise water down the
//       whole right half, sky, covered patio. But the hoop reads as a thin dark
//       pole against the hedge and the court surface is not in shot, so FULL
//       COURT would be a hook the picture does not support.
//   42  keeps the hoop AND the blue court surface, plus the raised spa
//       spilling into the pool, the built-in grill and the ficus wall. Less
//       postcard than 0 and the only one where the hook and the image agree.
//
// accentColor: teal 0E5B63, sampled from the pool tile and the water in the
// surviving half. Also rendered against navy 123C5A, which picks up the court
// blue and separates harder from the ficus green — but the panel's lower third
// sits over shaded hedge and concrete, and the navy turns that stretch a flat
// grey-blue while the teal stays saturated top to bottom.
//
// Exclusions passed on the build. Read as categories, not indexes — the lesson
// auto-posting.md §"Re-measured 2026-08-23" cost a build each to learn:
//   1          front driveway and garage doors. actor-generation.md §3 — the
//              reader has no front-elevation key, so this returns `outdoor`,
//              normalises to `pool` and prints under THE POOL DECK. 3010 N
//              Chuperosa shipped the agent presenting a garage door that way.
//   2,3,4,46   drone and elevated aerials (court, roof solar). §3, no floor
//              plane and no human-scale reference.
//   8,44       an all-but-empty room off the slider, and the covered breezeway.
//              Circulation — nothing to do in either.
//   12,15,16   range and cooktop close-ups. Detail shots, not rooms.
//   21         the long dining table shot down its own length, so the table top
//              runs off the bottom edge. actor-generation.md §9: the composite
//              has no depth ordering, and a large object whose near face fills
//              the foreground is how the agent ends up standing through it.
//   23,30,31   bedrooms shot across the foot of the bed. Same category as
//              above, and the exact frame that put him on the mattress at
//              1950 S Palm Canyon #128.
//   24,27,28,34,35,36,37  bathrooms and a toilet. §3, never.
//   26,38      an empty room with closet doors, and a linen closet.
//   39         the laundry alcove.
//   40,41      the air-conditioned garage with the pool table and the arcade
//              cabinet. Genuinely one of the best things here, and excluded on
//              purpose: the reader has no garage key, so it comes back `other`
//              → `living`, and the living caption below asserts tile floors
//              that a concrete garage slab would contradict. The garage goes in
//              a text slide instead — the same call 1950 S Palm Canyon made for
//              its balcony.
//   42         the cover. Excluded so it cannot also return as a room slide.
//   47,48      the 3D dollhouse and the floor plan.
//
// That leaves 20 eligible frames — six of the great room, four kitchen, two
// dining, five bedrooms and three outdoor. The selector still returns its own
// top 14 of all 49 and `--exclude` is applied to that result afterwards, so
// this list can only remove candidates, never promote them.
export default {
  listingKey: "20260823194116139985000000",
  accentColor: "0E5B63",
  coverPhotoIndex: 42,
  hook: "FULL COURT",
  // No bath count in here, and that is deliberate. The spec strip directly
  // above this paragraph is built from `bathroomsTotalInteger`, which the MLS
  // record rounds to 3, while the listing agent's own remarks say "2 and a half
  // bathroom". A body reading "two and a half baths" three lines under a strip
  // reading "3 BA" is one slide contradicting itself, and the honest half is
  // not mine to overwrite — the strip comes off the feed. So the cover carries
  // no bath count at all and the Instagram caption carries the remarks' 2.5.
  coverBody:
    "Three bedrooms and a basketball court behind the house. Paid-off solar, RV parking, pool and spa, no HOA, and it comes furnished.",
  // Keyed by ROOM, never by position, and written to the SPACE rather than to
  // the frame I hope the stager picks — the key is not stable across runs
  // (copy-voice.md §8). Aliases collapse before the lookup, so only the
  // canonical key of each group appears: great_room/office/other → living,
  // outdoor and outdoor_living → pool, bedroom → primary_bedroom.
  //
  // No time of day anywhere below. Every outdoor frame here is midday, but the
  // run picks the hour as freely as it picks the crop (9223 N Star Trail).
  rooms: [
    // Answers for great_room, office and other, so it has to hold for any frame
    // of the open plan — and, per Acoma Trail, for a dining frame that comes
    // back `living`. All three things named are house-wide and in every
    // interior frame: the remarks say tile throughout, the walls are white in
    // all 30-odd interior photos, and a ceiling fan is in shot in almost all of
    // them. Deliberately NOT named: the sectional, the wall TV and the big
    // teal-and-gold canvas, each of which is in some open-plan frames and not
    // others.
    { room: "living", caption: "Tile through the whole house, white walls, and a ceiling fan in every room." },
    // The island with stools pulled up to it is in all four surviving kitchen
    // frames — 11, 13, 14 and the one shot from across the living room. The gas
    // range is not (17 hides it behind the wall), so it stays out. Cabinet DOOR
    // STYLE also stays out: Sutherland shipped "shaker" over raised-panel doors
    // and a buyer who has been shopping kitchens spots that immediately.
    //
    // WRONG ANYWAY, and the reason is the reason there is no kitchen slide on
    // this post. Build H8 chose frame 14, which is the island shot down its own
    // length from the working side: the stools are around the far corner and
    // out of the crop entirely, so "stools pulled up to it" named furniture the
    // slide did not contain. Written to the space, contradicted by the frame —
    // the failure copy-voice.md §8 keeps describing. Both things left of the
    // comma survived; only the stools did not, and there is no wording of this
    // line that both says something and is safe across all four frames.
    { room: "kitchen", caption: "Remodeled and all white, with a long quartz island down the middle." },
    // Both surviving dining frames have the table, the acrylic chairs and a
    // fixture hanging over it. The gold sputnik is only in one of them, so it
    // is "a light" rather than named.
    { room: "dining", caption: "A table long enough for everybody, acrylic chairs, and a light over it." },
    // Answers for `bedroom` too, so it must survive the primary and both
    // secondaries. Every claim here is a listing fact rather than something in
    // a crop, on purpose: the beds in these photos are mattresses with pillows
    // and no bedding styled on them, two of the three rooms have a sofa and one
    // does not, and the flooring reads as plank in the bedrooms and
    // large-format tile everywhere else.
    { room: "primary_bedroom", caption: "Three bedrooms and two and a half baths, every one of them redone since 2021." },
    // Answers for outdoor and outdoor_living as well, so it names only what is
    // in all four backyard frames: the pool, and the ficus hedge that closes
    // the yard on every side. The spa is in three of them and the fire pit in
    // one, so neither is named here — they are in the text slides instead.
    { room: "pool", caption: "A long pool, ficus hedge the whole way around, and no one looking in." },
    // Only reachable if a front elevation slips through the exclusions. Both
    // facts are from the remarks and true of the front and the back.
    { room: "exterior", caption: "Ficus for privacy and artificial grass, so the whole lot stays low-maintenance." },
  ],
  fallbackCaption: "Three bedrooms, two and a half baths, and a basketball court in Bermuda Dunes.",
  textPosts: [
    {
      paragraphs: [
        "The backyard has a basketball court in it.",
        "Not a hoop bolted over the garage — a painted court with a key, next to a long pool with a raised spa spilling into it and a fire pit table off the patio.",
      ],
      italicLast: "Somebody is losing a game out here every weekend.",
    },
    {
      paragraphs: [
        "No HOA, and the solar is paid off.",
        "This is the part of Bermuda Dunes outside the country club, so there are no association dues at all. The panels are on the roof already bought and they convey with the house.",
      ],
      italicLast: "Ask me for the last twelve months of electric bills.",
    },
    {
      paragraphs: [
        "It sells furnished, and the garage is air conditioned.",
        "What you see in these photos stays. Two-car garage with the AC run out to it, RV parking beside the house, and tile floors through every room so there is no carpet to replace.",
      ],
      italicLast: "Bring a suitcase and start using the pool.",
    },
  ],
  // Two paragraphs, both under ~110 characters. buildCtaTransformation places
  // paragraph 2 at a fixed three-line offset and does not reflow, so a
  // four-line first paragraph gets overprinted (48423 Hepburn Drive).
  cta: {
    paragraphs: [
      "A court, a pool and a fire pit read better standing in the yard than on a phone.",
      "I will meet you there, and you can shoot around while we talk.",
    ],
    italicLast: "DM me and we will set a time.",
  },
  caption: `Three bedrooms, two and a half baths, and a basketball court behind the house in Bermuda Dunes.

Outside the country club, so there is no HOA. Out back: a painted sport court, a long pool with a raised spa that spills into it, a fire pit, a built-in grill under the covered patio, and ficus hedge on every side of the lot.

Built in 2021 and updated since — remodeled kitchen and baths, tile floors throughout, sliding glass doors, paid-off solar, RV parking, and a two-car garage with air conditioning run out to it. Artificial grass front and back. It sells furnished.

3 BD · 2.5 BA · 2,166 SQFT · $999,999

Listed by Jack A Rook & The Obsidian Group · eXp Realty Of Southern California Inc

#bermudadunes #coachellavalley #poolhome #sportcourt #desertrealestate`,
};
