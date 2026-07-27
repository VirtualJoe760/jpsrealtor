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
| **Standing in open living space, mid-conversation** | genuinely open floor, furniture behind them | walkthrough, natural |

Vary the placement across a carousel. Four slides of the same stance reads as a
template. The batch should feel like one continuous walkthrough of a home.

---

## 3. Never place the actor here

- **Bathrooms or showers.** Ever. Regardless of how good the room looks.
- **Bedrooms**, unless it's a sitting area within the bedroom and they are
  clearly seated in a chair — never on or beside the bed.
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
