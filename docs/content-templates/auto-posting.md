---
title: Automated carousel posting — generate, review, approve, publish
status: planned
last_verified: 2026-08-25
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
