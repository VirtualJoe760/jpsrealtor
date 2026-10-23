// 78250 Cortez Lane #129, Indian Wells — $325,000
// (Peyson Robertson & The Obsidian Group · eXp Realty Of Southern California Inc)
//
// Chosen because it is the last never-queued team active that is FURNISHED.
// auto-posting.md §"Re-measured 2026-08-14" called this one out by name as the
// only furnished never-queued sale left, and the contact sheet confirms it:
// mauve sectional, made bed, wicker patio set, styled shelves in every interior
// frame. Everything else in the pool is land, one rental, one multifamily, or
// a vacant house (Evans Lane, Falmouth, Calle San Antonio, Barron, Encanto all
// re-checked and still bare).
//
// It is also visually unlike the last few — a guard-gated Indian Wells condo
// under the Santa Rosas, against a Palm Springs mid-century tower, a Morongo
// Valley ranch and two 29 Palms houses.
//
// IT IS A STUDIO. 576 sqft, one room, with a green partition wall standing
// between the bed and the sofa — both are in shot together in frames 29, 39 and
// 42. So `living` and `primary_bedroom` are the SAME SPACE here and the stager
// can legitimately return either key for either frame. Both lines below are
// written to survive that: neither names an object the other room lacks.
//
// accentColor: deep clay 7A3B2C. The obvious pull is the green partition wall,
// and it is the wrong one — the cover frame is lawn, palms and green hillside,
// so a green panel would sink into it exactly the way 53806 Ridge Road's
// champagne sank into a tile roof. The clay is the patio cushions and the
// terracotta arc in the living-room mural, and it is the one colour in this
// listing's photography that the cover does not already contain.
//
// coverPhotoIndex 16, judged by its RIGHT half (copy-voice.md §8): palms, the
// pool, green lawn and the rock face rising straight up behind. The left 45%
// the panel eats is shaded rock and palm trunks, which is nothing lost.
//
// Exclusions passed on the build:
//   0-16, 20, 21  drone aerials — actor-generation.md §3 refuses these anyway,
//                 and they are 19 of the 50 frames. (16 is still the cover; the
//                 cover index is read straight off photoUrls and never staged.)
//   17,18,19      the unit's covered patio shot from out on the lawn — a front
//                 elevation in all but name, which is the classification gap
//                 §3 records against 3010 N Chuperosa Road.
//   26            refrigerator in a hall alcove — a detail shot, no floor
//   40,41,48      shower, laundry closet, bathroom vanity
//   42            hallway — corridor, nothing to do
//   44            dresser-and-closet corner, no standing room
//   46,47,49      entry courtyard and the exterior walkway — circulation
//
// REBUILD (same day, after looking at build V7). Two slides out of five were
// wrong for reasons no gate can see, so both frames are now excluded:
//
//   23  THE KITCHEN CAME BACK BLACK AND WHITE. The source photo is in colour —
//       green tree through the slider, orange K-cups, blue patio furniture, the
//       mauve sofa — but the stager cropped to x=560 of 1120 and every one of
//       those sits outside the crop. What is left is white cabinets, stainless,
//       grey granite and white walls, and with the charcoal suit on top the
//       slide reads as a monochrome photograph in a colour carousel. Nothing
//       failed; it just looks wrong. Frame 24 is the same kitchen from a step
//       back with the Keurig, the fruit basket and the warm granite in shot.
//   45  "POOLS FOR CLUB VIEW HOA USE ONLY", legible on the gate he is leaning
//       on, under a caption calling it one of THIS property's three pools. This
//       listing is in Mountain Cove; I cannot show that the signed pool is the
//       same association's, and asserting it on another brokerage's listing is
//       not a claim to guess at. It also puts the agent at a gate that says he
//       should not be there.
//
// So 27 and 28 — the unit's own private walled patio — go BACK IN as the
// outdoor candidate, and the caption below is rewritten to them. The reason
// they were held out the first time still stands and is now a known risk to
// watch rather than avoid: this listing carries `poolYN: true` on a COMMUNITY
// pool, so the `!poolYN` guard in build-pending-post.ts does not fire and
// `ROOM_LABELS.pool` stays "THE POOL DECK". stage_geometric.py emits `pool` as
// well as `outdoor` and DID return `pool` for frame 45 on build V7, so a walled
// patio with no pool in it can still land under a POOL DECK label — the same
// false claim 46109 Roadrunner Lane caught in the `outdoor` spelling. If it
// does, reband-pending-post.ts fixes it for no Gemini spend by passing
// `outdoor` for that slide, which relabels AND recaptions off the same render.
// In the event the selector never ranked 27 or 28 into the candidate set at
// all, so W7 has no outdoor slide and the question stayed theoretical.
//
// SECOND REBUILD, after looking at W7. One more frame out:
//
//   37  MALFORMED HAND. He is seated on the edge of the bed with his left hand
//       on the covers, and the fingers are fused into a single flat paddle with
//       no digits — actor-generation.md §9 "hands with wrong finger counts",
//       reject on sight. Nothing numeric catches this: the frame passed feet,
//       scale, drift and ArcFace cleanly. The pose is also dead-centre and
//       perfectly symmetric, which §6 calls out as the robotic read.
//       Frame 43 is the same bed from the desk side and rendered well on V7.
//
// THIRD REBUILD, and the exclusion list stops being a list of bad frames and
// becomes a hand-picked NINE. L7 is why: dropping frame 37 shifted the
// selector's ranking, and the nine frames it then handed the stager were
// 22/29/30/31/32/33/34/35 — every single one a living room. All of them staged
// successfully and eight were thrown away by the room de-duplication, so a
// build where nothing failed produced ONE room slide.
//
// That is a property of this listing, not a bug. It is 576 square feet with a
// partition in the middle, so almost any interior frame is legitimately
// `living` or `great_room`, and `selectStagingPhotos` has no reason to spread
// its picks across rooms. build-pending-post.ts then takes only the first
// WANT_SLIDES+5 = 9 after exclusions, so on an open-plan unit the window can
// close before it ever reaches the kitchen or the bed.
//
// So the set below is chosen to BE those nine, one or two per room, weighted
// toward frames that have already rendered well:
//   living   30 (good on V7), 34 (good on W7)
//   kitchen  24 (good on W7), 25
//   bedroom  43 (good on V7), 36, 38
//   outdoor  27, 28
// Everything else is excluded, including good frames, purely to stop the room
// de-duplication from eating the run.
export default {
  listingKey: "20260210171134856350000000",
  accentColor: "7A3B2C",
  coverPhotoIndex: 16,
  hook: "MOUNTAIN COVE",
  coverBody:
    "A 576-square-foot ground-floor studio inside Mountain Cove, the 24-hour guard-gated community at the foot of the Santa Rosa mountains. Turnkey furnished, granite counters, LG appliances, three heated pools.",
  // Keyed by ROOM, never by position, and written to the SPACE rather than to
  // the frame I hope the stager picks — the key is not stable across runs
  // (copy-voice.md §8). In a studio that constraint bites harder than usual:
  // `living` and `primary_bedroom` are one room with a partition in it, so
  // neither line may name the sofa or the bed as though the other frame had it.
  rooms: [
    { room: "living", caption: "One room, white walls, and the pale plank floor running straight through all of it." },
    { room: "kitchen", caption: "Granite counters, stainless appliances, and open shelving over the run." },
    { room: "dining", caption: "A table for two, and nothing else in the room has to move for it." },
    // No ceiling fan named, though there is one over the bed in the original of
    // every candidate frame. Build W7 put "a fan turning above it" over frame
    // 37, whose crop cut the ceiling off entirely — the object was in the PHOTO
    // and not in the SLIDE. The crop is chosen per run and cannot be predicted,
    // so anything near an edge is off limits the same way an unstable room key
    // is (copy-voice.md §8).
    { room: "primary_bedroom", caption: "White walls, a made bed, and the rest of the studio a few steps away." },
    // `pool` answers for `outdoor` and `outdoor_living` too, and the only
    // outdoor candidates left are 27 and 28 — the private walled patio, shot
    // from under the timber overhang. The line names the three things in BOTH
    // frames and nothing else: wicker seating, the wall, the overhang. No pool
    // (there isn't one out here), no mountain (only 28 catches it), and no time
    // of day — 9223 N Star Trail's "morning coffee" landed on a sunset.
    { room: "pool", caption: "Wicker chairs, a wall around it, and the overhang keeping the sun off." },
  ],
  fallbackCaption: "Ground-floor studio at Mountain Cove, Indian Wells.",
  textPosts: [
    {
      paragraphs: [
        "Residents here get Resident's Day tickets to the BNP Paribas Open, plus discounts at the Indian Wells golf resort and the four resort hotels.",
        "The Tennis Garden is a few minutes up the road. El Paseo is a short drive the other way.",
      ],
      italicLast: "Some of what you buy here is the address.",
    },
    {
      paragraphs: [
        "The first thing I check on any condo is the real monthly.",
        "Here the HOA is $265, and that covers the three heated pools, the grounds, and the guard on the gate around the clock.",
      ],
      italicLast: "I would rather you knew the whole number early.",
    },
    {
      paragraphs: [
        "This HOA permits a seven-day minimum stay.",
        "That is a rule I read for myself on every building rather than take it from a listing, because it changes what a place can be used for.",
      ],
      italicLast: "The rule is the fact. What you do with it is yours.",
    },
  ],
  // Two paragraphs, both kept under ~110 characters. buildCtaTransformation
  // places paragraph 2 at a fixed three-line offset and does not reflow, so a
  // four-line first paragraph gets overprinted (48423 Hepburn Drive).
  cta: {
    paragraphs: [
      "A studio gets judged on square footage and nothing else.",
      "I would rather walk you through the HOA, the gate and the rental rule first.",
    ],
    italicLast: "DM me. Happy to talk it through.",
  },
  caption: `Ground-floor studio at Mountain Cove — the 24-hour guard-gated community at the foot of the Santa Rosas in Indian Wells.

Turnkey furnished with limited exclusions. Granite counters, LG appliances throughout, open shelving, dimmers in the kitchen, bath and hallway, smart lock entry, and a private walled patio off the living space. Three heated community pools on the grounds.

Residents get Resident's Day tickets to the BNP Paribas Open and discounts at the Indian Wells Golf Resort and all four Indian Wells resort properties. The Tennis Garden is minutes away, El Paseo a short drive.

HOA is $265/mo. The association permits a seven-day minimum stay.

1 BD · 1 BA · 576 SQFT · $325,000

Listed by Peyson Robertson & The Obsidian Group · eXp Realty Of Southern California Inc

#indianwells #mountaincove #coachellavalley #desertliving #palmspringsarearealestate`,
};
