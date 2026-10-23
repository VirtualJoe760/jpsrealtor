// 48305 Pic Way, Indio — $620,000 (Ashley N Robertson · The Obsidian Group),
// Indian Palms Country Club.
//
// Chosen 2026-08-04 over 46109 Roadrunner Lane, which was the obvious pick on
// paper — $940k, 3,228 sqft, 69 photos, and the only other high-photo listing
// left in the team pool. Looking at the frames reversed it:
//
//   Roadrunner  16 of its 69 photos are drone shots the stager refuses outright,
//               its backyard is bare graded dirt, and the interiors are nine
//               near-identical frames of one beige room. Photo COUNT is not
//               photo depth; the auto-posting doc's `photosCount >= 12` filter
//               would have passed it.
//   Pic Way     furnished and actually styled, a pool AND a raised spa, a fire
//               pit, and the covered patio opens onto the fairway. 77 photos
//               with real variety between them.
//
// Indio is also the fourth different city in four posts — Yucca Valley,
// Palm Springs, Palm Desert, now Indio — so the feed does not read as one
// neighbourhood.
//
//   colour   7A2E14, a deep rust. Measured off the cover frame rather than
//            guessed: #51 is 49% dark hedge green (hue ~85), 16% sky and pool
//            blue (hue 158-211) and the rest desaturated tan stucco (hue 27-40,
//            saturation under 18%). Hue 0-20 at high saturation is the one
//            region nothing in the photograph occupies, and it is the direct
//            complement of the pool. Indigo (ridge-road), berry (vista-chino)
//            and muted brown (tesla-drive) are already in the feed; rust is
//            none of them.
//   cover    photo 51 — the pool full-length with the spa at the far end, hedge
//            on the right, clean sky above. The accent panel eats the left 44%
//            of the frame, so this was chosen against a rendered mask, not from
//            the thumbnail.
//
// The remarks say "Homes like this do not last." That is the listing agent's
// line and it stays there — copy-voice.md §7 bans it in our own copy.
//
// The short-term-rental angle is deliberately not a slide. The remarks pitch a
// "30-day short-term rental investment"; whether that conveys is a permitting
// and HOA question, and the CTA raises it as a question to ask rather than an
// answer to give. Same handling as tesla-drive.ts and the fourth bedroom.
export default {
  listingKey: "20260417021611604271000000",
  accentColor: "7A2E14",
  coverPhotoIndex: 51,
  hook: "SUNSET SIDE",
  coverBody:
    "Everything out back faces west — a private pool, an in-ground spa, a fire pit, and a covered patio looking over the fairway to the mountains. Furnished and single story, inside the gates at Indian Palms.",
  // Keyed by ROOM, never by position — a rejected take promotes a different
  // room into that slot and positional captions then mislabel it.
  //
  // The builder aliases great_room/office/other → living, bedroom →
  // primary_bedroom, and outdoor/outdoor_living → pool. Every caption below has
  // to be true of ANY frame that can land in its bucket, which is the trap
  // vista-chino.ts logged three times in one build. Two that bite here:
  //
  //   primary_bedroom  also catches the guest rooms and the BUNK ROOM (#42-43).
  //                    Nothing about a primary suite can go in that line.
  //   pool             also catches the covered patio and the fire-pit corner,
  //                    which are on the golf-course side of the lot and show no
  //                    water at all. So the golf course lives on the cover, in a
  //                    text slide and in the caption — never in a room caption
  //                    that a pool close-up could inherit.
  rooms: [
    { room: "living", caption: "White walls, high ceilings, and a fireplace at the far end of it." },
    // First build proved the bucket problem again on three of four slides. The
    // renders were all fine; the captions named things their own frame did not
    // contain, which is the one failure a numeric gate cannot catch:
    //
    //   kitchen  "double ovens ... and an island with stools pulled up to it"
    //            landed on the sink-and-dishwasher run. Two of the three named
    //            objects were absent.
    //   dining   "the doors to the patio are right behind you" landed on the
    //            round table by the FRONT door. Behind him was the entry.
    //   pool     "pool, spa, fire pit" landed on the covered patio looking at
    //            the fairway — no water anywhere in the frame.
    //
    // So these three now describe the LOT rather than the pixels. A line that
    // orients the viewer ("pool on one side, golf course on the other") reads
    // naturally under any frame from that bucket; a line that inventories
    // objects only reads correctly under the one frame it was written for.
    { room: "kitchen", caption: "Granite counters, and enough of them that two people can cook at once." },
    { room: "dining", caption: "The kind of table where dinner turns into the whole evening." },
    { room: "primary_bedroom", caption: "Four bedrooms, all on one level, and all of them furnished." },
    { room: "pool", caption: "Pool and spa on one side, golf course on the other." },
    { room: "exterior", caption: "Single story, tile roof, and a driveway with room to spare." },
  ],
  fallbackCaption: "A furnished single-story pool home inside the gates at Indian Palms.",
  textPosts: [
    {
      paragraphs: [
        "Everything out back faces west.",
        "Pool, spa, fire pit, covered patio, and past the rail the fairway and the mountains behind it. West is also where the sun goes down.",
      ],
      italicLast: "Eat dinner out there once and the house makes sense.",
    },
    {
      paragraphs: [
        "Indian Palms is gated, with security around the clock.",
        "That matters most when you are not here. A house that sits empty three months a year is a different set of worries than one you sleep in every night.",
      ],
      italicLast: "Ask what happens here while you are gone.",
    },
    {
      paragraphs: [
        "The Empire Polo grounds are a few minutes from this driveway.",
        "Two weekends in April that field is the busiest address in the desert. The rest of the year it is a quiet road with horses along it.",
      ],
      italicLast: "Ask what a place is like in the other fifty weeks. That is when you actually live there.",
    },
  ],
  // CTA paragraphs are hard-capped by the layout, not soft-wrapped: at 231
  // characters the second paragraph ran past its box on the first build and the
  // closing italic line printed ON TOP of its last line. copy-voice.md §8 says
  // under 220 per paragraph and it means it. tesla-drive.ts sits at 191 and
  // renders clean, so that is the working ceiling.
  cta: {
    paragraphs: [
      "A lot of people buying in a country club community are not buying somewhere they will live full time.",
      "That changes which questions matter — what the HOA covers, what the rental rules say, who watches the place in August. I'd rather sort that out first than tour the wrong houses with you.",
    ],
    italicLast: "DM me. Let's talk before you tour another house.",
  },
  caption: `Furnished single-story pool home inside the gates at Indian Palms Country Club.

Private pool and an in-ground spa, a fire pit, and a covered patio that looks over the fairway to the mountains — all of it facing west. Four bedrooms and three baths on one level, a fireplace in the living room, and an open kitchen with double ovens and an island. Built 2003 on an 8,712 sqft lot. Gated with 24-hour security; HOA runs $75 a month, with tennis courts and a fitness center. The Empire Polo grounds are minutes away.

4 BD · 3 BA · 2,166 SQFT · $620,000

Listed by Ashley N Robertson & The Obsidian Group · eXp Realty Of Southern California Inc

#indio #indianpalms #poolhome #coachellavalley #desertliving`,
};
