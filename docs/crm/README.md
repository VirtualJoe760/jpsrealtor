---
title: CRM
status: current
last_verified: 2026-05-21
related: [../auth/README.md, ../multi-tenant/README.md]
supersedes: docs/CRM_DOCUMENTATION.md
---

# CRM

## TL;DR

The CRM is an **agent-private** subsystem: every contact belongs to a single
`userId` (the agent), and every endpoint scopes by `session.user.id` — NOT
`resolveDomainOwner`. The core entity is `Contact`, fed by three sources:
(1) the smart CSV/Excel import pipeline, (2) the Follow Up Boss (FUB) sync,
and (3) inbound lead forms (buy/sell intake, contact form). Imports run async
via Vercel `after()` so the HTTP response returns immediately and the frontend
polls a status endpoint while bulk `insertMany` flushes to Mongo in chunks.
Anti-spam is layered: Turnstile + per-IP/per-email sliding-window limits +
honeypot + gibberish-name heuristic on the public lead-capture surface.

## Files

| File | Purpose |
|---|---|
| `F:\web-clients\joseph-sardella\jpsrealtor\src\models\Contact.ts` | The Contact schema: phones[], emails[], address{}, FUB fields, campaign history, anti-spam flags, property metadata |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\models\ImportBatch.ts` | Per-import-job record: progress counters, field mapping, errors, results |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\models\Campaign.ts` | Outbound campaign (voicemail/postcard/ads). Linked from import for tagging — see commerce/campaigns docs for full details |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\app\api\crm\contacts\import\preview\route.ts` | Parses CSV/XLSX, auto-detects columns + provider, returns mapping suggestions |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\app\api\crm\contacts\import\confirm\route.ts` | Canonical async import: creates ImportBatch, queues work via `after()`, bulk insertMany in chunks |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\app\api\crm\contacts\import\status\[batchId]\route.ts` | Polling endpoint the UI hits while the batch runs |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\lib\services\fub-client.ts` | Follow Up Boss REST client (Basic auth, pagination, 429 handling) |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\lib\services\fub-mapper.ts` | Maps a `FubPerson` to a Contact document |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\app\api\fub\sync\route.ts` | Manual FUB sync trigger (agent dashboard button) |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\lib\spam-defenses.ts` | `isGibberishName()` + `honeypotTripped()` |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\lib\rate-limit.ts` | `limit()` / `checkRateLimit()` — sliding window, in-memory |

## Contact model

The schema (`Contact.ts`) carries both **modern structured arrays** and **legacy
top-level fields** for backward compatibility:

| Modern | Legacy | Notes |
|---|---|---|
| `phones: [{ number, label, isPrimary, isValid, country }]` | `phone: string` | Importer writes both — `phones[0].number` is mirrored into `phone` |
| `emails: [{ address, label, isPrimary, isValid }]` | `email: string` | Same pattern: `emails[0].address` → `email` |
| `labels: ObjectId[]` (refs `Label`) | `legacyLabels: string[]` | DEPRECATED legacy string labels |
| `address: { street, city, state, zip, country }` | — | Also: `alternateAddress`, `mailingAddress` (separate from residential) |

Other notable fields:
- **Sources** (`source` enum): `manual`, `csv_import`, `google_contacts`, `outlook`, `api`, `website`, `referral`, `followupboss`.
- **Status**: `uncontacted`, `contacted`, `qualified`, `nurturing`, `client`, `inactive`.
- **FUB integration**: `fubId` (FUB person id), `fubSyncedAt`, `fubData` (raw FUB person — debug).
- **Campaign history**: tracks Drop Cowboy voicemail drops the contact has received.
- **Anti-spam flags**: `doNotContact`, `unsubscribedAt`, `voicemailOptOut`.
- **Property metadata**: lat/lng, bedrooms, bathrooms, sqft, year built, purchase/sale prices — used when contacts come from title-rep / mojo dialer feeds with property attached.

### Indexes (the critical ones)

