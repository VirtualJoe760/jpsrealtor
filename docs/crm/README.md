---
title: CRM
status: current
last_verified: 2026-10-17
related:
  - ../auth/README.md
  - ../multi-tenant/README.md
  - ../integrations/twilio.md
  - ../integrations/sms-compliance.md
  - ../integrations/email.md
  - ../campaigns/README.md
  - ../chatrealty-api/lead-capture.md
supersedes: archive/CRM_DOCUMENTATION.md
---

# CRM

## TL;DR

The CRM is **agent-private**: every `Contact` belongs to one `userId` (the agent)
and every `/api/crm/*` route scopes by `session.user.id`, never by
`resolveDomainOwner`. Contacts arrive from six places: the CSV/XLSX import, the
Google Contacts import, the Follow Up Boss (FUB) sync, the public buy/sell
lead forms (always filed under the **primary agent**), public appointment
booking (filed under the booked agent), and tenant-site signups mirrored from
the per-tenant Postgres. Outbound from a contact: SMS (Twilio, per
agent number) and email (Resend, per agent domain), both credit-metered, plus
campaigns (voicemail / direct mail / ads, see `../campaigns/README.md`). UI:
`/agent/contacts`, `/agent/messages`, `/agent/email`; `/agent/crm` only redirects.
CSV imports run async through Next's `after()` while the UI polls a status route.

## Gotchas

- **Dedup is only on the legacy `phone` field.** The `(userId, phone)` unique
  sparse index and the importer's in-memory maps both key on `phone` / `email`
  (the legacy mirrors), not `phones[]` / `emails[]`. Keep them in sync when you
  write a contact. `POST /api/crm/contacts` requires the legacy `phone` and does
  not populate `phones[]` itself.
- **Enum drift silently breaks two creators.** `Contact.source` and `status`
  are enums (`src/models/Contact.ts:320,325`). The Google import writes
  `source: 'google_import'` / `status: 'new'` (`import/google/route.ts:147`) and
  the inbound-SMS webhook writes `source: 'inbound_sms'` / `status: 'lead'`
  (`crm/sms/webhook/route.ts:156`); none of those values exist, so the create
  throws a ValidationError. Google import: every contact lands in `errors`, and
  the user is then redirected to `/admin/crm`, which does not exist. Inbound SMS
  from a number not yet in the CRM: the webhook swallows the error, answers an
  empty 200 and **the message is not stored**. Fix by using valid enum values.
- **Opt-out flags are only partly enforced.** `doNotContact` is checked by
  `POST /api/crm/sms/send`, by the campaign contact pickers (`api/contacts/list`,
  `crm/labels/[id]/create-campaign`) and set by the inbound STOP handler. The
  voicemail and direct-mail send routes under `api/campaigns/[id]/` and
  `api/dropcowboy/campaign` do **not** re-check it, and `voicemailOptOut` /
  `unsubscribedAt` are never read anywhere. `preferences.smsOptIn` is stored but
  never required before sending.
- **Lead forms file under the primary agent.** `leads/buy-intake` and
  `leads/sell-intake` look up `PRIMARY_AGENT_EMAIL` and create the Contact
  there, whatever domain the visitor was on.
- **FUB sync is single-tenant.** One `FUB_API_KEY`, one `FUB_AGENT_ID` (default
  31), a shared Python cron; the route is not per-agent.
- **FUB re-sync overwrites.** The upsert `$set`s `status`, `tags`, names and
  phones/emails every time, so CRM-side edits to those are lost on the next sync.
- **`after()` is mandatory for long work.** Vercel kills the function when the
  response is sent; a bare fire-and-forget promise dies. `after()` keeps it alive
  up to `maxDuration = 300` (`import/confirm/route.ts:21`).
- **API responses are never cached.** The `vercel.json` catch-all excludes
  `/api`; a separate `/api/(.*)` rule sets `no-store`.
- **Mongoose strict mode drops undeclared fields.** Raw CSV rows are saved whole to
  `originalData` (Mixed) so nothing is lost; anything else must be in the schema.
- **Services in `src/lib/services/` are mostly unwired.** Only
  `column-detection.service.ts` is imported by a route (import preview).
  `contact-import`, `contact-cleaner`, `contact-analysis`,
  `groq-contact-assistant`, `list-management` and `contact-validators` have no
  route or component importer.
- **Live SMS updates need the custom server.** The Messages UI uses socket.io
  (`src/hooks/useSocket.ts`); `server.js` hosts it. `emitNewMessage`
  (`src/server/socket.ts`) silently no-ops when no socket server exists, and the
  UI has no refetch fallback.

