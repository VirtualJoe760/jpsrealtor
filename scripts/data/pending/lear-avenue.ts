// 1184 Lear Avenue, 29 Palms — $369,900 (Ashley Robertson & The Obsidian Group)
//
// WHY THIS ONE. Four never-queued team listings were looked at as images before
// anything was written, because auto-posting.md's binding constraint is
// furniture, not price, and that is only visible in the photos:
//
//   16430 Evans Lane ($1.3M, 53 photos, 5 acres, two residences) is the
//   highest-priced never-queued listing in the pool and is COMPLETELY VACANT.
//   All 53 frames: every interior is an empty room, both houses. Same failure
//   as 79161 Falmouth Drive — nothing telic in any frame, so every slide
//   degrades to an edge reaction, which actor-generation.md §6 then forbids
//   repeating across the sequence. Rejected before spending any Gemini.
//
//   4140 E Calle San Antonio ($570k) is still out for the reason lapis-drive.ts
//   recorded: vacant, plus frames carrying a "Digitally Altered" watermark on
//   the pool and the front lawn. Confirmed again here — #5 and #7 both stamp it.
//
//   71817 Samarkand Drive ($549k, pool, listed yesterday) is genuinely
//   furnished, and is the one real alternative to this. It lost on photography:
//   severe barrel distortion on nearly every interior, several near-duplicate
//   frames, and rooms carrying exercise equipment, laundry and toys. The
//   simple-luxury template is an editorial format and those frames do not
//   survive being cropped to 4:5 and banded. Worth revisiting if it gets
//   rephotographed.
//
// This one is furnished, professionally shot, and bright: a coffered-ceiling
// great room with a stone gas fireplace and a wall of desert windows, a maple
// kitchen with an island and bar stools, a made primary with a view window, and
// a timber pergola over a deck with string lights. Four distinct spaces with
// something to DO in each.
//
// BUILD 1 (queued X9, then declined). Three room slides survived, two of them
// good — the kitchen (#23, leaning on the counter) and the pergola deck (#45).
// The great room (#13) shipped THE POSE GUIDE SKELETON DRAWN INTO THE RENDER:
// white bone marks down both trouser legs, plainly visible at full size. The
// stager rejected three earlier takes on exactly that fault ("guide marks were
// drawn into the render") and then passed this one, so the guide-mark detector
// has a miss in it, not a gap. That take also carried the run's worst numbers —
// scale 1.30x against a 1.32 ceiling, drift 78.5 so the shadow was skipped —
// which is the shape of a take worth rejecting on sight anyway.
//
// This is the reason the skill says to look at the images. Both the broken
// slide and the wrong pergola material passed every numeric gate.
//
// It is also the first 29 Palms listing and the first acreage property in the
// feed since Ridge Road three weeks ago — the queue has been Palm Springs and
// Indio infill for a fortnight.
//
// THE MLS SAYS `furnished: "Unfurnished"` while the photos show it lived in.
// Nothing below claims the furniture conveys. The captions describe the ROOM.
//
// EXCLUSIONS (pass on the command line):
//   0            — reserved for the cover, so it cannot repeat as a room slide.
//   1-12         — the dirt approach, four front elevations, the detached
//                  garage and the shed. This is the gap in actor-generation.md
//                  §3: the reader has no front-elevation key, so a driveway
//                  returns `outdoor`, which the caption layer normalises to
//                  `pool` on a poolYN:false house. 3010 N Chuperosa Road
//                  shipped a closed garage door labelled OUTDOOR LIVING.
//   15, 29       — entry and hallway. Circulation (§3).
//   30, 31       — the guest beds are bare mattresses with linens folded on
//                  top. The gates cannot see that; a suited agent seated on an
//                  unmade bed is the wrong photograph whatever caption it takes.
//   32, 39, 40   — bathrooms. Never (§3).
//   41           — the primary bath. Same.
//   33, 34       — utility sink and laundry. Nothing to do, and 34 has a pile
//                  of washing in frame.
//   36, 42       — the primary from the cluttered side: shelving units, a
//                  rumpled bed, boxes.
//   37, 38       — the flex room. Two reasons: the generator collapses
//                  `office` → `living`, so a den landing there would take the
//                  great-room line, and the room's largest objects are gun
//                  safes. Neither belongs in a listing carousel.
//   43, 47       — rear elevation with the condenser unit, and the shed.
//   48-59        — bare dirt, the fire ring, and eight drone frames. No floor
//                  plane, no human-scale reference (§3).
//
// ADDED AFTER LOOKING AT BUILD 1:
//   13           — the skeleton render described above.
//   18           — all takes rejected in build 1. Rejections are properties of
//                  the photo, so re-offering it only burns a candidate slot.
//
// ADDED AFTER LOOKING AT BUILD 2 (queued Q4, then declined):
//   21           — the run's `dining` pick, and the photograph
//                  actor-generation.md §1 exists to prevent: an empty room, a
//                  blank grey wall, and a man standing in front of it with his
//                  hands in his pockets. There is nothing in that frame to do.
//   44           — the pergola from outside it, so the take seated him on the
//                  bare edge of the deck facing the lens. #45 is the same
//                  structure shot from UNDER it, looking out, and built well in
//                  build 1. Keeping both let the run take the weaker one.
//
// #23 was not rejected in build 2 — it died on a Gemini 503. A transient API
// failure is not evidence about a photo, so it stays in.
//
//   npx ts-node -O '{"module":"commonjs"}' scripts/build-pending-post.ts \
//     lear-avenue --exclude 0,1,2,3,4,5,6,7,8,9,10,11,12,13,15,18,21,29,30,31,32,33,34,36,37,38,39,40,41,42,43,44,47,48,49,50,51,52,53,54,55,56,57,58,59
//
// That leaves 14,16,17,19,20,22 (great room and dining end), 23-28 (kitchen),
// 35 (primary) and 45,46 (the pergola deck) — fifteen candidates for four
// slots, and every frame still in the set has something in it to do.
//
// WHAT THREE BUILDS TAUGHT, in case a fourth is ever needed: the two frames
// that build reliably here are #23 (kitchen island, leaning on the counter)
// and #45 (under the pergola, looking out). The living/dining end is the
// unstable one — it is one connected space that the reader has returned as
// `great_room`, `living` and `dining` across three runs, and half its frames
// are empty floor.
export default {
  listingKey: "20260526222601877563000000",
  // Deep petrol. The house's own palette is warm all the way through — maple
  // cabinets, pale plank floors, sand, a rust-red pergola — and the cover is an
  // amber sunset. Ridge Road's lesson was that an accent inside the photo's own
  // colour family disappears into it, so every warm hex is out here. Petrol is
  // the complement of the sunset and appears nowhere in the property.
  accentColor: "163A47",
  // Judged by the RIGHT half, per copy-voice.md §8 — the cover panel hides the
  // left ~45%. What survives is the lit front window, the porch light, the
  // mountain silhouette and the full sunset gradient. The half that gets
  // covered is bare dirt and a fence line, which is the half worth losing.
  coverPhotoIndex: 0,
  hook: "3.6 ACRES",
  coverBody:
    "The house sits near the middle of 3.6 acres in Desert Heights, with open ground on every side. A gas fireplace in the living room, transferable solar, and Joshua Tree National Park a short drive out.",
  // Captions are keyed by ROOM and the generator collapses aliases before it
  // looks one up — great_room/office/other → living, outdoor/outdoor_living →
  // pool, bedroom → primary_bedroom. The FIRST row of each collapsed group
  // answers for the whole group, so ONE row per group, and each line has to be
  // true of every frame that can still land on it. copy-voice.md goes further:
  // the stager's key is not stable across runs, so the line is written to the
  // SPACE, not to the frame I hope it picks.
  rooms: [
    // Has to hold for 13, 14, 16-22 — the whole connected great room and dining
    // end, under whichever of living/great_room/dining/other the run returns.
    // The stone fireplace is in 16-19 but NOT 13, 14, 20 or 21. The sectional
    // drops out of 20 and 21. High ceilings, pale plank floor and the window
    // wall are the only three things in all nine, so they are the only three
    // named.
    { room: "living", caption: "High ceilings, pale plank floors, and windows that keep the desert in the room." },
    // 20, 21 and 22 share the lantern pendant and the arch through to the
    // kitchen. There is no table in the dining end in any of them, so no table
    // is named — 46109 Roadrunner Lane shipped a caption for furniture that was
    // not in shot.
    // "…just through the arch" in build 2 (Q4), which landed on #21 — a frame
    // with a patio slider and a blank wall and no arch anywhere in it. The arch
    // is real and is in 20 and 22; it was not in the frame the run chose. Same
    // failure as the pergola material, one slide over. "A few steps away" is a
    // fact about the HOUSE and survives whichever frame lands.
    { room: "dining", caption: "A lantern pendant overhead, and the kitchen a few steps away." },
    // Has to hold for 23-28. Maple cabinets, dark counters and stainless are in
    // all six. The island and its bar stools are in 26, 27 and 28 only, and the
    // window over the sink drops out of 25, so none of the three is named.
    { room: "kitchen", caption: "Light maple cabinets, dark stone counters, and stainless right through it." },
    // Answers for `bedroom` too. Only 35 survives the exclusions, but the line
    // is written so any bedroom in this house could take it.
    { room: "primary_bedroom", caption: "A window on the open desert, a fan overhead, and a door that shuts on all of it." },
    // `outdoor` and `outdoor_living` both normalise to `pool`, so this row
    // answers for the whole group and there must not be a second one.
    // poolYN IS FALSE ON THIS PROPERTY — nothing here may imply water.
    // "A steel pergola" in build 1 (X9). It is stained TIMBER, and at contact-
    // sheet size the red-brown stain reads as painted steel. A false material
    // claim on another brokerage's listing, and one no gate can catch — the
    // render was fine, the sentence was wrong. Look at the full-size frame
    // before naming what a thing is made of.
    { room: "outdoor", caption: "A wood pergola, string lights, and nothing but open desert past the deck." },
    // Reachable only if the reader returns `exterior`, which has its own label
    // (THE GROUNDS) and no alias. Every exterior frame is excluded, so this is
    // insurance rather than a slide I expect.
    { room: "exterior", caption: "3.6 acres, a circular drive, and the garage set well back off the house." },
  ],
  fallbackCaption: "3.6 acres in Desert Heights, with Joshua Tree a short drive out.",
  textPosts: [
    {
      paragraphs: [
        "The lot is 3.6 acres, and it is the reason to come and look at this one.",
        "The house sits near the middle of it, so there is open ground on every side and a circular drive that means you are never backing out onto Lear.",
      ],
      italicLast: "Walk out after dark and you can see the whole sky.",
    },
    {
      paragraphs: [
        "Buyers ask me what it costs to run a house this far out.",
        "There is a transferable solar system on this one, a 250-gallon propane tank, central air and a swamp cooler. Those four things are most of the answer.",
      ],
      italicLast: "Ask for the utility bills before you fall for the view.",
    },
    {
      paragraphs: [
        "This is a manufactured home on its own land, and it carries a 433A certification.",
        "That is what makes conventional, FHA and VA financing straightforward here. It is the first thing I check on a house like this one.",
      ],
      italicLast: "It is a small piece of paper that decides how you can pay for the house.",
    },
  ],
  // THE CTA TEMPLATE DOES NOT REFLOW. buildCtaTransformation places paragraph 2
  // at a fixed 3-line offset from paragraph 1, so a paragraph that wraps to 4
  // lines gets overprinted by the next one (48423 Hepburn Drive shipped that
  // way once). Keep each paragraph to ~110 characters.
  cta: {
    paragraphs: [
      "Buying acreage out here comes with septic, propane and solar to understand.",
      "I will walk you through what each one costs before you decide, not after.",
    ],
    italicLast: "DM me. I would rather answer questions than sell you a view.",
  },
  caption: `3.6 acres in Desert Heights, 29 Palms — 1184 Lear Avenue.

The house sits near the middle of the lot with open ground on every side. Coffered ceilings and a gas fireplace in the living room, a maple kitchen with an island, a flex room for an office or a gym, a detached two-car garage and a storage shed on a concrete foundation. Transferable solar, a 250-gallon propane tank, and a 433A certification that keeps conventional, FHA and VA financing straightforward. Joshua Tree National Park is a short drive out.

3 BD · 2 BA · 1,620 SQFT · $369,900

Listed by Ashley Robertson & The Obsidian Group · eXp Realty Of Southern California Inc

#29palms #twentyninepalms #joshuatree #highdesert #desertheights`,
};
