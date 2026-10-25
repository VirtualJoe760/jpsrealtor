// 17 Lugo Drive, Rancho Mirage — $529,000 (Peyson Robertson / The Obsidian Group)
//
// Written 2026-10-25 WITHOUT a build. Gemini is 403ing on an unpaid billing
// account (auto-posting.md, "Blocked 2026-10-25"), so every stage of the
// pipeline that reads a photo is unavailable. The copy is drafted now so that
// the build is a single command once billing is restored — nothing here has
// been checked against a render.
//
// Facts this copy is built on, all from the listing record and remarks:
//   Condominium, 3 BD / 2 BA / 1,581 sqft, built 1975, Sunrise Country Club.
//   Guard-gated. View: Golf Course. Furnished. 2-car garage with a Tesla
//   charger. Heavenly Heat sauna included. Entire interior, walls and
//   ceilings, repainted within the week of listing. HOA $1,151/mo covering
//   exterior maintenance and landscaping. Clubhouse with a full restaurant,
//   bar, fitness center and a year-round heated pool; tennis and pickleball
//   nearby; a semi-private pool and hot tub directly across the street.
//
// COMPLIANCE — THERE IS NO PRIVATE POOL. `poolFeatures` is "Community, In
// Ground" and `poolPrivateYN` is unset. Every water reference below is to the
// community or the semi-private pool across the street, and is worded so it
// cannot be read as the home's own. Do not "improve" any of them into one.
//
// coverPhotoIndex 0 is the front entry. Judged by its RIGHT half, per
// copy-voice.md §8: the panel hides the walkway and the left lawn, and what
// survives is bougainvillea, the plantation-shuttered windows, lawn and palms.
// #30 (fairway, mountains, jasmine over the brick wall) is the better
// photograph but shows no house, so it stays in the body of the post.
//
// accentColor 16324F — deep navy. The frame is tan stucco, green lawn and
// magenta bougainvillea, so any warm accent lands in the same family as the
// stucco and the roof tile, which is the Ridge Road failure. A dark cool
// colour is the one thing not already in the photograph.
export default {
  listingKey: "20261008180938726483000000",
  accentColor: "16324F",
  coverPhotoIndex: 0,
  hook: "LOCK AND LEAVE",
  // No bed or bath count here — the spec strip three lines above is built from
  // the feed (copy-voice.md §8). `bedroomsTotal` is unset on this record and
  // the builder falls back to `bedsTotal` = 3, so the strip reads
  // "3 BD | 2 BA | 1,581 SQFT" and the body must not restate it.
  coverBody:
    "Guard-gated Sunrise Country Club, with the golf course out the back. The whole interior was repainted within the week, a Heavenly Heat sauna is included, and the Tesla charger is already in the garage.",
  // Keyed by ROOM, never by position. The generator collapses great_room into
  // living, outdoor/outdoor_living into pool and bedroom into primary_bedroom
  // before it looks a caption up, so only the FIRST row of each alias group is
  // ever reachable — one line has to be true of the whole group.
  //
  // Drafted to the invariant rather than to a frame, per copy-voice.md: the
  // crop has not happened yet, so these name what is true of the space however
  // it is cropped. Make them specific with reband-pending-post.ts AFTER the
  // build, against the frames that actually shipped.
  rooms: [
    { room: "living", caption: "Painted top to bottom within the week, and it comes furnished if you want it." },
    { room: "kitchen", caption: "Fresh paint in here too, and breakfast at the clubhouse when you'd rather not cook." },
    { room: "dining", caption: "Dinner at home, or the clubhouse restaurant a few minutes from the front door." },
    // Must hold for a secondary bedroom as well as the primary — nothing here
    // may promise a suite, a view or a door to the patio (46109 Roadrunner).
    { room: "primary_bedroom", caption: "Behind the guard gate, where the mornings are quiet." },
    { room: "office", caption: "A door that shuts, for the days the work follows you out here." },
    // `pool` is the alias target for outdoor/outdoor_living, and the frames it
    // can draw are the covered patio and the fairway wall — not water. The
    // pool and spa named here are the semi-private ones ACROSS THE STREET.
    { room: "pool", caption: "Brick underfoot, shade overhead, and a pool and spa just across the street." },
  ],
  fallbackCaption: "Guard-gated Sunrise Country Club, Rancho Mirage.",
  textPosts: [
    {
      paragraphs: [
        "The clubhouse has a real restaurant — breakfast, lunch and dinner, a full bar — and they will deliver a meal to the house if you ask.",
        "Fitness center, a heated pool year-round, tennis and pickleball courts nearby.",
      ],
      italicLast: "Some days you never have to get in the car.",
    },
    {
      paragraphs: [
        "When buyers ask me about HOA dues, the number is rarely the useful part. What it covers is.",
        "Here it's $1,151 a month, and it takes exterior maintenance and the landscaping off your list completely.",
      ],
      italicLast: "Lock the door, fly home, and nothing here needs you.",
    },
    {
      paragraphs: [
        "A Heavenly Heat sauna is included with the house. So is the Tesla charger already wired in the garage.",
        "And every wall and ceiling inside was repainted the week it came to market.",
      ],
      italicLast: "Three things you would otherwise be scheduling.",
    },
  ],
  // Exactly two paragraphs, each under ~110 characters. buildCtaTransformation
  // places paragraph 2 at a fixed three-line offset, so a four-line paragraph 1
  // gets overprinted (48423 Hepburn Drive).
  cta: {
    paragraphs: [
      "A lock-and-leave only works if the community behind it actually runs well.",
      "That is worth checking before you tour, not after. It is the part I look into first.",
    ],
    italicLast: "DM me. Let's talk before you tour another one.",
  },
  caption: `Guard-gated Sunrise Country Club, with the golf course out the back and the mountains behind it.

The entire interior, walls and ceilings, was repainted the week it listed. A Heavenly Heat sauna is included, there's a Tesla charger in the garage, and the HOA covers exterior maintenance and landscaping. Clubhouse restaurant and bar, fitness center, year-round heated pool, tennis and pickleball — and a semi-private pool and hot tub directly across the street.

3 BD · 2 BA · 1,581 SQFT · $529,000

Listed by Peyson Robertson & The Obsidian Group · eXp Realty Of Southern California Inc

#ranchomirage #sunrisecountryclub #coachellavalley #desertliving #golfcourseliving`,
};
