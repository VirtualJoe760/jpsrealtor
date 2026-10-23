// 1062 E Via San Michael Road, Palm Springs — $949,000
// Listed by Allison F Saenz, co-listed "The Obsidian Group" (eXp Realty Of
// Southern California Inc).
//
// Rewritten 2026-08-05. The previous version of this file predated the
// room-keyed caption fix: its `rooms[]` carried positional `label` strings and
// no `room` keys, which is precisely the shape that made the lookup compare
// `undefined === undefined` and hand every slide the FIRST caption in the list.
// It had also never been generated. Everything below is new copy.
//
// A room caption has to be true of ANY frame of that room, because the frame is
// chosen by the stager and changes every run. The first version of the kitchen
// line named three things — granite island, gas cooktop, pool through the
// slider — and the frame that shipped had only the island. The pool line named
// four and its frame had none of them, just the outdoor kitchen and the patio.
// Name what is true of the room, not an inventory of the photo you had in mind.
//
// Note on the caption keys: build-pending-post.ts normalises rooms before
// lookup (great_room/office/other -> living, outdoor+outdoor_living -> pool,
// bedroom -> primary_bedroom), so writing BOTH sides of an alias pair would
// make the second one dead. Seven distinct slots is all there is, and the
// `pool` line has to read correctly under either "THE POOL DECK" or
// "OUTDOOR LIVING" — the putting green and the covered patio both land there.
export default {
  listingKey: "20260616162315218913000000",
  // The cover is the pool frame: sky, water, hedge, mountains — all cool and
  // green. A warm clay is the one family that sets it off rather than sinking
  // into it, which is the mistake champagne made on Ridge Road.
  accentColor: "8A3B1F",
  // Passed to the generator under --exclude as well, so the stager cannot also
  // spend this frame as a room slide — nothing stops a cover photo being staged
  // too, and the same photograph twice in one carousel reads as a repost.
  //
  // Chosen by rendering the cover for 39 / 36 / 41 / 0 and looking at them,
  // which is worth the two minutes: the cover crop is `ar_4:5,c_fill,g_auto`
  // and the text panel then covers the left ~45%, so what survives is a
  // right-hand slice that g_auto picked without knowing the panel exists. The
  // twilight elevation (1) lost the entire house behind the panel and shipped a
  // lawn, a sidewalk and a parked car. 36 came back grey concrete, 41 came back
  // loungers and a playset slide. Judge a cover by the crop, never the source.
  coverPhotoIndex: 39,
  hook: "NOBODY LEAVES",
  coverBody:
    "Pool, raised spa, an outdoor kitchen and a putting green, all behind a hedge wall. Inside: vaulted ceilings, four bedrooms, and solar that comes owned rather than leased.",
  rooms: [
    { room: "living", caption: "Vaulted ceilings, and room to spare around the grand piano." },
    { room: "kitchen", caption: "Granite island with seating, opening straight into the dining room." },
    { room: "dining", caption: "Seats eight, with the patio doors open beside it." },
    { room: "primary_bedroom", caption: "Set apart from the other three bedrooms, with the patio right outside." },
    { room: "game_room", caption: "The poker table is already here. So are the chips." },
    { room: "pool", caption: "Outdoor kitchen, covered patio, and the pool a few steps past it." },
    { room: "exterior", caption: "Tile roof, owned solar, and palms the length of the street." },
  ],
  fallbackCaption: "Vaulted ceilings, a pool and a putting green, in Palm Springs.",
  textPosts: [
    {
      paragraphs: [
        "The backyard is the reason to look at this one.",
        "Pool on one end, raised spa beside it, an outdoor kitchen built into the stone wall, and a putting green past the deck.",
      ],
      italicLast: "Sunday out here runs long, and nobody watches the clock.",
    },
    {
      paragraphs: [
        "The solar on this roof is owned, not leased.",
        "Worth asking on every desert house you tour. A lease you assume at closing is a different thing to take on than panels that come with the house.",
      ],
      italicLast: "Ask who owns the panels before you ask about anything else.",
    },
    {
      paragraphs: [
        "Somebody here plays a lot of poker. There is a room for it, and the table is still in place.",
        "Four bedrooms, vaulted ceilings, and a primary set apart from the rest. The whole plan assumes company.",
      ],
      italicLast: "Buy the house that matches how you actually spend a Saturday.",
    },
  ],
  cta: {
    paragraphs: [
      "Most of my job happens before anyone opens a lockbox.",
      "Working out what you actually want, what that costs here, and which houses are a waste of your Saturday. That part is free, and it is the part that saves you the most time.",
    ],
    italicLast: "DM me. Let's talk before you tour another house.",
  },
  caption: `Pool, raised spa, an outdoor kitchen and a putting green — all behind a hedge wall in Palm Springs.

Inside: vaulted ceilings, four bedrooms with the primary set apart, a finished bonus room, and a covered patio running the back of the house. The solar is owned, not leased.

4 BD · 3 BA · 2,208 SQFT · $949,000

Listed by Allison F Saenz & The Obsidian Group · eXp Realty Of Southern California Inc

#palmsprings #palmspringsrealestate #desertliving #poolhome #coachellavalley`,
};