## Files

| File | Purpose |
|---|---|
| `src/models/Contact.ts` | The Contact schema (below) |
| `src/models/ImportBatch.ts` | Per-import job: status, progress counters, `importedContactIds`, `importErrors` |
| `src/models/Label.ts` | Per-user label (unique `userId+name`, colour, denormalised `contactCount`) |
| `src/models/ContactCampaign.ts` | Contact-to-Campaign junction (unique `contactId+campaignId`) |
| `src/models/sms-message.ts` | SMS history, owned by `userId` (see `../integrations/twilio.md`) |
| `src/app/api/crm/contacts/route.ts` | GET (search, `status`, `tag`, `source`, `limit`/`skip`), POST create, PUT update, DELETE (`id`, `ids`, or `deleteAll=true`) |
| `src/app/api/crm/contacts/[id]/route.ts` | PATCH, whitelist `status`, `notes`, `tags` only |
| `src/app/api/crm/contacts/[id]/{notes,photo,property-images,comparables}/route.ts` | Notes (`noteHistory`), photo, property imagery, nearby closed comps |
| `src/app/api/crm/contacts/{stats,tags,enrich,backfill-address}/route.ts` | Counts, tag counts, MLS property enrichment (active then closed listings then nearest), zip-to-city/state backfill |
| `src/app/api/crm/contacts/import/{preview,confirm,status/[batchId],google}/route.ts` | Import pipeline (below) |
| `src/app/api/crm/labels/**` | Label CRUD plus `[id]/create-campaign` (skips `doNotContact`) |
| `src/app/api/contacts/{list,search,find-by-email}/route.ts` | Pickers for campaigns and the email composer; `list` filters `doNotContact` |
| `src/app/api/crm/{sms,send-email}/**` | Messaging, see `../integrations/twilio.md` and `email.md` |
| `src/app/api/fub/sync/route.ts`, `src/lib/services/fub-{client,mapper}.ts` | FUB sync |
| `src/scripts/fub/sync-fub-leads.py` | Python incremental sync designed for a 15-minute cron |
| `src/lib/spam-defenses.ts`, `src/lib/rate-limit.ts`, `src/lib/turnstile.ts` | Anti-spam primitives |
| `src/lib/crm/{mirror-to-owner,upsert-contact-from-signup,end-user}.ts` | Tenant-site visitor capture (below) |

## Contact model

Modern structured arrays sit beside legacy top-level fields:

| Modern | Legacy | Notes |
|---|---|---|
| `phones[{number,label,isPrimary,isValid,country}]` | `phone` | Importer mirrors `phones[0]` into `phone` |
| `emails[{address,label,isPrimary,isValid}]` | `email` | Same mirror pattern |
| `labels: ObjectId[]` (Label) | `legacyLabels: string[]`, `tags: string[]` | Imports tag with strings (`campaign:<name>`) |
| `address`, `alternateAddress`, `mailingAddress` | | Mailing address is preferred for direct mail |

Other groups: `source` (`manual csv_import google_contacts outlook api website referral followupboss`),
`status` (`uncontacted contacted qualified nurturing client inactive`), `teamId`,
`linkedUserId` (contact has a ChatRealty account), `interests`, `preferences`
(`smsOptIn emailOptIn callOptIn`), `consent` (`tcpaConsent`, IP, date),
`noteHistory`, `lastContactDate/Method`, `dataQuality`, import tracking
(`importBatchId`, `originalData`), FUB (`fubId`, `fubSyncedAt`, `fubData`),
`campaignHistory` (Drop Cowboy drops), flags (`doNotContact`, `unsubscribedAt`,
`voicemailOptOut`) and property metadata (coordinates, beds/baths, sqft, prices).

Indexes: `(userId,phone)` **unique sparse**, `(userId,fubId)` **unique sparse**,
`(userId,email)` sparse, `(userId,status)`, `(userId,source)`,
`(userId,preferences.smsOptIn)`, `(userId,createdAt -1)`, `assignedAgent`,
`(firstName,lastName)`, and a text index over name, email, phone, notes.

## Import pipeline

1. **Preview** `POST /api/crm/contacts/import/preview`: parses CSV (papaparse) or
   XLSX, runs `ColumnDetectionService.detectProvider(headers)` first and uses
   that hint in `detectColumns()`, returns headers, 10 sample rows, suggested
   mappings with confidence and recommendations. It also writes the sample rows to
   `local-logs/contacts/` (gitignored, local disk only, contains contact data).
