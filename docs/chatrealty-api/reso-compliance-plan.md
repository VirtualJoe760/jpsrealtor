---
title: RESO Web API compliance plan
status: draft
last_verified: 2026-10-29
related: [./research.md, ./data-dictionary.md, ./build_plan.md, ./db-adapter.md]
---

# RESO Web API compliance plan

> **TL;DR.** RESO's own test tool (`reso-cert`) fails us at step one: we have
> no `$metadata` and no service root. To pass **Web API Core 2.1.0** we need a
> separate `/api/reso/*` surface: a CSDL `$metadata`, a `Property` resource with
> Data Dictionary field names, a `Lookup` resource, full OData `$filter`
> (or/not/in/any/all/now()), `$expand=Media`, and `@odata.nextLink` paging.
> Data Dictionary certification comes after that. Add/Edit and EntityEvent are
> optional endorsements we skip.
>
> **Status 2026-10-29: `reso-cert core` (Web API Core 2.1.0) PASSES locally:
> 45 passed, 0 failed, 12 skipped, outcome `passed`, `certification.valid:
> true`.** The endpoint is `/api/skill/reso` (see §7). This is a local run
> against `localhost`, not yet deployed and not yet submitted to RESO
> (phase 4).

### Core 2.1.0 run, 2026-10-29

`reso-cert core --url http://localhost:3005/api/skill/reso` (v0.11.5, admin
token named "reso-cert local test (2026-10-29)", `listings:read` only; revoke
it in Settings when done).

| Skipped | Why | Unblocked by |
|---|---|---|
| 5 `enum` (has/eq/ne, single + multi) and 2 `collection` (any/all) | Apply only to flag/collection enum modes; we serve string mode (2.1.0 default) | Nothing (not applicable) |
| `filter-string-enum-single-ne`, `filter-string-enum-single-in` | Every listing is `Active`, so "not conclusively testable across 1 field" | Closed/pending listings in the read (§5b, optional) |
| `filter-string-enum-multi-any`, `-all` | No multi-value lookup declared | Array-typed features field (§5b item 1) |
| `filter-string-endswith` (optional) | Its test value `'20190'` matches no ListingKey suffix, so the empty result is correct | Nothing |

The sampler read 1,000 records in 2 pages. Everything else passed:
metadata (XSD + semantics valid), service document, by-key, $select/$top/$skip/$count,
integer/decimal/date/timestamp filters incl. and/or/not and now(), orderby,
400/404, Lookup validation, string-enum eq, contains/startswith, nextLink
paging, $expand=Media.

## 1. What RESO tests, and how

Tool: `reso-cert` from `@reso-standards/reso-certification` (v0.11.5, Node 22+,
source `RESOStandards/reso-tools`). It's the same code RESO certifies with.

| Command | Endorsement | Do we need it |
|---|---|---|
| `core` | Web API Core 2.1.0 (2.0.0 still certifiable) | **Yes**: the baseline |
| `dd` | Data Dictionary 2.1 (2.0 selectable) | **Yes**, after Core |
| `add-edit` | RCP-010 create/update/delete | No: we're read-only |
| `entity-event` | RCP-027 change tracking | Later, maybe |
| `rcf` | RESO Common Format files, no server | Optional, cheap DD-shape check |

Run with `--auth-token TOKEN` (a bearer token) or with OAuth2 client
credentials. Results are written to `.reso-cert/…/current`.

**Pass rule (default):** no scenario fails. When a data type has no field or
no sample data, that scenario is **skipped, not failed**. `--full-coverage`
fails on any uncovered type. The runner samples up to 1,000 records per
resource and picks test values by median, so every filter has to match records
on both sides of the value.

### Core 2.1.0 scenarios we must pass

