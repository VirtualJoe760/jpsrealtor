---
title: Actor Generation — placing the agent inside listing photos
status: current
last_verified: 2026-08-26
owner: content
related: [./README.md, ./carousel-slides.md, ./cover-slide.md, ./copy-voice.md]
---

# Actor generation

**Read this before every call that puts a person into a listing photo.**

The "actor" is the agent — Joseph on jpsrealtor, or whichever agent owns the
listing. The goal is a photograph that looks like the agent was there when the
photographer was: doing something a person would plausibly do, at the right
size, lit by the room's own light.

The goal is NOT a headshot pasted onto a wall, and it is NOT an estate agent
standing in the middle of a room with his arm out.

Implementation: `scripts/stage_geometric.py`, `scripts/floor_plane.py`.

---

## 0. The order of operations

This order matters and was learned the hard way. Cropping used to run first and
scored "feature pixels" blindly, which threw away a pool table and a bar and
left a slide captioned *the game room* showing a brick chimney.

| # | Step | Why it is here and not later |
|---|---|---|
| 1 | **READ** the full, uncropped original | A crop is a composition decision. It cannot be made before anything knows what the photo is OF or FOR. |
| 2 | **CROP** to serve the reading | Must keep the feature whole, the contact object whole, and standing room beside it. |
| 3 | **GEOMETRY** proves valid spots | Depth → floor plane → which spots are physically real. |
| 4 | **VISION** picks among them | Meaning is its job; metric estimation is not. |
| 5 | **RENDER**, then gate | Numeric accept/reject, retry on failure. |

**Never let the crop precede the reading.**

---

## 1. Two tiers: ACTION and REACTION

### Tier 1 — ACTION (preferred)

> **Do the thing the object is FOR. Do not present the room.**

Affordance research separates an object's **Gibsonian** affordances — what you
could physically do with it (stand near, touch) — from its **telic** affordance
— what it is *for*. A pool table is for playing pool.

Every pose in the old library was Gibsonian at best, which is exactly why the
agent kept pointing at things: **pointing is what you do when you have no idea
what an object is for.**

| Object | Telic action |
|---|---|
| Pool table | Leaning over it, cue in hand, lining up a shot |
| Fireplace / wood burner | Back to it, warming himself |
| Kitchen island | Hands working on the counter, or leaning on it talking |
| Bar | Pouring something, or perched on a stool |
| Window with a view | Looking **out** of it, away from camera |
| Dining table | Pulling out a chair, setting something down |

**This table is illustrative, never exhaustive, and must not be turned into a
lookup.** The vision model already holds telic knowledge for essentially every
household object — a piano, a wine fridge, a putting green — so it is *asked*,
not looked up. That is what makes this scale: no list to maintain, none to go
stale.

He may face away from the camera if the action calls for it.

### Tier 2 — REACTION (when nothing is worth using)

Some frames genuinely contain nothing to use: a handsome empty room, a view, a
volume of space. **Do not invent a reason to stand in the middle of it.**

Instead he comes to the **left or right edge**, close to the lens, **waist-up**,
running off the bottom of frame on purpose, and *reacts* while the room stays
the subject.

| Reaction | Use when |
|---|---|
| `wow` | The property genuinely earns astonishment. Reserve it — super-luxury only. |
| `thumbs_up` | Warm approval, lighter properties |
| `open_hand` | Open palm toward the space, inviting |
| `approving` | Arms folded, small satisfied nod |

Pick the side with **less to look at**, so he never covers the good part.

**Reaction is also the universal fallback.** A waist-up figure at the frame edge
needs no floor spot, no feet and no scale gate, so *"no valid candidate spots"*
and *"all action takes rejected"* both degrade into a reaction shot instead of
failing the slide.

---

## 2. Body modes — the only bounded list

The action is unbounded; **physics is not**. Only four postures change how tall
a person is on screen, and the scale gate has to know which one it is judging.
A man bent over a pool table is not a failed standing man.

| Mode | Height factor | Example |
|---|---|---|
| `standing` | 1.00 | at a window, mid-stride |
| `leaning` | 0.82 | over a pool table, propped on an island |
| `crouching` | 0.62 | at a hearth, a low cabinet |
| `seated` | 0.55 | bar stool, dining chair, sofa |

---

## 3. Never place the actor here