2. **Confirm** `POST .../import/confirm`: re-parses the file with the confirmed
   mappings, creates an `ImportBatch` (`status: 'processing'`), queues
   `processImportAsync` through `after()` and returns `{ batchId, progress }`.
   Pre-flight upserts the campaign tag and label once, then loads the user's whole
   contact list into phone and lowercased-email maps. Per row: normalise phone and
   email, split a full name stuck in `firstName`, dedup, then one of three cases:
   existing contact plus `campaignTag` (stage a `$addToSet` tag write and select
   it), `context === 'campaign'` with no tag (select without tagging), or a
   regular import (skip and count as duplicate). New rows are also added to the
   dedup maps so duplicates inside the same file are caught. Inserts use
   `insertMany(chunk, { ordered: false })` in chunks of 100, flushing progress after
   each chunk. Final status is `failed` only if every row errored, else `completed`;
   `importErrors` is capped at 100.
3. **Status** `GET .../import/status/[batchId]`: finds by `(_id, userId)`, returns
   live progress; the UI polls about once a second.
4. **Google Contacts** `GET .../import/google`: redirects to Google OAuth
   (`contacts.readonly`), receives the callback on the same route and creates
   contacts one by one with `smsOptIn: false`. Currently broken, see Gotchas.

## Follow Up Boss sync

`POST /api/fub/sync` (session, role `realEstateAgent`): body `{ full: true }`
forces a refetch, otherwise the anchor is the newest `fubSyncedAt` among this
user's `source: 'followupboss'` contacts. `FubClient.getAllPeople` pages
`/v1/people` (limit 100, follows `_metadata.nextLink`, sleeps `Retry-After` on
429, Basic auth with `FUB_API_KEY`). `mapFubPersonToContact` maps stage to status
(for example `under contract` to `nurturing`, `closed` to `client`, `do not
contact` to `inactive` without setting `doNotContact`), derives buyer/seller
interests, and keeps the raw person in `fubData`. Writes are one unordered
`bulkWrite` of upserts on `(userId, fubId)`. No code routes FUB or Zillow leads
into campaign types.

## Lead capture and anti-spam

| Surface | Turnstile | Rate limit (in-memory) | Honeypot + gibberish name |
|---|---|---|---|
| `/api/auth/register` | yes | IP 20/h | yes |
| `/api/auth/forgot-password` | yes | IP 10/h and email 3/h | no |
| `/api/leads/buy-intake`, `sell-intake` | yes | IP 10/h | no |
| `/api/contact` | yes (skipped for trusted internal calls) | IP 10/h | no |

**None of the three lead routes is in the proxy's public list**, so a logged-out
visitor's submission gets `401` from the `/api` gate before Turnstile or the route
runs (confirmed on production 2026-10-17; see `../routing/README.md`).

`/api/contact` only emails (Gmail via nodemailer); it does **not** create a
Contact. Buy/sell intake create or update a Contact (`source: 'website'`) under
the primary agent and text the agent via `notifyAgentLead`. `src/lib/rate-limit.ts`
is a per-instance sliding window; `src/lib/rate-limit-kv.ts` (Upstash) exists but
no route imports it yet. `/api/appointments/book` is public and has neither; it
finds or creates a Contact (`source: 'website'`) under the agent named by
`agentId` or `subdomain`, writing only `emails[]` / `phones[]`, so the legacy
`phone` dedup index never sees it.

## Tenant-site visitors (BYOD)

Visitors on an agent's own site are stored in that tenant's Postgres `contact`
table (`src/lib/db/schema/crm.ts`) through `api/skill/contacts/from-signup` and
`api/skill/end-users/auth/*`. `mirrorContactToOwner` then upserts the same person
into Mongo `Contact` under the owning agent (`source: 'website'`, tag
`Website Signup`) so the dashboard and MCP contact tools can see them. See
`../chatrealty-api/lead-capture.md`.

## Reference implementation

`src/app/api/crm/contacts/import/confirm/route.ts` is the model for any bulk job
behind a fast response: create a tracking record, `after(...)`, return the id,
let the client poll.

## Archived sources

Superseded material lives in `../archive/` (`CRM_DOCUMENTATION.md`, `contacts/`,
`contact-cleaning/`, `SMS_*.md`, `TWILIO_WEBHOOK_SETUP.md`). Do not treat it as
current.
