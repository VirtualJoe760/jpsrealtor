// 255 S Avenida Caballeros #313, Palm Springs — $354,900
// (Alan Mckeefry & The Obsidian Group · eXp Realty Of Southern California Inc)
//
// Chosen because it is one of the very few never-queued team actives that is
// actually FURNISHED. Barron Drive and Encanto Drive were both checked as
// contact sheets first and are bare in every frame, which is the constraint
// auto-posting.md §"the furniture constraint" says now binds the pool.
//
// accentColor: deep petrol teal. The photography is white walls and burnt
// orange upholstery throughout, so a warm accent would have disappeared into
// it — the same failure 53806 Ridge Road's champagne made against a tile roof.
// The teal is pulled from the listing's own blue drapes and patio furniture.
//
// Exclusions passed on the build (see the run command in the report):
//   0,1      front door and entry hall — corridors, nothing to do
//   8,17     fridge corner, and a frame shot through the slider glass
//   11,12,15,16  bathrooms — actor-generation.md §3 refuses these anyway
//   13,14    the guest bedroom in use as an office. `office` ALIASES TO
//            `living`, so a desk frame would have inherited the great-room
//            caption under a THE OFFICE label. Cheaper to keep it out.
//   21,22    laundry closet, rooftop parking view
//   23,24,25 the community pool and spa. Dropped in favour of the private
//            covered balcony (18/19/20), which is the better photograph and
//            has furniture to actually use. Keeping both would have put a
//            balcony and a pool deck under one caption.
//   26,27,28 tennis courts and the monument sign — distant exteriors
//
// REBUILD (same day). The first run passed 1 of 7 candidates and then died in
// the CMA block, so nothing was ever queued. Second run drops the frames that
// failed every take — 2 and 5 (great room, guide marks drawn into the render),
// 6 (kitchen), 19 (balcony) — and puts 23,24,25 back in so the outdoor slot has
// candidates at all. 19 was the better photograph and it is a real loss; it
// burned six takes on feet-cropped and drifted-off-the-edge and did not land.
export default {
  listingKey: "20260703083525636593000000",
  accentColor: "12505E",
  coverPhotoIndex: 2,
  hook: "TOP FLOOR",
  coverBody:
    "Hugh Kaptur designed Villa Caballeros, and this top-floor end unit still has the vaulted ceilings and clerestory windows that come with it. Renovated kitchen and baths, and downtown a few blocks west.",
  // Keyed by ROOM, never by position, and written to the SPACE rather than to
  // the frame I hope the stager picks — the key is not stable across runs
  // (copy-voice.md §8). Every line below holds for any of the candidate frames
  // left in the set for that room.
  rooms: [
    { room: "living", caption: "Vaulted ceilings, white walls, and one big room to put everyone in." },
    { room: "dining", caption: "The table sits under the vault, with the whole room still open around it." },
    { room: "kitchen", caption: "Shaker cabinets, quartz counters, stone backsplash, and stainless all through." },
    { room: "primary_bedroom", caption: "Carpet underfoot, art above the bed, and a door to close on the rest of it." },
    // `pool` answers for `outdoor` and `outdoor_living` too, and after the
    // first build the outdoor candidates are BOTH the private balcony (20) and
    // the community pool and spa (23-25). So the line names only what is in
    // every one of them — palms and a chair — and no time of day, since 9223 N
    // Star Trail's "morning coffee" landed on a sunset. "Shade overhead" was
    // the first draft and is false of the two open pool-deck frames.
    { room: "pool", caption: "Palms, a chair, and nowhere you actually need to be." },
  ],
  fallbackCaption: "Top-floor end unit at Villa Caballeros, Palm Springs.",
  textPosts: [
    {
      paragraphs: [
        "The first thing everyone looks at in here is the ceiling.",
        "Villa Caballeros is a Hugh Kaptur building, and this top-floor unit has the vaults and the clerestory windows to show for it. That is not something you can add to a place later.",
      ],
      italicLast: "Architecture is the one part you cannot renovate in.",
    },
    {
      paragraphs: [
        "When a client sends me a Palm Springs condo, the first thing I look up is the real monthly.",
        "Here that is $595 of HOA covering water, sewer, trash and earthquake insurance, plus a land lease at $305 a month running through 2080.",
      ],
      italicLast: "Better to know that before the tour than during escrow.",
    },
    {
      paragraphs: [
        "Downtown is a few blocks west, so the car can stay in the covered space most weekends.",
        "Back here there is a heated pool and spa, tennis, pickleball, indoor racquetball, and an elevator up to your floor.",
      ],
      italicLast: "Lock the door, fly home, and nothing here needs watering.",
    },
  ],
  // Two paragraphs, both kept under ~110 characters. buildCtaTransformation
  // places paragraph 2 at a fixed three-line offset and does not reflow, so a
  // four-line first paragraph gets overprinted (48423 Hepburn Drive).
  cta: {
    paragraphs: [
      "A lot of my job is working out what a place actually costs to own.",
      "Not the list price — the HOA, the land lease, the whole monthly. Before the tour, not after.",
    ],
    italicLast: "DM me and I'll walk you through this one.",
  },
  caption: `Top-floor end unit at Villa Caballeros — Hugh Kaptur's building in central Palm Springs.

Vaulted ceilings and clerestory windows, a renovated kitchen with shaker cabinets and quartz, a marble-tiled primary bath, in-unit laundry, and a covered balcony off the primary suite. Heated community pool and spa, tennis, pickleball, indoor racquetball, elevator, and gated covered parking. Downtown a few blocks west.

HOA is $595/mo and covers water, sewer, trash and earthquake insurance. Land lease runs through 2080 at $305/mo.

2 BD · 2 BA · 1,046 SQFT · $354,900

Listed by Alan Mckeefry & The Obsidian Group · eXp Realty Of Southern California Inc

#palmsprings #hughkaptur #midcenturymodern #palmspringsrealestate #desertliving`,
};
