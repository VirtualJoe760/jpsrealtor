// 9223 N Star Trail, Morongo Valley — $359,000 (Ashley N Robertson & The
// Obsidian Group)
//
// WHY THIS ONE. The never-queued pool is down to five real candidates and
// auto-posting.md has already written off four of them as images: 16430 Evans
// Lane ($1.3M) and 79161 Falmouth Drive ($619k) are vacant end to end, 4140 E
// Calle San Antonio carries "Digitally Altered" watermarks, and 66550 San Diego
// Dr is propertyType C. That left three never-looked-at listings, and two were
// checked as contact sheets before a line was written:
//
//   78250 Cortez Lane #129, Indian Wells ($325k, 50 photos) is furnished and
//   professionally shot, but 22 of its 50 frames are drone. What is left is one
//   living room from six near-identical angles, two plain bedrooms and a
//   courtyard — and it is a white-walled Coachella Valley condo, which is what
//   the last fortnight of the queue already looks like.
//
//   71817 Samarkand Drive ($549k) stays out for the reason lear-avenue.ts
//   recorded: barrel distortion on nearly every interior.
//
// This one wins on furniture and on difference. It is Turnkey per the MLS and
// it looks it — a plank-ceilinged living room with a stone-hearth fireplace, a
// wood-counter kitchen with copper sink and amber pendants, a covered terracotta
// patio with rocking chairs, a bunk room, string lights and five acres of open
// ground with a painted water tower on it. It is also the first Morongo Valley
// listing in the feed and the first that is not a valley-floor tract house
// since Ridge Road.
//
// SUBDIVISION IS "Not Applicable", so the generator skips the CMA slide. That
// is the right outcome here anyway: cmaStats.narrative reads "158% premium to
// closed comps" on price-per-sqft, which is an artefact of a 345 sqft cabin on
// five acres being compared to 760 sqft houses on smaller lots. Putting that
// number on a slide would be a valuation claim about another agent's listing
// (copy-voice.md §9) and a misleading one.
//
// POOLYN IS FALSE. spaYN is true — a heated above-ground hot tub. Nothing below
// may imply water beyond that, and build-pending-post.ts now demotes the `pool`
// LABEL to OUTDOOR LIVING when the MLS says there is no pool. The `outdoor`
// spelling of that bug was fixed on Roadrunner Lane; the `pool` spelling was
// still live and this listing is what found it.
//
// EXCLUSIONS (pass on the command line):
//   0-13         — aerials, drone frames, distant exteriors and the road
//                  approach. No floor plane, no human-scale reference
//                  (actor-generation.md §3). #2 and #11 are a windmill detail
//                  and the address monument.
//   14           — front elevation. The reader has no key for one, so it comes
//                  back `outdoor` and gets banded as outdoor living. This is
//                  the documented gap in §3.
//   16, 24       — the patio from too far off; the cabin is a strip across the
//                  frame and there is nothing within reach to use.
//   20, 21       — a cactus planter and a grill lid, close up. No room to stand.
//   22, 23, 48   — the hot tub, filling most of the frame in all three. Wardrobe
//                  is business casual or better (§7), and a suited man beside a
//                  steaming hot tub is the wrong photograph however well it
//                  renders. #47 is the same subject and is doing the cover
//                  instead, where nobody has to stand in it.
//   26, 27       — a panelled corner and the firebox close up.
//   30, 32-34    — console styling, a window sill, the letterboard and a pot.
//                  Detail shots (§3).
//   31           — the bar nook. Genuinely telic (pouring a drink) and genuinely
//                  tempting, and out anyway: it is a narrow alcove with no
//                  picture window and no fireplace, so if the reader returns
//                  `other` it collapses to `living` and takes a great-room line
//                  that is false of it, and if it returns `game_room` it takes
//                  the spare line under a label the frame only half earns. The
//                  same bar is visible in #25 and #29 regardless.
//   38, 39       — bathroom and shower. Never (§3).
//   40, 43, 45   — beds shot tight, with a lantern or a pillow in the near
//                  foreground. No standing room and no floor.
//   41           — hallway. Circulation (§3).
//   44           — the water tower detail.
//   46, 47, 49   — dusk exteriors. #47 is the cover.
//   51-55        — landscape and sunset frames with the compound at a distance.
//
// ADDED AFTER LOOKING AT BUILD 1 (queued D6, then declined):
//   25           — the run's `living` pick, and the slide that killed the
//                  build. The figure's legs are composited straight THROUGH the
//                  round coffee table: the tabletop sits behind his shins, the
//                  wire base cage behind his calves, and his feet land on the
//                  rug in front of the base. Both lower legs are a solid black
//                  silhouette with no shoe in them. His two hands, held out to
//                  the fire, are fused into one mass with an extra thumb.
//                  Every numeric gate passed it — feet-on-floor read 100%
//                  because the mask genuinely reaches the rug, and the depth
//                  ordering is not something any gate looks at. This is the
//                  second build in a row where the fatal defect was invisible
//                  to the gates and obvious to the eye.
//   15, 28       — all takes rejected in build 1. Rejections are properties of
//                  the photo, so re-offering them only burns a candidate slot.
//
// #17 was rejected on a Gemini 503. A transient API failure is not evidence
// about a photo, so it stays in. #29 was only skipped for being a second
// living-room frame and is now the primary one.
//
//   npx ts-node -O '{"module":"commonjs"}' scripts/build-pending-post.ts \
//     star-trail --exclude 0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,20,21,22,23,24,25,26,27,28,30,31,32,33,34,38,39,40,41,43,44,45,46,47,48,49,51,52,53,54,55
//
// That leaves 17,18,19,50 (the covered patio, the rocking chairs and the
// outdoor table), 29 (the living room), 35,36,37 (the kitchen) and 42 (the bunk
// room) — nine candidates for four slots, four distinct spaces, and something
// to do in every frame.
//
// BUILD 2 (queued V9). Four slides, all sound as images: #42 seated on the edge
// of the lower bunk with his feet on the floor, #29 standing at the window,
// #36 arms folded at the right edge of the kitchen, #50 leaning in at the
// outdoor table under a sunset. Hands are correct in all four and nothing
// composites through furniture. #35, #37 and #17 all had every take rejected;
// #18, which produced the best slide of build 1, was never reached because #50
// filled the outdoor slot first.
//
// Both defects in build 2 were CAPTIONS, not renders, and both were fixed in
// place with scripts/reband-pending-post.ts — the banner is a pure Cloudinary
// transformation over the stored publicId, so a wrong line costs a URL rebuild
// and no Gemini at all. Declining build 2 would have thrown away four good
// renders to fix eleven words. See the two room rows below for what each line
// got wrong.
//
// WHAT TWO BUILDS TAUGHT: the frames that build reliably here are #42, #29 and
// #36. The failure mode on this listing is not the renders, which are good —
// it is that the property's best features (string lights, mountains, the copper
// sink, the water tower) are each in only some frames, and the stager chooses
// the crop. Every caption here is now written to survive any frame in its
// group, which costs specificity and is the correct trade.
export default {
  listingKey: "20260501212503801855000000",
  // Deep dusk blue. Every surface in this property is warm — wood ceilings,
  // wood counters, terracotta tile, copper, amber pendant glass — and the cover
  // is a pink-and-peach sunset, so Ridge Road's lesson applies twice over: an
  // accent inside the photo's own colour family disappears into it. This is the
  // colour of the sky an hour after the frame was shot, and it is dark enough
  // to hold white text at the panel's 75% opacity.
  accentColor: "2B3A55",
  // Judged by the RIGHT half, per copy-voice.md §8 — the panel hides the left
  // ~45%. What survives here is the painted water tower, the string lights, the
  // Little San Bernardinos and the full sunset gradient. The half that goes
  // under the panel is a bush and the near lip of the hot tub.
  coverPhotoIndex: 47,
  hook: "OWL'S NEST",
  coverBody:
    "Five expansive acres above Big Morongo Canyon, with a 1951 cabin at the middle of it. A gas-and-wood fireplace, a copper-sink kitchen, a heated spa under open sky, and a finished container that sleeps guests. Turnkey furnished.",
  // Captions are keyed by ROOM and the generator collapses aliases before it
  // looks one up — great_room/office/other → living, outdoor/outdoor_living →
  // pool, bedroom → primary_bedroom. The FIRST row of each collapsed group
  // answers for the whole group, so ONE row per group. And per copy-voice.md,
  // the stager's key is not stable between runs, so each line is written to the
  // SPACE it describes, never to the frame I am hoping it picks.
  rooms: [
    // Has to hold for 25, 28 and 29 under whichever of
    // living/great_room/office/other the run returns. The stone-hearth
    // fireplace is in 25 and 28 but NOT 29, and the wood-panelled bar alcove is
    // in 25 and 29 but not 28. The plank ceiling, the berber rug and the
    // windows are the only three things in all three frames, so they are the
    // only three named.
    { room: "living", caption: "Plank ceilings, a berber rug underfoot, and open desert through every window." },
    // Has to hold for 35, 36 and 37. One small galley kitchen: copper sink and
    // open shelving at one end, wood counter and stools under the window at the
    // other.
    //
    // "Copper sink, wood counters, amber pendants, and stools under the window"
    // in builds 1 and 2, both of which landed on #36 — which contains the
    // counter, the pendants and the stools and NOT the sink. Naming the room's
    // full inventory is the Acoma Trail standard, but Acoma's line survived
    // because every object it named was in the frame that took it. The rule
    // that actually holds is the narrower one: no caption may name a thing the
    // chosen frame does not show. #37 is the only frame with the sink in it and
    // it has now been rejected twice, so the sink comes out of the caption and
    // lives in the Instagram caption instead.
    { room: "kitchen", caption: "Wood counters, amber pendants, and stools pulled up under the window." },
    // Answers for `bedroom` too. Only 42 survives the exclusions — a bunk room
    // with a loft above and a made bed below — but the line is written so any
    // sleeping space in this property could take it.
    { room: "primary_bedroom", caption: "A bed made up under the window, and nothing outside it but open ground." },
    // `outdoor` and `outdoor_living` both normalise to `pool`, so this row
    // answers for the whole group and there must not be a second one.
    // POOLYN IS FALSE. There is a hot tub and no pool, and no frame here
    // contains either, so nothing implying water is named.
    //
    // "String lights overhead, mountains all the way around" in build 1 (D6),
    // which landed on #18 — and the stager's crop of #18 is a tight shot of the
    // porch: wood siding, a cactus in a copper pot, a rocking chair. No string
    // lights and no mountains anywhere in it. Both are real and both are in the
    // WIDER frames, which is exactly the trap copy-voice.md describes: the line
    // was written to be true of the space and then read as a mistake because
    // the crop the run chose contained neither object. The crop is the stager's
    // decision, not mine, so the line cannot depend on framing at all.
    //
    // "Morning coffee out here…" was the build-2 replacement, and it landed on
    // #50 — a sunset frame with an orange sky filling the top half. Object-free
    // was not enough: a line can be free of nouns and still be contradicted by
    // the frame, because TIME OF DAY is part of what a photograph asserts. The
    // run picks the hour as freely as it picks the crop. What is left names no
    // object and no hour — the acreage is a fact about the property, the sky is
    // in every outdoor frame, and sitting outside is true of all of them.
    { room: "outdoor", caption: "Five acres, open sky, and room to sit out in all of it." },
    // Reachable if the run returns `dining` for the outdoor table in 15 or 50.
    // There is no indoor dining room in the candidate set, so the line is
    // written for a table outside — which is the only table that can land here.
    { room: "dining", caption: "Dinner outside, the lights on, and the sun going down behind the ridge." },
    // Insurance. `exterior` has its own label (THE GROUNDS) and no alias; every
    // exterior frame is excluded, so this is a line I do not expect to use.
    { room: "exterior", caption: "Five acres, two horse stalls, and a painted water tower over the whole thing." },
  ],
  fallbackCaption: "Five acres in Morongo Valley, turnkey and ready to go.",
  textPosts: [
    {
      paragraphs: [
        "Five acres, and the house takes up 345 square feet of it.",
        "The rest is open ground: two horse stalls, a painted water tower, and a finished shipping container set up as a guest room with its own bathroom.",
      ],
      italicLast: "Sit out there after dark and the sky does the rest.",
    },
    {
      paragraphs: [
        "This one runs on a well and a septic system, which is normal out here and worth understanding before you fall for the view.",
        "I ask for the well report, the flow rate and the septic inspection early. Those three documents decide whether a place like this is easy to own.",
      ],
      italicLast: "Ask about the water before you ask about the price.",
    },
    {
      paragraphs: [
        "Morongo Valley sits between the highway and Joshua Tree, and the Big Morongo Canyon Preserve is in town.",
        "It is a boardwalk through a cottonwood marsh, and one of the best known birding stops in the California desert. Most people who know the town know it for that.",
      ],
      italicLast: "A few minutes off the highway and the noise stops.",
    },
  ],
  // THE CTA TEMPLATE DOES NOT REFLOW. buildCtaTransformation places paragraph 2
  // at a fixed 3-line offset from paragraph 1, so a paragraph that wraps to a
  // fourth line gets overprinted (48423 Hepburn Drive shipped that way once).
  // Both of these are under 90 characters.
  cta: {
    paragraphs: [
      "A place like this comes with a well, a septic tank and a 1951 build to understand.",
      "I would rather walk you through all three before you write an offer than after.",
    ],
    italicLast: "DM me. I will tell you what I would check first.",
  },
  caption: `Owl's Nest — five acres above Big Morongo Canyon, at 9223 N Star Trail in Morongo Valley.

A 1951 cabin with plank ceilings, a gas-and-wood fireplace and a copper-sink kitchen, sold turnkey furnished. Outside: a covered terracotta patio, a heated spa, string lights, two horse stalls, a painted water tower, and a finished shipping container fitted out as a guest retreat with its own bathroom. Well and septic, recently replaced roof, no HOA. Panoramic mountain views in every direction and Joshua Tree a short drive out.

2 BD · 2 BA · 345 SQFT · 5 ACRES · $359,000

Listed by Ashley N Robertson & The Obsidian Group · eXp Realty Of Southern California Inc

#morongovalley #joshuatree #highdesert #desertcabin #bigmorongo`,
};
