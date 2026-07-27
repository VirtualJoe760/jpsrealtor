// 53806 Ridge Road, Yucca Valley — $1,499,000 (Peyson Robertson)
//
// Rebuilt 2026-07-27 against reviewer feedback. What changed and why:
//
//   colour   champagne C9A66B → deep indigo 2B2D5C. The orange sat in the same
//            warm family as the tile roof and the mountains, so it blended
//            instead of setting the photo off.
//   slide 7  the Palm Springs comparison is gone entirely. It named a city the
//            buyer is not buying in. Joshua Tree stays — it is a real feature
//            of THIS location (copy-voice.md §1).
//   slide 7  "different market, different math" cut — too oblique to read at
//            Instagram speed (§2).
//   slide 8  "this one isn't a flip" → "move-in ready". Never define a home by
//            what it is not (§3).
//   slide 8  "somebody actually lived here before they listed it" cut — true of
//            nearly every house (§4). Replaced with the stars line, which is
//            the register that was asked for (§5).
//   slide 6  kept as written; it was the one that worked.
export default {
  listingKey: "20260414223243351528000000",
  accentColor: "2B2D5C",
  coverPhotoIndex: 0,
  hook: "DESERT SANCTUARY",
  coverBody:
    "Spanish arches and soaring beamed ceilings open onto 2.5 acres of canyon view. A new PebbleTec pool deck, private hiking trails, and Joshua Tree minutes down the road.",
  // Captions are keyed by ROOM, never by position. A rejected take promotes a
  // different room into that slot, and positional captions then mislabel it —
  // a dining nook shipped captioned "THE GAME ROOM" and a bedroom as "THE POOL
  // DECK" for exactly this reason.
  rooms: [
    { room: "living", caption: "Beamed ceilings, arched windows, and the canyon sitting right outside them." },
    { room: "kitchen", caption: "Blue cabinetry, quartz counters, and room for everyone to end up in here." },
    { room: "dining", caption: "Set the table under the beams, with the canyon through the glass." },
    { room: "game_room", caption: "Pool table, a full bar, and a ceiling that has no business working this well." },
    { room: "pool", caption: "New PebbleTec, and the canyon drops away past the fence." },
    { room: "primary_bedroom", caption: "Wake up to the ridgeline." },
    { room: "bedroom", caption: "Room for everyone who shows up." },
    { room: "outdoor_living", caption: "Sound baths, yoga, and nobody close enough to mind." },
  ],
  fallbackCaption: "Two and a half acres above Yucca Valley.",
  textPosts: [
    {
      paragraphs: [
        "Move-in ready, in the way that phrase is supposed to mean.",
        "New PebbleTec pool deck, new landscaping, paid-off solar, a steam shower, and a Tesla charger already in the garage.",
      ],
      italicLast: "Imagine the stars out here at night.",
    },
    {
      paragraphs: [
        "Buyers always ask me whether the short-term rental numbers are real.",
        "This one has a track record instead of a projection. That is a very different conversation to have with a lender.",
      ],
      italicLast: "Proven income beats a spreadsheet every time.",
    },
    {
      paragraphs: [
        "Two and a half acres, and the nearest neighbour is not close.",
        "Private hiking trails off the back of the property, a jacuzzi under open sky, and Joshua Tree a few minutes down the road.",
      ],
      italicLast: "Quiet like this is the whole reason people come out here.",
    },
  ],
  cta: {
    paragraphs: [
      "Buying out in the high desert is not a quick decision.",
      "Neither is choosing the agent who helps you do it. I would rather lose a client at hello than waste their time.",
    ],
    italicLast: "DM me. Let's talk before you tour another house.",
  },
  caption: `Spanish arches, soaring beamed ceilings, and 2.5 acres of canyon view above Yucca Valley.

New PebbleTec pool deck, paid-off solar, steam shower, Tesla charger, private hiking trails off the back of the property. Joshua Tree and Pioneertown a few minutes down the road.

4 BD · 4 BA · 3,252 SQFT · $1,499,000

Listed by Peyson Robertson · eXp Realty Of Southern California Inc

#yuccavalley #joshuatree #highdesert #desertliving #luxuryhomes`,
};
