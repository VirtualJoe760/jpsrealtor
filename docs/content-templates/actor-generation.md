---
title: Actor Generation — placing the agent inside listing photos
status: current
last_verified: 2026-09-07
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

**"Where the water dominates" is too narrow, and a tanning shelf is the proof.**
57730 Cantata Drive staged photo **#60** — a lap pool shot down its length with
the deck, a block wall, trees and sky filling most of the frame. Water is maybe
40% of it, so the frame does not read as a water frame at contact-sheet size and
was not excluded. The composite came back with the agent in a business suit
**standing in the pool**, shoes on the submerged tanning shelf, an in-pool lounge
chair floating beside him. feet-on-floor 100%, scale 0.74×, face 0.36, shadow
transferred, every gate green.

A tanning shelf is worse than open water, not better: it is a genuinely
horizontal plane a few inches below the surface, so it fits cleanly, it sits at
a plausible standing height relative to the deck, and the refraction that would
give it away is exactly what the geometry pass is not looking at.

So the test is not how much of the frame is water. It is:

> **Is there any water at all in the lower half of the frame?** If yes, the
> frame is a candidate for this failure regardless of how much else is in shot.

Pool listings therefore need the whole water set excluded up front — Cantata's
was `58,59,60,61,62,64,65,67,70` — and the outdoor slide taken from a patio, a
pergola, a fire-pit corner, a planter bed or a lawn. That build's replacement
outdoor frame was #51, a raised planter with cactus and block wall behind it,
and it staged first time.

**The same run produced the dining-room version of the near-face category.**
Photo **#32**, the dining table shot down its own length with the cloth filling
the lower right, returned the agent with both shoes resting on the tablecloth.
The §"large opaque object across the bottom" rule already covers it; what is
worth adding is that **a dressed dining table belongs on the list beside the
galley-kitchen peninsula and the doorway bedroom**, because a cloth reads as a
soft surface rather than an obstruction and does not look like the same category
until the composite comes back.

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

**A whole room can be nothing but the excluded category, and then that room has
no slide in it.** The galley note above says to exclude a kitchen shot across
its peninsula. 28 Oak Tree is what happens when there is no other kind of
kitchen frame: a 1,332 sqft condo whose kitchen opens to the living room
through a pass-through bar, photographed seven times — 13, 14, 15, 16, 17, 18,
19 — every one of them from the living-room side, across that bar. The selector
offered four of the seven and described the placement itself as *leaning on the
breakfast bar*, *standing behind the breakfast bar* and *at the counter near
the sink*.

The build kept 15, on the reading that it was the one frame with open tile
between the lens and the standing spot. The composite came back with the agent
over the counter run: feet on the cabinet doors, hips at counter height, no
floor under him anywhere. feet-on-floor **100%**, scale 0.91×, face 0.409,
every gate green.

So the pre-spend question has a counting half as well as a category half. When
the tell fires on *every* frame of a room rather than on some of them, the
least-bad frame is not a candidate — it is the same frame. Drop the room from
the plan, and let whatever that room was selling go in a text slide, the way
the lake, the sport court and the balcony did on the three builds before this
one.

---

## 10. Photos that are not photographs

**Some frames in an MLS set are renderings, and the pipeline cannot tell.**
Every gate in §9 measures the *composite* — is the figure standing on a real
floor plane, is the face his, did the room drift. None of them asks whether the
room was ever built. A rendering has a clean floor plane and lovely light, so it
sails through, and the post ships a feature the property does not have.

4140 E Calle San Antonio is the listing that made this concrete. Six of its 49
photos carry a **"Digitally Altered"** watermark burned into the top-left
corner:

| # | What it shows | What is actually there |
|---|---|---|
| 7 | a pool, spa, waterfall, path lighting, planting | a poured slab under a corrugated shade structure |
| 5 | a green front lawn | bare decomposed granite |
| 20, 27, 34, 44 | virtual furniture staging | empty rooms |

The selector ranked **#7 third, appeal 0.9**, and offered it as the `pool`
slide — *"seated on the left white lounge chair within the pool's shallow
end"*. A run that trusted the shortlist would have queued a fabricated pool
onto another brokerage's listing, which is the compliance failure in §7 of
`AGENTS.md`, not a taste one.

