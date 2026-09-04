---
title: Automated carousel posting — generate, review, approve, publish
status: planned
last_verified: 2026-09-04
owner: content
related: [./README.md, ./carousel-slides.md, ./actor-generation.md, ../integrations/twilio.md]
---

# Automated carousel posting

**Status: planned.** Nothing in this doc is built yet. It is the agreed design.

## TL;DR

A cron builds candidate carousels from the team's active listings, uploads the
slides to Cloudinary, and texts the agent. The agent reviews on the dashboard
and approves — or replies `POST` by SMS. Approved posts publish on the next
Tue/Thu/Sun slot. Nothing publishes without explicit approval. Slides are
deleted from Cloudinary after publishing.

Instagram has no drafts or scheduling API (verified against Meta's live docs
2026-07-26 — the container endpoint accepts no `scheduled_publish_time` and
exposes no drafts endpoint), so the review-and-schedule step is ours to own.

## Decisions

| Question | Answer |
|---|---|
| SMS approval keyword | **`POST`** — `YES`/`START`/`STOP`/`HELP` are carrier-mandated A2P keywords and cannot be repurposed |
| Multiple queued | keyword carries a short code (`POST A4`); bare `POST` works when exactly one is pending |
| Unapproved at slot time | **grace window of 2 hours** after the slot — approve inside it and it still posts. Past that it rolls to the next slot date |
| Never approved | never publishes. Rolls forward until declined or expired |
| Listing pool | **The Obsidian Group** (see below) |
| Generation cadence | **Sun / Tue / Thu**, each run targeting a slot **≥3 days out** |
| Candidates per run | **multiple** — the agent declines or regenerates ones that came out badly |
| Posting slots | **Tue / Thu / Sun** for carousels. Reels on other days, later — the reel pipeline is still WIP |
| Listing preference | newer listings preferred, not required |
| Slide retention | delete from Cloudinary after a successful publish |

## Identifying the team

The Obsidian Group is **not** an MLS office. Team listings carry
`listOfficeName: "eXp Realty Of Southern California Inc"` — the brokerage,
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
one house in front of the agent, which `source-post.md` names as the agent's
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

## Pipeline

```
cron (Sun/Tue/Thu)
  │  pick N listings from the pool, newest-first, skipping recently posted
  ▼
build carousel  ── plan → cover → stage rooms → band → CMA → text → CTA
  │              (actor-generation.md governs every Gemini call)
  ▼
upload slides to Cloudinary  →  create PendingPost (status: awaiting_review)
  │
  ▼
SMS the agent: "2 posts ready to review — <link>"
  │
  ├── dashboard: approve / decline / regenerate / schedule
  └── SMS reply "POST A4" → approved
  │
  ▼
publish cron (Tue/Thu/Sun slot + 2h grace)
  │  approved?  → publish to Instagram, SMS confirmation, delete Cloudinary slides
  │  not approved? → SMS reminder, roll to next slot
  ▼
PendingPost → posted / rolled / declined
```

## The `PendingPost` model

Scoped by `agentId` from day one — this is a user feature, not a Joseph
feature.

Fields worth calling out:

- `agentId` — owner. Every query filters on it.
- `listingKey` + a denormalized address/price snapshot, so the review UI
  doesn't refetch and the record still reads correctly after the listing
  changes.
- `slides[]` — Cloudinary public_ids **and** urls. Public_ids are what the
  cleanup job deletes; urls are what Instagram fetches.
- `caption`.
- `approvalCode` — the 2-char code in the SMS.
- `status` — `generating | awaiting_review | approved | scheduled | posted | declined | failed | expired`.
- `scheduledFor` — the slot it's aimed at. Rolls forward on miss.
- `rollCount` — so a post can expire rather than roll forever.
- `igPostId` + `permalink` after publishing.
- `generation` — which listing, which photo indices, which poses. Needed for
  **regenerate** to rebuild with different choices rather than from scratch.

## SMS

Everything needed already exists (`docs/integrations/twilio.md`):

- **Outbound** — `src/lib/messaging/notify-agent.ts` already texts the agent's
  cell from the platform number. Lead alerts use it today.
- **Inbound** — `/api/crm/sms/webhook` already resolves the agent by the `To`
  number and handles keywords.

Two things to add:

1. A `POST <code>` branch in the webhook, **before** the contact lookup. The
   webhook is contact-oriented; an inbound from the agent's own cell is not a
   client message and must not be threaded as one.
2. Point the Twilio webhook URL at production. ngrok appears nowhere in
   application code — "taking it live" is Twilio console configuration.

> **A2P.** Texting the agent *themselves* is low-volume to a known, opted-in
> recipient and works today on the shared platform number. Texting *other
> agents* at scale is A2P-gated per `twilio.md` — that gate lands with the
> multi-tenant rollout, not with this feature.

## Cloudinary lifecycle

Slides are uploaded for one purpose: to give Instagram a public URL to fetch.
Once published, Instagram serves its own copy and ours is dead weight.

- Delete slide assets after a **successful** publish, keeping `igPostId` and
  `permalink` on the record.
- Do **not** delete on decline immediately — the agent may regenerate from the
  same source. Sweep declined/expired posts after a retention window.
- The cleanup must be a **separate sweep job**, not inline with publish. A
  delete failing must never make a successful post look failed.

## Phases

| Phase | Scope |
|---|---|
| **1** | `PendingPost` model + generation script (manual invoke) → produces a reviewable record |
| **2** | Review UI — grid of slides, caption, approve / decline / regenerate / schedule |
| **3** | SMS notify + `POST` keyword in the webhook + production webhook URL |
| **4** | Cron: generate Sun/Tue/Thu; publish Tue/Thu/Sun with 2h grace and roll |
| **5** | Cloudinary sweep |
| **6** | Multi-tenant: per-agent pool config, per-agent number + A2P, credit billing for Gemini spend |

## Open questions

- **Reels** on non-carousel days depend on the `staging-timelapse-reel`
  pipeline, which is WIP (video-generation backend TBD — ComfyUI, Kling, and
  Luma were all evaluated and deprecated 2026-08-07). Out of scope until
  carousels are running.
- **Cost control.** Each build is roughly $0.16-$0.40 of Gemini. Generating
  multiple candidates three times a week needs a per-agent cap before this is
  a paid feature.
