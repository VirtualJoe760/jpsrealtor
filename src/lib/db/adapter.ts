// src/lib/db/adapter.ts
//
// Agent 01 — the DB-agnostic adapter contract (Spec 3 Task A).
//
// PURE INTERFACES ONLY. No implementation, no Mongoose, no Drizzle, no Neon
// imports — this file is the type contract that every other subsystem codes
// against (the Mongo adapter, the Postgres adapter, the CHAP repo, the OData
// handler, the sync package). Keeping it implementation-free is what lets ~25
// agents build in parallel against one shape.
//
// THE TENANT-SCOPING RULE (build_plan §3.3): there is no global data-plane DB
// connection. A `DbAdapter` is always tenant-scoped — it is handed back by the
// keystone resolver (`resolveAdapter(tenantId)`); handlers never construct one
// at module scope. This file deliberately exposes only the *interface*, so a
// global singleton is structurally impossible to declare here.
//
// CASING CONVENTIONS (build_plan §3.4): DTO fields are camelCase. The Postgres
// columns behind them are snake_case; the RESO source names are PascalCase. The
// collapse from those source shapes to the canonical camelCase DTO happens in
// exactly one place — `to-dto.ts`. Adapters return DTOs, never raw rows.

// -----------------------------------------------------------------------------
// OData query shape
// -----------------------------------------------------------------------------
//
// Agent 05 owns the canonical `OdataQuery` (`src/lib/skill-api/odata/parse.ts`)
// and the adapter's collection surface consumes it. That module does not exist
// at Phase-0 day-one, so to keep this contract file compilable standalone we
// declare the *structural* shape here as `OdataQueryLike`. When Agent 05 lands,
// their `OdataQuery` is assignable to this — it is the same flat, AND-only,
// injection-safe grammar (build_plan §6.6). Do NOT widen this into an
// expression tree; the grammar is intentionally flat.

/** A single AND-ed comparison from a `$filter` clause. */
export interface OdataFilterClause {
  /** Field name in the resource's field map (RESO/PascalCase as parsed). */
  readonly field: string;
  /** Comparison operator (the OData subset the parser accepts). */
  readonly op: "eq" | "ne" | "gt" | "ge" | "lt" | "le";
  /** Comparison value (already typed by the parser). */
  readonly value: string | number | boolean | null;
}

/** One `$orderby` term. */
export interface OdataOrderBy {
  readonly field: string;
  readonly dir: "asc" | "desc";
}

/**
 * Structural form of Agent 05's `OdataQuery`. Adapters accept this through
 * `FindOpts.odata`; they never re-parse a query string.
 */
export interface OdataQueryLike {
  /** `$select` — projected field names, or `undefined` for all. */
  readonly select?: readonly string[];
  /** `$filter` — flat list of AND-ed clauses (no `or`, no parentheses). */
  readonly filter?: readonly OdataFilterClause[];
  /** `$orderby` terms in priority order. */
  readonly orderby?: readonly OdataOrderBy[];
  /** `$top` — page size. */
  readonly top?: number;
  /** `$skip` — offset. */
  readonly skip?: number;
  /** `$count=true` — emit `@odata.count` (counting is opt-in; it's expensive). */
  readonly count?: boolean;
}

// -----------------------------------------------------------------------------
// Range helpers
// -----------------------------------------------------------------------------

/** Inclusive numeric range. `min`/`max` independently optional. */
export interface NumRange {
  readonly min?: number;
  readonly max?: number;
}

/**
 * Inclusive string range — used for the `onMarketDate` string-vs-Date trap
 * where the value is stored as an ISO-8601 string and must be compared
 * lexically, never cast to a Date (see the search route's `.collection` bypass).
 */
export interface StrRange {
  readonly min?: string;
  readonly max?: string;
}

/** Geographic bounding box (degrees, WGS84). */
export interface BBox {
  readonly minLat: number;
  readonly maxLat: number;
  readonly minLng: number;
  readonly maxLng: number;
}

// -----------------------------------------------------------------------------
// Listing filter — the structured (non-OData) listing query
// -----------------------------------------------------------------------------
//
// This mirrors today's `/api/skill/listings/search` query params so the Mongo
// adapter (Agent 02) can reproduce the exact current query objects and the
// Postgres adapter (Agent 09) can map each field to the equivalent SQL
// predicate. Bed/bath are single ranges here; each adapter is responsible for
// the dual-column `$or` (bedroomsTotal||bedsTotal, bathroomsTotalInteger||
// bathsTotal) against its own dialect.