```
{ userId: 1, phone: 1 }   unique, sparse    ← DB-level dedup
{ userId: 1, email: 1 }   sparse
{ userId: 1, fubId: 1 }   unique, sparse    ← prevents duplicate FUB sync
{ userId: 1, status: 1 }
{ userId: 1, createdAt: -1 }
```

The `(userId, phone)` unique + sparse compound is what **enforces dedup at the
database level**. Sparse so contacts without a phone (web leads) don't all
collide on null. The app-layer dedup map (below) is an optimization on top of
this guarantee, not a replacement for it.

## Import pipeline

Three-stage flow with the heavy work running **after** the response is sent.

### 1. Preview — `POST /api/crm/contacts/import/preview`

- Accepts CSV or XLSX (parsed with `papaparse` or `xlsx`).
- Runs `ColumnDetectionService.detectProvider(headers)` first, then
  `detectColumns()` using the provider hint — important: provider detection
  feeds column mapping, not the other way around.
- Returns: headers, first 10 sample rows, suggested field mappings with
  confidence scores, stats, and recommendations.
- Side effect: writes a debug snapshot to `local-logs/contacts/preview-{ts}.json`.

### 2. Confirm — `POST /api/crm/contacts/import/confirm`

This is **the canonical example** of the async-import pattern. Flow:

1. Validate session, parse file again with user-confirmed mappings.
2. Create `ImportBatch` with `status: 'processing'` and the total row count.
3. **Queue the actual work via `after(async () => processImportAsync(...))`**.
4. Return `{ batchId, progress }` to the client immediately. Frontend starts polling.

Inside `processImportAsync`:

- **Pre-flight (hoisted out of the row loop):**
  - Ensure campaign/label rows exist (one upsert each, not per-row).
  - **Pre-fetch every existing Contact** for this `userId` into a `Map`
    keyed by phone and a separate Map keyed by lowercased email. The original
    implementation ran `Contact.findOne` per row — N round-trips to Atlas
    blew past the function timeout on imports of a few hundred rows.
- **Row loop:**
  - Normalize phones (E.164-ish, US-centric) into `phones[]`, mirror primary
    into legacy `phone` field. Same for emails.
  - Smart-name handling: detect "Full Name" stuck in `firstName` and split it.
  - Dedup against the in-memory map.
  - **Three dedup scenarios** based on context:
    1. **Campaign tag** (`campaignTag` set, existing contact found) — stage
       a `$addToSet` tag update via bulkWrite; include in `importedContactIds`.
    2. **Campaign context** (`context === 'campaign'`, no tag) — include the
       existing contact in the selection without tagging.
    3. **Regular import** — skip duplicate, count toward `progress.duplicates`.
  - Non-duplicates are staged into a `toInsert[]` array and **also added to
    the dedup maps** so the next row with the same phone in the same CSV is
    caught as an in-CSV duplicate.
- **Bulk write:**
  - `Contact.insertMany(chunk, { ordered: false })` in chunks of 100.
  - `ordered:false` so a single row failing schema validation (or hitting the
    unique index in a race) doesn't abort the rest of the chunk.
  - After each chunk: `ImportBatch.findByIdAndUpdate(batchId, { progress: ... })`
    so the polling UI advances during the bulk-insert phase.
  - Staged tag-update bulkWrite is flushed once before insertion.
- Final batch update sets `status` and `completedAt`.

### 3. Status — `GET /api/crm/contacts/import/status/[batchId]`

Simple find by `(_id: batchId, userId: session.user.id)`. Returns the live
progress sub-document. The frontend polls this every ~1s while the batch runs.

## FUB integration

Follow Up Boss is the upstream CRM for inbound leads (Zillow, etc.). Sync flow:

1. **Trigger**: `POST /api/fub/sync` from the agent dashboard, or scheduled.
   Body `{ full: true }` forces a full refetch; default is incremental.
