---
title: Copy and voice — writing the text slides and captions
status: current
last_verified: 2026-08-25
owner: content
related: [./README.md, ./actor-generation.md, ./auto-posting.md]
---

# Copy and voice

**Read this before writing any hook, caption, room caption, text slide or CTA.**

`actor-generation.md` governs the images. This governs the words. Both are
required reading before generating a post — the copy is where a carousel most
often fails review, and unlike a bad image it cannot be fixed by retrying.

Every rule below comes from a specific line that was written, shown to the
agent, and rejected. The rejected version is kept alongside so the failure is
recognisable rather than abstract.

---

## 1. Never compare the property to another market

**This is the rule that gets broken most and matters most.**

Write about **this property and its own location**. Do not position it against a
different city, a different market, or a more famous neighbour.

| Rejected | Why |
|---|---|
| "Yucca Valley is not Palm Springs, and that is exactly the point." | Palm Springs has nothing to do with this property. Raising it invites a comparison nobody asked for and drags attention somewhere else. |
| "Different market, different math." | Same problem, and opaque on top of it. |
| "That land does not exist down-valley at this number." | Still a comparison, just implicit. |

The Joshua Tree mention in that same post was **good** — it is a real feature of
this location, minutes away, and a reason to want the house. The failure was
following it with another Palm Springs comparison.

> **Test:** if a sentence names a place the buyer is not buying in, delete it.

## 2. No clever constructions that hide the point

If a reader has to work out what you meant, the line has failed. Instagram is
read at speed.

- "Different market, different math." — rejected: too hard to discern the
  intention.
- Symmetry, antithesis and reversals read as writing rather than talking.

Say the plain thing. "Two and a half acres, and the nearest neighbour is not
close" beats any epigram about land value.

## 3. Never disparage — not the property, not the work, not another agent

| Rejected | Use instead |
|---|---|
| "This one isn't a flip." | **"Move-in ready."** |
| anything implying previous owners cut corners | describe what IS there |

"This isn't a flip" defines the home by what it is not, and implies a category of
lesser homes — some of which are other agents' listings. It also makes the reader
think about flips.

The platform rule against characterising other agents' listings applies to
comparisons drawn by implication, not just by name.

## 4. Don't state the obvious as though it were a selling point

| Rejected | Why |
|---|---|
| "Somebody actually lived here before they listed it." | True of nearly every house. It reads as a strange thing to point out. |

If a line would be equally true of the house next door, it is not a selling
point.

## 5. Sell the experience of being there

The strongest lines put the reader **in** the property doing something.

> **"Imagine the stars out here at night."**

That is the register to aim for on a 2.5-acre high-desert property: specific to
this place, sensory, and it makes someone want to stand there. Compare it with
"somebody actually lived here" — same slide, same house, completely different
effect.

Reach for what the buyer would actually *do*: morning coffee where, dinner
where, who is over, what they can hear.

## 6. Concrete beats adjectival

Name the thing. "New PebbleTec pool deck, paid-off solar, a steam shower, and a
Tesla charger already in the garage" carries more than any sentence containing
"luxurious" or "stunning".

Numbers, materials and brands are load-bearing. Adjectives are not.

## 7. Voice

First person, direct, unhurried. The agent is talking, not advertising.

- Contractions are fine. Exclamation marks are rare and earned.
- No emoji in slide copy. The caption may carry a small number.
- Short sentences. A fragment is fine when it lands.
- Never write "Don't miss this opportunity", "priced to sell", or "won't last".

## 8. Slide-by-slide

| Slide | Job | Length |
|---|---|---|
| Cover hook | 2-3 words, the feeling of the place | fits the panel |
| Cover body | one or two sentences naming what is distinctive | under 260 chars |
| Room captions | one line, a concrete detail of that room | one line |
| Text slides | the agent's own perspective — what a buyer should notice, what a question really means | under 220 chars per paragraph |
| CTA | why work with them, then the ask | exactly 2 paragraphs |

The text slides carry the post. **The photos sell the house; the text sells the
agent.** A text slide that only restates listing facts is wasted — the cover
already did that.