export interface ListingFilter {
  /** Exact city match (`city`). */
  readonly city?: string;
  /** Exact subdivision match (`subdivisionName`). */
  readonly subdivision?: string;
  /**
   * Normalized property-type bucket: A=sale, B=rental, C=multifamily, D=land.
   * Adapters expand this to the dialect's stored values. Type `B` reuses
   * `listPrice` as monthly rent (no separate rent column).
   */
  readonly propertyType?: string;
  /** `standardStatus` (defaults to "Active" at the call site, not here). */
  readonly status?: string;
  /** Inclusive list-price range. */
  readonly price?: NumRange;
  /** Inclusive beds range (collapsed dual-column at the adapter). */
  readonly beds?: NumRange;
  /** Inclusive baths range (collapsed dual-column at the adapter). */
  readonly baths?: NumRange;
  /** Inclusive year-built range. */
  readonly yearBuilt?: NumRange;
  /**
   * `onMarketDate` as a lexical ISO-string range (NOT a Date range — see
   * `StrRange`). Derived from min/maxDaysOnMarket at the call site.
   */
  readonly onMarketDate?: StrRange;
  /** Pool presence. `true` requires the typed/`extras` pool signal. */
  readonly hasPool?: boolean;
  /** Map-bounds / viewport constraint. */
  readonly bbox?: BBox;
  /**
   * Registered custom fields → `extras` JSONB predicates (Postgres) /
   * equivalent (Mongo). Keys are registry-validated field names; values are
   * exact-match. The adapter parameterizes them (no value interpolation).
   */
  readonly extras?: Readonly<Record<string, string | number | boolean>>;
}

// -----------------------------------------------------------------------------
// Find options
// -----------------------------------------------------------------------------

/** One sort term for a structured (non-OData) find. */
export interface SortSpec {
  readonly field: string;
  readonly dir: "asc" | "desc";
}

/**
 * Pagination / projection / ordering for a repo `find`. When `odata` is set it
 * carries an already-parsed Agent-05 query; the structured `sort`/`projection`
 * fields are the lower-level knobs the CHAP repo and legacy routes use.
 */
export interface FindOpts {
  /** Page size. */
  readonly limit?: number;
  /** Offset. */
  readonly skip?: number;
  /** Structured ordering (priority order). */
  readonly sort?: readonly SortSpec[];
  /** Projected DTO field names; `undefined` = the full DTO. */
  readonly projection?: readonly string[];
  /** Emit an exact total (`@odata.count` / `total`). Off by default — costly. */
  readonly withCount?: boolean;
  /** An already-parsed OData query (Agent 05), when this find came via `withOdata`. */
  readonly odata?: OdataQueryLike;
}

/** A page of results plus the cursor metadata the envelope needs. */
export interface Page<T> {
  readonly items: readonly T[];
  /** Exact total when `withCount`/`$count=true` was requested, else null. */
  readonly total: number | null;
  readonly skip: number;
  readonly limit: number;
  readonly hasMore: boolean;
}

// -----------------------------------------------------------------------------
// DTOs
// -----------------------------------------------------------------------------
//
// These are the byte-stable shapes routes and the MCP serialize. They are
// camelCase and dialect-independent — the WHOLE point of the adapter is that a
// Mongo row and a Postgres row map to the *same* DTO here.

/**
 * Listing DTO — the canonical listing card/detail shape.
 *
 * ATTRIBUTION INVARIANT (build_plan §3.8 — HARD RULE, MLS/IDX compliance):
 * `listAgentName` and `listOfficeName` are REQUIRED, not optional. A
 * `ListingDTO` without them is a compliance bug of the same severity as a
 * tenant leak. `toListingDTO` MUST always populate them; the contract test
 * asserts their presence on every mapped listing. `listAgentPreferredPhone`
 * and `listOfficePhone` are carried where the surface allows.
 */
export interface ListingDTO {
  // --- identity ---
  readonly listingKey: string;
  readonly slug: string;
  readonly detailUrl: string;

