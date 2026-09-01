// 76434 Encanto Drive, 29 Palms — $325,000 (Christopher R Monroe & The Obsidian Group)
//
// WHY THIS ONE, GIVEN IT WAS STRUCK BY NAME TWICE:
//
//   The never-queued pool on 2026-09-01 is three sales and seven land parcels.
//   All three sales were pulled as contact sheets again this run rather than
//   taken on the notes: 58540 Barron Drive is bare in all 29 frames (dark worn
//   carpet, phone-shot portrait frames, no subject anywhere) and 2502 Harbor
//   Drive is a gut rehab down to the studs with no drywall or flooring. Both
//   confirmed, both out. That leaves this one.
//
//   It IS vacant, which auto-posting.md says takes a listing out of the pool.
//   The Sea Life exception applies: a vacant room is shippable when it has a
//   SUBJECT. Here that subject is a real stone-faced fireplace (fireplaceYN,
//   fireplaceFeatures "Living Room") filling the far wall of the great room in
//   #0 and #25 — and a fireplace is telic in the actor-generation.md §1 sense,
//   which a mural is not. The kitchen is the second subject: white quartz,
//   white cabinets, pendants over the island.
//
// WHAT WAS EXCLUDED AND WHY (--exclude 1,3,6,7,10,17,19)
//
//   The selector found only 12 stageable frames of 26; the survivors are
//   0, 2, 11, 22, 25. By category, not by index (auto-posting.md 2026-08-27):
//
//   #6  — §9 depth ordering, written out for free in the dump: "standing on the
//         FAR SIDE of the kitchen island". The island's near face fills the
//         bottom third. This is the Palm Canyon / Oak Tree failure exactly.
//   #1, #3 — the two subject-free `living` frames: bare boxes, one of them a
//         room end with a louvered closet. Keeping them risks the one living
//         slide landing on a blank wall. #0 and #25 are the same room WITH the
//         fireplace, so excluding these raises the odds the living slide is
//         the fireplace slide. #3 was the selector's top rank; ranked first is
//         not the same as worth staging.
//   #7, #10, #17 — §3 distant exteriors. The house is small in frame with a
//         huge dirt foreground; no human-scale reference.
//   #19 — kept OUT of staging because it is the cover. #11 carries the outdoor
//         slot instead, so no frame appears twice in the post.
//
//   Watermark check ran on BOTH corners (tmp-watermark-strip.py and
//   tmp-corner-strip.py) per §10. Clean — no "Digitally Altered", no "AI
//   Enhanced". `furnished: Unfurnished` agrees with every photo here, so the
//   Sea Life field-disagrees-with-photo tell does not fire either.
//
// CMA: none. `subdivisionName` is the placeholder "Other" — see the
//   SUBDIVISION_PLACEHOLDERS note added to build-pending-post.ts this run. The
//   name+city query would have missed anyway (no Other/29 Palms doc), but 152
//   subdivision docs are named "Other" and several are in this team's cities.
//
// poolYN is false and poolFeatures is empty, so ROOM_LABELS.pool becomes
//   OUTDOOR LIVING. The `pool` row below is written to a covered porch and bare
//   ground, never to water.
export default {
  listingKey: "20260428183337460001000000",
  // Burnt sienna. The frames are grey stucco, tan dirt and desert blue; a warm
  // rust sits outside that family instead of blending into the sky, which is
  // the call Sea Life's teal made. Previewed against 1F4A3D and 2A4A6B — the
  // blue matched the sky so well the panel stopped reading as a panel.
  accentColor: "9A4A2B",
  // Rendered and compared, not judged by eye on the original (copy-voice.md §8).
  // gravity: auto keeps the gable, the covered porch and the sky in the
  // surviving RIGHT half. The interior fireplace frame (#0) was the obvious
  // cover and lost: the crop puts the fireplace half behind the panel and
  // leaves bare wall and empty floor, and TWO ACRES over an interior argues
  // with its own picture.
  coverPhotoIndex: 19,
  hook: "TWO ACRES",
  coverBody:
    "Two acres of open Mojave, minutes from Joshua Tree. Solar on the roof, a 2,500-gallon water tank on site, sewer in and paid for, and no HOA on any of it.",
  rooms: [
    // `great_room` collapses into `living`. Written to NOTHING a crop can
    // contradict — floor and walls only — because #0, #2, #22 and #25 could all
    // come back `living` and the room key is not stable across runs
    // (copy-voice.md §8, Acoma Trail). REBAND to name the fireplace if the
    // build lands #0 or #25; that is the expected outcome, not a fallback.
    { room: "living", caption: "New grey plank underfoot, light walls, and 1,734 square feet to put it all in." },
    // True of both surviving kitchen frames (#2 across the room, #22 from the
    // dining side). Deliberately does not name the sink, the range or the
    // window: the sink is only in #2 and the range only in #22, and Los Santos
    // shipped exactly that mistake in both directions.
    { room: "kitchen", caption: "White quartz, white cabinets, and two pendants over the island." },
    { room: "dining", caption: "Open to the kitchen on one side and the rest of the house on the other." },
    // `bedroom` collapses into `primary_bedroom`. No bedroom frame is stageable
    // here, so this exists only for a mislabelled bare room.
    { room: "primary_bedroom", caption: "One of three, with the same plank floor running through it." },
    // `outdoor` and `outdoor_living` collapse into `pool`. There is no pool.
    // Safe for #11 and for #19 if the selector moves: no mountains (#19's
    // horizon is roof and sky), no time of day, no landscaping — the lot is
    // bare decomposed granite and the light is hard midday in every frame.
    { room: "pool", caption: "A covered porch, a concrete slab under it, and two acres of open ground past that." },
    // USED. Not as a build key — the stager has no front-exterior key and
    // returned `outdoor` — but as the reband target, which is how Oak Tree was
    // fixed and why this row is written at all. ROOM_LABELS.exterior is THE
    // GROUNDS, which is what the frame actually shows.
    //
    // The build staged photo #8, which the selector's dump never ranked and
    // which is a §3 distant exterior of the same family as 7, 10 and 17 — all
    // three excluded by hand. "Exclude by category and expect the numbers to
    // move" (auto-posting.md 2026-08-27) cuts both ways: the category can also
    // move IN. The frame is the long side of the house across bare ground with
    // mountains behind, so the `pool` line above — a covered porch and a
    // concrete slab — named two things not in the picture. Same failure as Oak
    // Tree's driveway under an outdoor-living caption. Rebanded, not rebuilt:
    // the composite itself is clean and it is the only slide in the post that
    // shows the two acres the cover is about.
    { room: "exterior", caption: "Two acres of open desert around the house, and mountains past the edge of it." },
  ],
  fallbackCaption: "1,734 square feet on two acres, minutes from Joshua Tree.",
  textPosts: [
    {
      // The three best facts here — solar, the tank, sewer paid — are the whole
      // reason this house is different from the land parcels around it, and not
      // one of them can carry a room slide. Sixth run in a row to make that call.
      paragraphs: [
        "The first thing anyone asks about a house out here is water and power.",
        "Solar is already on the roof, there is a 2,500-gallon tank on site, and the sewer is in, connected and paid for.",
      ],
      italicLast: "The expensive questions are already answered.",
    },
    {
      // Attributed to the listing, phrased as eligibility rather than a promise.
      // copy-voice.md §9: never state or imply a valuation or advice.
      paragraphs: [
        "Because of where this house sits, some buyers qualify for help buying it.",
        "The listing notes up to $10,000 in closing cost assistance and low or no down payment financing here.",
      ],
      italicLast: "Ask a lender what that means for you before you rule anything out.",
    },
    {
      // Joshua Tree is a real feature of THIS location, minutes away — the one
      // place name copy-voice.md §1 explicitly blesses. No other market named.
      paragraphs: [
        "Joshua Tree is close enough from here that you go on a weeknight.",
        "And two acres out this far means the dark actually gets dark. Go stand outside once the sun is down.",
      ],
      italicLast: "Come out after dark before you decide anything.",
    },
  ],
  // Both paragraphs under ~110 chars — buildCtaTransformation places paragraph 2
  // at a fixed three-line offset and a fourth line gets overprinted (Hepburn).
  cta: {
    paragraphs: [
      "Out here, the land and what is hooked up to it matter as much as the house.",
      "I would rather walk you through that before you write an offer than after.",
    ],
    italicLast: "DM me. Let's talk before you drive out.",
  },
  caption: `Three bedrooms and 1,734 square feet on two acres of open Mojave, minutes from Joshua Tree National Park.

Solar panel system on the roof, a 2,500-gallon water storage tank on site, sewer in and connected, no HOA, and room on the lot for the RV. Buyers may qualify for up to $10K in closing cost assistance and low or no down payment financing because of where the property sits — ask for details.

3 BD · 2 BA · 1,734 SQFT · $325,000

Listed by Christopher R Monroe & The Obsidian Group · eXp Realty Of Southern California Inc

#29palms #joshuatree #highdesert #mojave #californiadesert`,
};
