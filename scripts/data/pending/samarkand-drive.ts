// 71817 Samarkand Drive, 29 Palms — $549,000
// (Peyson Robertson & The Obsidian Group · eXp Realty Of Southern California Inc)
//
// WHY THIS ONE. auto-posting.md §"Re-measured 2026-08-15" declared the
// never-queued pool empty, and by its own accounting it was: everything left
// was land, one rental, one multifamily, or a vacant house. Samarkand is the
// exception that log kept listing and never built — recorded 2026-08-12 as
// "Furnished; severe barrel distortion, cluttered" and again 2026-08-14 as the
// marginal fallback. Re-checked as a contact sheet today: it is genuinely
// furnished in every interior frame — sectionals, made beds, a set dining
// table, a stocked kitchen — so it is the last never-queued sale that can
// actually be staged. Only ONE listing in `pendingposts` has ever reached
// status "posted" (53806 Ridge Road), so nothing here risks a repeat post.
//
// It is also visually unlike the last several: a 1986 single-storey on a bare
// double lot in 29 Palms, against an Indian Wells condo, a Palm Springs tower
// and a Morongo Valley ranch.
//
// WHAT IS WRONG WITH THE PHOTOGRAPHY, stated up front so the build is judged
// against it. Every one of the 38 frames is shot on a very wide lens with
// severe barrel distortion — ceilings bow, wall lines curve, the pool coping
// arcs. Nothing in the pipeline corrects that and nothing should: it is the
// listing brokerage's photography and altering the room is a compliance
// problem, not a taste one (AGENTS.md §7). Several interiors are also lived-in
// rather than styled. The exclusion list below removes the frames where that
// tips over into unusable; the rest ship as shot.
//
// accentColor: deep rust 8A3B24. Sampled the cover's RIGHT half (copy-voice.md
// §8 — the panel eats the left ~45%, so only the right half is judged) and it
// quantises to 50% blue/cyan sky and pool plus 28% warm sand concrete. Rust is
// the complement of that cyan and is far darker and more saturated than the
// sand, so it separates from both. It is also in the listing: the terracotta
// floor tile and the red-orange floral panels over the dining table. The
// obvious pull — pool turquoise — is exactly the colour that would sink, the
// same failure as 53806 Ridge Road's champagne against a tile roof.
//
// coverPhotoIndex 4, chosen on its right half against 5, 7 and 0:
//   5  the back fence carries orange tagging and a red warning sign, both dead
//      centre of the right half.
//   7  a dark roof eave and a satellite dish cut across the top-right corner.
//   0  front elevation, clean but it is gravel and a rail fence, no water.
//   4  pool water fills the lower third, palms and open sky above it. A power
//      pole and a small yellow sign on the fence are the cost, and they sit
//      behind the pool rather than over it.
//
// Exclusions passed on the build:
//   0,1,2    front elevation, driveway, and the bare side lot. actor-generation.md
//            §3 records the classification gap these fall into — the reader has
//            no front-elevation key, so a driveway returns `outdoor`, normalises
//            to `pool` and gets labelled THE POOL DECK. 3010 N Chuperosa Road
//            shipped the agent presenting a closed garage door that way.
//   3        the back dirt lot. Nothing telic to do out there.
//   19       weight bench and exercise ball in front of a mirrored closet.
//   24,27,34,35  bathrooms and a shower. §3, never.
//   25,30,31,36  children's bedrooms and the craft room — toys, a step stool, a
//            curio cabinet. Not false, but a suited agent standing in a child's
//            room is the wrong photograph.
//   32,33    an interior hall with a folding room divider in it. Circulation.
//   37       a near-empty room with a beanbag and a cube shelf.
//
// REBUILD, after looking at build R4 (declined). Two more frames out:
//
//   21  HE IS SITTING ON THE FLOOR. The plan named the sectional as the contact
//       object and the render put him on the carpet at the edge of the area
//       rug, legs stretched out, back against nothing, with the sofa several
//       feet away to his left. Every gate passed — feet-on-floor 80%, scale
//       1.01x, drift 8.7, ArcFace 0.390 — because a man seated on the floor
//       satisfies all of them. It is a suited agent sitting on the ground in
//       the great room, which is not a photograph anyone would take.
//   20  the same room from a near-identical camera position, with the same
//       rug-on-carpet reading as the only seating geometry on offer. Excluded
//       so the rebuild does not walk straight back into it. Frames 18 and 23
//       are the remaining living candidates and both have a sofa standing
//       against a wall, which is a contact object the stager can actually use.
//
// Frames 4 and 6 (pool) were offered on R4 and lost every take, so the build
// shipped no pool slide at all despite the pool being the cover and the lead
// feature. They stay IN — 5 and 7 are also still eligible and were never
// ranked — on the chance the re-roll lands one.
//
// Note on what remains: the selector returns its own top 14 of all 38 and
// `--exclude` is applied to that result AFTERWARDS, so this list can only
// remove candidates, never promote the ones I would have picked (the lesson
// 78250 Cortez Lane cost four builds to learn). The bathrooms and empty rooms
// almost certainly never rank; the front elevations might, and losing them is
// the point.
export default {
  listingKey: "20260810181738474802000000",
  accentColor: "8A3B24",
  coverPhotoIndex: 4,
  hook: "DOUBLE LOT",
  coverBody:
    "Four bedrooms, three baths and two owner suites on a fully fenced double lot in 29 Palms. In-ground pool, detached two-car garage, RV parking, and mature eucalyptus. Joshua Tree is about ten minutes down the road.",
  // Keyed by ROOM, never by position, and written to the SPACE rather than to
  // the frame I hope the stager picks — the key is not stable across runs
  // (copy-voice.md §8). Aliases collapse before the lookup, so only the
  // canonical key of each group is written here and the second row of a group
  // would be unreachable anyway: great_room/office/other → living,
  // outdoor/outdoor_living → pool, bedroom → primary_bedroom.
  //
  // Nothing below names an object that a crop could cut, and nothing states a
  // time of day. Every interior candidate here is broad daylight and every
  // pool frame is hard midday sun, so 9223 N Star Trail's "morning coffee out
  // here" landing on a sunset is a live risk on this listing too.
  rooms: [
    // Answers for great_room AND office. Frame 8 is a living room with a desk,
    // a monitor and an office chair in one corner, so `office` is a real
    // possible return for it — and it would print THE OFFICE over this line.
    // The line has to read correctly either way, so it names no furniture.
    { room: "living", caption: "White walls, an open floor, and room to put the furniture where you actually want it." },
    // Sage-green cabinetry and tile floor are in all six kitchen frames. The
    // window over the sink is not — it sits on the right wall in one of them
    // and a crop could lose it — so it is not named.
    { room: "kitchen", caption: "Sage green cabinets, tile floors, and it runs the whole length of the room." },
    // REWRITTEN after looking at build R4. The original line was "A wood table
    // on tile, with the living room right there and nothing between them," and
    // the 4:5 crop of frame 13 contains no living room at all — it is table,
    // chairs, a sideboard, floral panels and a window. The open connection is
    // real in the house and absent from the slide, which is the Star Trail
    // failure in copy-voice.md §8: a caption contradicted by the frame without
    // naming a single object that is in it. Everything below is inside the
    // crop, and it holds for frame 17 as well, which is the same table from the
    // other side.
    { room: "dining", caption: "Solid wood table, high-backed chairs, and tile that keeps the room cool." },
    // Answers for `bedroom` too, so it must hold for any of the four. It states
    // a fact about the house rather than about the frame: every bedroom photo
    // has a window, and the two-suite layout is in the listing remarks.
    { room: "primary_bedroom", caption: "Four bedrooms, two of them suites with their own bath, and a window in every one." },
    // poolYN is true on this record and the pool is genuinely in-ground and
    // private, so ROOM_LABELS.pool stays THE POOL DECK and the claim is real —
    // unlike 46109 Roadrunner Lane and 9223 N Star Trail, where the same label
    // would have asserted a pool that did not exist.
    { room: "pool", caption: "In-ground pool, deck all the way around it, and privacy fence the whole way." },
    { room: "game_room", caption: "The den off the back: hobby room, gym, or whatever you need it to be." },
    { room: "exterior", caption: "Fully fenced double lot, room for the RV, and eucalyptus that have been here a while." },
  ],
  fallbackCaption: "Four bedrooms and a pool on a fenced double lot in 29 Palms.",
  textPosts: [
    {
      paragraphs: [
        "The lot is the part people underestimate out here.",
        "This is a fully fenced double lot on a corner, with room for an RV or a toy hauler, a detached two-car garage, and a storage shed already standing.",
      ],
      italicLast: "Space is the one thing you cannot add later.",
    },
    {
      paragraphs: [
        "Two owner suites, each with its own bathroom.",
        "That is what makes a house work for two couples, or for a family that has grown, or for someone staying longer than a weekend.",
      ],
      italicLast: "It changes who the house works for.",
    },
    {
      paragraphs: [
        "The view north runs unobstructed toward the Marine base.",
        "After dark that turns into city lights. Joshua Tree and the park entrance are about ten minutes down the road.",
      ],
      italicLast: "Sit out by the pool after dark and see what that looks like.",
    },
  ],
  // Two paragraphs, both under ~110 characters. buildCtaTransformation places
  // paragraph 2 at a fixed three-line offset and does not reflow, so a
  // four-line first paragraph gets overprinted (48423 Hepburn Drive).
  cta: {
    paragraphs: [
      "Photos flatten a lot. This one is bigger than it looks on a screen.",
      "Come stand on it. I will show you the fence line, the RV pad and the garage.",
    ],
    italicLast: "DM me and I will meet you out there.",
  },
  caption: `Four bedrooms, three baths and two owner suites on a fully fenced double lot in 29 Palms.

In-ground pool with privacy fencing and concrete deck all the way around. Detached two-car garage, storage shed, RV and toy hauler parking, central air and heat, natural gas, Nest, Ring and security cameras. A den or hobby room with the laundry in it. Mature eucalyptus on a corner lot.

Every bedroom has a view. The one to the north runs unobstructed toward the Marine base and turns into city lights after dark. Joshua Tree and the park entrance are about ten minutes down the road.

4 BD · 3 BA · 1,862 SQFT · $549,000

Listed by Peyson Robertson & The Obsidian Group · eXp Realty Of Southern California Inc

#29palms #twentyninepalms #joshuatree #highdesert #desertliving`,
};