- **Bathrooms or showers.** Ever.
- **Bedrooms, lying down.** Seated is fine — a chair, or the EDGE of a made bed,
  feet on the floor. (Owner-corrected 2026-07-27: an earlier version of this doc
  banned beds outright; that was the assistant's inference, not the owner's rule,
  and it produced a deformed-in-a-chair render.)
- **Aerials, drone shots, distant exteriors.** No floor plane, no human-scale
  reference; the model invents a scale and gets it wrong.
- **Detail and close-up shots.** No room to stand.
- **Corridors and empty circulation space.** Nothing to do.
- **Anywhere he'd occlude the feature the slide is selling.**

The photo reader refuses these up front, so this is enforced rather than hoped
for.

**Front driveways and garage doors are the gap in that list.** The reader has no
front-exterior key, so a driveway comes back as `outdoor` — which the caption
layer normalises to `pool` and the banding layer labels OUTDOOR LIVING. 3010 N
Chuperosa Road built a slide of the agent presenting a closed garage door under
"New pool, big shade tree, and afternoons that don't need a plan." Nothing in
the render was wrong; the classification was. Until the reader can name a front
elevation, keep those photo indexes out of the candidate set with `--exclude`,
and never let a room caption assert an object the chosen frame might not
contain.

---

## 4. Scale, and the ruler problem

**Scale is derived from geometry, never from a prompt or a hand-tuned curve.**

Figure height = `focal × 1.78m × mode_factor ÷ depth_at_feet`.

Two calibration traps, both of which silently poisoned every frame until found:

- **Focal length belongs to the ORIGINAL frame, not the crop.** Cropping the
  sides off a 3:2 photo narrows the horizontal field of view. Assuming the
  original's FOV on the cropped image put `f` at 600px instead of 1125px and
  sized every person at 18% of frame height.
- **Metric depth models carry scale bias on wide-angle interiors** — well
  outside their training set. The fitted floor put the *camera* 1.78–2.27m above
  the floor across four frames of one house; listing photos are shot off a
  tripod at roughly **1.45m**. Depth was long by ~1.4×, which was precisely the
  factor by which renders were being rejected as "too big". **The model was
  obeying the guide box; the ruler was wrong.** Depth is now anchored to camera
  height, the one absolute length we genuinely know about this genre.

**The floor is the LOWEST strong horizontal plane, not the most populous.**
Maximising RANSAC inliers fitted the *countertop* in a galley kitchen (0.64m
below the camera — counter height for a 1.5m tripod). Counters, islands and
tables all sit above the floor and are therefore nearer the camera.

**A hearth is not a coffee table.** Standable is a range — up to 0.30m above the
floor plane — because "warming yourself at the wood burner" *requires* standing
on its raised hearth. A coffee table at 0.4m and a counter at 0.9m still fail.

---

## 5. Placement — geometry proposes, vision disposes

Neither system can do this alone, so neither is asked to:

- **Geometry proposes.** Emits several well-separated spots, every one already
  verified against the floor plane, frame fit, human scale, standing room and
  measured free space. It guarantees *physical validity*.
- **Vision disposes.** Picks among valid options for *meaning*, and returns the
  feature, what he faces, what he is doing, and why the others are worse.

Metric estimation is what vision models are bad at. Judging what makes a
marketing photograph is what geometry cannot see.

**Actions happen AT objects.** When the plan names something he is touching,
candidate spots must be within arm's reach of it, and the crop must keep that
object plus standing room beside it. Without this the geometry rewards wide-open
floor — which is by definition *away* from furniture — and produces a man in a
flawless shooting stance cueing at thin air.

**A stride needs somewhere to walk.** Clearance is measured in metres of open
floor along a ray. But clearance may only **veto** a pose, never select one:
selecting on clearance alone fired on all four rooms of a batch and produced
four near-identical mid-strides.

---

## 6. Posture and variety

- No two slides in a post may share a **body posture**, an **expression**, or a
  **camera relationship**. Alternate seated and standing through the sequence.
- Poses are **asymmetric**: uneven shoulders, the two arms doing different
  things, hips off-axis. Symmetry is what reads as robotic.
- Candid, not catalogue: caught mid-moment — mid-step, mid-turn, a breath into a
  laugh. A pose that would pass in a clothing catalogue fails here.

---

## 7. Wardrobe

**Business casual or business professional. Nothing more casual, ever** — no
shorts, no t-shirts, whatever the scene.

