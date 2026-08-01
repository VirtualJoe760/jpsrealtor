---
name: daily-carousel
description: Build ONE Instagram carousel from an unposted Obsidian Group listing and queue it for Joseph's review. Writes the copy, runs the generator, reports what landed. Never publishes.
---

# /daily-carousel — one post a day, queued for review

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

### 4. Look at what you made

**Actually look at the images.** Pull the slide URLs from the queued
`PendingPost` and view them. The gates catch geometry and identity; they do not
catch a bad-looking photograph.

If a slide is wrong, rebuild with `--exclude` on the offending indexes rather
than shipping it. Joseph reviewing a bad post costs more than a rebuild.

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
