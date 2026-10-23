// 5803 Los Santos Drive #19, Palm Springs — $414,999 · Villas De Las Flores
// (Ashley Robertson · eXp Realty Of Southern California Inc)
//
// WHY THIS ONE. 39 team actives, 22 ever queued, 18 never queued. Nine of the
// never-queued are sales with >=12 photos, and 28 Oak Tree's build note had
// already struck four of them by name — Calle San Antonio, Encanto and Barron
// vacant, Hombria set aside for wide-lens distortion. That left five, and the
// note listed four of them as unchecked. All four were pulled as contact
// sheets this run:
//
//   5803 Los Santos Dr #19, Palm Springs, $415k, 56  → BUILT. Furnished and
//        professionally lit in every room, undistorted, and the widest spread
//        of distinct spaces left in the pool: living, dining, kitchen, two
//        bedrooms, a walled patio, the community pools and the courts.
//   3470 Warren Vista, Yucca Valley, $399k, 64       → Oak Tree's stated
//        fallback, and it stays the fallback. Re-checked: the interiors are
//        genuinely handsome, but a third of them are bare white rooms, ten of
//        the 64 frames are lot-boundary aerials with red survey lines drawn on
//        them, and every outdoor frame is raw dirt. Los Santos beats it on
//        furnished rooms, which is what the stager actually needs.
//   1321 Sea Life Ave, Thermal, $315k, 48            → checked and passed
//        over. Four bedrooms and almost every one of them empty; olive walls,
//        oak cabinets, and painted wall murals in three rooms. Nothing telic
//        in the frames the selector would reach for.
//   7526 Apache Trail, Yucca Valley, $295k, 31       → checked and kept in
//        reserve. Genuinely furnished and lived-in, and the better answer if
//        the feed needs a high-desert post; 31 frames with several aerials
//        among them is a thin shortlist next to 56.
//
//   2502 Harbor Drive, Thermal, $230k, 17 — still unchecked. 17 photos.
//
// Only 53806 Ridge Road has ever reached status "posted", so nothing here
// risks a repeat.
//
// A NOTE ON GEOGRAPHY, since the skill asks for visual difference. Palm Springs
// is the most-represented city in the review queue and 28 Oak Tree, queued the
// day before this one, is also a golf-adjacent condo. That is the one real
// argument against this listing and it lost to photo quality: only one post has
// ever published, so "the last few posted" is a queue of one, and the publish
// cron drains in approval order rather than queue order. Apache Trail is the
// swap if Joseph wants the feed spread out instead.
//
// coverPhotoIndex 43, measured. Rendered the real simple-luxury transformation
// over 34, 44, 13, 0, 42, 43, 36, 45 and 16 first — free, because the cover is
// a pure Cloudinary transform, and `gravity: auto` re-crops the frame so
// copy-voice.md §8's right-half rule cannot be applied to the original by eye:
//   34  the patio, and the obvious pick by subject. The panel hides the red
//       umbrella and what survives on the right is patio concrete, a chair and
//       the air-conditioning condenser against the wall. Oak Tree's cover
//       failure almost exactly.
//   0   the living room: a corner of grey sectional and a blank wall.
//   45  a slider with vertical blinds and a shrub.
//   42  mostly sidewalk.
//   13, 16  the remodelled kitchen, and both survive the crop well. Passed over
//       because a tight interior crop cannot also say which building this is,
//       and the hook is about the building.
//   36  the patio with the table, chairs and a palo verde. Good, and rejected
//       only because #34/#35/#36 are the outdoor_living family the stager will
//       almost certainly spend a room slide on. A cover that repeats slide 4 is
//       a wasted slide.
//   43  keeps palms, open sky, the unit's own elevation, agave and desert
//       gravel in the surviving half, and nothing man-made and ugly in it.
//
// hook CORNER UNIT. It is the listing agent's own lead, it is a fact the
// photograph cannot state — no elevation shot proves a corner — and it is the
// thing the text slides then get to explain. Set on two lines at 96pt and
// clears the 480px panel.
//
// accentColor 3C1A4B, chosen against the cover rather than sampled from it.
// Rendered deep violet against plum 5C2340 (Oak Tree's own), rust 7A2E1E and
// teal 14464F. Rust is warm-on-warm over tan stucco and terracotta gravel and
// goes soft — 53806 Ridge Road's failure. Teal shares a family with the palms
// and the agave inside the panel and desaturates against them. Plum works; it
// is Oak Tree's, queued the day before, and violet separates just as cleanly
// from every large area here — light blue sky, tan stucco, green foliage, warm
// gravel — while not being the same panel twice in a row.
//
// Exclusions passed on the build. Aimed at the SELECTOR'S ranked 14, not at the
// 56 photos, and dumped with scripts/tmp-selector-dump.ts first for under a
// cent. The ranked 14 was 1, 8, 48, 34, 7, 38, 3, 0, 4, 5, 6, 13, 16, 17.
// Three struck, eleven kept, so the first nine — 1, 8, 34, 7, 38, 3, 0, 4, 5 —
// go to the stager for four slots across five distinct room kinds:
//
//   6   the living room shot over the back of the sectional, which runs across
//       the entire bottom of the frame with a second arm on the right, and a
//       placement of "on the patterned rug, to the right of the round coffee
//       table" — beyond that near face. actor-generation.md §9's standing tell
//       in its plainest form.
//   16  the kitchen shot across the counter run, with the placement "standing
//       by the kitchen counter in the foreground" — i.e. behind the opaque
//       waist-height thing crossing the lower third. This is the frame that
//       put him through the island at 1950 S Palm Canyon #128. #13 is the
//       kitchen frame with open tile between the lens and the standing spot,
//       so it stays.
//   48  the community pool. Two reasons, and the second is the real one: the
//       deck is 60-odd feet from the lens, so a figure there lands small enough
//       to gamble the scale gate; and it is the HOA's pool, not this unit's, so
//       a room slide staged on it puts the agent somewhere the buyer does not
//       own. It is also the lowest appeal in the fourteen. #34 carries the
//       outdoor slot instead, and it is the private patio.
//
// NOT excluded, and deliberately: 1, 3, 4 and 5, all living-room frames with
// furniture near the lens. 84146 Azzura Way's build W3 excluded that whole
// family and shipped a one-room carousel; the category is an opaque near face
// ACROSS the standing spot, not any sofa in the picture. In all four the
// described spot is open rug or open tile to one side of the furniture.
//
// AND THE POOL LABEL GUARD HAD A HOLE IN IT, WHICH THIS LISTING FOUND.
// `poolFeatures` here is "Community, In Ground" and `poolYN` is true — the
// community pool, and it is in the ground. The guard 28 Oak Tree wrote asked
// whether EVERY comma-separated token looked like a shared facility, which
// only ever worked because Oak Tree's field was the single word "Association".
// " In Ground" failed that test, the whole string read as private, and THE POOL
// DECK was about to print over an enclosed private patio on a condo whose own
// remarks say the pools are "steps from" it — the same false claim about
// another brokerage's listing that Roadrunner Lane and Star Trail caught.
// Fixed in build-pending-post.ts: the test is now about ownership only, so a
// token that describes how the water was built cannot vote a shared pool back
// into private. reband-pending-post.ts still carries no guard at all, so if
// this ever needs a reband, pass `outdoor`, never `pool`.
//
// WHAT ACTUALLY HAPPENED. Recorded here because the exclusion list above is the
// input and the yield is the only thing that judges it.
//
//   A8 (--exclude 6,16,48) staged six and returned three: #2 living, #10
//      kitchen, #7 dining, all usable. #45 and #44 failed every take and #18
//      was refused outright as a laundry room. #0, #1 and #3 were skipped as
//      duplicate livings, so the fourth slot went unfilled and the post is 8
//      slides rather than 9. No CMA either — the subdivision has no closed-sale
//      stats. One build, nothing deleted, nothing to untangle.
//
//   AND NONE OF #1, #8, #34, #38 — the frames the exclusion list was written
//   against — were offered. The selector re-runs on the build and returned a
//   different set minutes after the dump, exactly as auto-posting.md
//   §"Re-measured 2026-08-27" warns. #34, the private patio, was ranked third
//   in the dump and never appeared, which is why there is no outdoor slide.
//   The dump earns its cent by naming the CATEGORIES to strike; it does not
//   pin the set, and a room you planned for can simply not turn up.
//
//   Two captions were REBANDED, not rebuilt — see the notes on the rows
//   themselves. Both named things their chosen frame does not contain, which is
//   a caption fault and costs nothing to fix; declining the build over eleven
//   words would have thrown away three good renders (9223 N Star Trail).
//
//   The cover was RECOVERED once, to pick up the unit number and the new width
//   caps on the address lines. Slide 1 only, no staging, no Gemini.
//
//   Queued as L6, which collided with 48423 Hepburn Drive. Reissued A8, and
//   build-pending-post.ts now draws its code against the live queue.
//
// ONE THING TO WATCH ON THE BUILD LOG. The `exterior` row below is almost
// certainly unreachable, exactly as it was on Oak Tree: the selector emits
// `exterior` for #38 but the stager has no such key and returns `outdoor`,
// which normalises to `pool`. So #38 would take the pool caption, and #34 will
// have taken the pool slot before it anyway. The pool caption is therefore
// written to hold over a front walkway as well as over the back patio — it
// names no object and no time of day.
export default {
  listingKey: "20260626022823230603000000",
  accentColor: "3C1A4B",
  coverPhotoIndex: 43,
  hook: "CORNER UNIT",
  // No bed or bath count in here — the spec strip three lines above is built
  // from the feed and already says 2 BD | 2 BA (copy-voice.md §8).
  coverBody:
    "A corner unit in the Palm Springs south end, off Golf Club Drive. Remodeled kitchen, updated baths, a full-size washer and dryer, and a walled patio. The pools, tennis and pickleball are a short walk from the door.",
  // Keyed by ROOM, never by position, and written to the SPACE rather than to
  // the frame I hope the stager picks — the key is not stable across runs
  // (copy-voice.md §8). Aliases collapse before the lookup, so only the
  // canonical key of each group appears: great_room/office/other → living,
  // outdoor and outdoor_living → pool, bedroom → primary_bedroom.
  //
  // No time of day anywhere below, and no ceiling. 1522 Sutherland Street
  // shipped two captions asserting a vaulted ceiling over frames whose ceilings
  // are flat; the ceilings here are vaulted in some frames of the same room and
  // not others, which is exactly the trap.
  rooms: [
    // Answers for great_room, office and other, so it has to hold for any frame
    // of the open end — and, per Acoma Trail, for a dining or kitchen frame
    // that comes back `living`. All three claims are house-wide rather than
    // crop contents: the walls are the same warm grey in all thirty interior
    // frames, the record says tile, and the kitchen is open to the room in
    // every frame that contains both. Deliberately NOT named: the grey
    // sectional and the wall-mounted TV, each of which is in some frames of
    // this space and not others.
    // REBANDED AFTER THE BUILD. The original line ended "and the kitchen open
    // to the room" — true of the space, and the frame the stager actually
    // returned (#2) faces the blank wall the other way, so the reader saw a
    // caption naming a kitchen that is not in the picture. 9223 N Star Trail's
    // lesson, and the same cheap fix: the band is a pure Cloudinary transform.
    { room: "living", caption: "Warm grey walls, tile underfoot, and a sectional that wraps the corner." },
    // Counters, cabinets and stainless are in every kitchen frame and survive
    // the key moving. The laundry is a record fact (`laundryFeatures: In
    // Kitchen`), not a frame claim, so it holds over the frames that do not
    // show the stack. Deliberately NOT named: the marble-look backsplash, which
    // #17 does not contain, and the fuel the range burns, which no field states.
    // REBANDED AFTER THE BUILD, same reason. "stainless appliances, and the
    // laundry lives in here" was written off the record (`laundryFeatures: In
    // Kitchen`) and off the other kitchen frames. The frame that landed (#10)
    // looks across the peninsula at the slab backsplash and contains neither
    // the stack nor anything obviously stainless — both are in #7, the dining
    // frame, one slide later. Rewritten to the four things this crop does hold.
    { room: "kitchen", caption: "Quartz counters, a full slab backsplash, new cabinets, and a bar to sit at." },
    // Written to the layout, which both dining frames plainly show. If a dining
    // frame instead comes back `living`, the line above still holds over it.
    { room: "dining", caption: "A round table between the kitchen and the living room, and no wall in between." },
    // Answers for `bedroom` too, so it has to survive the primary and the
    // secondary. Every claim is off the record: two bedrooms, two full baths,
    // carpet in the bedrooms, all bedrooms down on one level.
    { room: "primary_bedroom", caption: "Two bedrooms and two full baths, carpet underfoot, all on one level." },
    // Answers for outdoor and outdoor_living, and per the note above it has to
    // hold over the front walkway as well as the walled back patio, because
    // that is the key the stager returns for both. So it names nothing in the
    // frame at all — the walk is a fact about where the unit sits, which the
    // listing's own remarks state.
    { room: "pool", caption: "The pools, the tennis courts and the pickleball are all a short walk from here." },
    // Almost certainly unreachable — see the note above. Kept because it costs
    // nothing and the selector does emit the key.
    { room: "exterior", caption: "Desert planting out front, covered assigned parking, and the HOA keeps the grounds." },
  ],
  fallbackCaption: "A corner unit in Villas De Las Flores, in the Palm Springs south end.",
  textPosts: [
    {
      paragraphs: [
        "Corner unit is the line on this listing I would not skip past.",
        "It means one shared wall instead of two, and windows facing more than one way. In 1,066 square feet that is the difference between bright and boxed in.",
      ],
      italicLast: "Stand in it for five minutes and you will feel it.",
    },
    {
      paragraphs: [
        "The dues here are $452 a month, and you should know what that buys.",
        "Water, trash, and the building and grounds. The pools, the tennis courts and the pickleball sit on the other side of that number. Nothing out there is yours to fix.",
      ],
      italicLast: "Ask me for the HOA documents and I will send them over.",
    },
    {
      paragraphs: [
        "People ask me whether to hold out for a place with its own pool.",
        "A private pool is a service bill every month and a resurfacing bill later on. This one walks to the community pools, and the dues already cover keeping them up.",
      ],
      italicLast: "It comes down to how many days a year you would actually swim.",
    },
  ],
  // Two paragraphs, both under ~110 characters. buildCtaTransformation places
  // paragraph 2 at a fixed three-line offset and does not reflow, so a
  // four-line first paragraph gets overprinted (48423 Hepburn Drive).
  cta: {
    paragraphs: [
      "Fifteen minutes inside this one tells you more than fifty photos will.",
      "I will have the HOA documents, the dues breakdown and the title pulled before we go.",
    ],
    italicLast: "DM me and we will pick a time.",
  },
  caption: `Two bedrooms in the Palm Springs south end, off Golf Club Drive — a corner unit in Villas De Las Flores, and the land under it is fee, not leased.

Inside: a remodeled kitchen with quartz counters, new cabinets and stainless appliances, updated baths, tile through the living end and carpet in the bedrooms, a full-size washer and dryer, and a walled private patio off the slider. One level, all on the ground floor.

Outside the door: the community pools, the tennis courts and the pickleball, a short walk away. HOA $452 a month covers water, trash, and the building and grounds. Covered assigned parking. Minutes from downtown Palm Springs and Rancho Mirage.

2 BD · 2 BA · 1,066 SQFT · $414,999

Listed by Ashley Robertson · eXp Realty Of Southern California Inc

#palmsprings #palmspringsrealestate #coachellavalley #condoliving #lockandleave #desertliving`,
};
