// 7798 Acoma Trail, Yucca Valley — $299,000 (Peyson Robertson & The Obsidian Group)
//
// Picked because it is the only never-queued team listing that is FURNISHED
// with things a person can be photographed using. The pool is down to nine
// never-queued stageable sales and the two obvious higher-priced ones both
// fail on the images:
//
//   79161 Falmouth Drive ($619k, 51 photos, Bermuda Dunes CC) is completely
//   vacant — every one of its ~35 interior frames is a bare room mid-
//   renovation, carpet still going in. That is the Calle San Antonio failure
//   documented in lapis-drive.ts: nothing telic in any frame, so every slide
//   degrades to an edge reaction, which actor-generation.md §6 then forbids
//   repeating across the sequence. Its remarks also say "This is not a
//   cosmetic flip," which copy-voice.md §3 forbids echoing. Skipped.
//
//   4140 E Calle San Antonio and 78250 Cortez Lane were both already ruled
//   out for lapis-drive (digitally-altered frames; 22 aerials on a 576 sqft
//   condo). Still true. Skipped.
//
// This one has a navy sectional and a TV wall, a round dining table with four
// chairs under a chandelier, a galley kitchen with a gas cooktop in the island
// and wooden bench seating, and two made beds — four distinct rooms with
// something to DO in each. It is also the first sub-$300k house and the first
// small floor plan in the feed, which has run $500k-$1.5M for two weeks.
//
// THE MLS SAYS `furnished: "Unfurnished"` WHILE THE REMARKS CALL IT TURNKEY
// AND THE PHOTOS SHOW IT FULLY FURNISHED. The two disagree, so nothing below
// claims the furniture conveys — no "turnkey", no "comes furnished". The
// captions describe what is in the ROOM, which is all the staging needs, and
// leave what conveys to the listing agent.
//
// EXCLUSIONS (pass on the command line):
//   0          — reserved for the cover, so it cannot repeat as a room slide.
//   1          — the same front elevation at midday. Weaker than the cover and
//                nothing to do in it.
//   2,3,4,5,6  — driveway, garage doors, carport, bare patio slab. This is the
//                exact gap in actor-generation.md §3: the reader has no front-
//                elevation key, so a driveway returns `outdoor`, which the
//                caption layer normalises to `pool` on a poolYN:false house.
//                3010 N Chuperosa Road shipped a closed garage door labelled
//                OUTDOOR LIVING for this reason.
//   8, 26      — the desk nook and the hallway looking into it. The generator
//                collapses `office` → `living`, so a den landing there would
//                take the living-room line, which names the sectional.
//   9, 21, 22  — entry corner, hallway, linen shelving. Circulation (§3).
//   23         — bathroom. Never (§3).
//   29         — a bare corner with French doors and a plant. Reads as `other`
//                → `living`, and there is no sectional in it.
//   30, 31     — the massage / yoga room. Also collapses to `living`, and a
//                suited agent standing over a massage table is the wrong
//                photograph regardless of which caption it took.
//   32-38      — aerials and drone shots. No floor plane, no human-scale
//                reference (§3).
//   39, 40     — the back yard: a metal shed, a block wall, a patch of lawn
//                and bare dirt. Nothing here should rest on that frame.
//
// ADDED AFTER LOOKING AT BUILD 1 (queued as L8, five frames worse than the
// exclusion list predicted):
//   19         — THE ONE THAT MATTERED. #19 is the sink wall, not the cook
//                side: a laminate run with a soap dispenser, a bottle of dish
//                soap and a scrubber on it, and a mirrored pass-through as the
//                largest object in frame. The gates passed it — geometry and
//                identity were both fine — and it still shipped a slide whose
//                caption promised "an island to work at" over a frame with no
//                island in it. Exactly the case actor-generation.md's gate
//                table cannot catch, and the reason the skill says to look.
//   10         — the living room from the front door. Passed, but the top 45%
//                of the frame is bare ceiling and blank wall, and the figure
//                perches high on the sectional. #12 is the same room with the
//                TV wall, the ladder and the art in shot.
//   7, 11, 18  — all takes rejected in build 1. Rejections are properties of
//                the photo, so re-offering them only burns candidate slots.
//                Dropping all five is what let a BEDROOM into the top nine:
//                build 1 staged nine living/dining/kitchen frames and never
//                reached the bedrooms at all, so it queued 3 room slides
//                instead of 4.
//
//   npx ts-node -O '{"module":"commonjs"}' scripts/build-pending-post.ts \
//     acoma-trail --exclude 0,1,2,3,4,5,6,7,8,9,10,11,18,19,21,22,23,26,29,30,31,32,33,34,35,36,37,38,39,40
//
// That leaves 12 (living) 13,14 (dining) 15,16,17,20 (kitchen) 24,25,27,28
// (bedrooms) — eleven candidates for four slots, one per collapsed room key,
// and every remaining kitchen frame has the island in it.
//
// WHAT BUILD 2 ACTUALLY DID, and the thing to know before touching this file:
// THE STAGER'S ROOM READ IS NOT STABLE ACROSS RUNS. The same photo comes back
// under a different key each time, and because the caption and the label are
// both looked up by that key, the whole slide moves with it:
//
//   #15  selector said `kitchen`, stager said `great_room` (→ living), and
//        the action it chose was "pulling out a chair at the dining table".
//   #14  `dining` in build 1 — the correctly-labelled THE DINING ROOM slide —
//        and in build 2 it collapsed to `living` and was skipped as a dupe.
//
// So a caption cannot be written to the room the SELECTOR names either. #15
// landed under the living line, and that only survived review because the line
// was written to the whole open-plan space rather than to a sofa: the
// sectional, the white walls and the tile are all in that frame. Had it named
// the TV or the record player it would have been a false slide.
//
// Neither build got four rooms. The bedrooms are unreachable here — the
// selector never put one in its 14 picks, so no exclusion list can promote
// one. Build 2 queued as E4 with two room slides (great room, kitchen), which
// is what the photo set supports honestly.
//
// Build 1 (L8) was marked declined rather than left in the review queue: its
// kitchen slide was staged on #19 and was simply wrong. See the decline
// reason on that record.
export default {
  listingKey: "20260506205122773540000000",
  // Deep navy, taken off the sectional and the folded throw — the one
  // saturated colour the interior repeats on purpose. The cover is a golden-
  // hour front elevation: amber sky, gold dry grass, cream house, red fence.
  // Ridge Road's lesson was that an accent inside the photo's own colour
  // family disappears into it, and every warm hex would.
  accentColor: "1C3557",
  // Judged by the RIGHT half, per copy-voice.md §8 — the cover panel hides the
  // left ~45%. What survives here is the full Joshua tree, the lit front
  // window and the sunset behind the roofline. The left half that gets covered
  // is a bare mesquite and a concrete walk, which is the half worth losing.
  coverPhotoIndex: 0,
  hook: "SLOW MORNINGS",
  coverBody:
    "A 1968 house on a private terrace lot, open from the kitchen straight through to the living room. Old Town Yucca Valley is minutes away, the Black Rock entrance to Joshua Tree a little further, and Pioneertown is a short drive.",
  // Captions are keyed by ROOM and the generator collapses aliases before it
  // looks one up — great_room/office/other → living, outdoor/outdoor_living →
  // pool, bedroom → primary_bedroom. The FIRST row of each collapsed group
  // answers for the whole group, so each line has to be true of every frame
  // that can land on it, and must not name an object the chosen frame might
  // not contain (46109 Roadrunner Lane shipped a mountain window that was
  // behind the lens).
  rooms: [
    // Answers for great_room / office / other too, but the den, the massage
    // room and the empty French-door corner are all excluded, so only the real
    // living room can reach this line. True of 7, 10, 11 and 12 alike. The
    // record player in #10 is real and deliberately NOT named — it is at the
    // frame edge of one photo out of four.
    { room: "living", caption: "One long sectional, white walls, and tile that stays cool through August." },
    // 13 shows the table and the French doors, 14 and 15 show it open to the
    // kitchen. The table and the chandelier are the only things in all three.
    { room: "dining", caption: "A round table under a brass chandelier, a few steps from the kitchen." },
    // Has to hold for 15, 16, 17, 18, 19 and 20. Wood cabinets and the island
    // are in all six; the gas cooktop, the wall oven and the bench stools each
    // drop out of at least one, so none of them is named.
    { room: "kitchen", caption: "Wood cabinets, an island to work at, and it opens straight through to the dining room." },
    // Answers for `bedroom` too, so it has to hold for all four bedroom
    // frames. 24, 25, 27 and 28 share only a low wood bed frame, a ceiling fan
    // and white walls — no view, no slider, no ensuite.
    { room: "primary_bedroom", caption: "A low wood bed frame, a ceiling fan overhead, and white walls that hold the light." },
  ],
  fallbackCaption: "A 1968 house on a terrace lot, minutes from Old Town Yucca Valley.",
  textPosts: [
    {
      paragraphs: [
        "The address is doing most of the work here.",
        "Old Town Yucca Valley is minutes from the door, the Black Rock entrance to Joshua Tree is a short drive, and Pioneertown is a little past that.",
      ],
      italicLast: "You can get coffee and be standing at a trailhead before it gets hot.",
    },
    {
      paragraphs: [
        "The kitchen, the dining room and the living room are one connected space.",
        "An island with bench seating in the middle of it, so whoever is cooking is still in the conversation, and a run of front windows that keeps it bright all day.",
      ],
      italicLast: "At 1,198 square feet, how the rooms connect matters more than the number.",
    },
    {
      paragraphs: [
        "Two bedrooms, one bath, a two-car garage, and no HOA.",
        "If you are thinking of this as a weekend place, the numbers to look at are the utilities and the property taxes, not the monthly payment. I will pull them for you.",
      ],
      italicLast: "Stay for one evening after sunset and the appeal explains itself.",
    },
  ],
  // THE CTA TEMPLATE DOES NOT REFLOW. buildCtaTransformation places paragraph 2
  // at a fixed 3-line offset from paragraph 1, so a paragraph that wraps to 4
  // lines gets overprinted by the next one (48423 Hepburn Drive shipped that
  // way once). Keep each paragraph to ~110 characters.
  cta: {
    paragraphs: [
      "Buying a weekend place is a different decision than buying somewhere to live full time.",
      "Tell me which one this would be for you, and I'll tell you honestly whether it fits.",
    ],
    italicLast: "DM me before you drive out. It's a long way for a maybe.",
  },
  caption: `A 1968 house on a private terrace lot in Yucca Valley — 7798 Acoma Trail.

Open from the kitchen straight through to the living room, with an island and bench seating in the middle of it. Two bedrooms, one bath, a two-car garage, and no HOA. Old Town Yucca Valley is minutes from the door, the Black Rock entrance to Joshua Tree is a short drive, and Pioneertown is a little past that.

2 BD · 1 BA · 1,198 SQFT · $299,000

Listed by Peyson Robertson & The Obsidian Group · eXp Realty Of Southern California Inc

#yuccavalley #joshuatree #highdesert #oldtownyuccavalley #desertliving`,
};
