// 1321 Sea Life Avenue, Thermal — $315,000 (Jack A Rook & The Obsidian Group)
//
// The last never-queued furnished-enough sale in the pool on 2026-08-31. The
// other three (Encanto, Barron, Harbor) were pulled as contact sheets and are
// vacant or, in Harbor's case, a gut rehab down to the studs.
//
// WHAT THIS LISTING IS, AND WHAT THE COPY HAD TO WORK AROUND:
//
//   Photos 0, 2 and 4 carry an "AI Enhanced" badge burned into the BOTTOM-RIGHT
//   corner — not the top-left corner tmp-watermark-strip.py reads. They are the
//   only three frames in the set that look furnished, and the furniture in them
//   is not in the house. The selector ranked them 5th, 6th and offered #0 as a
//   `living` candidate. Excluded; see actor-generation.md §10, which is the same
//   failure 4140 E Calle San Antonio found through a different corner.
//
//   Everything else interior is EMPTY except the dining set (10, 11) and the
//   primary bed (18-20, which the selector never offers). So the `living`
//   caption has to hold over a bare room, and it does that by asserting only the
//   floor and the square footage — nothing the crop can contradict, no furniture
//   to be absent, no time of day. copy-voice.md §8 (Hombria / Star Trail).
//
//   Photo 13 was dropped because the selector's own placement for it reads
//   "standing BEHIND the kitchen island" — the §9 depth-ordering tell, written
//   out in advance for free. 12 and 16 both put open floor in the near field.
//
//   poolYN is false and there is no outdoor frame in the shortlist, so the
//   `pool` row below is written to the LOT and never to water.
export default {
  listingKey: "20260823203206317375000000",
  // Teal reads as the Salton Sea and sits outside the sand/sky family the frame
  // is otherwise made of — the Ridge Road problem in reverse.
  accentColor: "17494F",
  // 43 is the only exterior whose surviving RIGHT half is the house, the palms
  // and the horizon rather than bare dirt. Checked as a rendered cover, not by
  // eye on the original (copy-voice.md §8).
  coverPhotoIndex: 43,
  hook: "WIDE OPEN",
  coverBody:
    "Two-thirds of a fenced acre out by the Salton Sea, and 2,432 square feet of it under roof. New flooring end to end, room for the RV, and a permanent foundation, so FHA and VA both work here.",
  rooms: [
    // `great_room` collapses into `living`, so this line answers for both — and
    // for whatever the stager decides an empty room is on the day.
    // REBANDED after looking at the build. The draft line asserted only the
    // floor and the square footage, deliberately, because any of seven bare
    // rooms could have landed here. The stager picked #1 — the horse mural —
    // so the caption can now name what is actually in the frame. If this config
    // is ever rebuilt the mural is a coin flip again; revert to the draft first.
    { room: "living", caption: "The horses stay. New floors underfoot, and the rest of the room is yours." },
    { room: "kitchen", caption: "Island in the middle, window over the sink, and a pass-through to everybody else." },
    // REBANDED. The draft said "with the kitchen a few steps behind it" and the
    // frame the stager chose faces the opposite way — curtained window and a
    // mini split, no kitchen anywhere in it. Same failure as Via San Michael's
    // pool-through-the-slider. Both claims below are visible in the shot.
    { room: "dining", caption: "A table this long, and still room to walk all the way round it." },
    // `bedroom` collapses into `primary_bedroom`. True of the furnished primary
    // and of the three empty ones.
    { room: "primary_bedroom", caption: "One of four. New floors, a ceiling fan, and room for more than the bed." },
    // `outdoor` and `outdoor_living` collapse into `pool`. There is no pool.
    { room: "pool", caption: "Two-thirds of an acre, fenced all the way round, with room for the RV." },
  ],
  fallbackCaption: "Four bedrooms and 2,432 square feet, out by the Salton Sea.",
  textPosts: [
    {
      paragraphs: [
        "The first question I get on a manufactured home is always the same one. Can I actually get a loan on it.",
        "This one sits on a permanent foundation, so FHA and VA both work. That changes who can buy it, and it changes what you need in the bank.",
      ],
      italicLast: "Ask that question before you fall in love with the house.",
    },
    {
      // Paragraph 1 was 95 chars and wrapped to THREE lines, but the generator
      // had budgeted two and placed paragraph 2 at y_500 — so the two ran
      // together as one block with no gap, while slides 4 and 6 breathe. Not an
      // overprint like Hepburn's CTA, but the same family: a positional
      // template and a string a line longer than it was measured for. Keep text
      // paragraph 1 near 80 characters.
      paragraphs: [
        "Two-thirds of an acre, fenced on every side, with eleven places to park.",
        "Somewhere to put the RV, no HOA, and nobody to tell you where the trailer goes.",
      ],
      italicLast: "Room for everything you have been storing somewhere else.",
    },
    {
      paragraphs: [
        "People who love the Salton Sea tend to know it the first time they come out here.",
        "The light on the water in the evening, the birds coming through in the fall, and a quiet that carries.",
      ],
      italicLast: "Come out at sunset before you decide anything.",
    },
  ],
  // Both paragraphs under ~110 chars — buildCtaTransformation places paragraph 2
  // at a fixed three-line offset and a fourth line gets overprinted.
  cta: {
    paragraphs: [
      "Financing, foundations and land out here all have their own rules.",
      "I would rather walk you through them first than let a lender surprise you halfway in.",
    ],
    italicLast: "DM me. Let's talk before you tour another house.",
  },
  caption: `Four bedrooms and 2,432 square feet on two-thirds of a fenced acre, out by the Salton Sea.

New flooring end to end, AC plus mini splits, sewer connected and paid, eleven parking spaces with room for the RV, and no HOA. On a permanent foundation, so FHA and VA both work.

4 BD · 2 BA · 2,432 SQFT · $315,000

Listed by Jack A Rook & The Obsidian Group · eXp Realty Of Southern California Inc

#saltonsea #thermalca #californiadesert #desertliving #firsthome`,
};
