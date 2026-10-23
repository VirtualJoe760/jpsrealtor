// 1522 Sutherland, Lancaster — $499,999
// (Ashley N Robertson & The Obsidian Group · eXp Realty Of Southern California Inc)
//
// WHY THIS ONE. auto-posting.md §"Re-measured 2026-08-15" declared the
// never-queued pool empty and correctly predicted the next run would have to
// repeat or skip. A week later the pool has replenished: 32 team actives now,
// and three never-queued sales came on market in the last four days. Checked
// all three as contact sheets before writing a line (the only filter that
// works — auto-posting.md §"Re-measured 2026-08-12"):
//
//   1522 Sutherland, Lancaster, $499,999, 35 photos   → BUILT. Fully furnished,
//        professionally lit, styled in every interior frame. The strongest
//        photography in the pool by a distance.
//   27305 Hombria, Cathedral City, $429k, 32 photos   → furnished but shot on a
//        very wide lens with heavy distortion, dim, and lived-in rather than
//        styled (a garage full of bikes, shelving units, laundry in shot).
//   1950 Palm Canyon #128, Palm Springs, $299,999, 33 → furnished and usable;
//        wide-lens distortion and a cluttered kitchen counter. Keep as the
//        fallback for a future run.
//
// The remaining never-queued names are all previously recorded as vacant
// (16430 Evans Lane, 4140 Calle San Antonio, 76434 Encanto, 58540 Barron) or
// under the 12-photo bar (72714 Willow #4). Only ONE listing in `pendingposts`
// has ever reached status "posted" (53806 Ridge Road), so nothing here risks a
// repeat post.
//
// It is also visually unlike the last several queued: a 2001 suburban tract
// pool home in the Antelope Valley, against a 29 Palms double lot, an Indian
// Wells condo, a Palm Springs tower and a Morongo Valley ranch. Different
// architecture, different light, different colour.
//
// coverPhotoIndex 34, and this was measured rather than guessed. Rendered the
// real simple-luxury transformation against candidates 34, 28 and 0 before
// committing — cheap, because the cover is a pure Cloudinary transform with no
// Gemini in it, and `gravity: auto` re-crops the frame so the right-half rule
// in copy-voice.md §8 cannot be applied to the original by eye:
//   28  the pool frame. gravity:auto pulled to the deck and put the NEIGHBOUR'S
//       two-storey house across the top of the surviving half. Exactly the
//       failure §8 describes — the hero subject sits in the half the panel hides.
//   0   daylight front elevation. The panel covers the house and what is left is
//       a tree and a large flat lawn.
//   34  twilight front elevation. The crop keeps the whole sunset, the lit bay
//       window, the tile roof and the tree. Nothing unwanted in the right half.
//
// accentColor: deep olive 3E5240, and it is the house's own colour — sampled
// from the kitchen cabinetry (#5C6756 mid, #343926 in shadow), which is the
// single most distinctive thing in the interior. Also rendered against rust
// 8A3B24 for comparison and the rust sank: the right half of frame 34 quantises
// to dark warm browns, dusty mauve-pinks, amber and terracotta, so a warm panel
// reads as more sunset. Green is the complement of that magenta and separates
// cleanly while staying dark enough to carry white text at 75% opacity.
//
// Exclusions passed on the build:
//   0,1        daylight and porch front elevations. actor-generation.md §3 — the
//              reader has no front-elevation key, so these return `outdoor`,
//              normalise to `pool`, and would print under THE POOL DECK.
//              3010 N Chuperosa Road shipped the agent presenting a garage door
//              that way.
//   2          entry hall. Circulation, and `entry` has no label so it falls
//              through to INSIDE.
//   12         a kitchen-sink close-up: faucet and two soap bottles fill the
//              foreground. A detail shot, not a room.
//   14         a bare linen closet.
//   20,21,22,23  bathrooms and a shower. §3, never.
//   26         the laundry alcove.
//   30,31,32,33  drone aerials, a lot-line overlay and two neighbourhood maps.
//   34         the cover. Excluded so it cannot also come back as a room slide.
//
// That leaves 20 eligible frames: five of the great room, three kitchen, two
// dining, three of the primary, two secondary bedrooms, and five outdoor. Note
// that the selector returns its own top 14 of all 35 and `--exclude` is applied
// to that result AFTERWARDS, so this list can only remove candidates and never
// promote the ones I would have picked — the lesson 78250 Cortez Lane cost four
// builds to learn.
export default {
  listingKey: "20260819022822999139000000",
  accentColor: "3E5240",
  coverPhotoIndex: 34,
  hook: "WEST SIDE",
  coverBody:
    "Three bedrooms, two baths, and a pool with a six-person spa on Lancaster's west side. Built-in BBQ under the gazebo, artificial turf, leased solar, and an extended driveway with room for a boat.",
  // Keyed by ROOM, never by position, and written to the SPACE rather than to
  // the frame I hope the stager picks — the key is not stable across runs
  // (copy-voice.md §8). Aliases collapse before the lookup, so only the
  // canonical key of each group appears here and a second row of a group would
  // be unreachable anyway: great_room/office/other → living, outdoor and
  // outdoor_living → pool, bedroom → primary_bedroom.
  //
  // Nothing below states a time of day. Frame 27 is a dusk patio and frames 28
  // and 29 are hard midday sun, so the same backyard can land at either hour —
  // 9223 N Star Trail's "morning coffee out here" printed over a sunset for
  // exactly this reason.
  rooms: [
    // Answers for great_room, office and other, so it has to survive any frame
    // of the open plan. The living room is dark laminate and the dining and
    // kitchen ends are beige tile, so flooring is deliberately not named — a
    // dining frame returning `living` would contradict it. Ceiling fans in
    // every room and the crown molding are both in the listing remarks, so this
    // is a claim about the house rather than about the crop.
    //
    // REWRITTEN after looking at build V2. "Vaulted ceilings" came out first.
    // The house does have raked ceilings — frames 3, 4, 5 and 9 show them — but
    // the frame the stager chose (#4) crops to a flat white ceiling with the fan
    // in it, and the dining frame it also chose is flat as well. Two slides
    // asserting a vault that neither photograph contains is the Star Trail
    // failure twice over. Crown molding IS in shot here, above the navy wall
    // and over the window, so it stays.
    { room: "living", caption: "Crown molding, fresh paint, and a ceiling fan in every room of the house." },
    // Green shaker cabinets and tile are in all three kitchen frames. The
    // peninsula and the window over the counter are each present in only some
    // of them, so neither is named.
    //
    // REWRITTEN after looking at build V2. These are not shaker doors — they
    // are raised-panel with a routed profile, plainly so at full size. A wrong
    // furniture term is a small thing that costs the whole slide its authority,
    // and it is the kind of error a buyer who has been shopping kitchens spots
    // immediately. Replaced with three things that are unambiguously in the
    // frame: the colour, the gas range, and counter either side of it.
    { room: "kitchen", caption: "Green cabinets, a gas range, and counter on both sides of it." },
    // Frame 11 has the kitchen behind the table and frame 13 does not, so the
    // open connection — real in the house — is left out. Same failure the
    // Samarkand dining line was rewritten to avoid.
    //
    // REWRITTEN after looking at build V2. The chosen frame (#13) is the bay
    // window nook and its ceiling is flat, with the fan hanging off it filling
    // the top third of the slide. The caption asserted a vault directly over the
    // table while the flat ceiling was the most visible thing in the photograph.
    // Everything below is inside the crop: the table, the bench, and shutters on
    // three walls.
    { room: "dining", caption: "Wood table, bench seating, and plantation shutters wrapping the windows." },
    // Answers for `bedroom` too, so it must hold for the primary and for both
    // secondary rooms. States the count and two house-wide facts rather than
    // anything about one bed.
    { room: "primary_bedroom", caption: "Three bedrooms, shutters on every window, and a ceiling fan in each one." },
    // poolYN is true on this record, so ROOM_LABELS.pool stays THE POOL DECK
    // and the claim is real. This line also answers for `outdoor`, which is
    // what the covered patio and the BBQ corner will come back as, so it names
    // only things true of the whole backyard: the pool, the spa in the remarks,
    // and the block wall that is in every outdoor frame.
    //
    // REWRITTEN after looking at build V2. The block wall is real and is in most
    // of the backyard frames, but the one the stager chose (#28) is shot from the
    // far side of the pool and contains a wrought-iron pool fence and the
    // NEIGHBOUR'S two-storey house instead — no block wall anywhere in it. The
    // line was written to the yard, which is the rule, and the yard turned out
    // to have more than one boundary in it. Both things named below are in the
    // frame: the safety fence around the water and the spa beside it.
    { room: "pool", caption: "In-ground pool with a fence around the water, and a six-person spa beside it." },
    // No date in this line on purpose. The post sits in the review queue for an
    // unknown number of days before it publishes, so "repainted this month" ages
    // into a false statement about someone else's listing while it waits.
    { room: "exterior", caption: "Freshly repainted outside, landscaped front and back, and an extended driveway." },
  ],
  fallbackCaption: "Three bedrooms, two baths and a pool on Lancaster's west side.",
  textPosts: [
    {
      paragraphs: [
        "The backyard is the part that decides this house.",
        "Pool, a six-person spa, a built-in BBQ under the gazebo, and artificial turf so the yard stays green without a sprinkler running.",
      ],
      italicLast: "Have people over and nobody needs to leave the yard.",
    },
    {
      paragraphs: [
        "Ask me what has been replaced, because here there is an answer.",
        "Primary bath fully remodeled, interior and exterior both repainted, water heater replaced, and the AC motor done this July with the maintenance current.",
      ],
      italicLast: "That is the kind of list that makes an inspection boring.",
    },
    {
      paragraphs: [
        "The solar is leased, and the buyer takes over the lease.",
        "It is a number with terms attached, and it belongs in the conversation early rather than three days before closing.",
      ],
      italicLast: "Ask me for the lease terms before you write an offer.",
    },
  ],
  // Two paragraphs, both under ~110 characters. buildCtaTransformation places
  // paragraph 2 at a fixed three-line offset and does not reflow, so a
  // four-line first paragraph gets overprinted (48423 Hepburn Drive).
  cta: {
    paragraphs: [
      "I would rather walk the yard with you than send you another link.",
      "Bring your questions about the solar and the pool. I will have the answers ready.",
    ],
    italicLast: "DM me and we will set a time.",
  },
  caption: `Three bedrooms, two baths and a pool on the west side of Lancaster.

Out back: an in-ground pool with a safety fence, a six-person Hudson Bay spa, a built-in BBQ under the gazebo, and artificial turf that stays green without watering. An extended driveway takes the boat or the extra vehicle.

Inside, the primary bath was fully remodeled in September 2025, the interior was repainted at the same time and the exterior within the last few weeks. Crown molding in the living room, a gas fireplace, ceiling fans in every room, water heater replaced November 2025, AC motor July 2026. Leased solar, buyer to assume the lease.

3 BD · 2 BA · 1,590 SQFT · $499,999

Listed by Ashley N Robertson & The Obsidian Group · eXp Realty Of Southern California Inc

#lancasterca #antelopevalley #poolhome #lancasterrealestate #socalrealestate`,
};