  // --- location ---
  readonly address: string | null;
  readonly city: string | null;
  readonly subdivision: string | null;
  readonly latitude: number | null;
  readonly longitude: number | null;

  // --- classification ---
  readonly propertyType: string | null;
  readonly status: string | null;

  // --- price ---
  readonly listPrice: number | null;
  readonly currentPrice: number | null;

  // --- facts (collapsed dual-column) ---
  readonly beds: number | null;
  readonly baths: number | null;
  readonly sqft: number | null;
  readonly yearBuilt: number | null;
  readonly pool: boolean;

  // --- market timing ---
  readonly daysOnMarket: number | null;
  readonly onMarketDate: string | null;

  // --- media (fallback chain collapsed) ---
  readonly primaryPhotoUrl: string | null;
  readonly thumbUrl: string | null;

  // --- ATTRIBUTION (REQUIRED — IDX display rule, never optional) ---
  readonly listAgentName: string;
  readonly listOfficeName: string;
  readonly listAgentPreferredPhone: string | null;
  readonly listOfficePhone: string | null;
}

/** Contact DTO — the minimal CRM display shape (collapsed primary phone/email). */
export interface ContactDTO {
  readonly id: string;
  readonly name: string;
  readonly organization: string | null;
  readonly status: string | null;
  readonly tags: readonly string[];
  readonly primaryPhone: string | null;
  readonly primaryEmail: string | null;
  readonly source: string | null;
  readonly lastContactDate: string | Date | null;
  readonly lastContactMethod: string | null;
  readonly createdAt: string | Date | null;
}

// -----------------------------------------------------------------------------
// Resource enum
// -----------------------------------------------------------------------------

/** The collection resources the generic `find`/`get` surface can address. */
export type DbResource = "listings" | "contacts";

// -----------------------------------------------------------------------------
// Repositories
// -----------------------------------------------------------------------------

/** Tenant-scoped listing reads. Returns DTOs only — never raw rows. */
export interface ListingRepo {
  /** Structured listing search (mirrors today's search route). */
  find(filter: ListingFilter, opts?: FindOpts): Promise<Page<ListingDTO>>;
  /** Exact count for a filter (opt-in; expensive). */
  count(filter: ListingFilter): Promise<number>;
  /** Single listing by its RESO `listingKey`; `null` when absent. */
  get(listingKey: string): Promise<ListingDTO | null>;
}

/** Tenant-scoped contact reads. The Mongo path additionally scopes by `ownerId`. */
export interface ContactRepo {
  /** Free-text / structured contact search. */
  find(query: string, opts?: FindOpts): Promise<Page<ContactDTO>>;
  /** Single contact by id; `null` when absent. */
  get(id: string): Promise<ContactDTO | null>;
}

/**
 * The per-tenant database adapter.
 *
 * Obtained ONLY from the keystone resolver — never constructed at module scope,
 * never a shared singleton (build_plan §3.3). `dialect` lets parity tests assert
 * byte-identical DTOs across `"mongo"` and `"postgres"`. `raw` is the escape
 * hatch the CHAP repo (Spec 5) uses for PostGIS/aggregate SQL — on the Postgres
 * adapter it wraps Drizzle's `sql` runner; on Mongo it is unsupported.
 */
export interface DbAdapter {
  readonly dialect: "mongo" | "postgres";
  readonly listings: ListingRepo;
  readonly contacts: ContactRepo;

  /**
   * Generic OData-driven collection read used by the REST surface. Delegates to
   * the typed repos; accepts the parsed `OdataQueryLike` (Agent 05).
   */
  find(resource: DbResource, query: OdataQueryLike): Promise<Page<ListingDTO | ContactDTO>>;
  /** Generic single-resource read by id/key. */
  get(resource: DbResource, id: string): Promise<ListingDTO | ContactDTO | null>;

  /**
   * Raw parameterized SQL runner for the CHAP/PostGIS repo. Postgres-only;
   * the Mongo adapter throws `unsupported`. `params` are bound, never
   * interpolated.
   */
  query<T = unknown>(sql: string, params?: readonly unknown[]): Promise<T[]>;

  /**
   * Release the underlying client/pool. Called by the resolver's LRU `dispose`,
   * never by a handler. No-op for the neon-http reader; `pool.end()` for the WS
   * pool / Mongo connection.
   */
  close(): Promise<void>;
}
