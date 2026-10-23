// 83633 Lapis Drive, Coachella — $515,000 (Jack A Rook & The Obsidian Group)
//
// Picked out of the unposted team pool because it is the only never-queued
// candidate that is genuinely FURNISHED with telic objects. The two obvious
// alternatives both fail on the images, not on the copy:
//
//   4140 E Calle San Antonio ($570k, 49 photos, Palm Springs) is vacant —
//   every real interior is a bare room, and the only furnished frames (#20,
//   #27, #34, #44) carry the listing's own "Digitally Altered" disclosure. It
//   also ships a POOL in #7 on a poolYN:false property. Staging the agent into
//   another brokerage's digitally-altered photo is a compliance problem, and
//   with nothing to use every slide degrades to an edge reaction, which
//   actor-generation.md §6 then forbids repeating. Skipped.
//
//   78250 Cortez Lane #129 (Indian Wells, 50 photos) is 22 aerials and a
//   576 sqft condo. Aerials have no floor plane (§3). Skipped.
//
// This one has a full-size pool table in the front room, a granite island with
// bar stools, a covered patio with a dining set, and made beds — four distinct
// rooms with something to DO in each, which is exactly what the pipeline needs.
// It is also the first Coachella listing and the first family-sized floor plan
// in the feed, which has run Palm Springs mid-century and Indio golf for a week.
//
// EXCLUSIONS (pass on the command line):
//   0, 1, 21   — carry the listing's own "AI Enhanced" watermark. #21 is the
//                back yard with a lawn added: #22 is the same view unretouched
//                and the yard is bare dirt. Nothing below may claim grass, and
//                none of these three may be staged or used as the cover.
//   22         — the unretouched yard, but the frame is dirt and a wheelie bin.
//   2, 3, 10   — entry, hallway, stair landing. Circulation, nothing to do (§3).
//   6, 20      — the two dens. The generator collapses `office` → `living`, so a
//                den landing there would take the living-room line; there is no
//                photographed living room for that line to be written to.
//   9          — reserved for the cover, so it cannot repeat as a room slide.
//   11, 12, 19 — children's rooms: stuffed toys on the bed, a gaming chair, a
//                backpack on the floor. A suited agent seated on that bed edge
//                is the wrong photograph.
//   13, 16     — bathrooms. Never (§3). Both also have the photographer's
//                tripod in the mirror.
//   25         — a third patio angle, weaker than 23/24 and shows a hose bib.
//   26         — aerial. No floor plane, no human-scale reference (§3).
//
//   npx ts-node -O '{"module":"commonjs"}' scripts/build-pending-post.ts \
//     lapis-drive --exclude 0,1,2,3,6,9,10,11,12,13,16,19,20,21,22,25,26
//
// That leaves 4,5 (game room) 7,8 (kitchen) 14,15,17,18 (bedrooms) 23,24
// (covered patio) — ten candidates for four slots, one per collapsed room key.
//
// NO POOL (poolYN: false) and NO LAWN in the back. The `pool` caption below is
// written so it stays true whether the frame lands as `outdoor`, `pool` or
// `exterior`, and it describes the patio cover, which is real in all three.
export default {
  listingKey: "20260722200752789624000000",
  // Deep navy. The cover frame is the kitchen — cherry cabinets, gold granite,
  // cream walls, every pixel warm. Ridge Road's lesson was that an accent
  // inside the photo's own colour family disappears into it, so this sits
  // opposite the granite rather than beside it.
  accentColor: "1B2A4A",
  // Judged by the RIGHT half, per copy-voice.md §8 — the cover panel hides the
  // left ~45%. What survives here is the granite island with both bar stools,
  // the gas range and the dark uppers. #4's surviving strip is half a pool
  // table and a credenza; #23's is one chair and a bare yard. The two exterior
  // frames that would normally win a cover are both AI-enhanced and are out.
  coverPhotoIndex: 9,
  hook: "FIVE BEDROOMS",
  coverBody:
    "Five bedrooms and three baths on a no-HOA lot in Bella Canto, with a covered patio running the full width of the back of the house and parking for five out front. Granite island kitchen, and a front room big enough for the pool table.",
  // Captions are keyed by ROOM and the generator collapses aliases before it
  // looks one up — great_room/office/other → living, outdoor/outdoor_living →
  // pool, bedroom → primary_bedroom. The FIRST row of each collapsed group
  // answers for the whole group. So each line has to be true of every room
  // that can land on it, and must not name an object the chosen frame might
  // not contain (46109 Roadrunner Lane shipped a mountain window that was
  // behind the lens).
  rooms: [
    // FIRST BUILD SHIPPED "…dark cabinets, and a gas range" and the stager
    // picked #8, which is shot from the family-room side: island, dark
    // cabinets, wall ovens and the sectional are all in frame, and the gas
    // range is behind the lens. The range is real — it is in #7 and #9 — but
    // copy-voice's rule is to write the caption to what the chosen frame can
    // be relied on to contain. The opening through to the family room is in
    // every kitchen angle here; the range is not.
    //
    // AND KEEP IT TO TWO LINES. The replacement line above was 103 characters,
    // wrapped to three, and the third line printed straight through the
    // THE KITCHEN label — buildBannerTransform anchors the caption at
    // gravity:south y:80 and lets it grow UPWARD, while the label sits fixed at
    // y:250. At 38pt across 900px that is a hard ceiling of ~90 characters.
    { room: "kitchen", caption: "A granite island in the middle, and it opens through to the family room." },
    { room: "game_room", caption: "The front room is a game room — full-size pool table, right off the entry." },
    // Answers for `bedroom` too, so it has to hold for all four bedroom frames.
    // Nothing about a suite, a slider or a view: 14, 15, 17 and 18 share only
    // carpet, a ceiling fan and a made bed.
    { room: "primary_bedroom", caption: "Carpet, a ceiling fan overhead, and this is one of five bedrooms." },
    // norm("outdoor") === "pool", so this one line covers outdoor,
    // outdoor_living and pool. There is no pool, and the lawn in #21 was added
    // in post — so it describes the patio cover, which is real in every frame.
    { room: "outdoor", caption: "The patio cover runs the length of the house, so the whole back of it sits in shade." },
    { room: "exterior", caption: "The patio cover runs the length of the house, so the whole back of it sits in shade." },
    // Only reachable if the reader returns `great_room` or `other`. Written to
    // be true of any downstairs gathering space here.
    { room: "living", caption: "Tile downstairs, crown moulding, and it connects straight back to the kitchen." },
    // The game room IS the formal dining room with a pool table in it — same
    // chandelier, same tile. If the reader calls it `dining`, this line still
    // has to be true of that frame.
    { room: "dining", caption: "Chandelier overhead, tile underfoot, and the kitchen a few steps around the corner." },
  ],
  fallbackCaption: "Five bedrooms and no HOA, in Bella Canto.",
  textPosts: [
    {
      paragraphs: [
        "Five bedrooms, and no HOA.",
        "No monthly association bill, and no board deciding what sits in the driveway. On a house this size that is worth more than it sounds on paper.",
      ],
      italicLast: "Ask me what the taxes actually run here. I will pull them for you.",
    },
    {
      paragraphs: [
        "The patio cover runs the whole width of the back of the house.",
        "That is the difference between a yard you look at in August and a yard you use. Dinner outside at seven, and it is still in shade.",
      ],
      italicLast: "Out here, shade is not a decorative feature.",
    },
    {
      paragraphs: [
        "The front room came set up as a game room — pool table, chandelier, right off the entry.",
        "There is a den behind it doing office duty, and five bedrooms upstairs. Most of the where-does-everything-go question is already answered.",
      ],
      italicLast: "Walk it once with the whole family. It reads bigger in person.",
    },
  ],
  // THE CTA TEMPLATE DOES NOT REFLOW. buildCtaTransformation places paragraph 2
  // at a fixed 3-line offset from paragraph 1, so a paragraph that wraps to 4
  // lines gets overprinted by the next one (48423 Hepburn Drive shipped that
  // way once). Keep each paragraph to ~110 characters.
  cta: {
    paragraphs: [
      "Buying with a growing family is a different search than buying a second home.",
      "Tell me who is living there and how long you plan to stay. The right house usually answers itself.",
    ],
    italicLast: "DM me. I'll send the tax bill and the school boundaries before you drive out.",
  },
  caption: `Five bedrooms, three baths, and no HOA — 83633 Lapis Drive, in Bella Canto.

Granite island kitchen with dark cabinets and a gas range, a front room set up as a game room with a full-size pool table, and a covered patio that runs the full width of the back of the house. Parking for five out front.

5 BD · 3 BA · 2,162 SQFT · $515,000

Listed by Jack A Rook & The Obsidian Group · eXp Realty Of Southern California Inc

#coachella #coachellavalley #bellacanto #fivebedroomhome #desertliving`,
};