Colour is chosen from **measured backdrop pixels** — luminance, warm/cool
balance and colourfulness of what he actually stands against — not guessed from
the room's name:

| Backdrop | Wardrobe |
|---|---|
| Light room (luminance > 150) | Charcoal or deep navy — dark figure pops |
| Dark room (luminance < 95) | Light grey or soft tan |
| Warm room (wood, terracotta) | Cool cloth — navy, slate |
| Already colourful room | Plain and solid, no pattern competing |

Formality follows the room: sharp suit in great room / dining / living /
exteriors; business casual in kitchen / game room / pool.

---

## 8. Identity — measured, not hoped for

Match the source headshot **exactly** — hair colour and texture, face shape,
jawline, skin tone, eye colour. **Do not idealize, smooth, or slim.** This is a
real person's likeness on their own marketing.

**Two mechanisms, because the prompt alone was not remotely enough.**

### The face plate

The full headshot is mostly shoulders and background. When a render puts the
face large in frame, the model has little facial detail to copy and drifts to a
generic handsome face. Every render now also receives a **tight, upscaled crop
of the reference face**, and the prompt names the features that must match —
nose shape, eye set and spacing, eyebrows, jawline, chin, hairline, skin
texture.

Measured effect on a reaction render: ArcFace similarity **0.039 → 0.884**.

### The identity gate

Verified with ArcFace (`insightface`, buffalo_l) against the reference headshot,
on the RENDER, before anything is composited — so a stranger never reaches an
image we might publish.

> **This is not a theoretical risk.** A reaction render scored **cosine 0.039**
> — statistically a different man — while looking merely "slightly idealised" to
> the eye. It would have gone out with someone else's face on the agent's own
> marketing. Eyeballing does not catch this; only the number does.

**The threshold scales with face size**, because the score tracks how much face
there is to judge, not identity alone. A man bent over a pool table shows a
small, angled, downcast face; a fixed bar would false-reject him there and
false-accept a near-stranger in close-up.

| Face height (of frame) | Minimum cosine |
|---|---|
| > 14% — a portrait | 0.45 |
| 7–14% | 0.34 |
| < 7% — small or angled | 0.22 (gross substitution only) |

A failed take is retried, not published.

### Structure is not expression

The face plate initially anchored identity so hard it dragged the headshot's
*smile* with it — a `wow` reaction came back beaming, which is the wrong
photograph even though the face was finally right.

They are different things to copy, and the crop conflates them unless the
prompt says otherwise: **the face crop is for BONE STRUCTURE ONLY** — nose
shape and width, eye set and spacing, brow, jawline, chin, hairline, skin tone
and texture — and explicitly *not* for the expression, smile or head angle,
which come from the action or reaction direction instead. The reaction prompt
goes further and states that returning the headshot smile means the shot has
failed.

With that split stated, the same frame returned a genuine open-mouthed `wow`
at cosine **0.513** against the 0.34 bar for that face size. Identity anchored,
expression free.

---

## 9. Gates — what gets rejected automatically

Room preservation is **structural, not checked**: only pixels a segmentation
model calls "person" are taken from the render and pasted onto the untouched
original, and the shadow transfers as a **darken-only multiply**, which cannot
change a floor's material. Measured: 86–91% of frame bit-identical, and no pixel
outside the figure ever gets brighter.

| Gate | Rejects |
|---|---|
| Feet cropped | Figure running off the bottom edge (action tier only) |
| Feet on standable surface | On a coffee table, a counter, or floating |
| Contact support | Non-standing modes: occluded legs must abut real furniture |
| Scale ratio 0.70–1.32× | Giants and dolls, judged against the body mode |
| Largest component only | **Hallucinated extra people** — segmentation labels every person in frame, so a second invented figure would otherwise be composited into a client's listing photo |
| Room drift | Shadow transfer skipped if the frames no longer align |
| **Identity (ArcFace)** | **A face that is not his � threshold keyed to face size, see �8** |
| Reaction: edge / height / width / feature overlap | Figure that wandered off the edge, shrank to full body, or covered the feature |

**Occluded legs are not missing legs.** Leaning on an island puts the lower body
behind it, so the mask stops at the counter edge and a feet-on-floor test reads
0% on a perfectly good frame.

Also reject on sight: blank or flat-colour bands at any edge, duplicated limbs,
hands with wrong finger counts, and invented text or watermarks.

