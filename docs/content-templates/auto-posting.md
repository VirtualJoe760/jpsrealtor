---
title: Automated carousel posting — generate, review, approve, publish
status: partial
last_verified: 2026-10-17
last_verified_note: TL;DR, Decisions, and everything from "Implementation map" onward were checked against code on 2026-10-17. The dated "Re-measured" entries in the middle are an operational log of pool and build measurements from 2026-08/09 — kept as history, not re-verified; counts and queue depths in them are stale by design.
owner: content
related: [./README.md, ./carousel-slides.md, ./actor-generation.md, ./copy-voice.md, ../integrations/twilio.md]
---

# Automated carousel posting

## TL;DR

**Status: partly built.** A generated carousel is a `PendingPost`. The agent
reviews it in the Instagram tab of the agent CMS (`/agent/cms`) or texts
`POST <code>`; an hourly cron publishes **approved** posts in the Tue/Thu/Sun
9am-Pacific slot, one carousel per slot, and deletes the slides from Cloudinary
afterwards. Nothing publishes without `approvedAt`.

**Not built:** scheduled generation (the `daily-carousel` skill builds one post
per run — it is not a Vercel cron), the "posts are ready" text to the agent, the
2-hour grace window and expiry/roll-forward, and the sweep for declined posts.
See "Implementation map" below.

Instagram has no drafts or scheduling API (verified against Meta's live docs
2026-07-26 — the container endpoint accepts no `scheduled_publish_time` and
exposes no drafts endpoint), so the review-and-schedule step is ours to own.

## Decisions

| Question | Decision | Reality (2026-10-17) |
|---|---|---|
| SMS approval keyword | **`POST`** — `YES`/`START`/`STOP`/`HELP` are carrier-mandated A2P keywords and cannot be repurposed | Built. Regex accepts `POST` or `POST <letter><digit>` only (`APPROVE_RE` in `src/lib/messaging/post-approval-sms.ts`) |
| Multiple queued | keyword carries a short code (`POST A4`); bare `POST` works when exactly one is pending | Built, as described. Only `awaiting_review` posts answer to a code |
| Unapproved at slot time | grace window of 2 hours | **Not built.** The cron posts only inside the 9am hour; an approved post that misses it goes at the next slot |
| Never approved | never publishes | True. Nothing expires or rolls it — `rollCount`, `notifiedAt`, `remindedAt` are written as defaults and read by nothing |
| Listing pool | **The Obsidian Group** (see below) | Selected by the skill's scratch scripts, not by app code |
| Generation cadence | Sun / Tue / Thu, each run ≥3 days out | **Daily** attempt by the `daily-carousel` skill (`.claude/skills/daily-carousel/source-post.md`); it builds only when a never-queued listing exists |
| Posting slots | **Tue / Thu / Sun** for carousels | Built: `POST_DAYS` / `POST_HOUR = 9` / `America/Los_Angeles` in `src/app/api/cron/publish-pending/route.ts` and `nextPostSlot()` in `src/app/api/agent/pending-posts/[id]/route.ts`. Reels: not built (backend TBD) |
| Listing preference | newer listings preferred, not required | Judgement in the skill |
| Slide retention | delete from Cloudinary after a successful publish | Built, inline in the publish cron (not a separate sweep) |

## Identifying the team

The Obsidian Group is **not** an MLS office. As of 2026-07-26 team listings carried
`listOfficeName: "eXp Realty Of Southern California Inc"` (the team has since moved
brokerages — the 2026-10 rebrand to Fathom Realty Group, `d816b548` — so
re-check the office strings; the co-list rule below is what identifies the pool) — the brokerage,
shared with hundreds of unrelated agents — and the office string is not even
consistent within the team (`eXp Realty of California Inc` also appears).

The team is identifiable because **"The Obsidian Group" is entered as a
co-listing agent name**. Verified 2026-07-26: 31 listings carry it in
`coListAgentName`, zero in any office field.

So the pool is the union of:

1. `coListAgentName` or `listAgentName` matching `/obsidian/i`, and
2. listings whose list/co-list agent is on the **derived roster** — the set of
   agent names that appear opposite "The Obsidian Group" on any listing.

Deriving the roster rather than hardcoding it means the pool follows the team
as it changes.

Derived roster as of 2026-07-26 (10):

```
Alan E Mckeefry        Christopher R Monroe     Parker Jaeger
Allison F Saenz        Gersson S Ojeda Esparza  Peyson Robertson
Ashley N Robertson     Jack A Rook              Susanna A Stone
Carlos A Campos
```

**The derivation is one hop and misses people.** It only finds agents who have
appeared *directly opposite the literal string* "The Obsidian Group". Two real
examples from the same data:

- **Joseph Sardella is not in it** — he has never co-listed with the team name.
- **Kevin Klaess is not in it** — he co-listed with *Peyson*, not with the team
  name, so he is one hop further out.

Chasing further hops would pull in every agent who ever co-listed with a team
member, which is far too wide. So: **derive the roster as a starting point,
then let the agent edit it.** Store the final list; re-derive periodically and
surface additions for confirmation rather than adopting them silently. The
agent's own name must always be included.

> **Multi-tenant note.** This selector must be per-agent configuration, not a
> hardcoded Obsidian rule. Store it on the agent as a saved pool definition
> (team name + roster, or "my own listings"). Joseph is tenant one, not the
> only tenant.

## Gotchas when querying the pool

**The API derives fields the documents don't store.** Querying
`unifiedlistings` directly is not the same as reading a tool response. Three
found in one session:

| You want | Tool response calls it | The document has |
|---|---|---|
| photo count | `photoCount` | **`photosCount`** (and `media[]`) |
| days on market | `daysOnMarket` | nothing — derive from `onMarketDate` |
| lot size in acres | `lotSizeAcres` | often only `lotSizeSqft` |

Filtering on `photoCount` silently matches **zero** documents — not an error, an
empty result that reads like "no listing has photos". Verify a field exists on a
real document before filtering a pool on it.

**Filter to sales.** `propertyType` is a single letter: `A` sale, `B` rental,
`C` multifamily, `D` land. The pool sorted newest-first leads with rentals —
$2,900 and $3,200 a month — and the simple-luxury template is an editorial
luxury format. Selection must filter to `A`, require enough photos to stage
(`photosCount >= 12`), and apply a price floor. "Newest" alone picks the wrong
listing.

## Pool depth and what it means for cadence

> **Everything from here to "## Implementation map" is a dated log**, not a
> description of current state. Each "Re-measured" entry records what the pool,
> the queue and the builds looked like on one day in 2026-08/09 (counts, queue
> depth, which listings were struck and why). The reusable lessons are cross-
> referenced from `actor-generation.md` and `copy-voice.md`; the numbers are not
> maintained.

Measured 2026-07-26:

| Filter | Count |
|---|---|
| Active, team pool, all types | 40 |
| Sales only (`propertyType: 'A'`) | 24 |
| Sales with ≥12 photos (stageable) | **22** |
| …and ≥$500k | 12 |

**At 3 posts/week the whole team's stageable inventory is consumed in about
seven weeks** — and under four weeks if a $500k floor is applied. New listings
replenish it, but not at 12/month.

Two consequences:

1. **Don't apply a hard luxury price floor.** The team's stageable sales run
   roughly $300k–$950k; a $500k cut halves the pool for no real gain. The
   template is editorial, not luxury-exclusive — the copy should carry the
   price point rather than the selection filter.
2. **One post type is not enough to sustain 3/week indefinitely.** New-listing
   carousels alone will start repeating properties. Price improvements, open
   houses, just-sold, and the reel format all widen the rotation. Worth
   planning for before the cadence outruns the inventory.

### Re-measured 2026-08-11 — it outran the inventory

Sixteen days later, counting anything ever written to `pendingposts` as
consumed:

| Filter | Count |
|---|---|
| Active, team pool, all types | 29 |
| Never queued, sales only, ≥12 photos | **9** |
| …of those, furnished enough to stage | **~4** |

Ten listings have been queued, and the pool itself shrank from 40 to 29 as
listings closed. Consequence 2 above is no longer a thing to plan for; it is
the current state.

### Re-measured 2026-08-12 — the furniture constraint, priced out

One day later, checking every never-queued sale as IMAGES before writing
anything:

| Candidate | Photos | Verdict |
|---|---|---|
| 16430 Evans Lane, $1.3M | 53 | **Vacant.** Both residences, all 53 frames. |
| 79161 Falmouth Drive, $619k | 51 | Vacant (recorded above) |
| 4140 E Calle San Antonio, $570k | 49 | Vacant, plus "Digitally Altered" frames |
| 71817 Samarkand Drive, $549k | 38 | Furnished; severe barrel distortion, cluttered |
| **1184 Lear Avenue, $369,900** | 60 | **Built.** Queued K3 |
| 66550 San Diego Dr, $599k | 34 | `propertyType: C` — multifamily, out of scope |

So the never-queued pool holds **one** listing that builds and one marginal
fallback. The $1.3M listing being vacant is the point: price and photo count
both said pick it, and the images said no. **Check the photos before writing a
line of copy** — a contact sheet of all 53 frames costs nothing and it is the
only filter that works.

### Re-measured 2026-08-14 — the never-queued pool is down to one

Two days later. 30 team actives, 13 of them ever queued. Every remaining
never-queued candidate, checked as a contact sheet before any copy was written:

| Candidate | Photos | Verdict |
|---|---|---|
| 58540 Barron Drive, $285k | 29 | **Vacant.** Listed the day before; bare in all 29. |
| 76434 Encanto Drive, $325k | 26 | **Vacant.** |
| **255 S Avenida Caballeros #313, $354,900** | 29 | **Built.** Queued U5 |
| 78250 Cortez Lane #129, $325k | 50 | Furnished, but 22 of 50 are drone aerials |
| 71817 Samarkand Drive, $549k | 38 | Furnished; barrel distortion (recorded above) |
| 16430 Evans Lane / Falmouth / Calle San Antonio | — | Vacant (recorded above) |
| 72714 Willow Street #4, $299k | 11 | Under the 12-photo bar |

**After this run, 78250 Cortez Lane is the only furnished never-queued sale
left.** The rest of the pool is land (`propertyType: D`), one rental, one
multifamily, and vacant houses. Generation is daily and the pool replenishes at
nothing like that rate, so the next run will have to either repeat a listing
under a different post type or skip. Consequence 2 above has arrived in full.

**Staging yield is its own limit, separate from the pool.** Caballeros was built
three times and passed exactly one frame each time — 1 of 7, 2 of 8, 1 of 8. The
dominant rejection was *"guide marks were drawn into the render"*: the model
drawing its own skeleton and guide box into the output, on up to six consecutive
takes of the same frame. One kitchen reaction also came back at ArcFace cosine
**-0.015** — a completely different man. The gates held and nothing bad shipped,
but a 6-slide carousel with one room slide is what a 12%-yield build produces,
and it cost three builds of Gemini spend to learn. Budget candidate frames on
the assumption that most will not land.

### Re-measured 2026-08-15 — the never-queued pool is empty

78250 Cortez Lane was built and queued (L8), so the prediction above has landed:
**there is no never-queued furnished sale left.** 29 team actives, 14 ever
queued. What remains is land (`propertyType: D`), one rental, one multifamily,
and the vacant houses already recorded. The next run has to repeat a listing
under a different post type or skip; it cannot pick a fresh one.

Two things about Cortez cost four builds and are worth not re-learning:

**An exclusion list cannot pin the candidate set.** `selectStagingPhotos` is
called with `want: 14` and returns its own top 14; `--exclude` is applied to
that result *afterwards*. Hand-picking nine good frames and excluding the other
41 does not hand the stager those nine — it hands it however many of the nine
the selector independently ranked into its top 14, which on the third Cortez
build was four. Exclusions can only remove, never promote.

**On an open-plan unit, room de-duplication eats the run.** Cortez is a 576 sqft
studio with a partition wall, so nearly every interior frame legitimately comes
back `living` or `great_room`. One build staged nine candidates, passed every
one of them, and shipped a **single** room slide — the other eight were dropped
as duplicate rooms. Nothing failed and nothing was rejected; the yield was 1/9
anyway. `WANT_SLIDES + 5 = 9` is a *candidate* budget, not a room budget, and on
a studio those are very different numbers. Expect two room slides from an
open-plan listing and treat four as the exception.

**The binding constraint is not price or photo count — it is furniture.** The
highest-priced never-queued candidate, 79161 Falmouth Drive, has 51 photos and
about 35 of them are bare rooms mid-renovation. A vacant house gives the stager
nothing telic to work with, so every slide degrades to an edge reaction, which
`actor-generation.md` §6 then forbids repeating across the sequence. Two of the
nine remaining candidates were already rejected on exactly this. **Vacant
listings are effectively not in the pool**, and selection should test for it
rather than discovering it part-way through a build that costs real Gemini
spend.

