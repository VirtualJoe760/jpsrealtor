# Source a post — one carousel a day, queued for review

Builds a single carousel and puts it in the review queue. **This skill never
publishes anything.** Publishing is a separate cron that fires Tue/Thu/Sun at
9am Pacific and takes only approved posts, oldest approval first.

Generation is daily and posting is three times a week on purpose: Joseph picks
the good ones, and the queue drains in approval order.

## Before you start

Read these — they are the standard, not background reading:

- `docs/content-templates/copy-voice.md` — every line you write is governed by it
- `docs/content-templates/auto-posting.md` — the slot policy
- `docs/content-templates/actor-generation.md` — what the staging pipeline will do

## Steps

### 1. Pick a listing that has never been posted

Obsidian Group actives, excluding anything already posted. ~34 were available
when this skill was written.

```js
// Team listings carry "The Obsidian Group" in the co-list slot, or the team key.
const TEAM = "20230905131838052805000000";
const posted = await db.collection("pendingposts").distinct("listingKey", { status: "posted" });
const candidates = await db.collection("unifiedlistings").find({
  standardStatus: "Active",
  $or: [{ listAgentTeamKey: TEAM }, { coListAgentId: TEAM }],
  listingKey: { $nin: posted },
}).sort({ listPrice: -1 }).toArray();
```

Prefer a listing with **plenty of photos** (the stager rejects frames freely —
it wants candidates to spare) and one that is **visually different from the
last few posted**, so the feed does not read as the same house repeatedly.

Check the archive before choosing: `GET /api/agent/pending-posts/archive`, or
query `pendingposts` where `status: "posted"` directly.

### 2. Write the copy

Config goes in `scripts/data/pending/<slug>.ts` — copy the shape of
`ridge-road.ts`. You are writing:

| Field | What it is |
|---|---|
| `hook` | 1–2 words on the cover. Short — it is set at 96pt and wraps badly |
| `rooms[]` | `{ room, caption }` per room the stager might pick. Caption sits under the room label |
| `textSlides[]` | 2–3 slides, each `paragraphs[]` + one `italicLast` |
| `cta` | Closing slide — `paragraphs[]` + `italicLast` |
| `accentColor` | Hex, no `#`. Pull from the listing's own photography |
| `fallbackCaption` | Used when a room has no caption written for it |

Room keys the reader emits: `kitchen`, `living`, `great_room`, `dining`,
`primary_bedroom`, `bedroom`, `game_room`, `pool`, `outdoor`, `office`. Write
captions for more rooms than you expect to need — the stager picks its own
frames and an unmatched room falls back.

**But aliased keys share one caption, so write one line that is true of both.**
The generator collapses `great_room`→`living`, `outdoor`/`outdoor_living`→`pool`
and `bedroom`→`primary_bedroom` before looking a caption up, so whichever row
sits first in `rooms[]` answers for the whole group and the second row is
unreachable. 46109 Roadrunner Lane queued with a secondary bedroom labelled THE
BEDROOM under the primary-suite line, promising mountain windows and a patio
door that were not in the frame.

The same applies to what the caption asserts is *visible*. A line naming an
object the stager's chosen frame does not contain reads as a mistake even when
the house genuinely has one — the same listing named a fireplace that sat behind
the lens. Write the caption to the room, not to the photo you hope it picks.

**The rules that get broken most** (full list in `copy-voice.md`):

- Never compare the property to another market. Not "this isn't Palm Springs".
- Never disparage — the property, the finish work, or another agent.
- Don't state the obvious as a selling point ("it has a kitchen").
- Sell being *there*: "imagine the stars out here at night" beats "great views".
- Concrete over adjectival. "New PebbleTec, paid-off solar" beats "beautifully
  appointed".

### 3. Generate

```bash
npx ts-node -O '{"module":"commonjs"}' scripts/build-pending-post.ts <slug>
```

Takes several minutes: it reads each photo, fits a floor plane, renders the
agent into the room, and gates every take on geometry and face match. Expect
rejections in the log — that is the pipeline working.

Add `--exclude 3,7,12` to skip photo indexes, e.g. when rebuilding a listing
whose earlier frames were used or rejected.

**Dump the selector's shortlist before you write that list.**

