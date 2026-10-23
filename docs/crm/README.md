---
title: CRM
status: current
last_verified: 2026-10-18
related: [../auth/README.md, ../multi-tenant/README.md]
supersedes: docs/CRM_DOCUMENTATION.md
---

# CRM

## TL;DR

The CRM is an **agent-private** subsystem: every contact belongs to a single `userId` (the agent), and every endpoint scopes by `session.user.id` — NOT `resolveDomainOwner`. The core entity is `Contact`, fed by three sources: (1) the smart CSV/Excel import pipeline, (2) the Follow Up Boss (FUB) sync, and (3) inbound lead forms (buy/sell intake, contact form). Imports run async via Vercel `after()` so the HTTP response returns immediately and the frontend polls a status endpoint while bulk `insertMany` flushes to Mongo in chunks. Anti-spam is layered: Turnstile + per-IP/per-email sliding-window limits + honeypot + gibberish-name heuristic on the public lead-capture surface.

## Planned dialer

[Full dialer build plan](./dialer/build-plan.md): browser calling with a verified callback number, durable call history, and a single-line queue, with a later Telnyx adapter. Select contacts or a tag/filter set in /agent/contacts, then choose Open in dialer to freeze that queue. Mobile swipes between Dialer, Property tools and Queue; desktop places the full-width calling/contact row above Property and MLS comps/map, with inline contact editing and a collapsible 10-row paginated queue controlled from the gear. ContactViewPanel supports embedded rendering and retains normal inline editing and saved notes. Property research and mapped MLS comps appear below the calling row. Calls remain simulated; attempt state, notes and outcomes now persist through a transactional controller with one active attempt per agent across sessions. Server-persisted live calling with pause/resume across devices remains pending; triple-line dialing, prerecorded voicemail drops, separate simultaneous-answer overflow audio, and optional existing Retell AI handling are in the full target scope; the workspace now saves bounded simulation queues, explicit note checkpoints and outcomes through owner-scoped APIs, with recent-session resume and recovered ringing/connected/wrap-up state; live-provider recovery and automatic draft saving remain pending. Quick email follow-ups and newsletter invitations are planned in [email follow-ups](./dialer/email-follow-ups.md), reusing the CRM composer and verified sender. The [call wrap-up plan](./dialer/call-wrap-up.md) adds connected-call notes, tag moves and appointment booking. The [credit billing foundation](./dialer/credits-and-billing.md) now includes unified purchase quotes, paid-only grants and transactional hold/settlement primitives, with credit management in the existing navigation and isolated, labeled Stripe test wallets; live metering and auto-top-up remain disabled. See the build plan for source-matching caveats and validation.

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

The schema (`Contact.ts`) carries both **modern structured arrays** and **legacy top-level fields** for backward compatibility:

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

The `(userId, phone)` unique + sparse compound is what **enforces dedup at the database level**. Sparse so contacts without a phone (web leads) don't all collide on null. The app-layer dedup map (below) is an optimization on top of this guarantee, not a replacement for it.

## Import pipeline

See [contact-import](./contact-import.md) for preview, asynchronous confirmation, deduplication, bulk writes and progress polling.

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

Zillow leads that arrive via FUB get sorted into Campaign types (voicemail / postcard / ads) by downstream campaign logic — that flow is documented in commerce/campaigns.

## Anti-spam defenses

All public lead-capture endpoints (`/api/contact`, `/api/leads/buy-intake`, `/api/leads/sell-intake`) and auth endpoints (`/api/auth/register`, `/api/auth/forgot-password`) are stacked with:

| Layer | Implementation | Notes |
|---|---|---|
| **Cloudflare Turnstile** | `src/lib/turnstile.ts` (covered in auth README) | Server-side verify; required on all the above |
| **Per-IP rate limit** | `checkRateLimit("ip:1.2.3.4:contact", { max, windowMs })` | Sliding window, in-memory `Map` |
| **Per-email rate limit** | `checkRateLimit("email:foo@bar:register", ...)` | Same primitive, different key |
| **Honeypot** | `honeypotTripped(formData.website)` | Hidden field named `website` — real users never see it; bots autofill |
| **Gibberish name** | `isGibberishName(name)` | Rejects names like `huUnwmncpxBqZSyvDlKjcs` (no vowels, long consonant runs, excessive case changes) |

The rate-limiter (`src/lib/rate-limit.ts`) is an **in-memory sliding window** — single-instance only. If Vercel ever scales beyond one container per region, swap for Upstash Redis. Eviction runs lazily once per minute to keep the Map bounded.

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

The canonical example for the async-import pattern is `F:\web-clients\joseph-sardella\jpsrealtor\src\app\api\crm\contacts\import\confirm\route.ts`. Anything new that needs to do bulk work behind a fast HTTP response (other syncs, bulk operations, batch enrichment) should follow that file's structure: create a tracking record, `after(async () => ...)`, return the id, poll for progress.

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

The [provider job foundation](./dialer/provider-jobs.md) adds bounded dispatch and uncertain-request recovery primitives. A separate [Twilio adapter and signed status inbox](./dialer/twilio-voice-adapter.md) are implemented, with live dispatch hard-disabled. The simulation controller is not connected to them.

The dialer now includes [local audio device controls](./dialer/agent-audio.md); phone agent audio and mobile dial-in are accepted scope and remain pending server bridge implementation.


<!-- Dialer layout verified 2026-10-18 --> Dialer layout: the full-width contact/calling row sits above Property and MLS comps tools. The duplicate Contact tab is removed. MLS comps use a subject-home marker and numbered comparable markers linked to the sale list; missing coordinates are omitted from the map. Mobile uses Dialer, Property tools and Queue panels. The gear opposite Back to contacts groups audio devices, desktop queue visibility and saved-session recovery; the previous preview/header block is removed. Calls remain simulated.

Dialer settings open in a native modal overlay with an independent scroll area, backdrop dismissal and Escape support. Opening settings does not move the calling workspace; focus returns to the gear when closed. Verified 2026-10-18.

Inline dialer contact editing (verified 2026-10-18): the full-contact launcher is replaced by editable name, phone/email lists with primary selection, and address fields in the calling row. Save contact uses owner-scoped PATCH with validated detail fields; legacy primary phone/email values stay synchronized. Unsaved details block leaving or changing contacts. Saved queue phone snapshots remain unchanged. Address edits clear old map coordinates so research cannot silently use the previous home. The existing contact panel phone/email PATCH rejection is fixed by this shared API extension.

Sold-comps map interactions (verified 2026-10-18): pointer hover or keyboard focus previews the MLS photo, sold price, address and beds/baths/size without zooming. Click/tap opens a native property-details dialog with saved closed-listing media, description, sale/build/lot/pool facts, attribution and external research links. Sale-list Property details offers the same view, including sales without map coordinates. The contact-owned comparables route projects primaryPhotoUrl/media/publicRemarks/listingId from unified_closed_listings; no active-listing or live-provider fallback is used. Missing facts/photos remain explicitly unavailable. Mobile map gestures preserve one-finger panel scrolling.

Property photo enrichment (2026-10-18): contacts and sold-property dialogs share free, best-effort address-verified photo lookup and provenance-aware caching. POST lookups can seed declared externalPhotos fields on contacts/closed listings; MLS media is preserved. Source blocks are reported; no paid search provider or bypass is used. See [property-photo-discovery](./property-photo-discovery.md).