| Group | What it does | What we have to support |
|---|---|---|
| metadata-validation | Fetches `/$metadata` | Valid EDMX XML, `OData-Version` header, at least one DD resource |
| service-document | `GET /` | 200 JSON list of entity sets |
| fetch-by-key | `GET /Property('KEY')` | Single entity |
| select / top / skip / count | Query options | `$select`, `$top`, `$skip`, `$count=true` → `@odata.count` |
| Integer ×9 | e.g. `BedroomsTotal` | `eq ne gt ge lt le` plus **`and`, `or`, `not()`** |
| Decimal ×5 | e.g. `ListPrice` | `ne gt ge lt le` |
| Date ×6 | `Edm.Date`, `yyyy-mm-dd` literals | All six comparisons |
| Timestamp ×5 | `Edm.DateTimeOffset` | `gt ge`, plus `lt le ne` against **`now()`** |
| OrderBy ×4 | asc/desc, alone and combined with an int filter | Stable sort on a fully populated timestamp |
| lookup-resource-validation | `GET /Lookup?$filter=LookupName eq 'X'` | A **Lookup resource** holding every value the data uses. If it's empty, this **fails** (not a skip) |
| String enum eq/ne | `StandardStatus eq 'Active'` | `Edm.String` + LookupName annotation |
| String enum any/all | `Field/any(x:x eq 'A' or x eq 'B')` | Only if we declare a `Collection(Edm.String)` lookup field |
| `in` operator | `StandardStatus in ('Active',…)` | Only runs when the response says `OData-Version: 4.01` |
| String functions | `contains/startswith/endswith` | **Optional**: a failure shows "Not Supported" and doesn't fail Core |
| Error codes | Bad syntax → **400**; unknown resource → **404** | OData error body |
| server-driven-paging | Follows `@odata.nextLink` | Each page returns new records; the last page has no nextLink |
| expand | `?$expand={nav}&$top=5` for each **declared** collection nav | A declared nav that can't be expanded **fails**. Declaring none skips it |

Enum mode is detected from metadata. We use **string mode** (`Edm.String` +
`RESO.OData.Metadata.LookupName` annotation + `/Lookup`). That matches how we
store values, and it's the mode the 2.1.0 suite expects.

## 2. Where we are today

- `/api/skill/*` uses OData's response envelope and `$filter/$select/$orderby/$top/$skip/$count`,
  but `src/lib/skill-api/odata/parse.ts` only parses **AND-joined comparisons**.
  It deliberately has no `or`, parens, `not`, `in`, lambdas, or functions.
- Field names are camelCase (`listPrice`). RESO wants PascalCase DD names
  (`ListPrice`). `src/lib/reso/data-dictionary.ts` already maps every
  field in all three casings, so that's our translation table.
- No `$metadata`, no service document, no `Lookup` resource, no `nextLink`.
- Auth is bearer `crt_live_…`. That satisfies "OAuth2 bearer token" for a
  `--auth-token` run. Client-credentials exchange doesn't exist.
- Baseline run, 2026-10-29: `core` and `dd` both fail at "Fetch metadata"
  (404). See [research.md](./research.md) §4.

## 3. Design decisions to make (before code)

1. **Separate surface: `/api/reso/*`.** Don't rework `/api/skill/*`. The
   site builders, the MCP server and the scaffolder all depend on its camelCase
   DTOs. A catch-all route (`src/app/api/reso/[[...path]]/route.ts`) dispatches
   `""` (service doc), `$metadata`, `Property`, `Property('k')`,
   `Property('k')/Media`, `Lookup`, and returns 404 for anything else.
2. **Which data it reads (BYOD rule).** This must not become a shared listing
   pool (ship-strategy). Proposal: authenticate exactly like `withSkill`. A
   `dogfood` (admin) token reads Mongo `unified_listings`; a `tenant` token
   reads that tenant's Postgres; `none` gets 403. **Phase 1 ships Mongo/dogfood
   only** (tenant → 501) so there's a certifiable run. Postgres is phase 3.
   *Needs Joseph's call: is certifying on the dogfood dataset acceptable?*