```bash
npx ts-node -O '{"module":"commonjs"}' scripts/tmp-selector-dump.ts <listingKey>
```

`--exclude` filters the selector's own top 14 *after* it has chosen; it can
remove, never promote. So an exclusion list written off the contact sheet can
delete almost the whole shortlist without you knowing — 84146 Azzura Way's first
build excluded 12 of the 14 it was handed, staged two candidates for four slots
and shipped a one-room carousel. The dump costs under a cent and prints each
frame's room, placement and the exact spot the stager will aim at. Exclude from
*that*, then count what survives.

Two things the dump makes obvious that guessing does not:

- The selector takes **one frame per room kind first**, then fills every
  remaining slot with more `living`. The second-best kitchen and the good
  backyard frames are usually never offered, so excluding the one outdoor frame
  it did offer removes the outdoor slide rather than improving it.
- The category worth excluding is an **opaque near face at waist height** — a
  kitchen island shot across, a bed shot from the doorway, a sofa back filling
  the foreground. A low *glass* coffee table is not that: it hides a standing
  figure from the shin down, through glass.

### 4. Look at what you made

**Actually look at the images.** Pull the slide URLs from the queued
`PendingPost` and view them. The gates catch geometry and identity; they do not
catch a bad-looking photograph.

If the RENDER is wrong, rebuild with `--exclude` on the offending indexes rather
than shipping it. Joseph reviewing a bad post costs more than a rebuild.

**But check what is actually wrong first, because a bad caption is not a bad
render.** Staging is the expensive, non-deterministic half; the band is a pure
Cloudinary transformation over a `publicId` already stored on the record. So a
caption that names something the chosen frame does not contain is fixed with

```bash
npx ts-node -O '{"module":"commonjs"}' scripts/reband-pending-post.ts <slug> <postId> <room,room,room>
```

which costs no Gemini and re-rolls nothing. Rooms come from the build log's
`PASS` lines, in order — the record stores no per-slide room key. 9223 N Star
Trail shipped two wrong captions over four good renders; declining that build
would have thrown away all four to fix eleven words.

**And when one render is wrong and the rest are right, drop that slide — do not
re-roll the build.**

```bash
node scripts/tmp-drop-slide.js <postId> <n>
```

It renumbers the remaining slides, trims `generation.photoIndexes` and destroys
the orphaned Cloudinary asset. 84146 Azzura Way returned kitchen, dining and a
great room where the agent is sitting on nothing — hips in mid-air beside the
sectional, contact support 100%, every gate passed. Dropping it left an 8-slide
post; re-rolling would have re-gambled two good renders to fix one.

**A second build of the same listing leaves a second `PendingPost`.** The
generator always inserts and never supersedes. Pick the better build and delete
the other — the record *and* its Cloudinary assets — before you report. A review
queue holding two versions of one house is the agent's problem to untangle.

**Copy fixed after the build already read the config is cheap to apply.** Text
slides are pure Cloudinary transforms, same as the bands:

```bash
npx ts-node -O '{"module":"commonjs"}' scripts/tmp-retext-pending-post.ts <slug> <postId>
```

re-renders the text slides and the caption from the current config. It leaves
the CTA alone on purpose.

**A caption can be contradicted by the frame without naming a single object.**
Star Trail's outdoor line was rewritten to be object-free after it promised
string lights and mountains that the crop did not contain — and the rewrite,
"morning coffee out here", then landed on a sunset. Time of day is part of what
a photograph asserts, and the run picks the hour as freely as it picks the crop.

### 5. Report

Tell Joseph, briefly:

- Which listing, and why that one
- The approval code (`POST <code>` or the CMS panel approves it)
- Any slide you are unsure about — say so rather than hoping
- What is now queued in total

## Rules

- **Never publish.** No `media_publish`, no `post_instagram_carousel`. Queue it
  and stop.
- **One post per run.** Not a batch.
- **Never post a listing twice.** The publish cron blocks duplicates by
  `listingKey`, but do not rely on that — check before generating and save the
  work.
- **These are other agents' listings.** The staging pipeline may not alter the
  room; that is a compliance rule, not a taste one. Credit both listing agents.
- If nothing suitable is left in the pool, say so and stop. Do not repost, and
  do not reach outside the team's listings.