### Re-measured 2026-08-22 — new listings refilled it

A week later the "there is nothing left" reading above is out of date. **32 team
actives, 16 ever queued, 8 never-queued sales**, and three of those came on
market inside the previous four days. Checked all three as contact sheets before
any copy was written:

| Candidate | Photos | Verdict |
|---|---|---|
| **1522 Sutherland, Lancaster, $499,999** | 35 | **Built.** Queued V2 |
| 27305 Hombria, Cathedral City, $429k | 32 | Furnished but heavy wide-lens distortion, dim, lived-in |
| 1950 Palm Canyon #128, Palm Springs, $299,999 | 33 | Furnished and usable — hold as the next fallback |

The rest of the never-queued list is the vacant houses and the sub-12-photo unit
already recorded above. So the pool is not exhausted so much as **bursty**: it
empties, then two or three listings land in a week. A run that finds nothing
should say so and stop rather than repeat, because the following week may well
have three.

**Sutherland is also the first candidate whose photography was better than the
pipeline's usual input** — professionally lit, styled, undistorted — and the
staging yield reflected it: 5 frames offered, 5 usable renders, 4 shipped after
room de-duplication dropped a second great-room. Compare Caballeros' 12%. Photo
quality is not just a taste filter on selection; it is the strongest predictor
of how many slides a build returns.

**Render the cover before spending Gemini on the rooms.** The cover is a pure
Cloudinary transform, so candidate frames can be composited and compared for
nothing, and `gravity: auto` re-crops the source before the panel lands — which
means the right-half rule in `copy-voice.md` §8 **cannot be applied to the
original frame by eye**. Sutherland's obvious cover was the pool shot; rendered,
`gravity: auto` pulled to the deck and put the neighbour's two-storey house
across the surviving half. `scripts/tmp-cover-preview.ts` renders the real
template over a list of candidate indexes and accent colours.

**Four of the four room captions had to be rebanded after looking at the build**,
none of them for a bad render. Two asserted a vaulted ceiling over frames whose
ceilings are flat and fill the top third of the slide; one called raised-panel
cabinet doors shaker; one named a block wall in the frame that happens to look
at the wrought-iron pool fence instead. Every one of these was written to the
space rather than the photo, which is the rule — and the rule is not sufficient
on a house whose spaces are not uniform. Budget a reband on every build and
treat the first captions as drafts.

### Re-measured 2026-08-23 — the pool is down to one, and it cost three builds

31 team actives, 17 ever queued, 15 never queued. Of the 15, six are sales with
≥12 photos; the rest are land (`propertyType: D`), one rental and one
multifamily. Four of the six are already recorded vacant above (Evans Lane,
Calle San Antonio, Encanto, Barron), and Hombria was set aside on the previous
run. So the pool held exactly the one listing the 2026-08-22 run named as its
fallback:

| Candidate | Photos | Verdict |
|---|---|---|
| **1950 S Palm Canyon Dr #128, Palm Springs, $299,999** | 33 | **Built.** Queued L7 |

**Furnished, bright and undistorted was not enough — three builds shipped one
usable post.** The photography passes every filter this doc has accumulated,
and the listing still yielded two room slides out of four attempts, because of
a failure mode none of the filters name: **every kitchen and bedroom frame is
shot across a counter or a bed**, so the standing spot is behind an object
filling the foreground and the composite has no depth ordering to put it there.
Build G8 shipped the agent standing through the kitchen island; build L7 shipped
him standing on the mattress. Both passed every gate. Recorded properly in
`actor-generation.md` §9 — the tell is visible in the original frame for free.

Two process notes from paying for that three times:

- **Rebuilding is a lottery you can lose.** L7's living and dining renders were
  good. Build 3, run only to replace one bad bedroom slide, came back with **1
  of 4** room slides — it re-rolled the two good ones and lost the dining. The
  Star Trail rule ("don't discard four good renders to fix eleven words") holds
  for renders too: when one slide of several is wrong and the rest are right,
  the cheap fix is to drop that slide, not to re-roll the build.
- **Read the exclusion list as categories, not indexes.** "Frame 9 broke" is the
  wrong lesson when frames 7, 8, 10 and 11 are the same shot of the same galley
  from the same side. Excluding one at a time costs a build each.

Final: 7 slides — cover, great room, dining, three text, CTA. The balcony and
the mountain view are the best thing about the unit and no room slide could
carry them, so a text slide does.

### Re-measured 2026-08-25 — bursty, and it burst again

38 team actives, 19 ever queued, 20 never queued. Ten of the never-queued are
sales with `photosCount >= 12`, but six of those are already recorded unusable
above (Calle San Antonio, Encanto and Barron vacant; Hombria set aside for
wide-lens distortion), which leaves four genuinely new names — three of them on
market inside the previous fortnight. The "empties, then two or three land in a
week" reading from 2026-08-22 holds; it is now the normal shape of this pool
rather than an observation about one week.

| Candidate | Photos | Verdict |
|---|---|---|
| **41481 Jamaica Sands, Bermuda Dunes, $999,999** | 49 | **Built.** Queued H8 |
| 84146 Azzura Way, Indio, $625k | 75 | unchecked — next fallback |
| 28 Oak Tree, Rancho Mirage, $479,900 | 41 | unchecked |
| 3470 Warren Vista, Yucca Valley, $399k | 64 | unchecked |

Jamaica Sands is the first candidate to top the pool on price, recency, photo
count and furniture simultaneously, and the roster derivation picked it up
because Jack A Rook lists opposite the literal team string.

**The pool ate a slide, which is a new category and not bad luck.** Build one
staged the lap-pool frame and shipped the agent standing on the surface of the
water, mid-pool, with every gate passing and feet-on-floor at 100%. Still water
in flat light is a cleaner horizontal plane than most floors and RANSAC fits it
first; nothing downstream knows a plane has to be solid. Recorded properly in
`actor-generation.md` §9 alongside the depth-ordering failures, because the tell
is the same kind of thing and it is free to check: **look at the largest
horizontal surface in the frame and ask whether a person could stand on it.**

Two smaller notes from the same build:

- **The rebuild was worth taking here, and that is a judgement about what was on
  the table.** §"Re-measured 2026-08-23" says rebuilding is a lottery you can
  lose, and it is — but that entry is about re-rolling a build that returned
  four good renders. This one had returned two, one of which was the pool, so
  the downside was one slide. It came back with dining, great room and kitchen.
  Read the rule as *weigh what you are re-gambling*, not *never rebuild*.
- **The cover spec strip and the remarks disagree about the bath count.**
  `bathroomsTotalInteger` is 3; the listing agent's remarks say "2 and a half
  bathroom", and the strip is built from the field. A `coverBody` saying "two
  and a half baths" three lines under a strip saying "3 BA" is one slide
  contradicting itself. The strip is not ours to overwrite, so the fix is to
  keep bath counts out of the cover copy on any listing with a half bath.
  Cheap to correct after the fact — `scripts/recover-pending-post.ts <slug>
  <postId>` re-renders slide 1 alone, no staging and no Gemini.

Final: 7 slides — cover, dining, great room, three text, CTA. The sport court,
the paid-off solar and the air-conditioned garage are the three best facts about
this listing and none of them can carry a room slide (the court is only in
aerials; the garage has no room key and would classify as `other` → `living`),
so all three are text slides. Same call 1950 S Palm Canyon made for its balcony.

### Re-measured 2026-08-26 — the exclusion list has to be aimed at the SELECTOR

40 team actives, 20 ever queued, 21 never queued. Eleven of the never-queued are
sales with `photosCount >= 12`; four of those are already recorded unusable
above (Calle San Antonio, Encanto and Barron vacant; Hombria set aside for
wide-lens distortion), leaving seven open names — two of which came on market
the morning of this run. The bursty shape holds.

| Candidate | Photos | Verdict |
|---|---|---|
| **84146 Azzura Way, Indio, $625k** | 75 | **Built.** Queued C9 |
| 3470 Warren Vista, Yucca Valley, $399k | 64 | unchecked — next fallback |
| 28 Oak Tree, Rancho Mirage, $479,900 | 41 | unchecked |
| 5803 Los Santos Dr #19, Palm Springs, $415k | 56 | unchecked |
| 1321 Sea Life Ave, Thermal, $315k | 48 | unchecked, new 2026-08-26 |
| 7526 Apache Trail, Yucca Valley, $295k | 31 | unchecked |
| 2502 Harbor Drive, Thermal, $230k | 17 | unchecked, new 2026-08-26 |

Azzura Way is the fallback the 2026-08-25 run named, and it is the second
candidate after Sutherland whose photography is better than this pipeline's
usual input — professionally lit, undistorted, every room styled.

**An exclusion list aimed at the photo set instead of at the selector's
shortlist starves the build.** §"Re-measured 2026-08-15" already says
`--exclude` can only remove and never promote. What that entry does not say is
how to size the list, and the first Azzura build (W3) is what the gap costs:
65 of 75 frames excluded on a careful read of the contact sheet, ten kept — and
`selectStagingPhotos` handed back a top 14 of which **twelve were on the list**.
Two candidates for four slots, one survivor, a one-room carousel.

The fix is free and takes one command. **Dump the selector's ranking before
writing the exclusion list** — classification is ~$0.0001/photo, so the whole
sweep is under a cent, and `scripts/tmp-selector-dump.ts <listingKey>` prints
the ranked 14 with each frame's room, placement and `placementDetail`. Then
exclude *from that list*, and count what is left.

Reading the ranking also shows why guessing cannot work here. The selector takes
**one frame per room kind first**, then fills every remaining slot from the top
of the same sort — which is `living` (roomRank 0). On this listing the fill was
six more great-room frames, so the second-best kitchen and every good backyard
frame were never offered at all. Excluding the one outdoor frame it did offer
does not promote a better one; it removes the outdoor slide from the post.

**And the category to exclude is an OPAQUE near face at waist height, not any
object in the foreground.** W3 treated five great-room frames whose only
foreground object is a glass coffee table as the same §9 depth-ordering risk as
a kitchen island or a bed. They are not: a low glass table occludes a standing
figure from the shin down, through glass, and the floor still wins the RANSAC
fit because `floor_plane` takes the *lowest* strong horizontal plane. Build C9
kept them and returned three passes from nine candidates against W3's one from
two.

**Then C9 shipped a slide the gates could not catch, and it is a new one.** The
great-room frame came back "seated comfortably on the plush sectional" with
contact support at 100% — and the composite has him sitting on nothing, hips in
mid-air beside the sofa over bare floor, near foot missing its shoe. Recorded
properly in `actor-generation.md` §9: the contact-support gate asks whether the
occluded lower body abuts furniture, and a figure *beside* a sectional satisfies
that as readily as one *in* it. It was one slide of three, so it was dropped
rather than re-rolled, per §"Re-measured 2026-08-23" — `scripts/tmp-drop-slide.js
<postId> <n>` removes a slide, renumbers, trims `generation.photoIndexes` and
destroys the orphaned Cloudinary asset.

Two smaller notes:

- **Two builds of the same listing means two `PendingPost` records.** The
  generator always inserts; it never supersedes. W3 was deleted (record and
  both Cloudinary assets) once C9 was judged the better build, because the
  publish cron blocks duplicates by `listingKey` and a review queue holding two
  versions of one house is the agent's problem to untangle, not the queue's.
- **A copy fix after a build has already `require`d the config is cheap.** Text
  slides are pure Cloudinary transforms over the `sample` asset, exactly like
  the room bands, so `scripts/tmp-retext-pending-post.ts <slug> <postId>`
  re-renders them and the caption from the current config with no Gemini spend.
  It deliberately leaves the CTA alone — `buildCtaTransformation` needs the
  agent record's name, licence and the headshot/logo public_ids, which live in
  the generator.

Final: 8 slides — cover, kitchen, dining, CMA, three text, CTA. The lake, the
short-term-rental history and the heated spa are the three best facts here and
none of them can carry a room slide (the lake is only ever shot from 200 ft),
so all three are text slides. Third run in a row to make that call.

### Re-measured 2026-08-27 — a listing can be shot entirely across its own counters

40 team actives, 21 ever queued, 19 never queued. Ten of the never-queued are
sales with `photosCount >= 12`, and four of those ten are already recorded
unusable above (Calle San Antonio, Encanto and Barron vacant; Hombria set aside
for wide-lens distortion), leaving six open names.

