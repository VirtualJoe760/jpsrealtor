// 57730 Cantata Drive, La Quinta — $899,000 (Ashley N Robertson / The Obsidian Group)
//
// WHY THIS LISTING. It hit the feed 2026-09-06 and is the only genuinely new
// name in the pool. Every other FRESH candidate tmp-pool4.js returns is already
// struck by name in auto-posting.md, with frame numbers:
//
//   3470 Warren Vista    64 ph — mixed virtual staging, actor-generation.md §10
//   56616 Mountain View  44 ph — interiors #3-#28, every one bare
//   58540 Barron         29 ph — photography and condition
//   2502 Harbor          17 ph — gut rehab, "CASH ONLY. INVESTOR ONLY"
//
// Cantata is the opposite of the problem that has been emptying this pool: 77
// frames, lived-in and fully furnished (the feed says Furnished and the
// exclusions list is "Pac Man Table, personal items", which is not a sentence
// anybody writes about a staged house). The remarks disclose no virtual
// staging and no frame carries a badge. It is also the first pool-and-spa
// property in weeks — the last several posts are high-desert and Coachella-side
// listings, so this reads as a different house in the feed.
//
// NO EXCLUSIONS EXCEPT #35. Read off tmp-selector-dump.ts, not off the contact
// sheet (the Azzura lesson). The shortlist is #8 living, #21 kitchen, #58 pool,
// #54 outdoor_living, #31 dining, #16 game_room, #6 bedroom, #1 exterior,
// #35 other — and only nine get staged, so an exclusion list costs a slide
// rather than improving one. Every one of the first eight puts open floor in
// the near field; none is the opaque-near-face-at-waist-height category.
//
//   #35 is the laundry room, ranked ninth. It is the one frame in the shortlist
//   that would make a worse slide than the frame it displaces, and dropping it
//   promotes #9 (another great-room angle) into the spare slot instead.
export default {
  listingKey: "20260906140021711486000000",
  // The cover is turquoise water and sky — 0685D4 is the single most frequent
  // saturated colour in it. Anything blue or tan disappears into the pool, the
  // sky or the concrete (the Ridge Road failure, where champagne sat in the
  // same family as the tile roof). The one saturated non-blue, non-tan colour
  // in this listing's own photography is the red felt on the game-room table,
  // FE7251 sampled off #16. Deepened here so white type reads on it.
  accentColor: "8C2F1F",
  // #65. WAS #60, AND THE FIRST BUILD PROVED THE §8 TEST IS RUN AGAINST THE
  // WRONG IMAGE. "Judge a cover frame by its right half" reads as a test on the
  // listing photo, and that is how #60 was picked — its right half is pool
  // water and sky. But `buildCoverTransformation` applies `ar_4:5, c_fill,
  // g_auto` to the 1600x1200 landscape FIRST and hangs the panel on the
  // portrait crop, so the half that survives is the right half of a frame that
  // has already lost most of its width. g_auto scores saliency, and flat pool
  // water has almost none — it cropped to the trees and the cinderblock wall
  // instead, and POOL DAY shipped over a block wall.
  //
  // So the test is: crop to 4:5 with g_auto, THEN look at the right ~56%.
  // Rendered for #55, #62, #65, #67, #53 and #0 before choosing. #65 keeps
  // pool, deck, gazebo, palms and sky on the visible side; #62 keeps an
  // air-conditioning condenser; #53 keeps a fire bowl and patio chairs; #55
  // hides the putting green behind the panel; #0 is roof.
  //
  // #65 also fixes a duplication the first build created: the stager returned
  // #60 as its `outdoor` slide, so the cover and slide 3 were the same
  // photograph twice in one carousel.
  coverPhotoIndex: 65,
  hook: "POOL DAY",
  // No bed or bath count here. bathroomsTotalInteger is 5 and rounds a 4.5-bath
  // house up, so the spec strip three lines above will print "5 BA" off the
  // feed while the remarks say four. Jamaica Sands §8 — the strip is not mine
  // to argue with, so the body names neither and the caption carries 4.5.
  coverBody:
    "One of the largest lots in the community at 13,068 square feet, with a pool, a raised spa and a waterfall out back and a putting green beside them. Built 2005, three-car garage, offered fully furnished.",
  // Captions keyed by ROOM. `great_room` collapses into `living`,
  // `outdoor`/`outdoor_living` into `pool`, `bedroom` into `primary_bedroom` —
  // the first matching row answers for the whole group, so each line below has
  // to hold over every frame the stager might return under that key.
  rooms: [
    // Answers for #8, #9, #10, #13, #14, #15, #33 and #40. The brown sectional
    // and the tile are in all of the first six; #40 is the sitting room off the
    // primary and has wood floor, but it ranks 14th and only reaches a slot if
    // five earlier frames fail. Nothing here names a wall, a TV or a window —
    // Hombria and Apache both lost that bet in opposite directions, so the
    // draft asserts only what is invariant and the reband makes it specific.
    { room: "living", caption: "Tile underfoot, a sectional you can lose people on, and it opens to the next room." },
    // Holds over #21 through #29. Cherry cabinets and granite are in every one
    // of them; the island is in most and not in #29, so the close is about the
    // room rather than the island.
    { room: "kitchen", caption: "Cherry cabinets, granite counters, and room for more than one cook." },
    // `outdoor` and `outdoor_living` collapse into `pool`. The DRAFT was
    // deliberately vague — "13,068 square feet of lot, and the back of it is
    // the whole reason" — because that one line had to hold over the pool
    // frames, the covered patio, the pergola and the putting green alike, and
    // copy-voice.md's corollary is that the vaguer draft is the better draft.
    //
    // IT WAS REBANDED SPECIFIC AND THEN PUT BACK, WHICH IS THE LESSON. The
    // first build returned #60 — unmistakably the pool — so this line was
    // rewritten to "Full-length pool, a tanning shelf along one side, and block
    // wall all the way round", every word of it in that frame. Then #60 turned
    // out to be a bad render and the rebuild returned #51 instead: a raised
    // planter, cactus and block wall, no water anywhere. The specific line
    // followed the KEY, not the frame, and printed a full-length pool over a
    // cactus bed.
    //
    // So "reband to the frame that shipped" is only safe while that frame is
    // the one still shipping. A caption made specific to a render that is later
    // dropped has to go back to the invariant, and the invariant here is the
    // lot: true of the pool frames, the covered patio, the pergola, the putting
    // green and #51 alike, and contradicted by no crop. Number off the feed
    // (lotSizeArea 13068). No object, no time of day.
    { room: "pool", caption: "13,068 square feet of lot, and the back of it is the whole reason." },
    // #30, #31 and #32 are the same eight-seat table from three angles.
    { room: "dining", caption: "Long table, tile underfoot, and it seats everybody who shows up." },
    // The stager returns `game_room` for #16-#20, which all contain the
    // red-felt table, and also for #11 and #12, which are great-room angles
    // with the table only glimpsed at the back. So the draft does not name it.
    // REBAND once the build log says which frame shipped — if it is #16-#20 the
    // pool table is the line, and reband-pending-post.ts costs no Gemini.
    { room: "game_room", caption: "The game end of the house, open to everything else, no wall in the way." },
    // `bedroom` collapses into `primary_bedroom` for the CAPTION, but the LABEL
    // comes off the stager's own key first, so a `bedroom` frame prints THE
    // BEDROOM and not THE PRIMARY — no false claim either way. #6 is the only
    // bedroom in the stageable set; the line is written to hold over any of
    // them, naming only the floor and the curtains.
    { room: "primary_bedroom", caption: "Wood underfoot, curtains to the ceiling, and quiet enough to sleep in." },
  ],
  fallbackCaption: "A 2005 single-level in Piazza Serena, on one of the biggest lots in it.",
  textPosts: [
    {
      // Paragraph 1 kept near 70 characters — Sea Life's 95-char opener wrapped
      // to three lines and ran into paragraph 2's fixed offset.
      paragraphs: [
        "Everything about a house can be changed except the land it sits on.",
        "13,068 square feet here, one of the largest lots in the community. That is the part no remodel gets you, and it is why I would look at this one first.",
      ],
      italicLast: "Start with the lot. The rest is negotiable.",
    },
    {
      paragraphs: [
        "This one comes furnished, and that word does more work than people expect.",
        "It means you can close and sleep here the same week. It also means reading the exclusions, because the Pac-Man table is going with the seller.",
      ],
      italicLast: "Ask what stays before you fall in love with a room.",
    },
    {
      paragraphs: [
        "The pool has a tanning shelf, which is the part people underrate.",
        "A few inches of water, a chair sitting in it, and you can spend an afternoon out there in August without actually swimming. The spa and the waterfall are right behind it.",
      ],
      italicLast: "That is where the whole day goes.",
    },
  ],
  // Both paragraphs under ~110 characters — buildCtaTransformation places
  // paragraph 2 at a fixed three-line offset and a fourth line gets overprinted
  // (Hepburn Drive).
  cta: {
    paragraphs: [
      "A furnished house is a faster close, and a faster close has traps of its own.",
      "I would rather walk you through what stays and what does not before you write.",
    ],
    italicLast: "DM me. Let's talk before you tour another house.",
  },
  // 4.5 BA, not the 5 the feed's bathroomsTotalInteger rounds it to. bathsFull
  // is 4 and bathsHalf is 1, and the remarks call it a four-bathroom house.
  // The cover strip prints the feed's number and the two never sit on the same
  // slide — Jamaica Sands §8.
  caption: `A 2005 single-level in Piazza Serena, La Quinta, on 13,068 square feet — one of the largest lots in the community.

Pool with a tanning shelf, raised spa, and a lit waterfall. Putting green beside it, covered patio the length of the house, three-car garage, and mountain views. Low HOA, and per the listing it is offered fully furnished.

3 BD · 4.5 BA · 3,001 SQFT · $899,000

Listed by Ashley N Robertson · The Obsidian Group · eXp Realty Of Southern California Inc

#laquinta #coachellavalley #desertliving #poolhome #luxuryhomes`,
};