**The CTA slide does not reflow, and the text slides do.** `buildTextPostTransformation`
flows its paragraphs; `buildCtaTransformation` places paragraph 2 at a fixed
three-line offset from paragraph 1, so a CTA paragraph that wraps to four lines
gets overprinted by the next one. 48423 Hepburn Drive built with "…worth getting
right first." and "I would rather walk you…" stamped through each other. Keep
**CTA paragraphs under ~110 characters** — roughly 50 per line, three lines. The
220-character budget in the table above is the text-slide budget, not the CTA's.

**A room caption gets two lines — about 90 characters.** `buildBannerTransform`
anchors the caption at `gravity: south, y: 80` and lets it grow *upward*, while
the room label sits fixed at `y: 250` with its rule at `y: 230`. At 38pt across
900px two lines stop short of the rule and three do not: 83633 Lapis Drive
re-banded with a 103-character kitchen line and printed its third line straight
through THE KITCHEN. Same failure mode as the CTA above — a positional template
and copy that outgrew it.

**The room key is not stable across runs, so write the caption to the space,
not to the room name.** The stager re-reads every photo on every build and can
return a different key for the same frame. 7798 Acoma Trail built twice from
one exclusion list: photo #15 came back `kitchen` from the selector and
`great_room` from the stager, and photo #14 was `dining` on the first build and
collapsed into `living` on the second. Both the label and the caption are
looked up by that key, so the entire slide moves with it.

This is a stronger constraint than the alias-group rule. It is not enough for a
line to hold across the keys that collapse together — it has to hold for
whichever frame the run actually hands you. Acoma's living line survived a
dining-table frame landing under it only because it named the sectional, the
white walls and the tile, all of which were in shot; a line naming the TV or
the record player would have shipped a false slide. Name what the whole
connected space contains, and let the label be the only thing that moves.

**Judge a cover frame by its right half.** The cover panel covers the left ~45%
of the photo, so a hero shot that composes its subject on the left survives as
whatever happened to be on the right. The same listing's first build put the hook
FAIRWAY VIEWS over a barbecue and an air-conditioning condenser, because the
fairway, the palms and the patio table were all in the half the panel hid.

**The cover panel is 480px wide and only the hook was ever measured against
it.** The hook carries `width` + `crop: "fit"` from `fitHeadline()`; the city
subtitle underneath it carried neither, so at 28pt with 8px letter-spacing it
simply ran until it ran out of word. 16430 Evans Lane queued its cover with the
final S of DESERT HOT SPRINGS cut down the middle by the panel edge — one
stroke on the accent colour, one on open sky. Third instance of the same
family as the CTA overprint and the three-line room caption above: a fixed
template and a string that outgrew it.

Unlike a hook, **the city is not yours to shorten** — it comes off the listing.
So the fix is in `simple-luxury.ts`, not in the config: the subtitle now carries
the hook's own 390px cap and wraps to a second line at y:274, which still clears
the price at y:360. A cover queued before that fix keeps the old URL until it is
re-rendered — `scripts/recover-pending-post.ts <slug> <postId>` rebuilds slide 1
alone, no staging and no Gemini, the same way `reband-pending-post.ts` rebuilds
the room bands.

**Never put a bed or bath count in the cover body.** The spec strip sits three
lines above it and is built from the feed — `bedroomsTotal` and
`bathroomsTotalInteger` — and `bathroomsTotalInteger` rounds. 41481 Jamaica
Sands is a two-and-a-half-bath house by its own listing remarks and a "3 BA"
house by the field, so a body reading "two and a half baths" printed directly
under a strip reading "3 BA" and the slide argued with itself. The strip is not
yours to overwrite: it comes off the record, and the half bath is the listing
agent's statement, not a number to round away. So the cover names neither, the
caption carries the remarks' figure, and the two never sit close enough to
collide. Same family as the CTA overprint and the three-line room caption — a
fixed template and copy that did not check what was already on the slide.

## 9. Compliance

- Listing credit ("Listed by X · Office") appears on the cover and in the
  caption whenever the listing is not the agent's own.
- The CTA slide carries the agent's name and DRE number.
- Never state or imply a valuation, a prediction, or investment advice.
- Market figures must come from real closed-sale data and be described as what
  they are. See `carousel-slides.md` on keeping the CMA pitch factual.
