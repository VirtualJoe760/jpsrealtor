// 46109 Roadrunner Lane, La Quinta — $940,000 (Peyson Robertson · The Obsidian Group)
//
// Picked 2026-08-06: highest-priced unposted team active, 69 photos, and the
// first La Quinta listing in the feed — the last five queued or posted runs are
// Yucca Valley, Palm Springs x2, Palm Desert and Indio, and the interiors here
// (maple, dark granite, terracotta) look nothing like Tesla Drive's.
//
// Two things about this house that shape the copy:
//
//   NO POOL. poolYN is false and the yard is grass to the wall. Nothing may
//   imply otherwise — not a caption, not a room label. The generator's `outdoor`
//   room key had no label and fell through to "THE POOL DECK"; fixed in
//   build-pending-post.ts in the same commit.
//
//   The differentiator is SINGLE STORY at 3,228 sqft with 10-foot ceilings, not
//   luxury finish. The house is a well-kept 2006 build, so the copy leans on
//   what is measurably there — the island, the second primary suite, the level
//   lot, the $60 HOA — rather than on adjectives it cannot back (copy-voice §6).
//
// accentColor: the photography is relentlessly warm (tan stucco, terracotta
// walls, maple cabinets, brown granite). Ridge Road shipped an accent inside
// that same warm family and it disappeared into the photo, so this pulls the
// hazy blue-slate off the Santa Rosas in the aerial frames instead.
export default {
  listingKey: "20260414190721744574000000",
  accentColor: "1F3A52",
  coverPhotoIndex: 0,
  hook: "ALL ONE FLOOR",
  coverBody:
    "Thirty-two hundred square feet on a single level, ten-foot ceilings the whole way through, and a granite island long enough that nobody has to move when the food comes out.",
  // Keyed by ROOM, never by position — a rejected take promotes a different
  // room into the slot and positional captions then mislabel it.
  rooms: [
    // No fireplace in this line. The stager's great-room frames look down the
    // open axis toward the kitchen and the hearth is behind the lens, so naming
    // it described a wall the reader cannot see.
    { room: "living", caption: "Ten-foot ceilings, and the kitchen right there for the people who never sit down." },
    { room: "kitchen", caption: "Granite island, double ovens, gas cooktop, and the walk-in pantry behind that door." },
    { room: "dining", caption: "Everyone at one table, with the great room straight through the arch." },
    // ONE bedroom line, and it has to be true of any of the four. ROOM_ALIASES
    // collapses `bedroom` into `primary_bedroom` for de-duplication, so both
    // keys resolve to whichever row sits first and a second row is unreachable.
    // Build 1 proved it: the stager picked a secondary bedroom, the label read
    // THE BEDROOM, and the caption underneath promised mountains through the
    // windows and a door to the patio — neither of which is in that frame.
    { room: "primary_bedroom", caption: "Two of the four bedrooms are full primary suites, so nobody draws straws." },
    { room: "office", caption: "A quiet room at the front of the house for the work that follows you out here." },
    // Deliberately says nothing about which side of the house it is on. The
    // stager calls the front courtyard `outdoor` too, and build 1 put this line
    // under a photo of the front door.
    { room: "outdoor_living", caption: "Covered patio, a sink already plumbed in, and grass all the way to the wall." },
    { room: "exterior", caption: "Ten thousand square feet of level, fenced lot and a three-car garage." },
  ],
  fallbackCaption: "Single story, 3,228 square feet, north of Highway 111 in La Quinta.",
  textPosts: [
    {
      paragraphs: [
        "Everything is on one floor. No stairs to a bedroom, no stairs to the laundry, no stairs at all.",
        "Ten-foot ceilings the whole way through, so it lives even bigger than the 3,228 square feet reads on paper.",
      ],
      italicLast: "You notice it most on the days you are carrying something.",
    },
    {
      paragraphs: [
        "Buyers always ask me which room actually gets used. It is the one with the island in it, every time.",
        "Double ovens, a gas cooktop, a walk-in pantry, and counter long enough that the cook and everybody else can both be in here.",
      ],
      italicLast: "Thanksgiving happens here whether you planned it or not.",
    },
    {
      paragraphs: [
        "The lot is level, fenced, and just over ten thousand square feet, with the covered patio already wrapped around the back.",
        "There is a sink plumbed in out there and grass to the wall. Room for a pool, an outdoor kitchen, or both.",
      ],
      italicLast: "Coffee out there in the morning, before the heat shows up.",
    },
  ],
  cta: {
    paragraphs: [
      "A single-story plan this size is the kind of thing people decide about in the first ten minutes.",
      "I would rather walk it with you and have you tell me it is wrong than talk you into it from a phone screen.",
    ],
    italicLast: "DM me and let's get you inside it.",
  },
  caption: `Single story, 3,228 square feet, all on one level in La Quinta north of Highway 111.

Ten-foot ceilings, granite island kitchen with double ovens and a walk-in pantry, two primary suites, gas fireplace in the great room, three-car garage. Level 10,019 sqft lot with a covered wrap-around patio and room for a pool. HOA is $60 a month.

Old Town La Quinta, the Empire Polo Grounds and the hiking off the Cove are all a short drive.

4 BD · 3 BA · 3,228 SQFT · $940,000

Listed by Peyson Robertson & The Obsidian Group · eXp Realty Of Southern California Inc

#laquinta #laquintaca #coachellavalley #desertliving #singlestoryhome`,
};
