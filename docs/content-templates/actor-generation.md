---
title: Actor Generation — placing the agent inside listing photos
status: current
last_verified: 2026-07-26
owner: content
related: [./README.md, ./carousel-slides.md, ./cover-slide.md]
---

# Actor generation

**Read this before every Gemini call that puts a person into a listing photo.**

The "actor" is the agent — Joseph on jpsrealtor, or whichever agent owns the
listing. The goal is a photo that looks like the agent was actually in the room
when the photographer was there: relaxed, doing something a person would
plausibly do, at the right size, lit by the room's own light.

The goal is NOT a headshot pasted onto a wall.

---

## 1. The affordance rule (the one that matters most)

> **Pick the pose from what is in the photo. Never pick the photo to fit a pose.**

A photo can only host the actor if it contains somewhere a person would
naturally *be*: a chair, a sofa, a counter with standing room, a kitchen
island, a lounger by the pool, an open floor with a clear foreground.

If the frame offers no such place, **do not stage that photo.** Choose a
different one. There is always another photo; there is not always another way
to make a person standing in a corridor look intentional.

This is the rule that was missing when a staircase photo got staged and the
result was the agent at the foot of the stairs, arm extended, presenting a
closed door. Nothing in that frame gave him anything to do.

---

## 2. Approved placements

Each requires its prerequisite to be visibly in the frame.

| Placement | Photo must contain | Reads as |
|---|---|---|
| **Seated in an accent chair** | a visible armchair/accent chair with clear space | relaxed, confident, at home |
| **Lounging on the sofa** | a sofa shot from the front or three-quarter | lifestyle, aspirational |
| **Standing at the kitchen island / counter** | an island or counter with standing room on the camera side | "let me show you this kitchen" |
| **Leaning on a counter or railing** | counter, bar, or balcony rail at waist height | casual, unposed |
| **Poolside — seated on a lounger or standing at the deck edge** | pool deck with loungers or open decking | leisure, the desert-lifestyle shot |
| **Seated at the dining table** | dining table with pulled-out chair or open seat | entertaining |
| **Seated on the edge of the bed** | a made bed, shot wide enough to sit on its edge, feet on the floor | at-home, editorial |
| **Standing in open living space, mid-conversation** | genuinely open floor, furniture behind them | walkthrough, natural |

Vary the placement across a carousel. Four slides of the same stance reads as a
template. The batch should feel like one continuous walkthrough of a home.

---

## 2b. A gesture needs a subject

**If the actor is presenting, there must be something in frame worth presenting
to.** This is separate from whether the composite is technically good, and it
is the failure that is easiest to miss.

A generated entry-hall shot passed every physical check — correct scale, both
feet on the tile, lighting matched, natural posture — and was still unusable,
because he was gesturing at a *closed front door*. It looked like a real
photograph of a meaningless moment. Reviewed on technique alone it reads as the
best image in the batch; reviewed on meaning it is the worst.

So, before accepting a frame:

- **Name the subject of the gesture out loud.** "Presenting the kitchen
  island." "Showing the fairway through the glass." If the honest answer is
  "a wall", "a door", or "nothing", the frame fails.
- **The subject must be the thing the slide is selling** — a view, an island, a
  fireplace, the pool. Not circulation space.
- **No empty corners.** A person standing in a space whose only features are
  walls, doors and floor has nothing to do, and the image says nothing about
  the home.
- If the room is genuinely worth showing but offers no subject to gesture at,
  use a **non-presenting** placement — seated, leaning, mid-stride — rather
  than forcing an outstretched arm.

**Entries, foyers and landings usually fail this test.** They are circulation,
not living space; there is rarely anything in them to show. Prefer rooms that
contain the feature being sold.

## 3. Never place the actor here

- **Bathrooms or showers.** Ever. Regardless of how good the room looks.
- **Bedrooms, lying down.** Seated is fine — a chair, or the EDGE of a made
  bed with feet on the floor (owner-corrected 2026-07-27: an earlier version
  of this doc banned beds outright; that was the assistant's inference, not
  the owner's rule, and it produced a deformed-in-a-chair render where
  sitting on the bed was the natural shot).
- **Corners, narrow hallways, or against a blank wall.** Nowhere to be.
- **Staircases** — the base, the landing, or mid-flight. There's no natural
  reason to stand there and the geometry fights the figure.
- **Doorways gesturing at a closed door.** Presenting nothing.
- **Aerials, drone shots, or distant exteriors.** No floor plane and no
  human-scale reference; the model will invent a scale and get it wrong. This
  is where "giant agent floating over a hillside" comes from.
- **Detail and close-up shots** (fixtures, tile, hardware). No room to stand.
- **Any frame where they'd occlude the feature the slide is selling.**

---

## 3b. Use the depth of the room

**Put the actor in the middle ground, not flat against the foreground.**

Listing photos are shot wide precisely to show depth — a room receding toward a
window, a counter running away from the lens. Standing the actor at the front
plane throws that away and reads as a cutout laid on top, even when the scale is
right.

- Place them **into** the room: partway back, with floor visible in front of them
  and space behind.
- They should be standing **on** the surface that defines the space — on the rug,
  on the pool deck — not beside it or at its edge.
- Let real geometry pass in front of them where it naturally would. Occlusion is
  the strongest single cue that a person is actually in a space.

