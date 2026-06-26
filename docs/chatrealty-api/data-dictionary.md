---
title: RESO Data Dictionary — Field Catalog
status: current
last_verified: 2026-06-25
related: [./build_plan.md, ./db-adapter.md, ./architecture.md]
---

# RESO Data Dictionary (`src/lib/reso/data-dictionary.ts`)

> **TL;DR.** The single source of truth for column naming across the ChatRealty
> data plane. It catalogs four RESO resources — **Property** (listings),
> **Member** + **Office** (agent/brokerage identity), and **Media** (photos) —
> and carries **all three casings explicitly** for every field: the camelCase
> DTO `name`, the PascalCase RESO `resoName`, and the snake_case Postgres
> `pgColumn`. The Drizzle schema (Agent 09), the DDL generator (Agent 04), and
> the customer sync mapper (Agent 24) all consume this catalog. Casings are
> hand-mapped, never derived by naive transform.

This doc is generated to match `src/lib/reso/data-dictionary.ts` —
the **code is the source of truth**; this page explains the why and serves as
the LLM-readable field reference (build_plan §3.9). When the catalog changes,
bump `DATA_DICTIONARY_VERSION` and update this doc in the same change.

Current version: **`2026-06-25.1`**.

## The three casings (build_plan §3.4)

| Casing | Field on `ResoField` | Example | Where it's used |
|---|---|---|---|
| camelCase | `name` | `listingKey`, `onMarketDate`, `poolYN` | TS DTOs, the adapter, OData `$select` output |
| PascalCase | `resoName` | `ListingKey`, `OnMarketDate`, `PoolPrivateYN` | RESO Web API source, sync mapper input |
| snake_case | `pgColumn` | `listing_key`, `on_market_date`, `pool_yn` | Postgres columns, Drizzle tables, raw SQL |

**Why hand-mapped, not transformed.** A naive camel→snake transform breaks on
the YN fields (`poolYN`→`pool_y_n` ❌, want `pool_yn`) and reserved words
(`view`, `order`). The catalog spells out every mapping so no consumer has to
guess. Reserved-word columns (`"view"`, the Media `Order`→`media_order` rename)
are handled by the DDL generator (Agent 04).

## The attribution rule (build_plan §3.8 — HARD RULE, MLS/IDX compliance)

> **Listing data MUST NEVER be served or rendered without the listing agent and
> listing brokerage attribution.** A violation is a compliance bug of the same
> severity as a tenant leak.

In this catalog the attribution fields on **Property** are marked
`required: true` **and** `nullable: false`, so they are structurally impossible
to drop:

| `name` | `resoName` (source) | `pgColumn` | required | nullable |
|---|---|---|---|---|
| `listAgentName` | `ListAgentFullName` | `list_agent_name` | ✅ | ❌ |
| `listOfficeName` | `ListOfficeName` | `list_office_name` | ✅ | ❌ |
| `listAgentPreferredPhone` | `ListAgentPreferredPhone` | `list_agent_preferred_phone` | ✅ | ✓ (phone may be absent) |
| `listOfficePhone` | `ListOfficePhone` | `list_office_phone` | ✅ | ✓ |

The sync MUST map `ListAgentFullName`→`listAgentName`, `ListOfficeName`→
`listOfficeName`, plus the MLS IDs and phones. Every listing DTO carries
`listAgentName` + `listOfficeName`; every serving surface (search, card grid,
detail sheet, MCP listing-board, CHAP narration) displays them. Call
`getRequiredFields("Property")` to enumerate them programmatically.

## Lookup API

| Function | Returns |
|---|---|
| `getResource(resource)` | The `ResoResourceDef` (table, primaryKey, fields) or `undefined` |
| `getField(resource, x)` | A field matched by camelCase `name`, PascalCase `resoName`, **or** snake_case `pgColumn`; `undefined` on miss |
| `getFields(resource)` | All fields (empty array for unknown resource) |
| `getRequiredFields(resource)` | The `required` attribution/serving fields (§3.8) |
| `getIndexedFields(resource)` | Fields carrying / participating in an index (DDL generator) |
| `resoNameToFieldName(resource, resoName)` | PascalCase → camelCase |
| `fieldNameToColumn(resource, name)` | camelCase → snake_case column |

`getField` accepts all three casings on purpose: the sync mapper looks up by
`resoName`, the DDL generator by `name`, and raw-SQL consumers by `pgColumn`.