**The composite has no depth ordering, so nothing here can catch a figure
standing THROUGH the furniture.** Structural room preservation is the reason:
the person mask is pasted onto the untouched original, and that paste knows
only "person / not person" — never which of the two is nearer the lens. When
the chosen spot is *behind* something that fills the foreground, the figure is
laid over it and reads as standing inside it.

1950 S Palm Canyon Drive #128 produced it twice in one listing, on two
different objects, and every gate passed both times:

| Frame | Gates said | The slide showed |
|---|---|---|
| kitchen, across the peninsula | feet-on-floor 100%, scale 0.79×, face 0.353 | torso behind the cooktop, legs and shoes composited over the island's near face |
| bedroom, shot from the doorway | all gates passed | shoes planted on the mattress, the comforter filling the foreground |

Both spots were real floor and the geometry was right about that. The counter
and the bed simply sat between the camera and the floor he was standing on.

**The tell is in the ORIGINAL frame, before any spend: is there a large object
whose near face runs across the bottom of the photo?** Galley kitchens shot
across the peninsula and bedrooms shot from the doorway both do this as a
matter of course, which makes them a whole category rather than bad luck — the
condo above had four kitchen frames and three bedroom frames and every one of
them was framed that way. Exclude the category up front rather than paying for
a build to discover it, and expect a listing shot entirely like this to yield
room slides only from the spaces you can walk into from the camera position.

**And the floor plane can land on water.** 41481 Jamaica Sands Drive staged
frame 0 — a lap-length pool shot down its own length, water filling the lower
two-thirds — and shipped the agent standing mid-pool, on the surface, in the
middle of the water. Every gate passed, feet-on-floor read 100%, and the
gates were not wrong: still pool water in flat light is a better plane than
most floors, it sits below the camera, and RANSAC fits it first. Nothing in
the pipeline knows a plane has to be solid.

So the pre-spend question in the paragraph above has a second half: **is the
largest horizontal surface in this frame something a person can stand on?**
Pools, ponds, and (untested but the same geometry) large glass tables and
polished dark floors reflecting a room all present as clean planes. A backyard
frame where the water dominates is the same kind of category exclusion as a
galley kitchen shot across the peninsula — exclude it up front and let the
outdoor slide come from a patio, a fire-pit corner or a lawn, where the ground
in shot is ground.

Worth noting what this cost and what it did not: the fix was one exclusion and
a rebuild, and the rebuild returned dining, great room and kitchen where the
first had returned only outdoor and great room. Rebuilding is still a lottery
(§"Re-measured 2026-08-23" in `auto-posting.md`), but a build that yielded 2/4
has less to lose than one that yielded 4/4.

**Contact support says "next to furniture", not "on it".** 84146 Azzura Way
returned a great-room take described as *seated comfortably on the plush
sectional*, and the composite has the agent sitting on nothing: hips in mid-air
beside the sofa, legs crossed over bare floor and rug, the near foot missing its
shoe. Every gate passed, and contact support read **100%**.

The gate is not broken, it is answering a different question. Its job is the one
in the note above — occluded legs are not missing legs — so it asks whether the
figure's lower body *abuts real furniture*. A man sitting **beside** a sectional
abuts it exactly as well as one sitting **in** it. Nothing in the pipeline
measures a seat plane, and the composite has no depth ordering to notice that
the cushion he should be on is somewhere else.

So the seated tier has its own pre-spend tell, and it is a different one from
the two above:

| Mode | Ask before spending |
|---|---|
| Standing | is there a large OPAQUE object whose near face runs across the bottom of the frame? |
| Standing | is the largest horizontal surface something a person can stand on? |
| **Seated** | **is the seat itself visible and facing the lens, or only its arm and back?** |

An open sectional shot across its own back — the near section filling the
foreground, the far cushions hidden behind it — offers no visible seat, and
that is when the model puts him next to it instead of on it. It is the same
family as the galley kitchen and the pool: the frame decides the failure, and
the frame is free to look at.

The repair is not a rebuild. This was one slide of three good ones, so it was
dropped — `scripts/tmp-drop-slide.js <postId> <n>` removes a slide, renumbers
the rest, trims `generation.photoIndexes` and destroys the orphaned Cloudinary
asset.

---

## 10. Disclosure

Meta's container endpoint accepts **`is_ai_generated`**. These are AI-generated
images of a real person in a real property; set it. It costs nothing and it is
the honest call.
