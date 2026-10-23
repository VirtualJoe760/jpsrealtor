// 3010 N Chuperosa Road, Palm Springs — $749,000 (Peyson Robertson · The Obsidian Group)
//
// Chosen 2026-08-08 from 13 unposted team actives. 41 photos, a fully updated
// 1971 single-level, and a brand-new pool under a mature shade tree with the
// San Jacintos behind it — the only mid-century ranch in the current pool, and
// the queue is otherwise hillside/estate/country-club product.
//
// accentColor: the cover is a dusk front elevation with a coral sky and a green
// lawn. Every warm accent already in the queue (rust 7A2E14, terracotta 8A3B1F,
// brown 4A3226, wine 7A2740) would sit in the same family as that sky and
// disappear into it. Deep teal is pulled from the pool water in this listing's
// own photography and is the one thing on the property that opposes the sky.
// Deliberately darker/greener than the template default (1C4A5A).
//
// CAPTION COLLAPSE — the generator normalises office/great_room/other → living
// and bedroom → primary_bedroom before looking a caption up, so the FIRST row
// of each group answers for the whole group. This house has a flex/bonus room
// (photo 14) and three secondary bedrooms including a bunk room (22–23), any of
// which the stager may pick. So:
//   - the `living` line names only materials and light, which is true of the
//     great room, the flex room and the sitting room alike;
//   - the `primary_bedroom` line is written to be true of ANY of the four
//     bedrooms — no "wake up to the ridgeline", which would be a lie over a
//     bunk bed.
// 46109 Roadrunner Lane shipped a secondary bedroom promising windows and a
// patio door that were not in the frame; this is that bug's fix applied ahead
// of time.
//
// BUILD WITH (the build that queued as K6):
//   --exclude 0,1,2,3,5,6,9,10,14,16,17,18,19,20,21,22,23,24,25,26,27,28,29,
//             30,31,32,33,34,35,36,37,39,40
//
// Four builds, and the exclusion list is the record of what each one taught:
//
//   V8  photo 2, the front DRIVEWAY, was read as `outdoor` — which normalises
//       to `pool` for the caption and carries the label OUTDOOR LIVING. The
//       agent shipped presenting a closed garage door under "New pool, big
//       shade tree". The reader has no front-exterior key to route these to,
//       so every front-of-house frame (0,1,2,3,36,39,40) has to be kept out of
//       the candidate set by hand. The dusk elevation 39 is still the cover;
//       coverPhotoIndex bypasses the selector.
//   E4  the dining render at photo 9 came back oversized against the chairs
//       with a visible composite halo. Excluded.
//   Y7  photo 34 is the patio with NO pool in frame — same false claim as V8 by
//       a different route — and the bedroom render at 24 read as standing on
//       the bed, through a window showing a block wall rather than desert. All
//       backyard-but-not-pool frames and all bedrooms excluded.
//   K6  great room + kitchen, clean. Two room slides instead of four.
//
// WHY THERE IS NO POOL SLIDE. Photo 38 — the new pool, the shade tree and the
// San Jacintos in one frame — is the best image on this listing and never once
// reached a render. selectStagingPhotos did not put it in its 14 picks on three
// of four runs, and on the run where it did, Gemini returned 503. Excluding
// other photos cannot promote it; the selector's ranking is upstream of
// --exclude. Worth chasing separately, because the frame that sells this house
// is the one the pipeline never looks at.
//
// The kitchen line named the stools in attempt 1. They exist — but not in the
// frame the stager chose, which is the mistake copy-voice warns about. It now
// names only what is true of the room itself.
//
// NOT CLAIMED ANYWHERE: the spa. The MLS carries spaYN: true and the remarks
// say "pool and spa", but no spa appears in any of the 41 photos, and a caption
// that names something the frame does not contain reads as a mistake on another
// brokerage's listing. The pool is new and visible; that is what gets said.
export default {
  listingKey: "20260203160658521251000000",
  accentColor: "0D4F5C",
  coverPhotoIndex: 39,
  hook: "DESERT MODERN",
  coverBody:
    "A 1971 single-level on the north end of Palm Springs, updated top to bottom. Brand-new pool, new kitchen and baths, a mature shade tree, and the San Jacintos out the back.",
  rooms: [
    {
      room: "living",
      caption: "White walls, wide plank floors, and afternoon light that runs the length of the house.",
    },
    {
      room: "kitchen",
      caption: "New cabinetry, quartz counters, and an island big enough to actually work on.",
    },
    {
      room: "dining",
      caption: "Six chairs, open to the kitchen, and nobody stuck in another room.",
    },
    {
      room: "primary_bedroom",
      caption: "Four bedrooms on one level, each one with its own window on the desert.",
    },
    {
      room: "pool",
      caption: "New pool, big shade tree, and afternoons that don't need a plan.",
    },
    {
      room: "exterior",
      caption: "Low 1971 rooflines, black trim, and a lawn that runs out to the sidewalk.",
    },
  ],
  fallbackCaption: "Updated top to bottom, five minutes from downtown Palm Springs.",
  textPosts: [
    {
      paragraphs: [
        "The pool is brand new. So are the kitchen cabinets, the quartz, both bathrooms, the flooring, and the epoxy in the garage.",
        "Four bedrooms, two baths, 1,584 square feet, all of it on one floor.",
      ],
      italicLast: "You could move in on a Friday.",
    },
    {
      paragraphs: [
        "Desert Park Estates sits on the north end of Palm Springs — about five minutes to downtown and the same again to the Sunrise shops.",
        "The San Jacintos are the view from the back of the yard, and the tree over the patio does the work the sun makes it do.",
      ],
      italicLast: "Swim at four, dinner downtown at seven.",
    },
    {
      paragraphs: [
        "Buyers ask me what a house built in 1971 is going to cost them later.",
        "On this one the answer is mostly in the photos. The bones are from 1971. The pool, the kitchen, the baths and the floors are not.",
      ],
      italicLast: "Ask what has been replaced. It is the question that saves money.",
    },
  ],
  cta: {
    paragraphs: [
      "I would rather show you three houses that fit than thirty that don't.",
      "Tell me what you actually want out of a place out here, and I will tell you straight whether this one does it.",
    ],
    italicLast: "DM me — I'll tell you what I would check first.",
  },
  caption: `A 1971 single-level in Desert Park Estates, updated top to bottom, with a brand-new pool under a mature shade tree and the San Jacintos behind it.

New cabinetry and quartz in the kitchen, both bathrooms renovated, new flooring throughout, a bonus room off the living space, and an oversized two-car garage with fresh epoxy. Five minutes to downtown Palm Springs.

4 BD · 2 BA · 1,584 SQFT · $749,000

Listed by Peyson Robertson & The Obsidian Group · eXp Realty Of Southern California Inc

#palmsprings #desertparkestates #midcentury #palmspringsrealestate #coachellavalley`,
};
