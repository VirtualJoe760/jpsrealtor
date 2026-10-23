---
title: Contact import pipeline
status: current
last_verified: 2026-10-18
related: [README.md]
---

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

Simple find by `(_id: batchId, userId: session.user.id)`. Returns the live progress sub-document. The frontend polls this every ~1s while the batch runs.