### Common mistakes

- **Don't** camel→snake transform a YN field. Use `fieldNameToColumn` /
  `getField` — `poolYN` is `pool_yn`, never `pool_y_n`.
- **Don't** read `bedroomsTotal` alone. The catalog keeps the dual
  `bedroomsTotal` + `bedsTotal` (and `bathroomsTotalInteger` + decimal) columns;
  the **adapter** OR-collapses them — do not collapse in SQL by hand.
- **Don't** treat `onMarketDate` as a Date on the Mongo path. There it is an ISO
  string compared lexically (the `StrRange` trap); Postgres stores a real
  `timestamptz`.
- **Don't** register a custom field that shadows a core column. Agent 17's
  registry rejects core-RESO shadowing — unmapped fields go to `extras` (JSONB,
  GIN `jsonb_path_ops` indexed).

## Resource: Property (listings) — `property`

Primary key: `listingKey`. Grounded in `src/models/unified-listing.ts`.
Abbreviated catalog (full list in code):

| `name` (camelCase) | `resoName` (PascalCase) | `pgColumn` | type | nullable | indexed |
|---|---|---|---|---|---|
| `listingKey` | `ListingKey` | `listing_key` | string | ❌ | ✅ |
| `slug` | `Slug` | `slug` | string | ❌ | ✅ |
| `mlsSource` | `OriginatingSystemName` | `mls_source` | string | ❌ | ✅ |
| `propertyType` | `PropertyType` | `property_type` | string | ✓ | ✅ |
| `standardStatus` | `StandardStatus` | `standard_status` | enum | ✓ | ✅ |
| `listPrice` | `ListPrice` | `list_price` | number | ✓ | ✅ |
| `bedroomsTotal` | `BedroomsTotal` | `bedrooms_total` | integer | ✓ | ✅ |
| `bedsTotal` | `BedsTotal` | `beds_total` | integer | ✓ | ✅ |
| `bathroomsTotalInteger` | `BathroomsTotalInteger` | `bathrooms_total_integer` | integer | ✓ | ✅ |
| `yearBuilt` | `YearBuilt` | `year_built` | integer | ✓ | ✅ |
| `poolYN` | `PoolPrivateYN` | `pool_yn` | boolean | ✓ | ✅ |
| `view` | `View` | `view` | string | ✓ | — |
| `unparsedAddress` | `UnparsedAddress` | `unparsed_address` | string | ✓ | ✅ |
| `city` | `City` | `city` | string | ✓ | ✅ |
| `subdivisionName` | `SubdivisionName` | `subdivision_name` | string | ✓ | ✅ |
| `postalCode` | `PostalCode` | `postal_code` | string | ✓ | ✅ |
| `geom` | `Geom` | `geom` | geography | ✓ | ✅ (GiST) |
| `onMarketDate` | `OnMarketDate` | `on_market_date` | date | ✓ | ✅ |
| `modificationTimestamp` | `ModificationTimestamp` | `modification_timestamp` | date | ✓ | ✅ |
| `listAgentName` | `ListAgentFullName` | `list_agent_name` | string | ❌ | — |
| `listAgentPreferredPhone` | `ListAgentPreferredPhone` | `list_agent_preferred_phone` | string | ✓ | — |
| `listOfficeName` | `ListOfficeName` | `list_office_name` | string | ❌ | — |
| `listOfficePhone` | `ListOfficePhone` | `list_office_phone` | string | ✓ | — |
| `cmaStats` | `CmaStats` | `cma_stats` | json | ✓ | — |
| `extras` | `Extras` | `extras` | json | ✓ | ✅ (GIN) |

**`standardStatus` enum values:** `Active`, `ActiveUnderContract`, `Pending`,
`Closed`, `Expired`, `Canceled`, `Withdrawn`, `ComingSoon`, `Hold`, `Delete`,
`Incomplete`.

Notes: `view` is a reserved word — quoted `"view"` in DDL. `poolYN` is the
**canonical** pool flag; the sync MUST normalize the `poolYn`/`poolYN`/`pool`
soup into this one column at sync time (build_plan §6.5 — the Beverly Hills
0%-vs-73% under-reporting defect). For `propertyType` `B` (rental), `listPrice`
doubles as monthly rent — there is no separate rent column.

## Resource: Member (agent identity) — `member`

