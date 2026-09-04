// 7526 Apache Trail, Yucca Valley — $294,999 (Ashley N Robertson)
//
// HOW THIS LISTING WAS FOUND, BECAUSE THE POOL WAS SUPPOSED TO BE EMPTY.
//
//   The 2026-09-02 run reported no buildable candidate and it was reading a
//   pool query narrower than the documented one. `tmp-pool3.js` matches on
//   `listAgentTeamKey` / `coListAgentId` only; auto-posting.md §"Identifying
//   the team" defines the pool as the literal co-list NAME plus a derived
//   roster, which is how Azzura, Oak Tree and Los Santos were ever queued —
//   none of the three matches the key query today. The name query returns 37
//   actives against the key query's 30, and three of the seven it adds had
//   never been queued at all. This is one of them. See tmp-pool4.js.
//
// WHY THIS ONE OF THE THREE:
//
//   56616 Mountain View Trail (44 photos) is vacant end to end — new floors,
//   blank walls, one kitchen with objects in it. Struck on the 2026-09-01 rule
//   the same way Barron was.
//
//   3470 Warren Vista (64 photos) looks furnished and is not. It is new
//   construction listed Unfurnished, and photo #50 carries "Digitally Altered"
//   in the top-left corner. Bare and staged versions of the same rooms sit next
//   to each other in the set (#48, #49 bare; #50 furnished), so an unknown
//   subset of the interiors is rendered. actor-generation.md §10.
//
//   Apache is genuinely lived in — worn rugs, books on the shelves, personal
//   bedding — and both corner strips are clean. Every interior has furniture in
//   it, which is the constraint that has emptied this pool four runs running.
//
// EXCLUSION, AIMED AT THE SELECTOR AND NOT AT THE CONTACT SHEET:
//
//   #13 only. Its own placement reads "to the right of the dishwasher and to
//   the left of the double sink" — behind the butcher-block run, which fills
//   the lower-left of that frame at waist height. The §9 depth-ordering tell.
//   #12, #14 and #15 are all still in the shortlist and all put aisle floor in
//   the near field, so removing #13 costs no kitchen slide.
//
//   #9 and #11 put a sofa back across the near field and are the same category,
//   but they rank 7th and 9th behind #7 at rank 0, so the selector reaches them
//   only if two earlier living frames fail. Left in as depth rather than
//   excluded — the Azzura lesson is that an exclusion list can starve a build.
export default {
  listingKey: "20260527231221167213000000",
  // The cover is a dusk shot: amber windows, orange horizon, blue-violet sky.
  // Anything warm sits in the same family and blends (the Ridge Road problem),
  // and the interior is terracotta on top of that. Deep juniper green is the
  // one colour in this listing's own photography that is outside both — the
  // pine framing the cover and the lawn out back.
  accentColor: "1F3D2E",
  // #30, judged by its RIGHT half because the panel hides the left ~45%
  // (copy-voice.md §8). Right half is the lit house, the pine silhouette and
  // the sunset. #0 and #1 both put the facade on the left and leave the panel
  // sitting next to a chain-link gate and a garage door.
  coverPhotoIndex: 30,
  hook: "LIGHTS ON",
  // No bed or bath count here — the spec strip three lines above is built from
  // the feed and prints "2 BD | 1 BA | 936 SQFT" (bedroomsTotal is undefined on
  // this record and the builder falls back to bedsTotal). Jamaica Sands §8.
  coverBody:
    "A 1987 single-level in the middle of Yucca Valley, on a fenced lot with a lawn out back and Joshua trees past the fence. New mini split, new appliances, sewer connected and paid, and no HOA.",
  rooms: [
    // `great_room` collapses into `living`.
    //
    // REBANDED after looking at the build, and the draft got the Hombria rule
    // BACKWARDS. That rule says a tight 4:5 crop is most likely to land on the
    // one wall unlike the rest, because the odd feature is what made the
    // photographer frame the shot — so the draft named the terracotta wall
    // ("Terracotta on one wall, tile underfoot, and room to move around the
    // furniture."). The stager returned #9 and the crop went the OTHER way: the
    // terracotta survives only as a sliver behind a curtain at the far left
    // edge, and the slide reads as a white open-plan room. Naming the odd
    // feature is no more crop-proof than avoiding it; both are coin flips, and
    // the answer either way is to look at the build and reband.
    //
    // All three claims below are in the frame the stager actually chose.
    // IF THIS CONFIG IS EVER REBUILT the frame is a coin flip again — revert to
    // a line that asserts only the tile and the open floor, which hold over
    // #7, #8, #9, #10 and #11 alike.
    { room: "living", caption: "Tile straight through, a slider onto the yard, and the kitchen open to the whole room." },
    // Holds over #12, #14 and #15 with #13 excluded. Sage lowers, light wood
    // counters and stainless are in all three. "Came in new" is the remarks'
    // claim, not mine.
    { room: "kitchen", caption: "Sage cabinets, butcher-block counters, and appliances that all came in new." },
    // #16 and #17 both frame the counter-height table with the slider beside it
    // and the yard visible through the glass — checked, because Via San Michael
    // shipped a caption naming what was on the far side of a slider that was
    // not in shot.
    { room: "dining", caption: "Counter-height table by the slider, with the yard on the other side of the glass." },
    // `bedroom` collapses into `primary_bedroom`, so this answers for #21
    // (charcoal accent wall, quilt, lamp) and #18 (white walls, Joshua-tree
    // window). The only things true of both are the count and the tile — #21's
    // window sits on the left edge and a centred 4:5 crop cuts it, so the line
    // does not mention a window. The close is experiential and nothing in a
    // crop can contradict it (§5).
    { room: "primary_bedroom", caption: "One of two, tile underfoot, and quiet enough out here to sleep through anything." },
    // `outdoor` and `outdoor_living` collapse into `pool`. poolYN is false and
    // there is no water anywhere in this set, so this is written to the LOT.
    // Fencing, Joshua trees and open sky are in both #26 (lawn) and #27 (patio);
    // the lawn is only in #26 so it is not named here. No time of day — Star
    // Trail's rewrite promised morning and landed on a sunset.
    { room: "pool", caption: "Fenced all the way round, Joshua trees on the line, and open sky over all of it." },
  ],
  fallbackCaption: "A fenced lot in the middle of Yucca Valley, minutes from town.",
  textPosts: [
    {
      // Paragraph 1 near 80 characters — Sea Life's 95-char first paragraph
      // wrapped to three lines and ran into paragraph 2's fixed offset.
      paragraphs: [
        "Most of what I show out here is on septic. This one is on sewer, connected and paid.",
        "Septic is not a problem, it is just a system you own and maintain. Sewer is a bill. Worth knowing which one you are taking on.",
      ],
      italicLast: "Ask the question before you write the offer, not after.",
    },
    {
      paragraphs: [
        "A lawn in the high desert is somebody's decision, and it takes water to keep.",
        "But it is there, it is fenced on every side, and the dog does not need a leash to use it.",
      ],
      italicLast: "Sit out there once and you will see why they kept it.",
    },
    {
      paragraphs: [
        "This is a small house and I am not going to pretend otherwise.",
        "It is also two bedrooms, a fenced yard on both sides of the house, and minutes from town. That combination is harder to find out here than square footage is.",
      ],
      italicLast: "Ask yourself how much of a big house you would actually use.",
    },
  ],
  // Both paragraphs under ~110 chars — buildCtaTransformation places paragraph
  // 2 at a fixed three-line offset and a fourth line gets overprinted (Hepburn).
  cta: {
    paragraphs: [
      "Buying at this end of the market has its own rules, and most of them are about timing.",
      "I would rather sit down and go through them with you first than explain them after an offer falls over.",
    ],
    italicLast: "DM me. Let's talk before you tour another house.",
  },
  // The `furnished` field on this record reads "Unfurnished" while the remarks
  // say the home comes fully furnished, and the photos show a furnished house.
  // That is the listing agent's own contradiction, so the claim is attributed
  // to the listing rather than asserted, and it is kept out of the slides.
  caption: `Two bedrooms and 936 square feet in the heart of Yucca Valley, on a fully fenced lot with a lawn out back and Joshua trees past the fence.

New mini split, new appliances and a new garage door, all within the last year. Sewer connected and paid, no HOA, RV parking, and per the listing it comes furnished.

2 BD · 1 BA · 936 SQFT · $294,999

Listed by Ashley N Robertson · eXp Realty Of Southern California Inc

#yuccavalley #joshuatree #highdesert #desertliving #firsthome`,
};