| Candidate | Photos | Verdict |
|---|---|---|
| **28 Oak Tree, Rancho Mirage, $479,900** | 41 | **Built twice.** Queued Z4; build T9 deleted |
| 3470 Warren Vista, Yucca Valley, $399k | 64 | Checked as a contact sheet and passed over: a new manufactured home on a raw dirt lot, furnished sparsely, a third of the interiors bare white rooms, ten frames lot-boundary aerials with survey lines drawn on. Still the next fallback |
| 5803 Los Santos Dr #19, Palm Springs, $415k | 56 | unchecked |
| 1321 Sea Life Ave, Thermal, $315k | 48 | unchecked |
| 7526 Apache Trail, Yucca Valley, $295k | 31 | unchecked |
| 2502 Harbor Drive, Thermal, $230k | 17 | unchecked |

Oak Tree passes every filter this doc has accumulated — furnished in every room,
professionally lit, undistorted, on a golf course — and it returned **one usable
room slide from nine staged candidates**. The reason is a property of the
photography that none of the existing filters name.

**`poolYN` IS NOT "THIS HOME HAS A POOL", AND IT IS THE FIRST THING TO CHECK ON
A CONDO.** Oak Tree is `poolFeatures: "Association"` — the Mission Hills
community pool, a quarter mile away and not on the lot — and `poolYN: true`.
The guard 46109 Roadrunner Lane and 9223 N Star Trail wrote reads that flag
alone, so it was about to print **THE POOL DECK** over a golf-course patio: the
same false claim about another brokerage's inventory, arriving through a field
that reads true rather than a label that was missing. `build-pending-post.ts`
now also requires that not *every* named pool feature is a shared-facility one.
`reband-pending-post.ts` still has no `poolYN` guard at all by design — when
rebanding an outdoor frame, pass `outdoor`, never `pool`.

**Every kitchen frame in a set can belong to the excluded category at once.**
§9 of `actor-generation.md` says to exclude a galley shot across its peninsula.
What Oak Tree adds is that on a 1,332 sqft condo whose kitchen opens to the
living room through a pass-through bar, **all seven kitchen frames** — 13, 14,
15, 16, 17, 18, 19 — are shot from the living-room side across that bar. There
is no kitchen frame that is not that frame. Build T9 kept 15 as "the one with
open floor between the lens and the standing spot", and the slide came back with
the agent composited over the counter run, feet on the cabinet doors, hips at
counter height, every gate passing. When the tell fires on *every* frame of a
room, that room has no slide in it — plan the post without it rather than
keeping the least-bad one.

**And `--exclude` is written against a ranking that will not be the ranking.**
§"Re-measured 2026-08-26" says to dump the selector's top 14 first, and that is
still right — it is what identified the kitchen category here. But
`selectStagingPhotos` is a model call, not a sort: the dump for this listing
offered 6, 15, 1, 11, 3, 7, 8, 9, 10, 38, 13, 14, 16, 17, and the build minutes
later staged 4, 18 and 19, none of which the dump had ranked at all. Photo 11
came back `dining` in the dump and `living` in the build, and was dropped as a
duplicate room. So the dump tells you the *categories* the selector reaches for;
it does not pin the set. Exclude by category and expect the numbers to move —
which is the same lesson §"Re-measured 2026-08-23" drew about reading the
exclusion list as categories, arriving from the other direction.

**The rebuild was right here, and the arithmetic is the same one Jamaica Sands
did.** §"Re-measured 2026-08-23" says rebuilding is a lottery you can lose, and
it is — but the stake is however many good renders are on the table. Build T9
returned two room slides and the kitchen was the bad one, so dropping it left
**one**. Re-gambling one render to try for four is a different bet from
re-gambling four to fix one, and it paid: build Z4 came back dining, front
elevation and great room, all three usable, from five candidates.

The order matters and is worth copying. **Drop the bad slide from the first
build BEFORE starting the second**, so the fallback is already clean and
shippable if the rebuild returns nothing. Then judge, keep one, and delete the
other — record *and* Cloudinary assets, checking first that the loser's
`publicId`s are not shared with the winner. T9's cover and staged room were
destroyed; the CMA, text and CTA slides carry no `publicId` because they are
transforms over `sample`, so there is nothing to clean up for those.

**Which frames survive is not which frames you would have picked.** The three
that landed were 11 (dining), 3 (the front walkway) and 9 (the great room); 10
and 8 — the two best living frames by eye, and the one the first build had
already staged successfully — both failed every take. There is no reading of
the contact sheet that predicts that.

**A front elevation comes back `outdoor`, and `outdoor` is captioned as a
patio.** Photo 3 is the entry walkway with the garage door in it; the stager
called it `outdoor`, which normalises to `pool`, which took the outdoor-living
caption — "Patio, lawn, and the golf course starts where the grass ends" over a
driveway. The label was right (OUTDOOR LIVING) and the caption was false. The
config had an `exterior` row written for exactly this, and it was unreachable
because the stager never returned that key. Fixed with a caption-only reband —
`reband-pending-post.ts oak-tree <postId> dining,exterior,great_room` — no
Gemini, nothing re-rolled. **Read every PASS line's room key against what the
frame actually is before accepting a build**; the room slide most likely to be
mislabelled is the one shot outdoors.

Final: 9 slides — cover, dining, the grounds, great room, CMA, three text, CTA.
The golf frontage, the fee land and the $900 dues are the three best facts here
and none of them can carry a room slide (the course is only ever shot past the
lawn, and the other two are not photographable at all), so all three are text
slides. Fourth run in a row to make that call.


### Re-measured 2026-08-28 — the approval code is an instruction, and it was colliding

39 team actives, 22 ever queued, 18 never queued. Nine of the never-queued are
sales with `photosCount >= 12`. §"Re-measured 2026-08-27" had already struck
four by name and left four unchecked; all four were pulled as contact sheets
this run, so the unchecked column is finally down to one.

| Candidate | Photos | Verdict |
|---|---|---|
| **5803 Los Santos Dr #19, Palm Springs, $415k** | 56 | **Built.** Queued A8, 8 slides |
| 3470 Warren Vista, Yucca Valley, $399k | 64 | Re-checked and confirmed as recorded above: still the fallback, still a raw dirt lot |
| 1321 Sea Life Ave, Thermal, $315k | 48 | Checked and passed over — four bedrooms and almost every one empty, olive walls, oak cabinets, painted wall murals in three rooms |
| 7526 Apache Trail, Yucca Valley, $295k | 31 | Checked and **kept in reserve** — genuinely furnished and lived-in, the right answer when the feed needs a high-desert post. 31 frames with aerials among them is a thin shortlist next to 56 |
| 2502 Harbor Drive, Thermal, $230k | 17 | still unchecked |

**THE APPROVAL CODE IS NOT DECORATION AND IT WAS COLLIDING.** §"Decisions" says
the keyword carries a short code — `POST A4` — and bare `POST` works when
exactly one is pending. The generator drew that code at random from 23 letters
by 8 digits: 184 codes. With 22 posts already awaiting review the birthday odds
of a clash are better than even, and two had duly happened — 2800 E Vista Chino
and 71817 Samarkand Drive both hold **R4**, and this listing drew Hepburn
Drive's **L6** on its first build. Two live posts sharing a code is not a
cosmetic problem: `POST L6` is an ambiguous instruction to publish, and the
thing it is ambiguous about is which of another brokerage's listings goes out.
`build-pending-post.ts` now draws against the codes already held by
`awaiting_review` and `approved` records and widens to three characters if the
space is ever genuinely full. This build was reissued from L6 to **A8**.
The pre-existing **R4** pair is left alone: those codes are from earlier runs
and may already be written down.

**THE `poolYN` GUARD HAD A HOLE, AND A CONDO WITH A COMMUNITY POOL FOUND IT.**
§"Re-measured 2026-08-27" added the rule that not *every* named pool feature may
be a shared-facility one. That test only ever worked because Oak Tree's field
was the single word `"Association"`. Los Santos is `poolFeatures: "Community, In
Ground"` — the community pool, and it is in the ground — so `.every()` failed on
`" In Ground"`, the whole string read as private, and **THE POOL DECK** was
about to print over an enclosed private patio on a condo whose own remarks say
the pools are "steps from" it. `"In Ground"`, `"Gunite"`, `"Heated"`,
`"Salt Water"` describe how the water was *built* and say nothing about who owns
it. **Test ownership only:** a shared facility named and no private one named is
shared. A token that is silent on ownership must not be able to vote a shared
pool back into private.

**A UNIT NUMBER LIVES IN ITS OWN COMMA SEGMENT AND WAS BEING THROWN AWAY.**
`unparsedAddress` for this listing is `"5803 Los Santos Drive, 19, Palm Springs,
CA 92264"`, and the cover took `split(",")[0]`. So every unit-numbered listing
has been shipping a cover that names the building and not the door — 78250
Cortez Lane #129 and 255 S Avenida Caballeros #313 are already queued that way.
The unit now goes on **address line 2** with the city, not appended to line 1:
line 1 is 28pt inside a 480px panel with line 2 fixed 40px below it, so
`"5803 LOS SANTOS DRIVE #19"` at ~388 of 390 available would wrap and overprint
the city. Both address lines also picked up the hook's `width: 390` +
`crop: "fit"`, which they had never carried — the fourth member of the family
`copy-voice.md` §8 traces from the CTA overprint through the three-line room
caption to the bisected Evans Lane subtitle. Fixed in `simple-luxury.ts` and in
both `build-pending-post.ts` and `recover-pending-post.ts`; already-queued
covers need `recover-pending-post.ts` to pick it up.

**The selector moved again, exactly as §"Re-measured 2026-08-27" warns.** The
dump offered 1, 8, 48, 34, 7, 38, 3, 0, 4, 5, 6, 13, 16, 17; the build minutes
later staged 2, 10, 45, 7, 44, 18, none of which but 7 the dump had ranked in
that position. It returned **three of four** slots — living, kitchen, dining —
and no outdoor slide at all, because the patio frame the dump had ranked third
was never offered on the build. Exclude by category, expect the numbers to move,
and expect a room you planned for to simply not appear.

Final: 8 slides — cover, great room, kitchen, dining, three text, CTA. No CMA
(the subdivision has no closed-sale stats) and no outdoor slide. Two captions
were **rebanded rather than rebuilt**: the living line named a kitchen that the
chosen frame faces away from, and the kitchen line named stainless appliances
and the laundry stack, both of which are in the *dining* frame one slide later.
Free, no Gemini, no re-roll — the §"Re-measured 2026-08-23" arithmetic, which
here did not even need to be weighed.

### Re-measured 2026-08-31 — the watermark was in the OTHER corner

32 team actives, 26 ever queued, **four never-queued sales with ≥12 photos**.
Every one was pulled as a contact sheet this run rather than taken on the notes
above, and three of the four are out:

| Candidate | Photos | Verdict |
|---|---|---|
| **1321 Sea Life Avenue, Thermal, $315k** | 48 | **Built.** Queued L3, 7 slides |
| 2502 Harbor Drive, Thermal, $230k | 17 | The last unchecked name in the table above, and it is a **gut rehab**: bare studs, no drywall in two rooms, no flooring, no fixtures. Its own remarks say CASH ONLY, INVESTOR ONLY |
| 58540 Barron Drive, Yucca Valley, $285k | 29 | Re-confirmed vacant |
| 76434 Encanto Drive, 29 Palms, $325k | 26 | Re-confirmed vacant — a new build, empty in all 26 |

Two builds are missing from this log entirely — 27305 Hombria Drive (A7,
2026-08-29) and 4140 E Calle San Antonio (W6, 2026-08-30), both listings this
doc had previously struck by name. The pool is thin enough now that runs are
working back down the passed-over list, which is legitimate — those listings had
never been queued — but it should be recorded when it happens.

**THE "DIGITALLY ALTERED" CHECK READS THE TOP-LEFT CORNER AND THIS SET PUTS ITS
BADGE IN THE BOTTOM-RIGHT.** `actor-generation.md` §10 and
`scripts/tmp-watermark-strip.py` both come from 4140 E Calle San Antonio, whose
watermark sits top-left. Sea Life's photos 0, 2 and 4 carry **"AI Enhanced"** in
a rounded pill in the **bottom-right** corner — and those three are the only
frames in 48 that look furnished. The sectional, the great-room sofa and the
bunk beds are all generated; the house behind them is empty. The selector ranked
#0 and #2 fifth and sixth and offered both as `living` candidates, so a build
that trusted the shortlist would have shipped invented furniture with the badge
printed on the slide. `scripts/tmp-corner-strip.py` reads the other corner.

Three things generalise past this listing:

- **The disclosure tell does not fire here.** §10 says a remarks paragraph
  disclosing virtual staging is what makes the corner worth checking. Sea Life's
  remarks disclose nothing, and `furnished` reads `Unfurnished` while three
  photos show furniture — which is the same signal arriving through a field
  instead of a sentence. **Check both corners on every set**, and treat
  `furnished: Unfurnished` next to a furnished-looking frame as the tell.