Primary key: `memberKey`.

| `name` | `resoName` | `pgColumn` | type | nullable | indexed |
|---|---|---|---|---|---|
| `memberKey` | `MemberKey` | `member_key` | string | ❌ | ✅ |
| `memberMlsId` | `MemberMlsId` | `member_mls_id` | string | ✓ | ✅ |
| `memberFullName` | `MemberFullName` | `member_full_name` | string | ✓ | — |
| `memberEmail` | `MemberEmail` | `member_email` | string | ✓ | — |
| `memberPreferredPhone` | `MemberPreferredPhone` | `member_preferred_phone` | string | ✓ | — |
| `officeMlsId` | `OfficeMlsId` | `office_mls_id` | string | ✓ | ✅ |
| `extras` | `Extras` | `extras` | json | ✓ | ✅ (GIN) |

`memberFullName` is the join source for Property's `listAgentName` attribution.
`officeMlsId` is the foreign key to `Office.officeMlsId`.

## Resource: Office (brokerage identity) — `office`

Primary key: `officeKey`.

| `name` | `resoName` | `pgColumn` | type | nullable | indexed |
|---|---|---|---|---|---|
| `officeKey` | `OfficeKey` | `office_key` | string | ❌ | ✅ |
| `officeMlsId` | `OfficeMlsId` | `office_mls_id` | string | ✓ | ✅ |
| `officeName` | `OfficeName` | `office_name` | string | ✓ | — |
| `officePhone` | `OfficePhone` | `office_phone` | string | ✓ | — |
| `extras` | `Extras` | `extras` | json | ✓ | ✅ (GIN) |

`officeName` is the join source for Property's `listOfficeName` attribution.

## Resource: Media (photos) — `media`

Primary key: `mediaKey`.

| `name` | `resoName` | `pgColumn` | type | nullable | indexed |
|---|---|---|---|---|---|
| `mediaKey` | `MediaKey` | `media_key` | string | ❌ | ✅ |
| `resourceRecordKey` | `ResourceRecordKey` | `resource_record_key` | string | ✓ | ✅ |
| `mediaUrl` | `MediaURL` | `media_url` | string | ✓ | — |
| `mediaType` | `MediaType` | `media_type` | string | ✓ | — |
| `order` | `Order` | `media_order` | integer | ✓ | — |
| `caption` | `ShortDescription` | `caption` | string | ✓ | — |
| `extras` | `Extras` | `extras` | json | ✓ | ✅ (GIN) |

`resourceRecordKey` is the foreign key to `Property.listingKey`. The RESO field
`Order` is a reserved word — its column is renamed `media_order` in the DDL.

## Worked seed example

A row coming off the RESO Web API arrives PascalCase. The sync mapper
(Agent 24) walks the catalog, mapping each `resoName`→`pgColumn`; unmapped keys
fall to `extras`. The **attribution fields are non-negotiable** — a row missing
`ListAgentFullName`/`ListOfficeName` is non-compliant and must not be served.

Source RESO record (abbreviated):

```jsonc
{
  "ListingKey": "20240612123456789012345678",
  "StandardStatus": "Active",
  "PropertyType": "A",
  "ListPrice": 749000,
  "BedroomsTotal": 3,
  "BathroomsTotalInteger": 2,
  "YearBuilt": 1998,
  "PoolPrivateYN": true,
  "City": "Palm Desert",
  "SubdivisionName": "Palm Desert Country Club",
  "UnparsedAddress": "12345 Fairway Dr, Palm Desert, CA 92260",
  "Latitude": 33.7406,
  "Longitude": -116.3869,
  "OnMarketDate": "2024-06-12T00:00:00Z",
  "ListAgentFullName": "Joseph Sardella",      // → ATTRIBUTION (required)
  "ListAgentPreferredPhone": "+17605551234",
  "ListOfficeName": "ChatRealty / eXp Realty", // → ATTRIBUTION (required)
  "ListOfficePhone": "+17605550000",
  "SomeMlsSpecificFlag": "Y"                    // → unmapped → extras
}
```

Resulting Postgres row (snake_case columns):

