// 1950 S Palm Canyon Drive #128, Palm Springs — $299,999
// (Jack A Rook & The Obsidian Group · eXp Realty Of Southern California Inc)
//
// WHY THIS ONE. 31 team actives, 17 ever queued in `pendingposts`, 15 never
// queued. Of those 15, six are sales with ≥12 photos and the rest are land
// (`propertyType: D`), one rental and one multifamily — out of scope. Four of
// the six sales are already recorded VACANT in auto-posting.md and vacancy is
// the binding constraint (§"Re-measured 2026-08-15"): 16430 Evans Lane, 4140 E
// Calle San Antonio, 76434 Encanto Drive, 58540 Barron Drive. That leaves two
// furnished candidates, and 27305 Hombria was checked and set aside on the
// 2026-08-22 run for heavy wide-lens distortion and lived-in clutter.
//
// So this is the listing that run explicitly held as "the next fallback", and
// re-checking it as a contact sheet before writing a line confirms it builds:
// 33 frames, furnished throughout, bright, and the distortion is mild by this
// pool's standards. Only ONE listingKey in `pendingposts` has ever reached
// status "posted" (53806 Ridge Road), so nothing here risks a repeat post.
//
// It is also visually unlike the recent queue — a 1972 single-level Palm
// Springs condo with Saltillo tile and a mustard mid-century living set,
// against a Lancaster tract pool home, a 29 Palms double lot and a Morongo
// Valley ranch.
//
// coverPhotoIndex 29, measured rather than guessed. Rendered the real
// simple-luxury transformation over candidates 29, 32, 1 and 7 first — free,
// because the cover is a pure Cloudinary transform, and `gravity: auto`
// re-crops before the panel lands so the right-half rule in copy-voice.md §8
// cannot be applied to the original by eye:
//   1   living room. The crop keeps the dining nook and a large flat expanse
//       of beige carpet. The mustard sofa — the whole reason to pick it — sits
//       in the half the panel hides. Exactly the §8 failure.
//   7   kitchen/dining. The surviving half is the stainless island hood and one
//       red bar stool. Hardware, not a room.
//   32  the building under palms. A palm trunk fills most of what is left.
//   29  the community pool from above. The crop keeps the whole pool, the palms,
//       the tile roofs and the bougainvillea, and nothing unwanted survives.
//
// The cover photo is the COMMUNITY pool, not a private one — `poolYN` is false
// on this record — so the cover body names it as community amenities in the
// same breath. Saying "poolside" over a shared pool without that word is the
// kind of implied claim §9 exists to stop.
//
// accentColor: rust 6B2A1E, and it is the property's own colour. Sampled from
// the Saltillo tile that runs through the kitchen and dining (#A05F31 mid,
// #783915 in shadow) and the red bar stools (#550404); 6B2A1E sits between
// them. Rendered against the teal of the living-room throw pillows (#457B71 →
// 1F4A45) and a deep navy for comparison. The teal sank — frame 29's surviving
// half is turquoise pool water and green palms, so a cool panel reads as more
// pool; the navy went inert against a desert scene. Rust separates from the
// water and picks up the terracotta roof tiles that are already in the crop.
//
// Exclusions passed on the build:
//   3            the entry: front door fills the left third. actor-generation.md
//                §3 — circulation, and the reader has no front-elevation key, so
//                a door frame risks coming back `outdoor` and printing under
//                OUTDOOR LIVING the way 3010 N Chuperosa Road's garage did.
//   7,8,9,10,11  EVERY kitchen frame, and this is the lesson of build G8. The
//                galley is only ever shot from across the peninsula, so the
//                counter and the cooktop sit between the camera and any spot a
//                person can stand on. #9 passed every gate — feet-on-floor 100%,
//                scale 0.79x, face 0.353 — and shipped a figure whose torso was
//                behind the cooktop while his legs and shoes were composited
//                over the island's near face, standing through the counter.
//                Compositing takes the person mask and pastes it onto the
//                untouched original (actor-generation.md §9); nothing in that
//                path knows the counter is nearer the lens than he is. The gates
//                cannot see this, which is precisely why the skill says to look.
//                8 also had a black trash can in the foreground and 11 is a
//                close-up of a toaster and a range top — a detail, not a room
//                (§3) — so those two were out on their own merits already.
//                Dropping the kitchen costs the carousel nothing it cannot say
//                in the Instagram caption, and the room caption below is kept
//                for a future build off better kitchen photography.
//   12,13,14     bathrooms and a shower. §3, never.
//   16           shot from beside the bed at mattress height; most of the frame
//                is bedspread and there is no standing room read from it.
//   20,21,22     the SECOND bedroom, all three frames, and 21 and 22 were only
//                excluded on build 3. Every frame of that room is shot from the
//                doorway with the bed filling the near half, so the only thing
//                behind the bed to walk to is the balcony slider — 21 rejected
//                all takes outright, and 22 passed every gate and shipped the
//                agent standing ON THE MATTRESS in build L7, shoes planted on
//                the comforter. Same root cause as the kitchen above: the mask
//                is pasted over an original in which the bed is nearer the lens
//                than the standing spot. 20 was out from the start for the desk,
//                two monitors and the gaming chair forward in the left third.
//                The balcony and the foothills are the best thing about this
//                unit and no room slide can carry them, so text slide 3 does.
//   23,24        bathrooms. §3.
//   25,26        the 2D floor plan and the 3D dollhouse render.
//   27,28,30,31,32  building exteriors and drone aerials. §3 — no floor plane,
//                no human-scale reference.
//   29           the cover. Excluded so it cannot also return as a room slide.
//
// That leaves 16 eligible frames: four of the living room, three kitchen, three
// dining, and six across the two bedrooms. The selector returns its own top 14
// of all 33 and `--exclude` is applied to that result afterwards, so this list
// can only remove and never promote (78250 Cortez Lane, four builds).
export default {
  listingKey: "20260820221038844848000000",
  accentColor: "6B2A1E",
  coverPhotoIndex: 29,
  hook: "POOLSIDE",
  coverBody:
    "Two bedrooms and two baths in Sandstone Villas, gated and on one level, with a private balcony off one bedroom looking out at the San Jacinto foothills. No land lease. Community pools, a hot tub and a fitness center.",
  // Keyed by ROOM, never by position, and written to the SPACE rather than to
  // the frame I hope the stager picks — the key is not stable across runs
  // (copy-voice.md §8). Aliases collapse before the lookup, so only the
  // canonical key of a group appears here and a second row would be
  // unreachable: great_room/office/other → living, outdoor/outdoor_living →
  // pool, bedroom → primary_bedroom.
  //
  // No line below states a time of day. Every interior here was shot in flat
  // daylight, but the crop is not mine to choose and 9223 N Star Trail's
  // "morning coffee out here" printed over a sunset for exactly this reason.
  rooms: [
    // Answers for great_room, office and other. The flooring changes inside
    // this one open space — carpet at the living end, Saltillo tile at the
    // dining and kitchen end — so flooring is deliberately not named here; a
    // frame that came back `living` from the tiled end would contradict it.
    // White walls, a ceiling fan and the open connection are true of every
    // frame of the great room.
    //
    // The `office` alias is the live risk on this listing: the second bedroom
    // has a desk and two monitors in it, and if the stager reads one of those
    // frames as `office` the slide gets labelled THE OFFICE while inheriting
    // this line. Frames 20 was excluded to make that less likely and the build
    // log's PASS lines are the place to catch it — reband rather than rebuild.
    //
    // REWRITTEN after looking at build G8. The first line ended "…and it opens
    // onto the dining and the kitchen bar." The house genuinely is open plan,
    // but the frame the stager chose (#0) looks the other way, at the TV wall,
    // and contains no dining and no kitchen at all. Written to the space, which
    // is the rule, and the rule is not sufficient in a room you can shoot in
    // two opposite directions — the same failure 9223 N Star Trail recorded.
    // Everything below is inside that crop and true of the whole living end.
    { room: "living", caption: "White walls, wall-to-wall carpet with rugs over it, and a ceiling fan overhead." },
    // Kept for a future build, but UNREACHABLE as of build 2: every kitchen
    // frame is excluded. See the exclusion note on 7/9/10/11 above — this
    // kitchen is only ever shot from across the peninsula, and that foreground
    // counter is what broke G8's kitchen slide.
    { room: "kitchen", caption: "White cabinets, stone counters, and a stainless hood over the gas range." },
    // Saltillo tile and pendants are in every dining frame, and the kitchen bar
    // is visible from all of them — this is one open room, so the connection is
    // safe to name here in a way it is not from the carpeted end.
    //
    // REWRITTEN after looking at build G8, same failure as the living line. The
    // dining nook and the kitchen bar ARE one open space, but the chosen frame
    // (#6) faces the window wall and the kitchen is behind the lens. "Overhead"
    // rather than "over the table" because the pendant cluster hangs off the
    // table's left end, not centred on it.
    { room: "dining", caption: "Saltillo tile underfoot, a pendant cluster overhead, and a window behind the table." },
    // Answers for `bedroom` too, so it has to hold for BOTH bedrooms. The
    // balcony and the mountain are in one of them only and are therefore not
    // named — that is the 46109 Roadrunner Lane failure, a secondary bedroom
    // captioned with the primary's line. Ceiling fan, wall-to-wall mirrored
    // closet doors and carpet are in every frame of both rooms.
    { room: "primary_bedroom", caption: "Ceiling fans, wall-to-wall mirrored closets, and carpet in both bedrooms." },
  ],
  fallbackCaption: "Two bedrooms, two baths and 1,024 square feet on one level in Sandstone Villas.",
  textPosts: [
    {
      paragraphs: [
        "On a Palm Springs condo, the first thing to check is whether the land is owned or leased.",
        "The listing says there is no land lease here, and that is something I confirm in the title report and hand to you in writing before you make an offer.",
      ],
      italicLast: "Ask me and I will pull it.",
    },
    {
      paragraphs: [
        "The HOA is $448 a month.",
        "It covers the gated grounds, the pools, the hot tub and the fitness center, and it is a number you should see before you fall for the balcony.",
      ],
      italicLast: "I will send you the HOA documents and the reserve study.",
    },
    {
      paragraphs: [
        "The balcony off one of the bedrooms is the reason to come see this in person.",
        "Open the slider and the foothills are right there. It is a corner unit on one level, so there is a neighbour on one side instead of two.",
      ],
      italicLast: "Come stand on it before you decide.",
    },
  ],
  // Two paragraphs, both under ~110 characters. buildCtaTransformation places
  // paragraph 2 at a fixed three-line offset and does not reflow, so a
  // four-line first paragraph gets overprinted (48423 Hepburn Drive).
  cta: {
    paragraphs: [
      "At this price the real questions are the HOA and the land, and I have answers for both.",
      "I would rather meet you at the gate than send you another link.",
    ],
    italicLast: "DM me and we will set a time.",
  },
  caption: `Two bedrooms, two baths and 1,024 square feet on one level in Sandstone Villas, south Palm Springs.

Corner unit, gated community, built 1972. The kitchen and both baths have been updated — white cabinets, stone counters, a gas range under a stainless island hood, Saltillo tile through the kitchen and dining. A private balcony off one bedroom looks out at the San Jacinto foothills. Ceiling fans throughout, forced air and A/C, assigned carport.

HOA $448 a month, covering the gated grounds, community pools, hot tub and fitness center. The listing states there is no land lease.

2 BD · 2 BA · 1,024 SQFT · $299,999

Listed by Jack A Rook & The Obsidian Group · eXp Realty Of Southern California Inc

#palmsprings #palmspringsrealestate #palmspringscondo #sandstonevillas #coachellavalley #socalrealestate`,
};
