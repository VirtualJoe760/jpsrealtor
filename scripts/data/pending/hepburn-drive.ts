// 48423 Hepburn Drive, Indio — $529,000 (Peyson Robertson & The Obsidian Group)
//
// Chosen over the two other strong candidates in the unposted pool because the
// staging pipeline needs OBJECTS, not square footage:
//
//   79161 Falmouth Dr ($619k, top of the pool) is a completed renovation shot
//   completely EMPTY — every interior is a bare room. Tier-1 ACTION needs a
//   telic object to use (actor-generation.md §1); with none, all four slides
//   degrade to edge reactions, which §6 then forbids repeating. Skipped.
//
//   1184 Lear Ave (29 Palms, 60 photos) is furnished but personally — bare
//   mattresses, a gun safe, a gaming chair — and its story (high-desert
//   acreage, solar, stars) is the story 53806 Ridge Road already posted.
//
// This one is professionally furnished: island stools, a dining set, a
// full-size pool table, a sectional at a gas fireplace, made beds. It is also
// the only candidate whose subdivision carries real closed-sale stats, so it
// earns the CMA slide — Indian Palms, 25 closes, APR–JUL 2026.
//
// EXCLUSIONS (pass on the command line, see below). Front elevations 0-7 are
// the documented gap in the photo reader: it has no front-elevation key, so a
// driveway returns `outdoor`, normalises to `pool` and bands as OUTDOOR LIVING
// — that is how 3010 N Chuperosa Road built a slide of a closed garage door.
// 9,10,11,25 are entry and hallway (circulation, nothing to do). 8 is the one
// unfurnished room and would drag the living-room caption onto an empty box.
// 43 and 45 are outdoor frames held back from staging, 46-50 are aerials.
//
// Added after looking at build 1 (code V6, declined): 12, 13 and 23.
//   12 rendered him standing dead centre, feet together, hands clasped,
//      smiling at the lens — the catalogue pose actor-generation.md §6 rules
//      out, and the log's intended "leaning on the island" never happened.
//   13 rendered him with both hands in his pockets against a blank wall,
//      presenting nothing. Neither an ACTION nor a valid REACTION (§1).
//   23 staged fine but the frame is 70% sectional, so a slide banded THE GAME
//      ROOM read as a living room. 20 puts the pool table front and centre.
//
//   npx ts-node -O '{"module":"commonjs"}' scripts/build-pending-post.ts \
//     hepburn-drive --exclude 0,1,2,3,4,5,6,7,8,9,10,11,12,13,23,25,43,45,46,47,48,49,50
//
// NO POOL ON THIS PROPERTY (poolYN: false) — the pools are the community's.
// Nothing below may claim one, and the outdoor caption is written so it stays
// true whether the frame lands as `outdoor`, `exterior` or `pool`.
export default {
  listingKey: "20260616192248643487000000",
  // Deep teal. The cover frame (43) is a sunset over the fairway — warm orange
  // sky, yellow-green turf, terracotta hardscape. Ridge Road's lesson was that
  // an accent inside the photo's own colour family disappears into it, so this
  // sits opposite the sunset rather than beside it.
  accentColor: "10444C",
  // Was 43 (sunset over the fairway) with the hook FAIRWAY VIEWS. The cover
  // panel covers the LEFT ~45% of the frame, and 43 puts its fairway, palms
  // and patio table on the left — so the crop that survived was a barbecue and
  // an air-conditioning condenser, under a hook promising a fairway. Judge a
  // cover frame by what sits in its RIGHT half, not by the whole photograph.
  coverPhotoIndex: 1,
  hook: "THE WINTER PLACE",
  coverBody:
    "Single story behind the gates at Indian Palms, with the back patio opening onto the fairway. Listed fully furnished and short-term-rental friendly — the pools, tennis, bocce and championship course are all inside the gate.",
  // Captions are keyed by ROOM and the generator collapses aliases before it
  // looks one up — great_room/office/other → living, outdoor/outdoor_living →
  // pool, bedroom → primary_bedroom. So the FIRST row of each collapsed group
  // answers for the whole group, and a second row in the same group is
  // unreachable. Each line below therefore has to be true of every room that
  // can land on it, and must not name an object the chosen frame might not
  // contain (46109 Roadrunner Lane shipped a mountain window that was behind
  // the lens).
  rooms: [
    { room: "living", caption: "Vaulted ceilings, wood-look plank floors, and it opens straight through to the kitchen." },
    // "an island with room to sit" landed on a frame showing a bare granite
    // peninsula and no stools. Bar-height counter is true of every kitchen
    // frame in this set; the island is only true of some.
    { room: "kitchen", caption: "Granite counters, stainless appliances, and a bar-height counter to pull a stool up to." },
    { room: "dining", caption: "A table under the chandelier, and the kitchen two steps away." },
    { room: "game_room", caption: "A full-size pool table, right where the great room opens up." },
    // Answers for `bedroom` too, so it has to hold for the guest rooms as well
    // as the primary — nothing here about a suite, a slider or a view.
    { room: "primary_bedroom", caption: "Plank floors, a ceiling fan, and the bed already made — this one comes furnished." },
    // norm("outdoor") === "pool", so this one line covers outdoor, outdoor_living
    // and pool. It cannot mention a pool: there isn't one.
    { room: "outdoor", caption: "Lawn, a patio, and the golf course on the other side of the hedge." },
    { room: "exterior", caption: "Lawn, a patio, and the golf course on the other side of the hedge." },
  ],
  fallbackCaption: "Inside the gates at Indian Palms Country Club.",
  textPosts: [
    {
      paragraphs: [
        "This one is listed fully furnished.",
        "You close, you get the keys, and you can sleep there that night. For a second home in the desert, that is most of the work already done.",
      ],
      italicLast: "Bring a suitcase. That is genuinely the list.",
    },
    {
      paragraphs: [
        "Buyers ask me constantly whether a place can be rented short-term. The answer is usually complicated.",
        "This one is listed short-term-rental friendly, and the $225 monthly HOA covers the gate, the pools and spas, the fitness center, tennis and bocce.",
      ],
      italicLast: "Check the rules before you fall for the house. Every time.",
    },
    {
      paragraphs: [
        "The back patio looks onto the fairway, with the mountains sitting behind it.",
        "The championship course is inside the gate, the festival grounds are up the road, and Indio's shopping and dining is a few minutes the other way.",
      ],
      italicLast: "Sit out there once at sunset. That is the whole pitch.",
    },
  ],
  // THE CTA TEMPLATE DOES NOT REFLOW. buildCtaTransformation places paragraph 2
  // at a fixed 3-line offset from paragraph 1, so a paragraph that wraps to 4
  // lines gets overprinted by the next one. The first build shipped "…worth
  // getting right first." with "I would rather walk you…" stamped through it.
  // The text-post template flows correctly; only this one is positional.
  // Keep paragraph 1 to ~110 characters (roughly 50 per line, 2-3 lines).
  cta: {
    paragraphs: [
      "A second home in the desert is a different decision than a first home anywhere else.",
      "The season, the HOA, the rental rules — I would rather walk you through all of it than talk you into a showing.",
    ],
    italicLast: "DM me. I'll send the HOA docs and the rental rules before you drive out.",
  },
  caption: `Sunset over the fairway from the back patio — 48423 Hepburn Drive, inside the gates at Indian Palms Country Club.

Single story, listed fully furnished, and short-term-rental friendly. Gas fireplace, granite counters, an island with room to sit, and a pool table in the great room. The $225 HOA covers the gate, the pools and spas, the fitness center, tennis and bocce, and the championship course sits inside it.

4 BD · 3 BA · 2,066 SQFT · $529,000

Listed by Peyson Robertson & The Obsidian Group · eXp Realty Of Southern California Inc

#indio #indianpalms #coachellavalley #golfcourseliving #desertliving`,
};