**The strongest single pose: torso angled toward the feature, head turned back to
camera.** Standing at an island with the body square to the counter and the face
to the lens reads as someone caught mid-tour. Body and face both square to the
camera reads as a portrait pasted into a room.

## 3c. Vary posture AND expression across a batch

Two slides with the same stance make the whole carousel look templated, which is
exactly what it is trying not to look like.

Within one post, no two slides may share:

- **the same body posture** — if slide 2 is standing with hands relaxed, slide 3
  is seated, leaning, or mid-stride
- **the same facial expression** — vary between a warm smile, a relaxed neutral,
  and a slight laugh
- **the same camera relationship** — some looking at the lens, some looking into
  the room

Alternate **seated and standing** through the sequence. A carousel where the
agent sits, then stands at a counter, then leans on a rail reads as a walkthrough.
Four standing shots read as a template with the background swapped.

## 3d. Reject generation artifacts

Image models sometimes return a frame with a **blank band** — a strip of flat
white or grey along an edge where it failed to fill the canvas. It is obvious
once seen and easy to miss when scanning a small thumbnail.

Any image with a blank or flat-colour band at any edge is **rejected outright**,
no retake judgement needed. Check the bottom edge specifically; that is where it
has appeared.

Also reject: duplicated limbs, a second partial person, hands with wrong finger
counts, and text or watermarks the model invented.

## 3e. Wardrobe follows the scene — within business bounds

Two modes only, chosen by the room being staged. Nothing more casual than
business casual, ever — no shorts, no t-shirts, whatever the scene:

| Scene | Wardrobe |
|---|---|
| Living, dining, primary, office, exteriors | **Business professional** — dark grey suit over a light blue collared shirt, no tie (the headshot look) |
| Kitchen, game room, pool, outdoor living | **Business casual** — collared shirt, sleeves rolled once, dark chinos, leather loafers |

## 3f. Candid, not catalog

Reviewer's words: the poses looked robotic. Every figure generation now carries
the candid clause — weight clearly on one hip, shoulders relaxed and uneven,
caught mid-moment (mid-step, mid-turn, a breath into a laugh), never
symmetrical, never squared to the camera, arms never mirroring each other. A
pose that would pass in a clothing catalog fails here.

## 3g. Scale comes from depth, not from a box

Feet position in frame encodes distance: feet lower means closer means taller
in frame. Figure height maps monotonically from the FEET LINE (~0.38 of frame
height when feet sit at 62%, up to ~0.62 at the bottom edge). The vision
model's box height both over-shot (a ten-foot agent) and under-shot ("a little
short" in review); the feet anchor is the part it gets right, so that is the
only part trusted.

## 4. Physical realism — non-negotiable

Each of these counters an observed failure. Do not soften them.

- **Full body, head to feet.** Both feet visibly contacting the floor. Never
  crop at the waist or thigh — a cropped figure has nothing anchoring its size
  and will float.
- **Realistic human scale**, roughly 5'10". Check the figure against real
  references in frame: door openings, counter height, chair backs, ceiling.
  They must read as someone who could walk through that doorway.
- **Middle ground, not foreground overlay.** Roughly a quarter to a third of
  frame height, standing *in* the space, correctly occluded by furniture in
  front of them.
- **Lighting matched to the room** — direction, colour temperature, softness,
  contrast. A dusk or lamplit room does not light a person like studio flash.
  Cast a believable contact shadow on the floor.
- **Perspective matched.** Eye level must agree with the photo's horizon.
- **Generate, don't composite.** Say so explicitly in the prompt. Given a loose
  instruction the model pastes the source cutout, which carries the studio pose
  and studio light into every single output.

---

## 5. Identity and wardrobe

- Match facial features **exactly** as in the source headshot: hair colour and
  texture, face shape, jawline, skin tone, eye colour.
- **Do not idealize, smooth, slim, or otherwise alter their appearance.** This
  is a real person's likeness on their own marketing.
- Wardrobe: professional dark grey suit jacket over a light blue collared
  shirt, no tie — unless the agent's brand says otherwise.
- Expression: warm and natural. Vary it across a batch — not the same smile
  five times.

---

## 6. Tone

"Realistic, in a fun, AI-driven way." The image should be *believable* first —
correct scale, correct light, natural posture — and only then stylish. A subtle
warm grade and slight contrast lift is the house look. Anything that reads as
obviously fake undermines the listing it is selling.

---

## 7. Disclosure

Meta's container endpoint accepts **`is_ai_generated`**. These composites are
AI-generated images of a real person in a real property; set it. It costs
nothing and it is the honest call on marketing that depicts an agent somewhere
they may not have physically stood.

---

## 8. Where this is enforced

| Path | File |
|---|---|
| Hosted / MCP | `src/app/api/skill/images/agent-staged-listing/route.ts` — `BASE_PROMPT` + `POSE_VARIATIONS` |
| Local scripts | `scripts/carousel-build.js` — `STAGE_PROMPT(c)`, fed per-room `pose` + `expression` from `scripts/data/carousels/<slug>.js` |

The local script path takes explicit per-room direction and is the stronger of
the two — it always had identity preservation and per-room posing. When the two
disagree, the script is right.

**Photo selection is part of this contract, not a separate step.** Review the
photo set first (a contact sheet works well), pick the frames that satisfy the
affordance rule, and assign each one a placement from §2 before generating
anything.