```jsonc
{
  "listing_key": "20240612123456789012345678",
  "standard_status": "Active",
  "property_type": "A",
  "list_price": 749000,
  "bedrooms_total": 3,
  "bathrooms_total_integer": 2,
  "year_built": 1998,
  "pool_yn": true,
  "city": "Palm Desert",
  "subdivision_name": "Palm Desert Country Club",
  "unparsed_address": "12345 Fairway Dr, Palm Desert, CA 92260",
  "geom": "SRID=4326;POINT(-116.3869 33.7406)",
  "on_market_date": "2024-06-12T00:00:00Z",
  "list_agent_name": "Joseph Sardella",
  "list_agent_preferred_phone": "+17605551234",
  "list_office_name": "ChatRealty / eXp Realty",
  "list_office_phone": "+17605550000",
  "extras": { "someMlsSpecificFlag": "Y" }
}
```

The corresponding camelCase DTO (`ListingDTO`, served to clients / the MCP)
carries `listAgentName` and `listOfficeName` — **always**, never optional.
That is the attribution invariant, restated: no listing surface omits them.

## Custom fields & the `extras` filter helper (`src/lib/tenant/custom-fields.ts`, Agent 17)

> **TL;DR.** A tenant may declare fields beyond this core catalog. They live in
> the listing's `extras` JSONB blob and are catalogued in the per-tenant
> `custom_field_registry` table (`0001_init.sql`; Drizzle shape in
> `src/lib/db/schema/contacts.ts`). `src/lib/tenant/custom-fields.ts` is the
> **only** place that table is written/read and the only place a custom-field
> name is validated.

**No global connection (build_plan §3.3).** Every function takes an **injected**
`TenantDb` — a minimal `{ query<T>(sql, params) }` handle satisfied by the
keystone's `DbAdapter` (its raw runner). The module never opens a pool, never
imports a module-level `db`.

| Function | Purpose |
|---|---|
| `registerCustomField(db, { name, type, label?, searchable?, enumValues?, resource? })` | Upsert a field on the `(resource, name)` unique key. Returns the stored record. |
| `listCustomFields(db, resource?)` | All registered fields (default `Property`; pass `"all"` for every resource). |
| `getSearchableCustomFields(db, resource?)` | Only `searchable` fields — the set the OData layer may filter on. |
| `validateCustomFieldName(name, resource?)` | Throws `CustomFieldError` on a bad identifier or core-field shadow. |
| `extrasFilterClause(name, op, value, paramIndex?)` | A **parameterized** `extras` predicate. |

**The two hard invariants (build_plan §7 risk row).** `registerCustomField`
rejects:

1. **Core-field shadowing** — a `name` that resolves (by any of the three
   casings, via `getField`) to a core RESO column → `CustomFieldError`
   (`code: "shadows_core_field"`). Prevents an `extras->>'x'` predicate from
   colliding with a real typed column.
2. **Unsafe identifiers** — the name must match `^[a-z_][a-z0-9_]*$` (lowercase,
   ≤63 chars) → `code: "invalid_name"`. The name is the **only** token ever
   embedded in SQL text, so it must never carry a quote, paren, or whitespace.
   (The identifier gate runs **before** the shadowing check, so an
   uppercase-bearing core name like `listingKey` is rejected as `invalid_name`.)

An `enum` field additionally requires non-empty `enumValues`
(`code: "enum_values_required"`).

**`extrasFilterClause` is parameterized — the value is NEVER interpolated.** It
returns `{ text, params, nextParamIndex }` where `text` carries a single `$N`
placeholder and `params` is the bound value:

| Value kind | Emitted predicate (for `op` `eq`/`ge`/…) |
|---|---|
| boolean | `(extras->>'name')::boolean = $N` |
| number | `(extras->>'name')::numeric >= $N` |
| string | `extras->>'name' = $N` |

The operator comes from a fixed allow-list (`eq ne gt ge lt le`); an unknown op
throws (`invalid_op`). `paramIndex` lets the clause splice into a larger
statement's `$N` sequence. Example:

```ts
const c = extrasFilterClause("waterfront", "eq", true, 1);
// c.text   === "(extras->>'waterfront')::boolean = $1"
// c.params === [true]
await db.query(`SELECT listing_key FROM property WHERE ${c.text}`, [...c.params]);
```

Tested LIVE against Neon (`src/lib/tenant/__tests__/custom-fields.test.ts`):
register `waterfront`, list it, build a clause and run it against a seeded row;
plus pure shadowing/identifier-rejection assertions. The WS pool is closed in an
`after()` hook so the runner exits cleanly.
