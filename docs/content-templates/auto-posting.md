---
title: Automated carousel posting — generate, review, approve, publish
status: planned
last_verified: 2026-07-26
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
  pipeline, which is WIP (RunPod/ComfyUI steps unbuilt). Out of scope until
  carousels are running.
- **Cost control.** Each build is roughly $0.16-$0.40 of Gemini. Generating
  multiple candidates three times a week needs a per-agent cap before this is
  a paid feature.
