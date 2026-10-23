// 16430 Evans Lane, Desert Hot Springs — $1,300,000 (Bryan Hernandez ·
// The Obsidian Group). Five acres at the end of a dirt road with TWO separate
// residences on it: main house 3/2 plus a bonus room, guest house 2/2, and an
// additional exterior bathroom. Built 2013, gated, septic, water district.
//
// Chosen over 4140 Calle San Antonio (the other high-photo-count fresh
// listing) because every frame in this set is a real photograph. Calle San
// Antonio's three strongest images — the pool, the green lawn, the furnished
// living room — are all virtual renders the MLS discloses in the remarks, and
// the listing carries poolYN: false. Building a carousel on a pool that does
// not exist is the false-claim failure the pool-label guard in
// build-pending-post.ts exists to prevent; it should not be reintroduced by
// hand at the photo-selection step.
//
// accentColor: deep wine 4C1F2A. Sampled the cover's RIGHT half (copy-voice.md
// §8 — the panel hides the left ~45%) and it came back 61% warm tan (dirt,
// ridge) and 29% sky blue. Both of the obvious pulls are therefore blenders:
// a tan panel disappears into the ground, a blue one into the sky. Wine is the
// one dark hue in the frame's complement that neither the roof, the hillside,
// nor the sky can absorb. Same lesson as Ridge Road's champagne → indigo.
//
// coverPhotoIndex 43: the approach shot. Its right half — the house cluster,
// the dark garage, one green tree, the ridge — is the half that survives the
// panel. Photo 0's right half is a garage door over bare concrete, and 52's
// right half is RVs and power poles while all the good palms sit left, which
// is exactly the wrong way round for the crop.
//
// NO POOL, NO SPA, NO FIREPLACE on this listing (poolYN / spaYN / fireplaceYN
// all false). ROOM_LABELS.pool is auto-demoted to OUTDOOR LIVING by the
// generator, so the `pool` row below is written as an outdoor-space line and
// must never name water.
//
// Solar panels are visible on both roofs (photos 30, 37) and are deliberately
// NOT mentioned anywhere in this copy. The MLS carries no ownership field for
// them, and "solar" on an Instagram slide reads as "paid-off solar" — a claim
// about another brokerage's listing that nothing in the feed supports.
export default {
  listingKey: "20260806223928193474000000",
  accentColor: "4C1F2A",
  coverPhotoIndex: 43,
  hook: "FIVE ACRES",
  coverBody:
    "Two separate homes at the end of a dirt road, on five acres of open desert. Gated at the drive, the hillside rising behind the house and the valley opening out in front of it.",
  // Captions are keyed by ROOM and the key is not stable across runs
  // (copy-voice.md §8), so every line here is written to the SPACE and holds
  // for any frame the stager might hand that key. Nothing below names an
  // object that is not in every candidate frame for its group.
  //
  // Order inside an alias group matters: the FIRST row answers for the whole
  // group and later rows are unreachable. living answers great_room / office /
  // other; primary_bedroom answers bedroom; pool answers outdoor /
  // outdoor_living. Those three sit first in their groups.
  rooms: [
    // REWRITTEN AFTER THE FIRST BUILD, then re-applied with
    // reband-pending-post.ts. The original line read "Hand-cut wood posts,
    // white walls, and the desert light coming in" — written for photos 15/16/
    // 19/20, the rooms with rough-cut beams. It was a textbook instance of the
    // unstable-room-key failure in copy-voice.md §8: the stager returned
    // `other` for photo 33 (a bare cream room, tile floor, one window of date
    // palms, no beams anywhere), `other` aliases to `living`, and photo 33 sits
    // AHEAD of 16/19/20 in the selector's order. So #33 claimed the living key,
    // #16 — which the stager itself described as "rustic exposed beams and
    // wood-framed entry" — was dropped by the room de-duplication, and the
    // beam caption shipped over a room with no beams and cream walls.
    //
    // The replacement names only what is in the frame the run actually
    // produced. A rebuild re-rolls the selection, so this line has to be
    // re-checked against whatever lands on the living key next time.
    { room: "living", caption: "Date palms in the window, tile underfoot, and a fan turning overhead." },
    // Two kitchens on the parcel (main house and guest house). Oak cabinets,
    // stone counters and a window over the sink are the three things true of
    // both. The ranges differ between them, so no appliance is named.
    { room: "kitchen", caption: "Oak cabinets, granite counters, and a window over the sink." },
    { room: "dining", caption: "Open to the kitchen, so nobody ends up eating in the other room." },
    // Answers for `bedroom` too. Ceiling fan and a window are in every bedroom
    // frame in the set; the flooring is not.
    { room: "primary_bedroom", caption: "A ceiling fan, a window onto the desert, and the quiet five acres buys you." },
    // Labelled OUTDOOR LIVING, not THE POOL DECK — poolYN is false and the
    // generator demotes the label. No shade structure is named because the
    // outdoor frames include open concrete pads as well as covered patios.
    { room: "pool", caption: "Five acres around you, and the wind is the loudest thing out here." },
    { room: "game_room", caption: "The bonus room off the main house. Office, gym, or wherever everyone ends up." },
    // `exterior` has its own label (THE GROUNDS) and no alias, so it needs its
    // own row or it falls through to the spare line.
    { room: "exterior", caption: "Five acres, gated at the drive, and the road ends here." },
  ],
  fallbackCaption: "Five acres at the end of the road, with two homes on it.",
  textPosts: [
    {
      paragraphs: [
        "Two separate homes on one parcel is the part buyers underestimate.",
        "Three bedrooms and two baths in the main house, two and two in the guest house, and a bathroom outside for when you have been in the dirt all day.",
      ],
      italicLast: "Parents, grown kids, guests who stay a week. You decide later.",
    },
    {
      paragraphs: [
        "Five acres, and the road turns to dirt before you get here.",
        "Gated at the drive. The hillside comes up behind the house and the valley opens out in front of it.",
      ],
      italicLast: "There is no porch light out here but yours.",
    },
    {
      paragraphs: [
        "Buyers always ask me what five acres actually costs to keep.",
        "Septic, a water district meter, and a dirt road that wants grading after a storm. None of it is hard. It is worth knowing before you fall for the place.",
      ],
      italicLast: "I would rather tell you that up front than after.",
    },
  ],
  // buildCtaTransformation does NOT reflow: paragraph 2 is placed at a fixed
  // three-line offset from paragraph 1, so a paragraph that wraps to four lines
  // gets overprinted (copy-voice.md §8, 48423 Hepburn Drive). Both of these are
  // under 110 characters.
  cta: {
    paragraphs: [
      "Land takes longer to buy than a house does.",
      "Come walk the five acres with me before you decide anything. It reads differently in person.",
    ],
    italicLast: "DM me and we will get out there.",
  },
  caption: `Five acres at the end of a dirt road in Desert Hot Springs, with two separate homes on it.

Main house is 3 bed / 2 bath plus a bonus room. Guest house is 2 bed / 2 bath. There is a bathroom outside as well, for the days you have been in the dirt. Built in 2013, gated at the drive, granite counters, clay tile roof, detached garage. The hillside comes up behind the house and the valley opens out in front of it.

5 BD · 6 BA · 2,550 SQFT · 5 ACRES · $1,300,000

Listed by Bryan Hernandez & The Obsidian Group · eXp Realty Of Southern California Inc

#deserthotsprings #coachellavalley #desertliving #acreage #guesthouse`,
};
