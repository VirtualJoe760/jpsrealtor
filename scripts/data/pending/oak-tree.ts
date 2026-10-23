// 28 Oak Tree, Rancho Mirage — $479,900 · Mission Hills East / Deane Homes
// (Kevin Klaess & Peyson Robertson · eXp Realty of California Inc)
//
// WHY THIS ONE. 40 team actives, 21 ever queued. Ten of the never-queued are
// sales with >=12 photos, and four of those ten are already on record as
// unusable — Calle San Antonio, Encanto and Barron vacant, Hombria set aside
// 2026-08-22 for heavy wide-lens distortion. That leaves six open names:
//
//   28 Oak Tree, Rancho Mirage, $479,900, 41 photos   → BUILT. Furnished in
//        every room, professionally lit, undistorted, and the widest spread of
//        distinct spaces in the remaining pool.
//   3470 Warren Vista, Yucca Valley, $399k, 64        → checked as a contact
//        sheet and passed over. New-build manufactured home on a raw dirt lot:
//        furnished, but sparsely, and a third of the interiors are bare white
//        rooms with nothing in them. Ten of the 64 frames are lot-boundary
//        aerials with red survey lines drawn on. A vacant-adjacent set is what
//        auto-posting.md §"Re-measured 2026-08-15" says gives the stager
//        nothing telic to work with. Still the next fallback.
//   5803 Los Santos Dr #19, Palm Springs, $415k, 56   → unchecked
//   1321 Sea Life Ave, Thermal, $315k, 48             → unchecked
//   7526 Apache Trail, Yucca Valley, $295k, 31        → unchecked
//   2502 Harbor Drive, Thermal, $230k, 17             → unchecked
//
// Only 53806 Ridge Road has ever reached status "posted", so nothing here
// risks a repeat.
//
// Visually unlike the last several queued: a 1987 golf-course condo — grey
// walls, brown leather, a reclaimed-wood plank wall, tile floors and a green
// fairway — against a Terra Lago pool house with emerald cabinets, a Bermuda
// Dunes contemporary, a Lancaster tract home and a Palm Springs tower unit.
//
// coverPhotoIndex 29, measured rather than guessed. Rendered the real
// simple-luxury transformation over 39, 29, 3, 30 and 2 first — free, because
// the cover is a pure Cloudinary transform, and `gravity: auto` re-crops the
// frame so copy-voice.md §8's right-half rule cannot be applied to the
// original by eye:
//   39  the patio table with the fairway behind it, and the obvious pick by
//       subject. gravity:auto pulled to the foreground and what survives the
//       panel is a green mesh lounger and a slab of concrete. The golf course
//       is gone. §8 in its purest form.
//   3   the front walkway. Clean, but it is the garage side of the building
//       and the fairway — the entire pitch — is behind the camera.
//   30  lawn and two trees. Nothing to look at and no house in it.
//   2   the community pool from 200 ft. Handsome, and it is not this property;
//       a cover the buyer does not own is the wrong first slide.
//   29  keeps the covered patio, the tile roof, the lawn running out to the
//       course and open sky in the surviving half, and it is the only frame
//       where the house and the setting are both in the same picture.
//
// hook OWN THE LAND rather than FAIRWAY SIDE. Both rendered; both set on two
// lines at 96pt and clear the panel. FAIRWAY SIDE restates what the photograph
// already shows. OWN THE LAND is the thing the picture cannot say — Mission
// Hills sits in a valley where land leases are ordinary, this one is fee land
// (`landLeaseYN: false`), and the listing agent's remarks lead and close on it.
// Same call Azzura Way made picking TURNKEY over POOL AND SPA.
//
// accentColor 5C2340, chosen against the cover rather than sampled from it.
// Every saturated colour in this listing's interiors is a warm brown — leather
// and the reclaimed-wood wall — and 53806 Ridge Road is on record for what a
// warm accent does over a warm tile roof: it blends instead of setting the
// photo off. Rendered plum against indigo 2B2D5C (Ridge Road's own, and it
// sinks into the sky along the top of the panel), forest 1E3A34 (sinks into
// the lawn across the bottom) and slate 243B53 (sinks into both). The panel is
// semi-transparent, so an accent that shares a family with any large area of
// the photo simply disappears; plum shares one with nothing here.
//
// Exclusions passed on the build. Aimed at the SELECTOR'S ranked 14, not at
// the 41 photos — auto-posting.md §"Re-measured 2026-08-26" — and dumped with
// scripts/tmp-selector-dump.ts first, for under a cent. The ranked 14 was
// 6, 15, 1, 11, 3, 7, 8, 9, 10, 38, 13, 14, 16, 17. Seven struck, eight kept,
// so the stager is handed eight candidates for four slots across five distinct
// room kinds. Read as categories:
//
//   13,14,16,17  every kitchen frame shot ACROSS the counter. The placements
//                came back "leaning on the breakfast bar", "standing behind
//                the breakfast bar" and "at the counter near the sink" — in
//                all four the opaque near face of a waist-height run of
//                cabinets crosses the bottom of the frame, which is
//                actor-generation.md §9's first tell and the exact frame that
//                put him through the island at 1950 S Palm Canyon #128. 15 is
//                the one kitchen frame with open tile floor between the lens
//                and the standing spot, so it is the one that stays.
//   7            the living room shot over the back of a sofa, with a cushion
//                and a dark coffee table filling the lower third, and a
//                placement of "seated on the right brown leather sofa" whose
//                seat is not visible from the camera. §9's standing tell and
//                its seated tell fire on the same frame — this is the Azzura
//                Way great room, where contact support read 100% over a man
//                sitting on nothing.
//   38           a console table with two lamps running across the near edge,
//                and redundant with 8, 9 and 10 anyway.
//   6            not a depth problem. It is the entry hall: a blank half-wall,
//                a cabinet, and the sofa clipped off the left edge. Nothing
//                worth a slide.
//
// NOT excluded, and deliberately: 8, 9 and 10, whose sectional runs along the
// bottom-LEFT while the described standing spot is the open rug and tile in
// the centre of the frame. Azzura Way's build W3 excluded that whole family
// and shipped a one-room carousel; the category is an opaque near face across
// the standing spot, not any furniture in the picture.
//
// WHAT ACTUALLY HAPPENED, both builds. Recorded here because the exclusion list
// above is the input and the yield is the only thing that judges it.
//
//   T9 (--exclude 6,7,13,14,16,17,38) staged nine and returned two: #10 living,
//      good, and #18 kitchen — a frame the dump had never ranked, shot across
//      the counter like all seven of this listing's kitchen frames, and the
//      composite put him over the cabinet run with his feet on the doors.
//      Every gate passed. Photo 11 came back `living` this run and was dropped
//      as a duplicate room. Dropped the kitchen slide, leaving one room slide.
//   Z4 (--exclude 1,4,6,7,13,14,15,16,17,18,19,29,38) staged five and returned
//      three: #11 dining, #3 the front walkway, #9 the great room, all usable.
//      #10 and #8 — including the frame T9 had already staged successfully —
//      failed every take. Kept Z4, deleted T9 and both its Cloudinary assets.
//
// The rebuild was worth taking because T9 had one good render left after the
// drop, not four. auto-posting.md §"Re-measured 2026-08-23" is about the other
// case; weigh what you are re-gambling.
//
// AND THE `exterior` ROW BELOW IS UNREACHABLE FROM THE STAGER. #3 is the entry
// walkway and the garage door; the stager called it `outdoor`, which normalises
// to `pool` and took the patio caption — a golf course promised over a
// driveway. The selector says `exterior`, the stager does not have the key.
// Fixed on Z4 with a caption-only reband, `dining,exterior,great_room`.
//
// ONE THING TO WATCH ON THE BUILD LOG. `poolYN` is true on this record and the
// property has no pool — `poolFeatures: "Association"` is the Mission Hills
// community pool a quarter mile away. build-pending-post.ts now tests for a
// shared-facility-only pool before it will use the label THE POOL DECK, which
// is the guard 46109 Roadrunner Lane and 9223 N Star Trail wrote and this
// listing found the hole in. If an outdoor frame still lands under a pool
// label, reband it as `outdoor`, not `pool` — reband-pending-post.ts carries
// no poolYN guard at all and maps `pool` straight to THE POOL DECK.
export default {
  listingKey: "20260413015035446628000000",
  accentColor: "5C2340",
  coverPhotoIndex: 29,
  hook: "OWN THE LAND",
  // No bed or bath count in here — the spec strip three lines above is built
  // from the feed and already says 2 BD | 2 BA (copy-voice.md §8).
  coverBody:
    "East-facing on the Mission Hills East golf course, inside the guard gate. Three private courses, 27 tennis courts and a fitness center — and the land under it is yours.",
  // Keyed by ROOM, never by position, and written to the SPACE rather than to
  // the frame I hope the stager picks — the key is not stable across runs
  // (copy-voice.md §8). Aliases collapse before the lookup, so only the
  // canonical key of each group appears: great_room/office/other → living,
  // outdoor and outdoor_living → pool, bedroom → primary_bedroom.
  //
  // No time of day anywhere below, and no ceiling. Sutherland Street shipped
  // two captions asserting a vaulted ceiling over frames whose ceilings are
  // flat; the ceilings here vary room to room and are not worth the risk.
  rooms: [
    // Answers for great_room, office and other, so it has to hold for any frame
    // of the open plan — and, per Acoma Trail, for a dining or kitchen frame
    // that comes back `living`. All three claims are house-wide rather than
    // crop contents: the remarks say tile flooring throughout, the walls are
    // the same grey in all thirty-odd interior frames, and the opened-up
    // kitchen is the listing's own description of the layout. Deliberately NOT
    // named: the reclaimed-wood plank wall and the brown leather sectional,
    // each of which is in some open-plan frames and not others.
    // Trimmed to 78 characters from 87. The banner gets two lines at 38pt and
    // 83633 Lapis Drive printed a third straight through THE KITCHEN at 103,
    // so the budget is ~90 and there is no reason to sit against it.
    { room: "living", caption: "Grey walls, tile floors, and the kitchen opened up into the living room." },
    // Cabinets, counters, range and the breakfast bar are in every kitchen
    // frame and survive the key moving. Deliberately NOT named: the stools —
    // 41481 Jamaica Sands shipped "stools pulled up to it" over a frame whose
    // stools were out of the crop — hence "a bar to sit at" rather than a count.
    { room: "kitchen", caption: "Glossy white cabinets, wood-edged counters, a gas range, and a bar to sit at." },
    // Written to the layout, which both dining frames plainly show: the table,
    // the kitchen counter beyond it, no wall between. Azzura Way's build W3 is
    // the warning against the opposite — a layout line insisting the kitchen is
    // in the same room, over a crop that reads as a closed dining room.
    { room: "dining", caption: "The table, the kitchen counter behind it, and no wall in between the two." },
    // Answers for `bedroom` too, so it has to survive the primary and the
    // secondary. Both claims are off the record: two bedrooms, tile throughout.
    { room: "primary_bedroom", caption: "Two bedrooms, and the same tile runs right through both of them." },
    // Answers for outdoor and outdoor_living. Patio, lawn and the course are in
    // every back-of-house frame. If a FRONT elevation comes back `outdoor`
    // instead of `exterior` this line is wrong about the course — check the
    // build log's PASS lines and reband if so.
    { room: "pool", caption: "Patio, lawn, and the golf course starts where the grass ends." },
    { room: "exterior", caption: "Rock and cactus out front, a two-car garage, and the HOA handles the upkeep." },
  ],
  fallbackCaption: "On the Mission Hills East golf course, inside the guard gate.",
  textPosts: [
    {
      paragraphs: [
        "The first thing I check on any desert condo is the land under it.",
        "Land leases are common out here, and they come with a monthly payment and a date they end. This one is not leased — you own the ground it sits on.",
      ],
      italicLast: "I will pull the title and show you.",
    },
    {
      paragraphs: [
        "Mission Hills is guard-gated, and the dues here are $900 a month.",
        "Inside the gate: three private golf courses, 27 tennis courts, croquet and a fitness center. Golf, tennis and social memberships are separate, and you pick the one you want.",
      ],
      italicLast: "Ask me what the $900 covers and I will get it in writing.",
    },
    {
      paragraphs: [
        "One level, an attached two-car garage, and tile through every room.",
        "Both bathrooms have been remodeled and there are shutters on the windows. Close it up in May, come back in October, and nothing outside is yours to mow.",
      ],
      italicLast: "Coffee on the patio while the course is still quiet.",
    },
  ],
  // Two paragraphs, both under ~110 characters. buildCtaTransformation places
  // paragraph 2 at a fixed three-line offset and does not reflow, so a
  // four-line first paragraph gets overprinted (48423 Hepburn Drive).
  cta: {
    paragraphs: [
      "I would rather show you this one in person than send you another link.",
      "I will pull the title, the HOA documents and the club fees before you write anything.",
    ],
    italicLast: "DM me and we will pick a time.",
  },
  caption: `Two bedrooms on the Mission Hills East golf course in Rancho Mirage — and you own the land under it.

Inside: tile through every room, a kitchen opened up into the living room with a bar to sit at, both bathrooms remodeled, shutters on the windows, an attached two-car garage. One level, east-facing, with the course out the back.

Outside the door: a guard gate, three private golf courses, 27 tennis courts, croquet and a fitness center. Golf, tennis and social memberships are available separately. HOA $900 a month.

2 BD · 2 BA · 1,332 SQFT · $479,900

Listed by Kevin Klaess & Peyson Robertson · eXp Realty of California Inc

#ranchomirage #missionhills #coachellavalley #golfcourseliving #lockandleave #desertrealestate`,
};