2. **Incremental anchor**: find the most-recent `Contact.fubSyncedAt` where
   `source === 'followupboss'` for this user; pass as `lastActivityAfter`.
3. **Fetch**: `FubClient.getAllPeople({ assignedUserId, lastActivityAfter })`
   paginates the `/v1/people` endpoint (limit 100, follows `_metadata.nextLink`,
   handles 429 with `Retry-After`).
4. **Map**: `mapFubPersonToContact` translates FUB phones/emails/addresses to
   the Contact schema, maps FUB stage → Contact status (e.g. `"under contract"`
   → `nurturing`, `"closed"` → `client`), and stashes the raw FUB object in
   `fubData` for debug.
5. **Persist**: upserted via the `(userId, fubId)` unique index. `source` is
   set to `followupboss` so re-syncs find them again.

Zillow leads that arrive via FUB get sorted into Campaign types
(voicemail / postcard / ads) by downstream campaign logic — that flow is
documented in commerce/campaigns.

## Anti-spam defenses

All public lead-capture endpoints (`/api/contact`, `/api/leads/buy-intake`,
`/api/leads/sell-intake`) and auth endpoints (`/api/auth/register`,
`/api/auth/forgot-password`) are stacked with:

| Layer | Implementation | Notes |
|---|---|---|
| **Cloudflare Turnstile** | `src/lib/turnstile.ts` (covered in auth README) | Server-side verify; required on all the above |
| **Per-IP rate limit** | `checkRateLimit("ip:1.2.3.4:contact", { max, windowMs })` | Sliding window, in-memory `Map` |
| **Per-email rate limit** | `checkRateLimit("email:foo@bar:register", ...)` | Same primitive, different key |
| **Honeypot** | `honeypotTripped(formData.website)` | Hidden field named `website` — real users never see it; bots autofill |
| **Gibberish name** | `isGibberishName(name)` | Rejects names like `huUnwmncpxBqZSyvDlKjcs` (no vowels, long consonant runs, excessive case changes) |

The rate-limiter (`src/lib/rate-limit.ts`) is an **in-memory sliding window** —
single-instance only. If Vercel ever scales beyond one container per region,
swap for Upstash Redis. Eviction runs lazily once per minute to keep the Map
bounded.

## Gotchas

- **The `(userId, phone)` unique sparse index is what guarantees dedup.** The
  in-memory dedup map in the import flow is an optimization (avoids the round
  trip when we know the row will collide); the index is the safety net. Don't
  remove the index thinking the app handles it.
- **`after()` is mandatory for long-running work.** Vercel terminates the
  serverless function the moment the HTTP response sends. A bare
  fire-and-forget `Promise` (`void processImportAsync(...)`) gets killed before
  it can finish. `after()` keeps the worker alive up to `maxDuration` (300s
  here). Reference: Next.js docs on `unstable_after` (now stable in Next 16).
- **`vercel.json` cache catch-all forces `no-store` headers** on all
  `/api/**` responses. CRM endpoints are correctly excluded from edge caching,
  but if you ever wanted to cache something here you'd have to override at
  the route level.
- **Mongoose strict mode silently drops unschema'd fields.** When importing
  raw CSV data, anything not in the Contact schema disappears. The importer
  saves the raw row to `originalData` (Mixed type) so nothing is truly lost,
  but if a UI shows a field that "should be there" and it isn't — check the
  schema first.
- **Legacy `phone`/`email` top-level fields are intentionally kept in sync**
  with `phones[0].number` / `emails[0].address`. Don't write to one without
  the other or downstream code (the unique index, FUB sync, campaign matching)
  breaks.
- **CRM endpoints scope by `session.user.id`, NOT `resolveDomainOwner`.** This
  is correct — contacts are agent-private, not domain-public. Do not "migrate"
  these to the multi-tenant pattern. (See multi-tenant/README.md.)

## Reference implementation

