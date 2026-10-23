// 3048 N Bahada Road, Palm Springs — $799,000 (Allison F Saenz / The Obsidian Group)
//
// Picked 2026-08-07: highest-priced unposted team active, 47 photos, and the
// widest room vocabulary left in the pool — great room, kitchen, dining, four
// bedrooms, TWO game rooms (a poker table off the great room, foosball and
// darts in the finished bonus space), pool + spa, putting green, built-in
// grill. The stager rejects frames freely, so a listing with this many
// distinct, stageable rooms is worth spending before the thinner ones.
//
// Captions are written ONE PER ALIAS GROUP, canonical key only. The generator
// collapses great_room/office/other → living, outdoor/outdoor_living → pool,
// and bedroom → primary_bedroom before looking a caption up, so a second row
// inside a group is unreachable — 46109 Roadrunner Lane shipped a secondary
// bedroom under the primary-suite line for exactly that reason.
//
// Each caption is also written to be true of EVERY frame in its group, not to
// the frame I hope gets picked:
//   living  — no fireplace named. The stacked-stone hearth is only in some of
//             the great-room frames, and `office`/`other` land here too.
//   pool    — absorbs the patio and the putting green, so it names the yard
//             rather than the water.
//   bedroom — the vaulted ceiling is only in two of the four bedrooms; tile
//             and a ceiling fan are in all of them.
//
// Nothing here claims a view: publicRemarks mentions mountain views but the
// structured `viewYN` is false, and the yard is hedged on every side.
//
// Built twice. Attempt 1 (code Z2, declined) passed every numeric gate and
// still had two slides that could not ship, which is exactly the failure the
// gates are not built to catch:
//   #37 spa      — "leaning on the edge of the spa" rendered as a man doubled
//                  over in mid-air, touching nothing. Scale and identity were
//                  both fine; the posture was not.
//   #27 bedroom  — an `open_hand` reaction presented a blank wall with a TV on
//                  it. The bed was almost entirely outside the crop, under a
//                  banner reading THE BEDROOM.
//   #6 great room— not wrong, but a mid-room arms-out gesture, and it put the
//                  poker room in the background of the slide BEFORE the poker
//                  room's own slide. Excluded to force a different frame.
// Attempt 2 (--exclude 6,14,27,37) came back with four telic actions in four
// rooms and four distinct postures: seated at the island bar, standing over a
// putt, arms folded at the dining table, leaning on the poker table.
export default {
  listingKey: "20260616012555792579000000",
  // Deep pine, taken from the mature hedge that walls the entire back yard and
  // the putting green inside it. Deliberately NOT a warm tone — Ridge Road's
  // champagne panel sat in the same family as the tile roof and went flat.
  // The cover frame is a terracotta house at dusk; green is the contrast.
  accentColor: "1B4736",
  // Twilight front elevation: the house lit from inside, palms, and the owned
  // solar visible on the roof — which is a selling point the copy leans on.
  coverPhotoIndex: 1,
  hook: "ROOM TO PLAY",
  coverBody:
    "Vaulted ceilings and a stacked-stone gas fireplace inside. Out back a pool, a separate spa, a putting green, a built-in grill. Owned solar on the roof. Four bedrooms, one level, no HOA.",
  rooms: [
    { room: "living", caption: "Vaulted ceilings, tile the whole way through, and it all opens into one room." },
    { room: "kitchen", caption: "Quartz counters, white cabinetry, and nobody has to leave while you cook." },
    { room: "dining", caption: "A long table, with the kitchen close enough to keep talking." },
    { room: "game_room", caption: "A poker table in one room, foosball and a dartboard in the other." },
    { room: "pool", caption: "Pool, spa, putting green, built-in grill. All of it behind a tall hedge." },
    { room: "primary_bedroom", caption: "Cool tile underfoot, a fan overhead. That is how you sleep through July." },
    { room: "exterior", caption: "Owned solar on the roof, mature palms out front, and no HOA." },
  ],
  fallbackCaption: "Four bedrooms on one level in Desert Park Estates.",
  textPosts: [
    {
      paragraphs: [
        "Count what is actually back there. A pool, a separate in-ground spa, a putting green, a basketball hoop, a built-in grill, and a swing set.",
        "The hedge runs the whole way around, so none of it is on display to the street.",
      ],
      italicLast: "A Sunday out here would take care of itself.",
    },
    {
      paragraphs: [
        "Buyers ask me about solar before almost anything else out here, and what they actually want to know is whether it is leased.",
        "This one is owned. There are mini-splits on top of the central air as well, which is what 2,161 square feet on one level needs.",
      ],
      italicLast: "August is the whole reason that matters.",
    },
    {
      paragraphs: [
        "One room in this house holds a poker table. Another holds foosball, a dartboard, and a TV.",
        "The bonus space is finished and it is not precious — a gym, an office, a studio, whatever you actually do on a Wednesday night.",
      ],
      italicLast: "Bring your own idea of what a room is for.",
    },
  ],
  cta: {
    paragraphs: [
      "A good part of my job is telling people a house is not the right one.",
      "It is a strange way to sell real estate and it is the only way I know how. You get my honest read on the first walkthrough, not the fourth.",
    ],
    italicLast: "DM me. I would rather save you a Saturday.",
  },
  caption: `Vaulted ceilings, a stacked-stone fireplace, and tile through the whole single level in Desert Park Estates.

Out back: a pool, a separate in-ground spa, a putting green, a basketball hoop, a built-in grill, and a long table under the covered patio. Owned solar on the roof, mini-splits on top of the central air, and no HOA.

4 BD · 2 BA · 2,161 SQFT · $799,000

Listed by Allison F Saenz & The Obsidian Group · eXp Realty Of Southern California Inc

#palmsprings #desertparkestates #palmspringsrealestate #coachellavalley #poolhome`,
};