- **A vacant house with one furnished room is still a vacant house, and it can
  still be worth building.** The `living` shortlist here was seven views of bare
  rooms. What made it shippable is that two of them have large hand-painted wall
  murals, so the empty room has a subject and the slide is about something. That
  is a narrower exception than "furnished enough" — a bare room with a blank
  wall (#6) was excluded for exactly the reason the rest were kept.
- **Write the room caption to nothing at all when seven frames could land in
  the slot.** The draft `living` line asserted only the floor material and the
  square footage — no object, no wall, no time of day, nothing a crop could
  contradict. Then the build picked the horse mural and the line was rebanded to
  name it. Cheaper and more reliable than guessing which bare room wins.

The §9 depth-ordering tell also paid for itself before any spend this time: the
selector's own placement text for photo 13 read *"standing **behind** the
kitchen island"*, which is the Palm Canyon and Oak Tree failure written out in
advance, for free, in the dump. Excluded on that sentence alone.

Yield was 2 of 4 — dining (#10) and the great room (#1), both clean composites,
feet on the floor and no depth failure. Both room captions were **rebanded and
neither render was touched**: the dining line named a kitchen that the chosen
frame faces directly away from, and the great-room line was the deliberately
object-free draft above. A third fix went through `tmp-retext-pending-post.ts`:
text slide 2's first paragraph was 95 characters, wrapped to three lines where
the generator had budgeted two, and paragraph 2 landed hard against it with no
gap. Not an overprint like Hepburn's CTA, but the same family — **keep a text
slide's first paragraph near 80 characters.**

Final: 7 slides — cover, dining, great room, three text, CTA. No kitchen slide
(#12 and #16 were both offered and neither passed), no CMA, no outdoor. The
permanent foundation and the FHA/VA eligibility it buys, the two-thirds acre
with eleven parking spaces, and the Salton Sea itself are the three best facts
here and none can carry a room slide, so all three are text slides. Fifth run in
a row to make that call.

### Re-measured 2026-09-01 — a subdivision named "Other" is not a subdivision

32 team actives, 21 ever queued, **11 never queued** — seven of them land
(`propertyType: D`), one a duplex (`C`, out of scope), and **three sales**. All
three were pulled as contact sheets again rather than taken on the notes above,
and two are confirmed out: 58540 Barron Drive is bare in all 29 frames and 2502
Harbor Drive is a gut rehab with no drywall or flooring in two rooms. That left
the one this doc had struck by name twice.

| Candidate | Photos | Verdict |
|---|---|---|
| **76434 Encanto Drive, 29 Palms, $325k** | 26 | **Built.** Queued F9, 8 slides |
| 58540 Barron Drive, Yucca Valley, $285k | 29 | Re-confirmed vacant, third time |
| 2502 Harbor Drive, Thermal, $230k | 17 | Re-confirmed gut rehab, second time |

**A SUBDIVISION DOCUMENT NAMED "Other" HOLDS A WHOLE CITY'S UNRELATED SALES, AND
THE CMA GUARD DID NOT KNOW THAT.** The guard skipped `not applicable` and `not
in a development` and nothing else. Encanto's `subdivisionName` is the
placeholder **"Other"**, and `subdivisions` has **152 documents literally named
"Other"**, one per city, each holding that city's miscellaneous closings — the
first one that came back on a name-only query was Other/San Jose, median close
**$1,301,000** at **$725/sqft**. On a $325,000 house in 29 Palms that is a CMA
slide asserting a market that does not exist, which is the valuation claim
`copy-voice.md` §9 forbids.

This particular build was saved by the *city* half of the query — there is no
Other/29 Palms document, so the lookup missed and the slide was skipped by luck,
not by the guard. Other/Desert Hot Springs, Other/Thermal, Other/Palm Desert and
Other/Blythe all exist and are all cities this team lists in, so the next such
listing would have printed one. `build-pending-post.ts` now tests
`subdivisionName` against a placeholder set — `not applicable`, `n/a`, `na`,
`not in a development`, `other`, `unknown`, `none` — **whole-string, not by
substring**, because "other" and "none" are not distinctive and "Mother Lode
Estates" is a real subdivision name. Same family as the `poolYN` guard: a field
that reads true through a value the guard did not name.

**THE EXCLUSION CATEGORY CAN MOVE *IN*, NOT ONLY OUT.**
§"Re-measured 2026-08-27" says to exclude by category and expect the numbers to
move, and every prior instance of that is a frame you kept not being offered.
This run is the mirror image. Photos 7, 10 and 17 were excluded by hand as §3
distant exteriors; **photo 8 is the same shot from the same distance, the
selector's dump never ranked it at all, and the build staged and passed it.**
The `pool` caption written for the covered porch then named a porch and a
concrete slab that are nowhere in that frame — Oak Tree's driveway failure
arriving through a frame no exclusion list could have been aimed at.

Fixed by **reband, not rebuild**: `exterior` → THE GROUNDS, which is what the
picture is. The composite itself was clean and it is the only slide in the post
that shows the two acres the cover is about, so dropping it would have cost more
than the eleven words did. Write an `exterior` row on every config even when the
stager cannot return that key — it exists to be a reband target.

**A vacant house is buildable when the subject is ARCHITECTURAL, which is a
wider door than Sea Life's murals.** §"Re-measured 2026-08-31" allowed a vacant
room with a hand-painted mural because the empty room had a subject. Encanto's
great room has a stone-faced fireplace, and unlike a mural a fireplace is
**telic** in the `actor-generation.md` §1 sense — there is something to *do* at
it — so it supports an action slide rather than only a reaction. Yield was 3 of
5 candidates against Sea Life's 2 of 4. The rule this pool has been applying,
"vacant listings are effectively not in the pool", is really *rooms with no
subject are not in the pool*; a fireplace, an island or a mural is enough.

**The generator has outrun the reviewer, and that is now the binding
constraint.** 27 posts sit `awaiting_review`, **zero approved**, and exactly one
listing has ever been posted. This log has spent five weeks measuring the intake
pool; the pool is not what is limiting the feed. Worth raising with the agent
before another five weeks of builds.

Final: 8 slides — cover, great room, kitchen, the grounds, three text, CTA. No
CMA (see above). The solar, the 2,500-gallon tank and the sewer being connected
and paid are the three best facts here and none can carry a room slide, so all
three are text slides. Sixth run in a row to make that call.

### Re-measured 2026-09-02 — nothing was built, and that is the correct output

**33 team actives, 27 ever queued, 10 never queued — and no buildable candidate
among the ten.** Seven are land (`propertyType: D`, 2–13 photos, no rooms), one
is the duplex at 66550 San Diego Drive (`C`, out of scope since 2026-08-13), and
the two remaining sales are the same two this log has already struck by name:

| Candidate | Photos | Verdict |
|---|---|---|
| 58540 Barron Drive, Yucca Valley, $285k | 29 | **Out — fourth confirmation.** See below |
| 2502 Harbor Drive, Thermal, $230k | 17 | Out — third confirmation. Remarks still open "CASH ONLY. INVESTOR ONLY" |

No new listing has come on since the 2026-09-01 run. 3048 Bahada Road carries an
`onMarketDate` of 2026-09-01 and looks new in a sort, but it is a relist — it was
queued (Z2/U8) on 2026-08-07. **Sort the pool on `onMarketDate` and it will hand
you back listings you have already built.**

**BARRON DRIVE IS THE CASE THAT MARKS THE OUTER EDGE OF THE 2026-09-01 RULE.**
That entry widened the door: not "vacant listings are out" but *"rooms with no
subject are out"* — a fireplace, an island or a mural is enough. Barron was
pulled as a contact sheet this run to be tested against the widened rule rather
than taken on the three prior strikes, and it fails it. What the 29 frames hold:

- **Five exteriors** (0–4) and **two dirt-lot frames** (27, 28). No patio, no
  hardscape, no structure — decomposed granite and Joshua trees.
- **Two kitchen frames** (5, 6) and they are the *only* rooms in the house with
  an object in them. Both are shot across the peninsula, which is the Oak Tree
  case exactly: §"Re-measured 2026-08-27" and `actor-generation.md` §9 say that
  when the depth-ordering tell fires on **every** frame of a room, the least-bad
  frame is not a candidate, it is the same frame. #6 has open vinyl in its left
  half, but the sink and counter — the only telic objects — sit behind the
  peninsula's near face and the dishwasher, both of which run across the
  foreground.
- **Everything else is a bare box**: living and dining (7–11) are white walls
  and dark carpet with a hallway through them, six bedrooms/closets (12, 13, 15,
  19, 20, 24, 25) are carpet and blank wall shot from the doorway with the door
  slab in the foreground, five are bathrooms (16, 17, 21, 22, 23 — never, §3),
  #18 is a damaged vanity top in close-up, and #26 is a stained garage floor.

So the widened rule and the original one agree here. Encanto had a stone-faced
fireplace and Sea Life had hand-painted murals; **Barron has one kitchen that can
only be photographed from the wrong side of its own counter, and eleven empty
rooms.** Every slide it could produce would be a figure standing in a bare room
over worn faux-parquet vinyl. Recording the frame numbers so the fifth run does
not pay for a fifth contact sheet: this listing is out until it is re-shot.

**AND THE REVIEW QUEUE IS STILL THE BINDING CONSTRAINT — UNCHANGED IN A DAY.**
§"Re-measured 2026-09-01" raised it; nothing has moved.

| | 2026-09-01 | 2026-09-02 |
|---|---|---|
| `awaiting_review` | 27 | **27** |
| approved / scheduled | 0 | **0** |
| distinct listings ever posted | 1 | **1** |

The oldest unreviewed post (R4, 2800 Vista Chino) has been sitting **30 days**.
And every listing that has ever been queued has a live `awaiting_review` build in
that stack — **zero listings have only declined builds** — so there is no listing
anywhere in the pool that could be rebuilt without putting a second version of
one house in front of the agent, which `.claude/skills/daily-carousel/source-post.md` names as the agent's
problem to untangle.

That makes "build nothing" the correct output rather than a failure to find
something. The alternative moves available were all worse than doing nothing:
a fifth Barron attempt would ship bare rooms, a rebuild would duplicate a queue
entry, and land and the duplex are out of scope. **A run that adds a 28th
unreviewed post to a queue with zero approvals is not producing anything.**

**What would actually refill this pool**, in the order it is worth doing:

1. **The agent reviews the 27.** This is the whole constraint. Twenty-seven posts
   at ~3 slots a week is nine weeks of feed already built and paid for.
2. **New team listings.** Intake has been bursty (§"Re-measured 2026-08-25") and
   the last one arrived 2026-08-26. Nothing is owed here — it arrives when it
   arrives.
3. **Re-shoots.** Barron and Harbor are both out on *photography and condition*,
   not on the properties. Neither becomes buildable without new frames.

**Tooling note: `scripts/tmp-pool-check.js` no longer completes.** It calls
`.find(...).toArray()` on `unifiedlistings` with no projection, so it pulls every
matched document's full `media` array — 33 listings × up to 87 photo records —
and the DigitalOcean cluster now drops the connection mid-cursor with
`PoolClearedOnNetworkError: server monitor timeout` after several minutes, having
printed nothing. `scripts/tmp-pool3.js` is the replacement: same report, but the
team query is an aggregation that projects the scalar fields and reduces the
photos to `{ $size: "$media" }`, so nothing large crosses the wire. It returns in
under a minute. `scripts/tmp-detail2.js` is the same fix for the per-listing
detail dump.

### Re-measured 2026-09-04 — the pool was never empty, the QUERY was narrow

**Four runs reported a shrinking pool and the last one reported none at all, and
all four were reading a team query narrower than the one this document
defines.** §"Identifying the team" says the pool is the union of (1) listings
carrying the literal string "The Obsidian Group" in an agent-name field and (2)
listings whose list or co-list agent is on the **derived roster**. What
`tmp-pool-check.js` and its replacement `tmp-pool3.js` actually match is

```js
$or: [{ listAgentTeamKey: TEAM }, { coListAgentId: TEAM }]
```

— key equality only, no roster. The two are not the same set:

| Query | Active team listings |
|---|---|
| key only (`tmp-pool3.js`) | 30 |
| documented definition (`tmp-pool4.js`) | **37** |

The seven it drops are listings where a **roster member is the list agent and
the co-list slot holds someone other than the team entity**, or is empty. Three
of them were already in the review queue and should have made this visible
sooner: 84146 Azzura Way, 28 Oak Tree Drive and 5803 Los Santos Drive #19 all
have live `awaiting_review` builds and none of the three matches the key query
today. **A listing the pool report calls out-of-pool while the queue holds a
build of it is the tell**, and it sat in two consecutive reports unremarked.

Three of the seven had never been queued at all, so 2026-09-02's "no buildable
candidate among the ten" was measuring the wrong ten:

| Candidate | Photos | Verdict |
|---|---|---|
| 3470 Warren Vista Ave, Yucca Valley, $399k | 64 | Out — mixed virtual staging, `actor-generation.md` §10 |
| 56616 Mountain View Trail, Yucca Valley, $378k | 44 | Out — vacant end to end, the 2026-09-01 rule |
| 7526 Apache Trail, Yucca Valley, $294,999 | 31 | **Built — X2.** |

Mountain View is Barron with new flooring: 44 frames, every interior a bare
room, the kitchen the only room with an object in it. Warren Vista is the first
set where the staged and unstaged versions of the *same rooms* both ship, with
one watermark across 36 interiors — written up in `actor-generation.md` §10,
because the lesson is about reading watermarks and not about this pool.

**The fix is that the scratch scripts never implemented the derivation, not a
new rule.** `tmp-pool4.js` does, and prints a `key` / `NAME` column so a future
run can see which listings only the documented definition reaches. Note the
field name: the roster derives from `listAgentName` / `coListAgentName`, **not**
`listAgentFullName` — a first pass used the latter, matched zero documents,
derived an empty roster, and printed a confident 30 that agreed exactly with the
narrow query it was meant to check. Same trap as `photoCount` / `photosCount` in
§"Gotchas when querying the pool", and worse, because here the wrong field name
does not return an empty pool, it returns the wrong answer twice.

**Four queued posts are for listings that have left `unifiedlistings`.** That
collection holds Active only, so a listing that goes pending or is withdrawn
stops matching; none of the four is in `unified_closed_listings` either.
Publishing any of them would advertise a home that is no longer on the market.

| Code | Queued | Listing |
|---|---|---|
| K6 | 2026-08-08 | 3010 N Chuperosa Road, Palm Springs |
| E4 | 2026-08-11 | 7798 Acoma Trail, Yucca Valley |
| V9 | 2026-08-13 | 9223 N Star Trail, Morongo Valley |
| V2 | 2026-08-22 | 1522 Sutherland Street, Lancaster |

So the queue is 28 `awaiting_review` and **24 publishable**, not 28. Those four
are the cheapest four decisions in the stack — they can be declined without
opening the slides. `scripts/tmp-stale-queue.js` prints this, and it is worth
running before any report that quotes a queue depth, because the number decays
on its own while nobody is looking at it.

**The X2 build: 2 of 4 room slides survived, and it was queued anyway.** Both
survivors are good renders with accurate captions, and one of the four losses
was a Gemini **503**, not a gate. No kitchen slide reached the post — three
kitchen frames were offered and every take was rejected for feet cropped or face
match. Rebuilding to chase a kitchen re-gambles two good renders to add one,
which is the Azzura arithmetic (§"Re-measured 2026-08-26") pointing the other
way, so the 7-slide post stands. There is no "add one slide" tool — only
`tmp-drop-slide.js` and `recover-pending-post.ts` — and building one was out of
scope for a run that already had a queueable post.

**`tmp-cover-preview.ts` composes the address differently from the generator.**
The preview builds line 1 from `streetNumber + streetName` and this feed's
`streetName` is `"Apache"` where `unparsedAddress` is `"7526 Apache Trail"`, so
the preview rendered 7526 APACHE and the queued cover correctly reads 7526
APACHE TRAIL. Harmless in production and actively misleading in review: a run
that judges a cover from the preview is looking at text the build will not ship.
Worth fixing in the preview before it is used to reject a cover over a defect
that only exists in the scratch script.

### Re-measured 2026-09-05 — the never-queued pool is exhausted, and the queue held a duplicate for 20 days

**The broad query is now the one being run, and it does not change the answer
today.** `tmp-pool4.js` returns the same 37 actives it returned yesterday — 30
reached by the key query, 7 only by the roster derivation — so no new team
listing arrived overnight. Thirteen of the 37 have never been queued, and they
break down as:

| Never-queued | Count | Buildable |
|---|---|---|
| Land (`propertyType` D) | 7 | no — nothing to stage |
| Rental (B) | 1 | no |
| Residential income (C) | 1 | struck below |
| Sales (A) | 4 | all four struck |

So the pool is empty of buildable candidates for the second time, and this time
against the documented definition rather than a narrower one.

**The duplex was struck on its photographs, not its category.** 66550 San Diego
Dr, Desert Hot Springs, $599k, 34 frames — the only never-queued row this log
had set aside on `propertyType` alone, so it was worth one sheet. Both units are
occupied and photographed as lived in: #2–#6 are a front room given over to
exercise equipment and several hundred potted plants, #16/#17 a hallway walled
with them, #8/#9/#11/#12/#14 beds under personal effects, #18–#21 two kitchens
with every counter in use. There is no frame the stager could place a figure
into that would read as a listing slide, and the copy standard — sell being
there — has nothing to take hold of. Frame numbers recorded so a second run does
not pay for a second sheet.

**56616 Mountain View Trail re-confirmed, with the frame numbers the first
strike did not record.** Interiors are #3–#28 and every one is bare: #3–#12 the
open living end, #13–#17 the kitchen, #19–#26 five empty bedrooms, #22/#27 the
baths, #28 the laundry. The renovation is real — new flooring, new cabinets, new
fixtures — and irrelevant, because the 2026-09-01 rule is about subjects in the
room and not about condition. #29–#43 are exterior and aerial.

**3470 Warren Vista re-confirmed the same way.** It is a new build on a bare
dirt lot: #1 is a floor-plan render, #5–#10 are lot-boundary overlays with the
parcel drawn in red, and the furnished interiors #15–#50 are renderings. The
tell that needs no watermark read is in the set itself — #48 and #49 are empty
rooms and #50 is the same room with a bed, and #34/#35 stage a canopy bed in a
room #36 shows unfurnished. Nobody has lived in this house; there is no
un-staged furnished frame to find.

**The queue held two live builds of 71817 Samarkand Drive for 20 days.**
`.claude/skills/daily-carousel/source-post.md` §4 says to pick the better build and delete the other *before
reporting*, and both R4 and F2 were queued on 2026-08-16 and both left
`awaiting_review`. That instruction is written as a step inside a build, so no
later run looked for a duplicate it had not created itself — which is why one
survived roughly a fortnight of daily runs. **The check belongs at the top of a
run, not at the end of a build:** `awaiting_review` count against distinct
`listingKey` count is one line of `tmp-stale-queue.js` output and it was already
printing 28 posts / 27 listings.

F2 kept, R4 deleted with its four Cloudinary derivatives
(`tmp-retire-duplicate.js`, which refuses a keeper on a different `listingKey`
or a `posted` record, and skips any `publicId` the keeper also references). Both
builds carry identical text slides, CTA and caption; they differ in the cover
crop and three staged frames, and F2 wins on both counts a reviewer would use:

| | R4 (deleted) | F2 (kept) |
|---|---|---|
| Great room | seated on the arm of the sectional, small in frame behind a white ottoman | standing, arms crossed, full figure |
| Kitchen | at the range — fine | at the sink counter — fine |
| Dining | **bent at the waist over a chair back** | standing beside the table, upright |
| Dining caption | "…with the living room right there and nothing between them" — no living room in the frame | "Solid wood table, high-backed chairs, and tile" — all three in frame |

R4's dining slide is the two failure modes this document keeps separately: a bad
pose *and* a caption naming something the crop does not contain. Choosing
between two builds is the cheapest quality decision available in the whole
pipeline — no Gemini, no rebuild, and it removes a post from the review stack
instead of adding one.

**Queue after this run: 27 `awaiting_review`, 27 distinct listings, 0 approved,
23 publishable.** The four stale entries from 2026-09-04 (K6, E4, V9, V2) are
unchanged — still no listing row, still the four cheapest declines in the stack.
One listing has ever been posted, on 2026-07-28. The binding constraint has not
moved in four days and is not a pool problem: **there is nothing left to build
that would not be a second version of a house already waiting.**

### Re-measured 2026-09-06 — nothing moved, and the daily run is now the wrong lever

**Third consecutive run with no build, and every input is byte-identical to
yesterday's.** `tmp-pool4.js` returns the same 37 actives, the same 30/7
key/roster split, and the same 13 never-queued rows. `tmp-stale-queue.js`
returns 27 `awaiting_review` against 27 distinct listings — no duplicate this
time — and the same four stale entries. Nothing arrived overnight and nothing
was reviewed overnight.

**The four struck candidates were re-checked by photo count, not by contact
sheet, which is the whole point of recording frame numbers.** A strike stands
unless the photo set changed, so the cheap test is whether the count moved:

| Struck candidate | Photos at strike | Photos today | Strike |
|---|---|---|---|
| 3470 Warren Vista Ave, Yucca Valley, $399k | 64 | 64 | mixed virtual staging, `actor-generation.md` §10 |
| 56616 Mountain View Trail, Yucca Valley, $378k | 44 | 44 | interiors #3–#28, every one bare |
| 58540 Barron Drive, Yucca Valley, $285k | 29 | 29 | bare in all 29, fourth confirmation |
| 2502 Harbor Drive, Thermal, $230k | 17 | 17 | gut rehab, CASH ONLY / INVESTOR ONLY |
| 66550 San Diego Dr, Desert Hot Springs, $599k | 34 | 34 | both units occupied, #2–#21 recorded |

None moved, so none was re-sheeted. That is four contact sheets not paid for,
and it only works because the previous two runs wrote the frame numbers down.
The remaining eight never-queued rows are seven land parcels and one rental —
nothing to stage, and no re-check is owed on a `propertyType`.

**The binding constraint is review, and generating daily against it is the
wrong lever.** The pool is not the problem and has not been for three days.
The arithmetic:

| | |
|---|---|
| Posted, ever | 1 listing (53806 Ridge Road), last on 2026-07-29 |
| `awaiting_review` | 27 |
| `approved` / `scheduled` | **0** |
| Publish slots since the last post | ~17 (Tue/Thu/Sun since 2026-07-29) |

The publish cron takes only `approved` posts, so it has had nothing to do for
five weeks — every slot has fired against an empty approved set while the
review stack grew to 27. A daily generation run against that can only do one
of two things, and it has now done both: add a second build of a house already
waiting (Samarkand, 20 days), or report an empty pool (three times).

So the recommendation is **pause the daily generation cron until the queue is
drawn down**, rather than log a fourth empty-pool entry. The work that is
actually available is all on the review side and none of it needs a build:

1. **Four declines that need no slides opened** — K6 (3010 N Chuperosa Road),
   E4 (7798 Acoma Trail), V9 (9223 N Star Trail), V2 (1522 Sutherland Street).
   All four have left `unifiedlistings`; publishing one would advertise a home
   that is off the market.
2. **23 publishable posts** waiting on an approve/decline that only Joseph can
   give.
3. At three slots a week, 23 approved posts is **roughly eight weeks** of feed
   already built. Generation does not need to run again inside that window.

**Approval-code reuse was checked and is not a defect.** Five codes appear on
more than one record (L3, E4, Y7, L8, L7), which reads alarming next to an SMS
path keyed on `POST <code>`. It is safe by construction: `build-pending-post.ts`
draws the code from `distinct("approvalCode")` over live records only, and
`post-approval-sms.ts` resolves it against `status: "awaiting_review"` only, so
a code is unique among exactly the set that can answer to it. Zero ambiguous
pairs today. Recorded here so the next run does not re-investigate it.

### Built 2026-09-07 — 57730 Cantata Drive, and the pool that had to be excluded

**The pool refilled by itself.** Four runs reported a shrinking or empty pool and
the last three recommended pausing generation. `tmp-pool4.js` today returns 38
broad actives against 31 key-matched, and one row in it is new: **57730 Cantata
Drive, La Quinta, $899,000, 77 photos**, listed 2026-09-06 by Ashley N Robertson
with The Obsidian Group co-listed. It is the first genuinely new name in the pool
in a week, and it is the answer to the constraint that emptied it — the four
standing strikes are all vacant, virtually staged, or a gut rehab, and Cantata is
lived in and offered furnished (the exclusions field reads "Pac Man Table,
personal items", which nobody writes about a staged house).

The four struck candidates were re-checked by photo count, per the rule above.
None moved: Warren Vista 64, Mountain View 44, Barron 29, Harbor 17. No contact
sheets paid for.

**Queued as K9, `6a9eca83d28360d85aa2c65a`, 9 slides.** Queue is now **28
`awaiting_review` against 28 distinct listings**, 0 approved. The four stale
entries are unchanged and unchanged for a fourth run — K6 Chuperosa, E4 Acoma,
V9 Star Trail, V2 Sutherland. None of the four has a `unified_closed_listings`
row either, so they did not sell; they simply left the Active feed.

**It took two builds and cost about twice the usual Gemini, because a documented
exclusion was not applied.** `actor-generation.md` §9 already said a frame whose
largest horizontal surface is water will stage the agent standing on it, and
already said to exclude those up front. The first build was run without that
exclusion and returned two unusable renders out of four:

| Frame | Gates said | The slide showed |
|---|---|---|
| #60 pool | feet-on-floor 100%, scale 0.74×, face 0.36 | agent in a suit standing **in the pool**, shoes on the submerged tanning shelf |
| #32 dining | all gates passed | both shoes resting on the dining table's cloth |

The water rule was written as "where the water dominates", and #60's water is
about 40% of the frame, which is why it was not read as a water frame. It has
been rewritten to "any water in the lower half" and the dining table has been
added to the near-face category. Cantata's exclusion list is recorded in the
config: `30,31,32,58,59,60,61,62,64,65,67,70`.

**The second build fixed the renders and lost the kitchen**, which is the
rebuild lottery working as documented: #21 came back keyed `great_room` rather
than `kitchen` and was deduped against #8, #37 (the primary bedroom, the one
frame this listing had never offered before) died on a Gemini 503, and only 2 of
4 survived. Build 1 held a good kitchen and a good great room; build 2 held a
good outdoor frame and nothing else new. **Neither was shippable alone at two
room slides.**

So the slide was **grafted** rather than a third build run —
`scripts/tmp-graft-slide.js <keeperId> <donorId> <donorSlideN> <room>`. A staged
slide is self-contained: the Cloudinary asset is a finished composite of this
listing's own photo and the band over it is a pure transform read from the
keeper's config, so moving one between two builds of the *same listing*
fabricates nothing. Both builds upload into the same `pending/<slug>/staged`
folder, so no copy is needed, and `tmp-retire-duplicate.js` already skips any
`publicId` the keeper still serves — it reported "shared with keeper, kept" and
destroyed only the loser's own assets. K2 is deleted; K9 carries photo indexes
`[22, 8, 51]`.

**Two things worth carrying forward beyond this listing:**

1. **The §8 cover test is run against the wrong image.** "Judge a cover frame by
   its right half" reads as a test on the listing photo, and that is how #60 was
   chosen — its right half is pool and sky. But the cover applies `ar_4:5,
   c_fill, g_auto` *first* and hangs the panel on the portrait crop, and `g_auto`
   scores saliency, which flat pool water has almost none of. It cropped to the
   trees and the cinderblock wall, and POOL DAY shipped over a block wall. The
   test is: **crop to 4:5 with g_auto, then look at the right ~56%.** Six
   candidates were rendered that way before #65 was chosen; the render costs a
   Cloudinary upload and no Gemini.
2. **A Gemini 503 prints the API key in the error URL.** The #37 rejection line
   carries `...generateContent?key=...` in full. It only reached a scratchpad log
   outside the repo this time, but it means **a build log is a secret-bearing
   artefact** and must never be committed, pasted into a report, or attached to a
   bug. Worth stripping the query string from that error before it is logged.

**The review queue is still the binding constraint and this run did not change
that** — 28 waiting, 0 approved, one listing ever posted. The difference from the
last three entries is that there was finally something new to build, so the
"pause generation" recommendation is narrowed rather than withdrawn: **generate
only when `tmp-pool4.js` shows a listing that has never been queued.** On a day
it does not, the four stale declines are still the cheapest work in the stack.

### No build 2026-09-08 — the pool is back to five standing strikes, and none moved

**Nothing new arrived overnight.** `tmp-pool4.js` returns **38 broad actives
against 31 key-matched**, byte-identical to yesterday's split — Cantata is still
the newest row and it was built yesterday. Thirteen of the 38 have never been
queued and they break down exactly as they did on 2026-09-05:

| Never-queued | Count | Buildable |
|---|---|---|
| Land (`propertyType` D) | 7 | no — nothing to stage |
| Rental (B) | 1 | no |
| Residential income (C) | 1 | struck, both units occupied |
| Sales (A) | 4 | all four struck |

**All five strikes re-checked by photo count, no contact sheet paid for.** This
is the cheap test the frame-number rule exists to make possible:

| Struck candidate | Photos at strike | Photos today | Strike |
|---|---|---|---|
| 3470 Warren Vista Ave, Yucca Valley, $399k | 64 | 64 | mixed virtual staging; #1 floor-plan render, #5–#10 lot overlays, #15–#50 rendered interiors |
| 56616 Mountain View Trail, Yucca Valley, $378k | 44 | 44 | interiors #3–#28, every one bare |
| 58540 Barron Drive, Yucca Valley, $285k | 29 | 29 | bare in all 29, fifth confirmation |
| 2502 Harbor Drive, Thermal, $230k | 17 | 17 | gut rehab, remarks open CASH ONLY / INVESTOR ONLY |
| 66550 San Diego Dr, Desert Hot Springs, $599k | 34 | 34 | both units occupied and lived in, #2–#21 recorded |

**No rule moved in a direction that would unstrike any of them.** Yesterday's
two edits to `actor-generation.md` — water broadened from "dominates" to "any
water in the lower half", and the dining table added to the near-face category —
both *add* exclusions. The 2026-09-01 subjects-in-the-room rule, which is what
Barron and Mountain View fail, is unchanged. So no re-verification is owed and
none was run.

**The queue is clean of duplicates for the second consecutive run.**
`tmp-stale-queue.js` prints **28 `awaiting_review` against 28 distinct
listings**, so no listing holds two live builds. The four stale entries are
unchanged for a fifth run — K6 (3010 N Chuperosa Road), E4 (7798 Acoma Trail),
V9 (9223 N Star Trail), V2 (1522 Sutherland Street). None has a
`unified_closed_listings` row; they left the Active feed rather than selling.
**24 of the 28 are publishable.**

**The 2026-09-07 narrowing holds and today is the day it bites:** generate only
when `tmp-pool4.js` shows a listing that has never been queued. It does not, so
no build was run and no Gemini was spent. The binding constraint is still
review — 28 waiting, **0 approved**, one listing ever posted (53806 Ridge Road,
2026-07-29), and every Tue/Thu/Sun slot since has fired against an empty
approved set.

### No build 2026-09-15 — the one FRESH row is a house already in the queue, relisted under a new key

**`tmp-pool4.js` returns 36 broad actives against 29 key-matched, and five FRESH
stageable rows (type A, ≥12 photos).** Four of the five are the standing
strikes. The fifth is new and is the trap:

```
20260914030856526270000000 | A | $529,000 | ph51 | 48423 Hepburn, Indio | key | FRESH
```

**It is not fresh. It is L6.** 48423 Hepburn Drive has been sitting in the
review queue since 2026-08-09 with 9 slides, under listing key
`20260616192248643487000000`. That key left the Active feed, and the property
came back on **2026-09-14 at the same $529,000 under a new key**,
`20260914030856526270000000`. Same house, same price, 51 photos.

**`FRESH` is computed against `pendingposts.listingKey`, so a relist reads as
never-queued.** Nothing in the pool report is wrong — the key genuinely has
never been queued — but the answer it gives to "has this house been built?" is
wrong, and building it would have put a second live build of one listing in
front of the agent, which §0 of the skill exists to remove.

The tell was in the repo, not the database: `scripts/data/pending/hepburn-drive.ts`
was already there, dated 2026-08-09, naming the same address, the same price and
the exclusion list from its build. **A config file in `scripts/data/pending/`
is a record that this listing has been built, and it survives the key change
that the listingKey test does not.** Check it before spending a build on any row
the pool calls FRESH.

**The same blind spot is in the publish cron, where it matters more.** The
already-posted guard at `src/app/api/cron/publish-pending/route.ts:126` finds a
prior `posted` record by `listingKey`. Two keys for one house defeat it, so a
relist is the one route by which this system could publish the same property
twice — the exact failure the guard was written for. Not fixed here; recorded
because the fix is an address match, not a key match, and that is a change to
the publish path rather than to a daily run.

**What the cron does *not* do is check that the listing is still Active** — it
only looks for a prior posted record. So L6 needs no repair to publish and its
stale key costs nothing at publish time. It was deliberately left untouched:
repointing a queued record at a new key is the agent's call, not a scheduled
run's.

**So the stale-decline stack is six, not seven, and it grew by two.** Since
2026-09-08, C4 (46109 Roadrunner Lane), Y7 (83633 Lapis Drive) and L6 left the
Active feed; L6 came back. None of the six has a `unified_closed_listings` row —
they left the feed rather than selling.

| Code | Listing | Built | Status |
|---|---|---|---|
| C4 | 46109 Roadrunner Lane, La Quinta | 08-06 | gone, no row at that address |
| K6 | 3010 N Chuperosa Road, Palm Springs | 08-08 | gone |
| **L6** | **48423 Hepburn Drive, Indio** | **08-09** | **relisted 09-14, publishable** |
| Y7 | 83633 Lapis Drive, Coachella | 08-10 | gone |
| E4 | 7798 Acoma Trail, Yucca Valley | 08-11 | gone |
| V9 | 9223 N Star Trail, Morongo Valley | 08-13 | gone |
| V2 | 1522 Sutherland Street, Lancaster | 08-22 | gone |

`scripts/tmp-relist-check.js` does this pass: it takes every stale
`awaiting_review` post, reads the address out of `listingSnapshot` (which has
`address`/`city`/`price`, **not** `streetNumber`/`streetName` — a query keyed on
those matches every document in the collection and prints a plausible-looking
wall of unrelated listings) and looks for a live row at that address.

**All five strikes re-checked by photo count. None moved, no contact sheet
paid for:** Warren Vista 64, Mountain View 44, Barron 29, Harbor 17, San Diego
34 — byte-identical to 2026-09-08. And no rule moved that could unstrike one:
zero commits to `docs/content-templates/` since that entry.

**`tmp-pool4.js` died at its 180s socket timeout, and the failure looks like a
result.** The roster aggregate is a full scan of `unifiedlistings` with two
regexes and no index, and it printed the roster line, then `ERR connection
timed out`, then **exited 0** — a run that scrolls past as "roster derived, no
pool". Socket timeout raised to 900s. Worth knowing because this script is the
skill's single source of truth for the pool, and its cheapest failure mode is
looking like an empty one.

**No build, no Gemini spent.** The queue is **28 `awaiting_review` against 28
distinct listings** — no duplicates, fourth consecutive clean run — of which
**22 are publishable**, still **0 approved**, and still one listing ever posted
(53806 Ridge Road, 2026-07-29). The 2026-09-07 narrowing holds and is doing its
job: generate only when the pool shows a listing that has never been queued, and
today's candidate had been.

### No build 2026-09-16 — a relist two days running, and this one came back at a different price

**Yesterday's trap, one day later and a different house.** `tmp-pool4.js` returns
**35 broad actives against 28 key-matched** and five FRESH stageable rows (type
A, ≥12 photos). Four are the standing strikes. The fifth is new and is the same
shape as yesterday's Hepburn Drive:

```
20260915183238136289000000 | A | $699,000 | ph41 | 3010 Chuperosa, Palm Springs | key | FRESH
```

**It is K6.** 3010 N Chuperosa Road has been in the review queue since
2026-08-08 with 8 slides under key `20260203160658521251000000`. That key left
the Active feed and the property came back on **2026-09-15** under
`20260915183238136289000000` — same 1,584 sqft, same 41 photos, same Peyson
Robertson / The Obsidian Group. `scripts/data/pending/chuperosa-road.ts` was
already there, dated 2026-08-08, naming the same address and carrying the
exclusion list from the build that queued as K6. **The repo check caught it
before any Gemini was spent, for the second consecutive run.**

Two relists in two days is enough to stop calling this a coincidence. The
2026-09-15 entry recommended checking `scripts/data/pending/` before spending a
build on any FRESH row; that should be read as a required step, not a
precaution.

**AND A RELIST CAN COME BACK AT A DIFFERENT PRICE, WHICH SPLITS THE CLASS IN
TWO.** Hepburn relisted at the same $529,000, so the 2026-09-15 entry concluded
a relisted post "needs no repair to publish" — the queued slides were still
accurate and only the key was stale. **Chuperosa relisted $50,000 lower**, and
K6's cover prints the old number in the panel
(`l_text:Poppins_60_medium:%24749%252C000`) with `$749,000` closing the caption
as well. So:

| | Stale key | Slides still accurate | Publishable as-is |
|---|---|---|---|
| L6 Hepburn, relisted at $529,000 | yes | yes | yes |
| **K6 Chuperosa, relisted at $699,000** | yes | **no — cover and caption both assert $749,000** | **no** |

A post whose cover overstates another brokerage's list price by $50,000 is the
same category of false claim as THE POOL DECK over a golf-course patio
(§"Re-measured 2026-08-27"), arriving through a field that was true when it was
written. **A stale key is cosmetic; a stale price is not.** The repair is cheap
— the cover is a pure Cloudinary transform over a stored `publicId` and the
caption is a text field, so `recover-pending-post.ts` picks both up — but
repointing a queued record at a new key is the agent's call and not a scheduled
run's, which is the same line the 2026-09-15 entry drew for L6 and did not
cross.

**L6 itself has already left again.** Yesterday it was Active under
`20260914030856526270000000` and recorded here as publishable; today
`48423 Hepburn Drive, Indio` returns no row at all. A relist is not a state that
settles — it lasted two days. **Anything this log records as "relisted,
publishable" has to be re-checked on the day it is acted on**, not taken from
the entry that recorded it.

**`tmp-relist-check.js` was offering a neighbour's front door as a relist.** U5
(255 S Avenida Caballeros **#313**, $354,900, Alan E Mckeefry) is newly stale
this run, and the checker answered it with 255 S Avenida Caballeros **#305** —
$320,000, listed by Deewayne Sowels / Robert A Wills, who are not on the roster.
Same complex, same 1,046 sqft floor plan, different door, different brokerage.
Taken at face value that reads as "U5 relisted, cheaper", which is the Chuperosa
conclusion drawn about a unit the team does not list. Two defects, both fixed:

- **A leading directional blanked the street filter.** The name comparison took
  `streetName.split(" ")[0]` and mapped a bare `"n"` to `""`, so
  `"N Chuperosa Road"` compared as the empty string, matched nothing, and fell
  through to the *unfiltered* list — every listing sharing the street number.
  That is why K6's row printed 3010 N Redwood Drive and 3010 North Avenida
  Caballeros as candidates. Directionals are now stripped, not blanked.
- **First-token comparison is wrong for Spanish-convention names.** In
  `"Avenida Caballeros"` the first token is the street *type*, so it collapsed
  to `"avenida"` and matched `"Avenida Granada"`. The comparison is now the whole
  name minus a trailing type suffix — `"Chuperosa Road"` still equals
  `"Chuperosa"`, and Caballeros no longer equals Granada.

The checker now also prints **unit number, sqft, listing agents, and an explicit
`sqft MATCH / price MOVED` line** per candidate. Sqft alone cannot separate two
units of one floor plan — #305 and #313 are both 1,046 — so **the unit number
and the agents are the discriminators**, and they have to be on screen to be
used. K6 now returns exactly one candidate instead of four.

**All five strikes re-checked by photo count. None moved, no contact sheet paid
for:** Warren Vista 64, Mountain View 44, Barron 29, Harbor 17, San Diego 34 —
byte-identical to 2026-09-08 and 2026-09-15. No rule moved that could unstrike
one either: the only commit to `docs/content-templates/` since the last entry is
that entry itself.

**One broad-pool row left the feed unaccounted for.** Yesterday was 36 broad /
29 key; today is 35 / 28. Hepburn leaving (−1) and Chuperosa arriving (+1) net
to zero, so a second key-matched row also left. Yesterday's entry recorded only
the counts and the FRESH rows, so the pool cannot be diffed after the fact.
**Worth having `tmp-pool4.js` write its full key list to a dated file** so a
one-row drift is attributable rather than noticed and dropped, as it is here.

**The stale stack is eight posts, and the split matters more than the count:**

| Code | Listing | Built | Status |
|---|---|---|---|
| C4 | 46109 Roadrunner Lane, La Quinta | 08-06 | gone |
| **K6** | **3010 N Chuperosa Road, Palm Springs** | **08-08** | **relisted 09-15 at $699,000 — slides assert $749,000** |
| L6 | 48423 Hepburn Drive, Indio | 08-09 | relisted 09-14, **gone again 09-16** |
| Y7 | 83633 Lapis Drive, Coachella | 08-10 | gone |
| E4 | 7798 Acoma Trail, Yucca Valley | 08-11 | gone |
| V9 | 9223 N Star Trail, Morongo Valley | 08-13 | gone |
| **U5** | **255 S Avenida Caballeros #313, Palm Springs** | **08-14** | **gone — #305 is a different door, not a relist** |
| V2 | 1522 Sutherland Street, Lancaster | 08-22 | gone |

None of the eight has a `unified_closed_listings` row; they left the Active feed
rather than selling. Seven are clean declines that need no slides opened. K6 is
a decline *or* a price correction, and that is Joseph's call.

**No build, no Gemini spent.** The queue is **28 `awaiting_review` against 28
distinct listings** — no duplicates, fifth consecutive clean run — of which
**20 are publishable**, still **0 approved**, and still one listing ever posted
(53806 Ridge Road, 2026-07-29). The 2026-09-07 narrowing holds for the second
day running: generate only when the pool shows a listing that has never been
queued, and today's candidate had been.

### No build 2026-09-17 — the pool is byte-identical, and the third relist is a different brokerage

**Third consecutive run with no build, and for the third consecutive run the
repo check is what stopped it.** `tmp-pool4.js` returns **35 broad actives
against 28 key-matched** and five FRESH stageable rows (type A, >=12 photos) —
the same five as yesterday. Four are the standing strikes. The fifth is
`20260915183238136289000000 | $699,000 | ph41 | 3010 Chuperosa` — **still K6**,
still relisted, still carrying `scripts/data/pending/chuperosa-road.ts` dated
2026-08-08. Nothing arrived overnight and nothing was reviewed overnight.

**All five strikes re-checked by photo count. None moved, no contact sheet paid
for:** Warren Vista 64, Mountain View 44, Barron 29, Harbor 17, San Diego 34 —
byte-identical to 2026-09-08, 09-15 and 09-16. And no rule moved that could
unstrike one: the only commit touching `docs/content-templates/` since the last
entry is that entry itself.

**The pool now records its own membership, so the next run can diff it.** The
2026-09-16 entry closed on a one-row drift it could see but not attribute —
36/29 became 35/28 with one arrival and one departure netting to zero, and no
run had ever written down *which* keys it saw. `tmp-pool4.js` now writes
`scripts/data/pool-snapshots/<date>.json` (every key with address, price, photo
count, type and key/NAME match) and prints a `POOL DIFF` block against the most
recent prior snapshot: `LEFT`, `ARRIVED`, and `PRICE` for a row that stayed but
repriced. Today is the baseline, so today's diff is empty by construction and
tomorrow's is the first real one. **The price line is the part that earns its
keep** — a queued post whose listing repriced under the same key is the K6
failure mode arriving without a relist to announce it, and nothing in the
pipeline was watching for it.

**The third relist in three days, and this one is not the team's listing.** V9
(9223 N Star Trail, Morongo Valley) has been a clean decline since 2026-09-08.
Today `tmp-relist-check.js` answers it with a live row, and the discriminators
added yesterday are what make it readable in one line:

```
-> 20260916201000004332000000 Active $349000 9223 Star Morongo Valley ph47 765sf
   2026-09-16 | Christopher Kreiling / undefined
   sqft DIFFERS | price MOVED $359,000 -> $349,000
```

**765 sqft against the queued 345, and Christopher Kreiling is not on the
derived roster** — the row does not appear anywhere in `tmp-pool4.js`'s 35
broad actives, which is the independent confirmation. V9 credits Ashley N
Robertson, who is. So this is the Avenida Caballeros shape rather than the
Chuperosa shape: **a live row at the queued address that belongs to someone
else.** Publishing V9 off the back of it would credit the wrong brokerage on
another agent's listing. It stays a decline.

That makes three consecutive runs in which a stale post's address came back
live, and only one of the three (L6 Hepburn, and only for two days) was the
queued house at the queued price. **The address matching is now doing real
work, and its value is in the rows it rejects**, not the ones it returns.

**The stale stack is eight, unchanged in membership for a second run:**

| Code | Listing | Built | Status today |
|---|---|---|---|
| C4 | 46109 Roadrunner Lane, La Quinta | 08-06 | gone |
| **K6** | **3010 N Chuperosa Road, Palm Springs** | **08-08** | **relisted 09-15 at $699,000 — slides assert $749,000** |
| L6 | 48423 Hepburn Drive, Indio | 08-09 | gone again, confirmed second day |
| Y7 | 83633 Lapis Drive, Coachella | 08-10 | gone |
| E4 | 7798 Acoma Trail, Yucca Valley | 08-11 | gone |
| **V9** | **9223 N Star Trail, Morongo Valley** | **08-13** | **gone — the live row is 765sf under a non-roster agent** |
| U5 | 255 S Avenida Caballeros #313, Palm Springs | 08-14 | gone — #305 is a different door |
| V2 | 1522 Sutherland Street, Lancaster | 08-22 | gone |

Seven are clean declines that need no slides opened. K6 is a decline *or* a
price correction, and that is Joseph's call — repointing a queued record at a
new key is not a scheduled run's to make.

**No build, no Gemini spent.** The queue is **28 `awaiting_review` against 28
distinct listings** — no duplicates, sixth consecutive clean run — of which
**20 are publishable**, still **0 approved**, and still one listing ever posted
(53806 Ridge Road, 2026-07-29). The 2026-09-07 narrowing holds for the third day
running: generate only when the pool shows a listing that has never been queued.

### No build 2026-09-18 — the first real pool diff, and it is A7 leaving the feed

**Fourth consecutive run with no build.** `tmp-pool4.js` returns **34 broad
actives against 27 key-matched** and the same five FRESH stageable rows as
2026-09-17. Four are the standing strikes — Warren Vista 64, Mountain View 44,
Barron 29, Harbor 17 photos, none moved, so no contact sheet paid for. The fifth
is still `20260915183238136289000000 | 3010 Chuperosa | $699,000` — **K6
relisted**, caught again by `scripts/data/pending/chuperosa-road.ts`.

**The snapshot diff did its first job.** Yesterday's baseline let today's run
name the one-row drop instead of guessing at it:

```
LEFT   20260821015844740586000000 $429000 27305 Hombria, Cathedral City
```

That key is **A7** (27305 Hombria Drive, built 2026-08-29). `tmp-relist-check.js`
finds no active or any row at the address and nothing in the closed collection
under the original key — the same shape as the other clean declines. A7 joins
the stale stack, which is now **nine**: C4, K6, L6, Y7, E4, V9, U5, V2, A7.
Nothing else in the stack changed — K6 still $699,000 against the $749,000 its
slides print, V9 still the 765sf non-roster row, U5 still other doors.

**No build, no Gemini spent.** The queue is **28 `awaiting_review` against 28
distinct listings** — no duplicates, seventh consecutive clean run — of which
**19 are publishable** (down one, A7), still **0 approved**, and still one
listing ever posted (53806 Ridge Road, 2026-07-29).

### No build 2026-09-19 — the pool diff is empty, so there is nothing to decide

**Fifth consecutive run with no build.** `tmp-pool4.js` prints `POOL DIFF vs
2026-09-18 … no change — same listings, same prices`: **34 broad / 27
key-matched**, the same five FRESH stageable rows. Four are the standing strikes
(Warren Vista 64, Mountain View 44, Barron 29, Harbor 17 — photo counts
unchanged, no contact sheet paid for). The fifth is K6 Chuperosa relisted at
$699,000, caught again by `scripts/data/pending/chuperosa-road.ts`.

`tmp-relist-check.js` reads the stale stack exactly as yesterday: nine posts
(C4, K6, L6, Y7, E4, V9, U5, V2, A7), K6 still $50,000 under the price its
slides print, V9 still the non-roster 765sf row, U5 still other doors, the rest
gone with nothing in the closed collection.

A byte-identical diff is the snapshot's cheapest answer: with no LEFT, ARRIVED
or PRICE line, every conclusion from 2026-09-18 carries forward unchanged and
nothing needed re-checking by hand. **No build, no Gemini spent.** Queue: **28
`awaiting_review` / 28 distinct**, **19 publishable**, **0 approved**; the only
`posted` records are the two for 53806 Ridge Road (Y5 and the MCP post).

### Built 2026-10-17 — 80519 Avenida Santa Isadora, and the dump does not predict the build

**First build since 2026-09-07, and the first run in four weeks.** The last
entry here is 2026-09-19; nothing ran between then and today. The gap is the
single most useful fact in this entry, because it is what refilled the pool:
`tmp-pool4.js` returns **40 broad actives against 33 key-matched** (was 34/27)
and **twelve** FRESH stageable rows (was five).

**The snapshot diff paid for itself across a month-long gap.** It named every
change without a single hand check:

```
LEFT    Vista Chino $999,500 · Warren Vista $399,000 · 1950 Palm Canyon $299,999
        0 Alder Creek $30,000 · 77110 Indiana $2,650
ARRIVED Gods Way Love $895,000 · Avenida Rubio $560,000 · Willow $529,900
        17 Lugo $529,000 · Santa Isadora $468,900 · Latham $452,000
        Calle Bosque $419,900 · Los Santos $399,000 · Acoma $294,000
        La Brisa $175,000 · 03 Foothill $96,500
PRICE   Azzura $625,000 -> $575,000 · Sierra · 16 Woodward · 17 Woodward
```

Note **Warren Vista LEFT the feed** — the mixed-virtual-staging strike from
2026-09-04 is now moot, and the standing-strike list drops from five to three
(Mountain View 44 ph, Barron 29 ph, Harbor 17 ph, all byte-identical).

**Nine of the twelve FRESH rows are disqualified before any spend, and three of
those nine by the repo check rather than the database.** Chuperosa, Acoma and
Los Santos are all relists of houses already queued, caught by
`scripts/data/pending/{chuperosa-road,acoma-trail,los-santos}.ts`. That is the
third, fourth and fifth time the repo check has stopped a duplicate build that
every key-based test called FRESH.

**That leaves six genuinely never-built rows** — Avenida Rubio 40 ph, Willow 27,
Lugo 35, **Santa Isadora 52**, Latham 34, Calle Bosque 41 — the first real
choice this skill has had since August. Santa Isadora wins on photo depth,
which is the thing the stager spends.

#### The stale stack is eleven, and a second post is now a price correction

| Code | Listing | Built | Status today |
|---|---|---|---|
| **R4** | **2800 E Vista Chino, Palm Springs** | 08-03 | **new** — gone, nothing in closed |
| C4 | 46109 Roadrunner Lane, La Quinta | 08-06 | gone |
| **K6** | **3010 N Chuperosa Road, Palm Springs** | 08-08 | **$699,000; slides print $749,000** |
| L6 | 48423 Hepburn Drive, Indio | 08-09 | gone |
| Y7 | 83633 Lapis Drive, Coachella | 08-10 | gone |
| **E4** | **7798 Acoma Trail, Yucca Valley** | 08-11 | **relisted 09-24 at $294,000; slides print $299,000** |
| V9 | 9223 N Star Trail, Morongo Valley | 08-13 | gone — live row is 765sf, non-roster agent |
| U5 | 255 S Avenida Caballeros #313 | 08-14 | gone — four live rows, all other doors |
| V2 | 1522 Sutherland Street, Lancaster | 08-22 | gone |
| **L7** | **1950 S Palm Canyon Drive #128** | 08-23 | **new** — #134 and #151 are other doors, #151 is a rental |
| A7 | 27305 Hombria Drive, Cathedral City | 08-29 | gone |

**E4 is the K6 shape, and now there are two of them.** `tmp-relist-check.js`
returns `20260924025028354964000000 Active $294000 ... Peyson Robertson / The
Obsidian Group`, sqft MATCH, $5,000 under what the cover and caption print. Same
agent, same team, same house. Neither K6 nor E4 is a decline and neither is
publishable as built; repointing a queued record at a new key is the agent's
call, not a scheduled run's.

#### The build: code G6, 8 slides

Exclusions `7,21,25,27,39,40,42,43,44`, aimed at `tmp-selector-dump.ts`:
pool-water frames (§9's absolute "any water in the lower half" test), the
across-the-island kitchen, the doorway bedroom, the front driveway, and an
empty tile passage. Reasoning per frame is in
`scripts/data/pending/avenida-santa-isadora.ts`.

**THE DUMP AND THE BUILD RAN DIFFERENT SELECTIONS, AND THAT IS NEW.** The skill
reads as though `tmp-selector-dump.ts` tells you what the build will be handed,
so exclusions can be aimed at it. It does not. The dump's fourteen were #15,
#22, #39, #41, #27, #18, #32, #7, #14, #16, #24, #25, #20, #21. The build's own
nine were **#17, #18, #37, #14, #15, #16, #24, #20, #22** — #17 and #37 are in
the build's list and were never in the dump's, while #41 and #32 are in the
dump's and never reached the build despite not being excluded.

The selector re-reads and re-ranks every photo on every run, the same way
`stage_geometric.py` re-keys a frame between builds (copy-voice.md §8, Acoma's
#15 coming back `kitchen` then `great_room`). So:

> **A dump-derived exclusion list is a filter, not a plan.** It is still worth
> paying for — it is how the *categories* get named, and three of the frames
> excluded here did appear in the build's own list — but do not count on a
> specific frame surviving to fill a specific slot, and do not count on an
> unexcluded frame being offered at all.

That cuts both ways and it cut favourably today: **#41, the covered patio with a
sliver of pool water just below the midline, was the one frame this run was
unsure about, and it was never offered.** The §9 bet was never placed. It also
means the post has no outdoor room slide; the pool is carried by the cover.

Staging returned **3/4 slots**: #17 `great_room`, #18 `dining`, #20 `kitchen`.
#15 and #22 lost every take — #22 in the instructive way, three action takes
rejected on scale (0.32x, then face 0.316, then 1.86x) and then all three
reaction takes rejected on identity at cos 0.018 / 0.039 / 0.054. That last
number is the §8 "statistically a different man" figure, caught by the gate and
never composited.

**Then one of the three was dropped, and the reason was duplication rather than
a bad render.** #17 and #18 are *the same glass dining table*, and the stager
gave both the same action — "pulling out a chair at the dining table". Two
consecutive slides, one table, one posture: `actor-generation.md` §6 forbids two
slides sharing a body posture and a camera relationship, and at Instagram speed
it reads as the same photograph twice.

Both renders are good, so the choice was about coverage, not quality: **#18 was
dropped and #17 kept**, because #17 is the only frame in the post containing the
great room — the sectional, the fireplace and the teal wall sit behind the table
in it, and #18 shows nothing #17 does not except the patio slider. `THE GREAT
ROOM` over a frame whose foreground is a dining table is a compromise, and the
`living` caption ("Tile underfoot, vaulted ceilings, and one open room from end
to end") is true of it in a way the label alone is not.

> **The duplication is not visible from the build log.** `#17 PASS (great_room)`
> and `#18 PASS (dining)` are two different room keys and the de-duplication
> correctly let both through. Only looking at the images shows they are one
> room. This is the §4 "actually look at what you made" rule firing on
> something none of the gates is designed to catch.

`tmp-drop-slide.js 6ad40e450b45e02118b579e5 3` — slide destroyed, remaining
renumbered, `photoIndexes` trimmed to `[17,20]`.

#### The cover: a template bug, fixed rather than worked around

`80519 AVENIDA SANTA ISADORA` is 27 characters against the ~25 the 390px panel
holds at 28pt, so address line 1 wrapped and printed `ISADORA` straight through
`INDIO, CA` at y:510. copy-voice.md §8 had already named line 1 a coin flip;
this is the run that lost it. The fix is in `simple-luxury.ts` — the line is now
sized to one line through `fitHeadline` (22pt here, unchanged at 28pt for
everything that fitted before) — and is written up in copy-voice.md §8. Verified
on the real build, not only on a preview.

Cover frame is **#43**, chosen over the twilight hero #0 after rendering both:
#0 is beautiful in landscape and loses everything to the 4:5 `g_auto` crop
except two power poles and cracked asphalt. Accent `8C3A1F`, rust off the tile
roof and the waterfall stone in that same frame; the drafted teal — the house's
own accent-wall colour — rendered as the same family as the pool water beside
it, which is the Ridge Road failure.

#### Where the queue stands

**29 `awaiting_review` against 29 distinct listings** — no duplicates, eighth
consecutive clean run — of which **18 are publishable**, still **0 approved**,
and still one listing ever posted (53806 Ridge Road, two `posted` records).
Code **G6**, id `6ad40e450b45e02118b579e5`, 8 slides.

## Implementation map

| Piece | Where | Notes |
|---|---|---|
| Model | `src/models/PendingPost.ts` | Scoped by `agentId`. Statuses: `generating`, `awaiting_review`, `approved`, `posted`, `declined`, `expired`, `failed` — there is no `scheduled` status; a schedule is `scheduledFor` on an `approved` post. Slides are `{ n, publicId \| null, url, kind }`; text and CTA slides have no `publicId` (they are transforms over a built-in sample). |
| Generator | `scripts/build-pending-post.ts <slug> [--exclude 3,7,12]` | Copy lives in `scripts/data/pending/<slug>.ts`, hand-written per listing. Pipeline: `selectStagingPhotos` → `stageGeometric` (`scripts/stage_geometric.py`) → band → cover → CMA (only if the subdivision has closed-sale stats) → text + CTA → insert `awaiting_review`. It always inserts and never supersedes, so a rebuild makes a second record. Hardcodes Joseph's headshot, email, handle and broker logo — tenant one. |
| Scheduled generation | `.claude/skills/daily-carousel/` | A scheduled Claude task, not a Vercel cron. `vercel.json` only schedules `auto-approve-partners`, `publish-pending` (hourly) and `mls-sync`. |
| Review UI | `src/app/agent/cms/components/InstagramContent.tsx` | Rendered on `/agent/cms`. |
| Review API | `GET /api/agent/pending-posts`, `PATCH /api/agent/pending-posts/[id]` (`approve` / `decline` / `schedule`), `GET /api/agent/pending-posts/archive`, `POST /api/agent/pending-posts/[id]/imprint` (regenerate one slide from the agent's note) | Approving without a slot stamps `scheduledFor = nextPostSlot()`. Decline keeps per-slide `slideFeedback`. |
| SMS approval | `src/lib/messaging/post-approval-sms.ts`, called from `/api/crm/sms/webhook` **before** the contact lookup | Only the agent's own cell can approve; a client texting `post` falls through to normal handling. |
| Publish | `src/app/api/cron/publish-pending/route.ts`, `src/lib/instagram-publish.ts` | Hourly; acts only at 9:00 Pacific on Sun/Tue/Thu (`?force=1` overrides). Takes `approved` posts, first-approved first, **one per slot**. Skips (and marks `expired`) a listing already `posted`. A failure leaves the post `approved` and counts `failedAttempts`; at 5 it becomes `failed`. On success it destroys the Cloudinary assets, empties `slides`, sets `assetsDeletedAt` and `archivedAt`. |
| Disclosure | `is_ai_generated` | Sent to Meta by default (`isAiGenerated !== false`). |

## Not built, and what it would take

- **"Posts are ready" text.** The senders exist — `notifyPostsReady`, `notifyPostSlotDue` and `notifyPostPublished` in `src/lib/messaging/notify-agent-posts.ts`, on `TWILIO_ALERT_NUMBER` — but nothing calls them (not the generator, the publish cron or the skill), so nothing texts the agent about a queued post and approval by SMS needs the agent to already know the code. Texting the agent themselves is low-volume to an opted-in recipient and works on the shared number; texting *other* agents at scale is A2P-gated per `twilio.md`.
- **Grace window, expiry, roll-forward.** The publish cron has no notion of a missed slot beyond "approved posts go at the next 9am slot". Unapproved posts stay `awaiting_review` forever.
- **Sweep for declined/expired posts.** Their Cloudinary assets are kept (the agent may regenerate from the same source) and nothing ever removes them. Any sweep must stay a separate job so a failed delete never makes a successful post look failed.
- **Reels** on non-carousel days — the `staging-timelapse-reel` video backend is TBD (ComfyUI, Kling and Luma were all evaluated and deprecated 2026-08-07).
- **Multi-tenant pool and cost control.** Per-agent pool config, per-agent number + A2P, and credit billing for Gemini spend (roughly $0.16–$0.40 per build) are all open. `PendingPost` is `agentId`-scoped from the start; the generator is not.

## Scratch scripts the skill depends on

`scripts/tmp-stale-queue.js`, `tmp-pool3.js`, `tmp-pool4.js`, `tmp-detail2.js`,
`tmp-drop-slide.js`, `tmp-graft-slide.js`, `tmp-retire-duplicate.js`,
`tmp-retext-pending-post.ts` and `tmp-selector-dump.ts` are committed.
`scripts/reband-pending-post.ts`, `scripts/recover-pending-post.ts`,
`scripts/tmp-pool-check.js` (superseded by `tmp-pool3.js`),
`scripts/tmp-cover-preview.ts`, `scripts/tmp-watermark-strip.py` and
`scripts/tmp-corner-strip.py` are referenced throughout this doc but were
**untracked in git** as of 2026-10-17 — they exist only in Joseph's working
copy, so a fresh clone cannot run them.