3. **Filter parser.** Use RESO's `@reso-standards/odata-expression-parser`
   (zero dependencies, ESM, the parser RESO's own reference server uses). We
   write our own AST → Mongo translator (later AST → SQL), keyed off the
   data-dictionary map. Its license is the RESO EULA, so check that before
   depending on it. The fallback is extending our own parser to the full
   grammar, which is a lot more work.
4. **Field allow-list = what `$metadata` declares.** Only declare fields we
   actually store and can filter correctly. A declared field that can't be
   filtered fails its test, and an undeclared one is just skipped. Start
   small (~20 Property fields covering every type below) and grow it.
5. **Attribution vs `$select`.** Our rule is that `ListAgentFullName` and
   `ListOfficeName` always ship with a listing. **Open question:** OData says `$select` restricts the payload, and the
   `select` scenario checks that. Proposal: declare them, return them when
   selected, and keep the IDX display rule at the rendering layer, where it
   already lives.

## 4. Proposed first field set (Property)

One or more field per type the suite exercises. Types are what we'd *declare*.
Step 1 of phase 1 verifies the stored BSON type matches. The data-dictionary
doc already warns that `onMarketDate` is stored as an ISO **string** on Mongo,
so a date filter has to compare string-to-string or be coerced.

| RESO name | Edm type | Stored as (camel) | Exercises |
|---|---|---|---|
| `ListingKey` | String (key) | `listingKey` | fetch-by-key |
| `ListPrice` | Decimal | `listPrice` | decimal filters |
| `BedroomsTotal` | Int32 | `bedroomsTotal` (OR `bedsTotal`; adapter collapses) | integer filters, and/or/not |
| `BathroomsTotalInteger` | Int32 | `bathroomsTotalInteger` | |
| `YearBuilt` | Int32 | `yearBuilt` | |
| `LivingArea` | Decimal | `livingArea` | |
| `ListingContractDate` | Date | `listingContractDate` | date filters |
| `OnMarketDate` | Date | `onMarketDate` | date filters (string trap) |
| `ModificationTimestamp` | DateTimeOffset | `modificationTimestamp` | timestamp, orderby, now() |
| `StandardStatus` | String + LookupName | `standardStatus` | string enum, `in` |
| `PropertyType` | String + LookupName | **`extras.propertyTypeRaw` / label, not the A–D bucket** | |
| `City`, `PostalCode`, `SubdivisionName`, `UnparsedAddress` | String | same | string functions |
| `Latitude`, `Longitude` | Decimal | same | |
| `PoolPrivateYN` | Boolean | `poolYN` | |
| `ListAgentFullName`, `ListOfficeName` | String | `listAgentName`, `listOfficeName` | attribution |
| `Media` | Collection(Media) nav | embedded `media[]` | `$expand` |

`StandardStatus` caveat: `unified_listings` is **Active-only (~85k)**. With a
single value, the `ne` and `in` tests have nothing on the other side of the
median. Either serve `unified_closed_listings` alongside it (~1.1M, a different
collection: needs a union read) or accept those scenarios skipping. Decide once
we see the sample.

Multi-value lookups (`InteriorFeatures` etc.) are stored as **comma-joined
strings**, not arrays. Phase 1 doesn't declare them, so the any/all scenarios
skip. Declaring them later means splitting at sync time.

## 5. Phases

**Phase 0: verify (≈½ day).** Read-only probe of real BSON types for the
§4 fields (it was about to run when this plan was requested). Check the
expression-parser license. Confirm a dogfood token for test runs (mint one in
Settings; never paste it into chat).

**Phase 1: pass Core 2.1.0 on dogfood Mongo. ✅ Done 2026-10-29 (local run).**
1. `src/lib/reso/edmx.ts`: generates `$metadata` XML from the declared field set
   (EntityContainer, Property + Media + Lookup entity types, key, LookupName
   annotations, nav property).
2. `src/lib/reso/filter-to-mongo.ts`: parser AST → Mongo query. Covers
   comparisons, `and/or/not`, `in`, `now()`, date/datetime literals, any/all,
   contains/startswith/endswith. `ne` excludes nulls (SQL three-valued logic,
   same as the reference server). Unknown field or unsupported node → 400.
3. `src/app/api/reso/[[...path]]/route.ts`: service doc, `$metadata`,
   collection, by-key, nav path, `Lookup`. Sets `OData-Version: 4.01` and
   `@odata.context`, builds `@odata.nextLink` from `$skip` (or a `$skiptoken` on
   `ModificationTimestamp, ListingKey` for stable paging over 85k rows), uses
   OData error bodies, `no-store`.
4. Lookup resource: built from distinct values of each declared lookup field
   (cached; values change rarely). Rows: `LookupKey, LookupName, LookupValue,
   StandardLookupValue, LegacyODataValue, ModificationTimestamp`.
5. Unit tests for the translator and the EDMX output. Then
   `reso-cert core --url http://localhost:3000/api/reso --auth-token …`,
   repeating until 0 failures. Record the coverage matrix here.

**Phase 2: Data Dictionary 2.1 (size after phase 1).** `reso-cert dd` checks
metadata names/types against the DD and replicates data. Start with
`--no-strict --skip-variations` to list everything that needs fixing, then do a
strict run. A certification-eligible DD run needs RESO Variations Service
credentials (`RESO_SERVICES_URL`, `CLIENT_ID`, …) from the certification site.
Consider `reso-cert rcf` on an exported sample first. It checks field shape
with no server involved.

**Phase 3: tenant Postgres.** AST → parameterized SQL over the tenant
`property` table (snake_case via `fieldNameToColumn`), reached through the
keystone resolver. Re-run Core against a tenant token.

**Phase 4: certification submission.** OAuth2 client-credentials token
endpoint (RESO's own certification runs may need it; check), provider UOI/USI
registration with RESO, run on the production URL, submit reports.

## 5b. Who does what (2026-10-29)

Anything that changes how the database is **seeded** belongs to the backend
agent (`VirtualJoe760/chatrealty-backend`, the Python VPS jobs). The API
surface belongs to this repo. They run in parallel: phase 1 builds against the
data as stored today, so the API never waits on a re-sync. Seed changes add
coverage (skipped scenarios start running) once they land.

| Backend agent (seeding) | Why RESO needs it |
|---|---|
| Write multi-value features as arrays: **new** field, e.g. `interiorFeaturesList` | Turns on string-enum any/all tests |
| Write a consistently typed date: **new** field alongside `onMarketDate` | Date filters need one stored type |
| Nightly `Lookup` precompute (distinct values per lookup field) | `/Lookup` without a collection scan |
| *(optional)* closed listings available to the RESO read | `StandardStatus ne` / `in` coverage |

**Add fields, never retype existing ones.** The live site reads
`interiorFeatures` as a string, and Mongo search compares `onMarketDate`
lexically (the `StrRange` trap). Changing either in place breaks production.
The RESO layer switches to the new fields once they exist.

## 6. Risks / open questions

- **Certify on which dataset?** Dogfood data is real MLS data under Joseph's
  feed license. Exposing it through a RESO endpoint, even admin-only, should be
  checked against the feed's redistribution terms.
- **Active-only data** limits enum `ne`/`in` coverage (see §4).
- **Performance.** The suite samples 1,000 rows and pages through all of `/Lookup`.
  The by-key and sort paths need indexes (`listingKey`, `modificationTimestamp`
  exist).
- **Scope creep.** `/api/skill/*` stays as-is. Moving it onto the new parser is
  a separate decision.

## 7. What was built (phase 1)

| File | Role |
|---|---|
| `src/app/api/skill/reso/[[...path]]/route.ts` | Service doc, `$metadata`, `Property`, `Property('k')`, `Property('k')/Media`, `Lookup`, OData 404. Auth: `crt_live` + `listings:read`; tenant tokens → 501; rate tier `reso` (600/min) |
| `src/lib/reso/web-api/fields.ts` | The declared fields and their Mongo sources. **Add a field only after checking its stored type** |
| `src/lib/reso/web-api/edmx.ts` | `$metadata` (string-mode enums, matches RESO's own generator) |
| `src/lib/reso/web-api/filter-to-mongo.ts` | `$filter` AST (RESO's parser) → Mongo |
| `src/lib/reso/web-api/query.ts` | `$select $orderby $top $skip $count $expand`, `Prefer: odata.maxpagesize` |
| `src/lib/reso/web-api/property-store.ts` | Raw-collection reads of `unified_listings` (not the Mongoose model: its schema says `Date`, the data is strings) |
| `src/lib/reso/web-api/lookup.ts` + `match.ts` | Lookup catalog (DD standard values + distinct data values, 1 h cache) filtered in memory with the same translator |
| `src/lib/reso/web-api/__tests__/filter-to-mongo.test.ts` | Run with `npx tsx --conditions=import --test …` (the parser is ESM-only) |

What the probe (2026-10-29, 85,346 docs) changed from §4:
- Every timestamp is one exact string shape, `YYYY-MM-DDTHH:MM:SSZ`, so string
  comparison is safe. Literals are normalized to it, and fractional seconds round
  to the exact bound.
- `OnMarketDate` is stored as a full timestamp and served as its date part
  (Edm.Date, as the DD types it). `ListingContractDate` is already `YYYY-MM-DD`.
- `BedroomsTotal` reads `bedsTotal`, because `bedroomsTotal` is never populated.
- Media is a nav-only EntityType, **not** an EntitySet. Photos are embedded
  (~2M), and a top-level set would invite the suite to page through all of
  them. They map from Spark's shape (`id`, `name`, `uriLarge`).
- `propertyTypeName` holds the RESO labels (`Residential`, `Land`,
  `Residential Lease`, `Residential Income`). That makes it the right source
  if `PropertyType` is added as a second lookup.

Live-site safety: everything is additive. It's a new route, new `src/lib/reso/web-api/`
modules, and one new rate tier. `src/proxy.ts` and the existing `/api/skill/*`
routes are unchanged, and nothing is written to the database.

## Sources

- [RESOStandards/reso-tools](https://github.com/RESOStandards/reso-tools): `reso-certification/src/web-api-core/README.md` and `scenarios.ts` (scenario list and gating above)
- [RESO Web API Core spec](https://transport.reso.org/proposals/web-api-core)
- [RESO certification](https://www.reso.org/certification/)