The canonical example for the async-import pattern is
`F:\web-clients\joseph-sardella\jpsrealtor\src\app\api\crm\contacts\import\confirm\route.ts`.
Anything new that needs to do bulk work behind a fast HTTP response (other
syncs, bulk operations, batch enrichment) should follow that file's structure:
create a tracking record, `after(async () => ...)`, return the id, poll for
progress.

## Related

- [auth/README.md](../auth/README.md) — Turnstile, rate-limit, gibberish-name plumbing originate here
- [multi-tenant/README.md](../multi-tenant/README.md) — why CRM is agent-private and out of scope for `resolveDomainOwner`

## Migration log

Legacy `/docs/` files related to CRM, classified per `docs-v2/CLAUDE.md`:

| Title | Path | Classification | Action |
|---|---|---|---|
| CRM Documentation | `F:\web-clients\joseph-sardella\jpsrealtor\docs\CRM_DOCUMENTATION.md` | OUTDATED | Pre-dates the bulk-insertMany + `after()` import flow (May 2026) and the FUB integration; SUPERSEDED by this README → move to `archive/` |
| Contact Cleaning — Implementation Complete | `F:\web-clients\joseph-sardella\jpsrealtor\docs\contact-cleaning\IMPLEMENTATION_COMPLETE.md` | OUTDATED | Shipped Jan 2026; historical → `archive/` |
| Chat Import — Architecture | `F:\web-clients\joseph-sardella\jpsrealtor\docs\contact-cleaning\CHAT_IMPORT_ARCHITECTURE.md` | PARTIAL | If still in flight, mark `status: partial`; if shipped, → `archive/` |
| Chat Import — Implementation | `F:\web-clients\joseph-sardella\jpsrealtor\docs\contact-cleaning\CHAT_IMPORT_IMPLEMENTATION.md` | OUTDATED | Implementation log; `archive/` |
| Chat Integration — Report | `F:\web-clients\joseph-sardella\jpsrealtor\docs\contact-cleaning\CHAT_INTEGRATION_REPORT.md` | OUTDATED | Work log; `archive/` |
| Contact Bottom Panel Spec | `F:\web-clients\joseph-sardella\jpsrealtor\docs\contacts\CONTACT_BOTTOM_PANEL_SPEC.md` | PARTIAL | Verify shipped state; UI spec details could merge into a future `crm/ui.md` |
| Contact Review Enhancement Plan | `F:\web-clients\joseph-sardella\jpsrealtor\docs\contacts\CONTACT_REVIEW_ENHANCEMENT_PLAN.md` | PARTIAL | Verify shipped state |
| Mobile Contacts Optimization Plan | `F:\web-clients\joseph-sardella\jpsrealtor\docs\contacts\MOBILE_CONTACTS_OPTIMIZATION_PLAN.md` | PARTIAL | Verify shipped state; could split into `crm/mobile.md` if substantial |
| Property Enrichment Strategy | `F:\web-clients\joseph-sardella\jpsrealtor\docs\contacts\PROPERTY_ENRICHMENT_STRATEGY.md` | PARTIAL | Strategy doc; verify implementation status |
| Property Auto Enrichment Plan | `F:\web-clients\joseph-sardella\jpsrealtor\docs\contacts\PROPERTY_AUTO_ENRICHMENT_PLAN.md` | PARTIAL | Verify shipped state |
| Property Data Population Plan | `F:\web-clients\joseph-sardella\jpsrealtor\docs\contacts\PROPERTY_DATA_POPULATION_PLAN.md` | PARTIAL | Verify shipped state |
| Twilio Webhook Setup | `F:\web-clients\joseph-sardella\jpsrealtor\docs\TWILIO_WEBHOOK_SETUP.md` | PARTIAL | Verify against current `/api/crm/sms/webhook`; keep separate or merge |
| SMS Action Items / Improvement / Phase2 Testing | `F:\web-clients\joseph-sardella\jpsrealtor\docs\SMS_*.md` (3 files) | OUTDATED | Transient planning/testing docs; SMS shipped → `archive/` |