**The `poolFeatures` guard cannot catch this.** `build-pending-post.ts:317`
rewrites `ROOM_LABELS.pool` to OUTDOOR LIVING when the feed records no private
pool — the guard that saved 46109 Roadrunner Lane, 9223 N Star Trail and 5803
Los Santos Drive. It works because those listings' *labels* were wrong about a
real field. Here the field is correctly empty and the *photograph* is the thing
asserting the pool, so the label guard has nothing to fire on and the image
carries the claim by itself.

**Check the corner, not the contact sheet.** The watermark is white text over
whatever is behind it and is illegible at thumbnail size — #7 read as an
attractive twilight backyard on a 320px contact sheet. Crop the **top-left 30%
× 6%** of every frame into one strip and read that:

```python
crop = im.crop((0, 0, int(im.width * 0.30), int(im.height * 0.06)))
```

Then exclude every watermarked index, the furniture ones included: the
watermark is part of the pixels and would print on the finished slide.

**AND THE BADGE IS NOT ALWAYS IN THAT CORNER.** 1321 Sea Life Avenue puts
**"AI Enhanced"** in a rounded pill in the **bottom-right**, where the crop
above never looks. Three of its 48 frames carry it — photos 0, 2 and 4 — and
those three are the only ones in the set that appear furnished. The sectional,
the great-room sofa and the bunk beds are generated; the rooms behind them are
empty. The selector ranked #0 and #2 fifth and sixth and offered both as
`living` candidates. `scripts/tmp-corner-strip.py` reads the bottom-right the
way `tmp-watermark-strip.py` reads the top-left; **run both on every set**,
because the corner is a vendor's house style and there is no reason to expect
one MLS feed to be consistent about it.

Sea Life also breaks the disclosure tell below: its remarks disclose nothing at
all. What it has instead is a **field** that disagrees with a photograph —
`furnished: Unfurnished` on a listing whose leading frame shows a full living
room. Treat that pair as the same signal as the disclosure paragraph.

**The tell that it is worth checking at all** is a remarks paragraph disclosing
virtual staging — this listing's ends *"Furniture, décor, and other items
depicted in staged images are digital enhancements and are not included with the
property."* That disclosure is the listing agent doing the right thing, and it
is also the signal that the set is mixed. It does not say which frames, and it
does not distinguish added furniture from an added pool.

**AND ONE WATERMARK DOES NOT MEAN ONE RENDERED FRAME.** Calle San Antonio had
six of 49 and Sea Life three of 48, so both read as *find the badged frames and
exclude them*. 3470 Warren Vista Avenue is the case where that arithmetic
breaks: 36 interiors, exactly **one** — photo #50 — showed "Digitally Altered"
in the top-left strip, and the set is plainly staged far more widely than that.
Photos #48 and #49 are bare rooms and #50 is the same kind of room with a bed
and nightstands in it; #40, #41 and #42 show three different dining
arrangements in one space. **The set contains both the staged and the unstaged
version of the same rooms**, which is what a photographer uploads when the
staging vendor returns a partial set and nobody prunes the originals.

So the strip read is a *lower bound*, not an inventory. Two rules follow:

- **Count the badges against the furniture.** If a set looks furnished in
  twenty frames and one frame carries the badge, the badge is not telling you
  the other nineteen are real. It is telling you the vendor watermarked
  inconsistently.
- **The same room appearing both empty and furnished is itself the tell**, and
  it needs no corner crop. It cannot be a photography decision — nobody
  photographs a room, moves a bed in and photographs it again for one listing.

Warren Vista also carries the field/photograph pair from the Sea Life paragraph
above — `furnished: "Unfurnished"` on 2026 new construction "completed just
weeks ago" — and its remarks disclose nothing. Establishing which of the 35
unbadged interiors are real is a per-frame audit, not a strip read, and it is
not worth paying for while any unstaged listing remains in the pool. Struck on
2026-09-04 for that reason rather than on a frame count.

## 11. Disclosure

Meta's container endpoint accepts **`is_ai_generated`**. These are AI-generated
images of a real person in a real property; set it. It costs nothing and it is
the honest call.
