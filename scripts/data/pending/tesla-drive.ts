// 74586 Tesla Drive, Palm Desert — $900,000 (Ashley N Robertson · The Obsidian
// Group), Genesis.
//
// Chosen 2026-08-03: newest listing in the team pool (on market 7/26), 74
// photos, and architecturally unlike the two properties already through the
// queue — Ridge Road was high-desert Spanish, Vista Chino a Palm Springs
// mid-century. This one is a 2016 single-story with walnut beams running the
// whole main room.
//
//   colour   4A3226, pulled off the ceiling beams themselves. The cover photo
//            is pool blue, hedge green, tan block wall and grey pavers; a dark
//            warm brown is the one value in the frame that nothing else
//            occupies. Berry (vista-chino) and indigo (ridge-road) are both
//            already in the feed.
//   cover    photo 66 — pool, raised spa with the tiled spillway, palms and a
//            clean sky band. The cover's accent panel covers the left 44% of
//            the frame, so the subject has to sit right of centre; the interior
//            candidates all put their best content in the half that gets
//            covered.
//   baths    the MLS carries bathroomsTotalInteger 4 / decimal 3.5 (3 full + 1
//            half) and the cover renders the integer. The caption below says
//            3.5, matching the listing's own remarks, so cover and caption
//            differ by half a bath. Accuracy on another agent's listing beats
//            internal tidiness; the builder is what needs fixing.
//   solar    "paid-off solar and Tesla backup batteries" is the listing's own
//            claim about itself, reported as a feature and not as a promise
//            about what transfers. Same handling as "listed furnished" on
//            vista-chino.ts.
//
// The fourth bedroom is deliberately not discussed. The remarks say it shows
// as three and lives as four with a closet added; that is a permitting question
// nobody should be answering in a caption.
export default {
  listingKey: "20260726023814167620000000",
  accentColor: "4A3226",
  coverPhotoIndex: 66,
  hook: "WIDE OPEN",
  coverBody:
    "Single story in Genesis, with walnut beams running the length of the main room and a private pool and raised spa out back. Paid-off solar and Tesla backup batteries already on the house.",
  // Keyed by ROOM, never by position — a rejected take promotes a different
  // room into that slot and positional captions then mislabel it.
  // The builder aliases great_room/office/other → living, bedroom →
  // primary_bedroom, and outdoor/outdoor_living → pool, so a bedroom caption
  // has to read correctly over a child's room as well as over the primary.
  rooms: [
    { room: "living", caption: "Walnut beams the length of the ceiling, and the kitchen open at the far end." },
    { room: "kitchen", caption: "Double ovens, a gas cooktop, and an island with room to actually work." },
    { room: "dining", caption: "Table under the beams, sliders behind it, pool ten steps past that." },
    // Not "shutters on every window": the frame the stager picked leads with the
    // big DRAPED slider and keeps the shuttered window off to the side, so that
    // line read as contradicted by its own photograph. Name both treatments and
    // let the picture carry whichever one it shows.
    { room: "primary_bedroom", caption: "Palms out the window, and shutters for the mornings you want it dark." },
    { room: "pool", caption: "Pool, raised spa, string lights, and palms over the back wall." },
    { room: "exterior", caption: "Single story, tile roof, and the solar on it is already paid off." },
  ],
  fallbackCaption: "A single-story home in Genesis, north Palm Desert.",
  textPosts: [
    {
      paragraphs: [
        "Everybody who moves out here eventually asks the same question about summer: what does it cost to keep a house cool.",
        "Paid-off solar and Tesla backup batteries are already on this one. That is a different conversation than solar with a lease still attached to it.",
      ],
      italicLast: "Ask what July actually cost. It is the right question in Palm Desert.",
    },
    {
      paragraphs: [
        "One story, and the middle of the house is one long room.",
        "Kitchen at one end, the table in the middle, sofa at the other, and walnut beams running the whole length of the ceiling. Whoever is cooking is still in the conversation.",
      ],
      italicLast: "You feel a ceiling like that before you notice it.",
    },
    {
      paragraphs: [
        "Genesis runs about $268 a month. That covers a community pool and a fitness center.",
        "This house has its own pool in the back as well, so the community one is a bonus rather than the reason you would buy here.",
      ],
      italicLast: "Check what the HOA covers. It is the easiest number to skip.",
    },
  ],
  cta: {
    paragraphs: [
      "Palm Desert has a dozen communities that look the same from the road and are not the same at all.",
      "Which one fits comes down to how you actually live — whether you want the gym, the short drive to El Paseo, or none of it. I would rather sort that out first than walk you through twelve houses.",
    ],
    italicLast: "DM me. Let's talk before you tour another house.",
  },
  caption: `Single story in Genesis, built 2016, with walnut beams running the length of the main room.

Private pool and a raised spa in the back, a kitchen with double ovens and a long island, shutters on the bedroom windows, and a whole-home water softener with reverse osmosis. Paid-off solar and Tesla backup batteries already on the house. HOA runs about $268 a month and includes the community pool and fitness center.

4 BD · 3.5 BA · 2,467 SQFT · $900,000

Listed by Ashley N Robertson & The Obsidian Group · eXp Realty Of Southern California Inc

#palmdesert #genesispalmdesert #poolhome #palmdesertrealestate #desertliving`,
};
