// src/lib/db/mongo-adapter.ts
//
// Agent 02 — the Mongo adapter (legacy / self-host path).
//
// `createMongoAdapter(conn)` implements the `DbAdapter` contract (Agent 01)
// against today's MongoDB collections. Its sole job is to reproduce — BYTE FOR
// BYTE — the Mongo query objects the current `/api/skill/*` routes hand to the
// driver, so the legacy single-tenant deployment behaves identically before and
// after the adapter seam lands. The Postgres adapter (Agent 09) maps the same
// `ListingFilter`/`FindOpts` inputs to SQL; this one maps them to Mongo.
//
// WHY THIS FILE EXISTS / WHAT IT MUST PRESERVE (build_plan §6.3, Agent 02):
//
//   1. The native `.collection` bypass. `onMarketDate` is declared `Date` in the
//      Mongoose schema but STORED as an ISO-8601 string. A `$gte`/`$lte` against
//      a string through Mongoose silently casts to Date and matches nothing.
//      The search route bypasses Mongoose via `UnifiedListing.collection` so the
//      filter values are used verbatim — this adapter does the same: every read
//      goes through `conn.collection(name)` native handles, never a model.
//
//   2. The dual bed/bath `$or` clauses. Different MLS sources populate different
//      field names, so beds match `{ $or: [{ bedroomsTotal }, { bedsTotal }] }`
//      and baths `{ $or: [{ bathroomsTotalInteger }, { bathsTotal }] }`,
//      accumulated into `query.$and` exactly as the search route builds them.
//
//   3. `userId: ownerId` scoping for contacts. The legacy single-tenant path
//      scopes every contact read by the owning user's id (search route line:
//      `{ userId: auth.user._id }`). The adapter takes `ownerId` at construction
//      and stamps it onto every contact query.
//
//   4. `.lean()` / native reads. Reads return plain rows (the native driver
//      already yields POJOs); `Mixed` fields like `cmaStats`/`cashflowStats`
//      pass through untouched. Rows are collapsed to DTOs by Agent 01's
//      `toListingDTO`/`toContactDTO` — the adapter never invents its own mapping.
//
// The query-building functions are exported so the contract test can assert the
// emitted filter equals the hand-built Mongo query object with NO live DB.

import type {
  DbAdapter,
  DbResource,
  ListingRepo,
  ContactRepo,
  ListingFilter,
  FindOpts,
  Page,
  ListingDTO,
  ContactDTO,
  OdataQueryLike,
  SortSpec,
} from "./adapter";
import { toListingDTO, toContactDTO } from "./to-dto";

// -----------------------------------------------------------------------------
// Minimal structural types for the Mongo connection handle
// -----------------------------------------------------------------------------
//
// We DON'T import the `mongodb` / `mongoose` types here — the adapter must
// compile standalone (Phase 0, no keystone) and the contract test must run with
// zero driver dependency. These structural interfaces describe only the surface
// the adapter touches: a connection that hands back native collection handles
// with find/findOne/countDocuments. The real `mongoose.Connection.db` and the
// raw `mongodb` `Db` both satisfy this shape.

/** A native MongoDB cursor (the subset the adapter chains). */
export interface MongoCursorLike<T = Record<string, unknown>> {
  sort(spec: Record<string, 1 | -1>): MongoCursorLike<T>;
  skip(n: number): MongoCursorLike<T>;
  limit(n: number): MongoCursorLike<T>;
  project(spec: Record<string, 0 | 1>): MongoCursorLike<T>;
  toArray(): Promise<T[]>;
}

/** A native MongoDB collection handle (the subset the adapter calls). */
export interface MongoCollectionLike<T = Record<string, unknown>> {
  find(filter: Record<string, unknown>, options?: { projection?: Record<string, 0 | 1> }): MongoCursorLike<T>;
  findOne(filter: Record<string, unknown>, options?: { projection?: Record<string, 0 | 1> }): Promise<T | null>;
  countDocuments(filter: Record<string, unknown>): Promise<number>;
}

/**
 * The Mongo connection handle the adapter is constructed with. A
 * `mongoose.Connection` (via `.collection(name)`) or a raw `mongodb` `Db`
 * satisfies this. The adapter only ever obtains native collection handles from
 * it — never a Mongoose model — preserving the schema-casting bypass.
 */
export interface MongoConnLike {
  collection<T = Record<string, unknown>>(name: string): MongoCollectionLike<T>;
}

/** Options for `createMongoAdapter`. */
export interface MongoAdapterOptions {
  /**
   * Legacy single-tenant owner scoping. When set, every CONTACT query is scoped
   * `{ userId: ownerId, ... }` (the `auth.user._id` the contacts route uses).
   * Listings are MLS-global and are NOT owner-scoped (matching today's routes).
   */
  readonly ownerId?: string;
  /** Collection name overrides (defaults mirror the current model collections). */
  readonly collections?: {
    readonly listings?: string;
    readonly contacts?: string;
  };
}

const DEFAULT_LISTINGS_COLLECTION = "unified_listings";
const DEFAULT_CONTACTS_COLLECTION = "contacts";

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;

// -----------------------------------------------------------------------------
// Listing query builder — reproduces the search route's query object EXACTLY
// -----------------------------------------------------------------------------
//
// Source of truth: src/app/api/skill/listings/search/route.ts (the structured,
// non-geo path). Construction ORDER matters because the emitted object's key
// order must match the hand-built reference in the contract test:
//
//   { standardStatus, city?, subdivisionName?, propertyType?, listPrice?,
//     yearBuilt?, onMarketDate?, latitude?, longitude?, $and? }
//
// - status defaults to "Active" at the call site (the route does
//   `status?.trim() || "Active"`); ListingFilter.status carries it explicitly.
// - propertyType: the route calls `applyPropertyTypeFilter(query, pt, "A")`
//   which Object.assign's `{ propertyType: <code> }` UNLESS the resolved value
//   is "all". ListingFilter.propertyType already carries the normalized bucket
//   (A/B/C/D); we set it directly, treating "all"/"any"/"" as "skip".
// - beds/baths collapse into the dual-column `$or` inside `$and`.
// - onMarketDate is a LEXICAL STRING range (StrRange) — used verbatim, never a
//   Date. The native `.collection` read is what makes that comparison work.
// - hasPool maps to the poolFeatures presence heuristic (string field), pushed
//   onto `$and`, exactly as the route does.
// - bbox maps to the latitude/longitude degree-box the route writes when `near`
//   resolves to a center.

const PROPERTY_TYPE_SKIP = new Set(["", "all", "any", "*"]);

export function buildListingMongoQuery(
  filter: ListingFilter
): Record<string, any> {
  // Base: standardStatus is always present (route seeds the query with it).
  const query: Record<string, any> = {
    standardStatus: filter.status ?? "Active",
  };

  if (filter.city) query.city = filter.city;
  if (filter.subdivision) query.subdivisionName = filter.subdivision;

  // propertyType: skip the clause for the wildcard buckets, else exact code.
  if (filter.propertyType !== undefined) {
    const pt = String(filter.propertyType).trim();
    if (!PROPERTY_TYPE_SKIP.has(pt.toLowerCase())) {
      query.propertyType = pt;
    }
  }

  // listPrice range (route builds `{}` then assigns $gte/$lte conditionally).
  if (filter.price && (filter.price.min !== undefined || filter.price.max !== undefined)) {
    query.listPrice = {};
    if (filter.price.min !== undefined) query.listPrice.$gte = filter.price.min;
    if (filter.price.max !== undefined) query.listPrice.$lte = filter.price.max;
  }

  // yearBuilt range.
  if (
    filter.yearBuilt &&
    (filter.yearBuilt.min !== undefined || filter.yearBuilt.max !== undefined)
  ) {
    query.yearBuilt = {};
    if (filter.yearBuilt.min !== undefined) query.yearBuilt.$gte = filter.yearBuilt.min;
    if (filter.yearBuilt.max !== undefined) query.yearBuilt.$lte = filter.yearBuilt.max;
  }

  // Dual-column beds/baths $or clauses accumulate into $and (route order:
  // beds first, then baths, then the pool clause).
  const andClauses: Record<string, any>[] = [];

  if (filter.beds && (filter.beds.min !== undefined || filter.beds.max !== undefined)) {
    const range: Record<string, number> = {};
    if (filter.beds.min !== undefined) range.$gte = filter.beds.min;
    if (filter.beds.max !== undefined) range.$lte = filter.beds.max;
    andClauses.push({ $or: [{ bedroomsTotal: range }, { bedsTotal: range }] });
  }

  if (filter.baths && (filter.baths.min !== undefined || filter.baths.max !== undefined)) {
    const range: Record<string, number> = {};
    if (filter.baths.min !== undefined) range.$gte = filter.baths.min;
    if (filter.baths.max !== undefined) range.$lte = filter.baths.max;
    andClauses.push({ $or: [{ bathroomsTotalInteger: range }, { bathsTotal: range }] });
  }

  // onMarketDate — LEXICAL string range (the StrRange native bypass). The route
  // assigns the range object to query.onMarketDate AFTER the beds/baths $and
  // accumulation but BEFORE the pool clause; key order here mirrors that.
  if (
    filter.onMarketDate &&
    (filter.onMarketDate.min !== undefined || filter.onMarketDate.max !== undefined)
  ) {
    const range: Record<string, string> = {};
    if (filter.onMarketDate.min !== undefined) range.$gte = filter.onMarketDate.min;
    if (filter.onMarketDate.max !== undefined) range.$lte = filter.onMarketDate.max;
    query.onMarketDate = range;
  }

  // hasPool — poolFeatures (string) presence heuristic, pushed onto $and.
  if (filter.hasPool === true) {
    andClauses.push({
      poolFeatures: { $exists: true, $nin: [null, "", "None", "none"] },
    });
  } else if (filter.hasPool === false) {
    andClauses.push({
      $or: [
        { poolFeatures: { $exists: false } },
        { poolFeatures: { $in: [null, "", "None", "none"] } },
      ],
    });
  }

  // Registered custom fields → exact-match equality predicates (Mongo
  // equivalent of the Postgres `extras` JSONB path). Keys are registry-validated
  // upstream; values are used as exact matches (never interpolated into an
  // operator), so they go straight onto the query object.
  if (filter.extras) {
    for (const [key, value] of Object.entries(filter.extras)) {
      query[key] = value;
    }
  }

  // bbox → latitude/longitude degree box (route writes these after geocoding a
  // `near` center). Both bounds inclusive.
  if (filter.bbox) {
    query.latitude = { $gte: filter.bbox.minLat, $lte: filter.bbox.maxLat };
    query.longitude = { $gte: filter.bbox.minLng, $lte: filter.bbox.maxLng };
  }

  if (andClauses.length > 0) query.$and = andClauses;

  return query;
}

// -----------------------------------------------------------------------------
// Contact query builder — reproduces the contacts search route's query object
// -----------------------------------------------------------------------------
//
// Source of truth: src/app/api/skill/contacts/search/route.ts.
//   { userId: ownerId, $or?: [...regex...], status?, tags? }
// `q` becomes a case-insensitive regex OR across name/org/email/phone (+ the
// legacy scalar phone/email fields). `tag` maps to `tags` (array contains).

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export interface ContactQueryParams {
  readonly ownerId?: string;
  readonly q?: string;
  readonly status?: string;
  readonly tag?: string;
}

export function buildContactMongoQuery(
  params: ContactQueryParams
): Record<string, any> {
  const query: Record<string, any> = {};
  // Legacy single-tenant owner scoping is the FIRST key (route seeds it).
  if (params.ownerId !== undefined) query.userId = params.ownerId;

  const q = params.q?.trim();
  if (q) {
    const regex = new RegExp(escapeRegex(q), "i");
    query.$or = [
      { firstName: regex },
      { lastName: regex },
      { organization: regex },
      { "emails.address": regex },
      { "phones.number": regex },
      { phone: regex }, // legacy field
      { email: regex }, // legacy field
    ];
  }

  if (params.status?.trim()) query.status = params.status.trim();
  if (params.tag?.trim()) query.tags = params.tag.trim();

  return query;
}

// -----------------------------------------------------------------------------
// Shared find helpers
// -----------------------------------------------------------------------------

function clampLimit(limit: number | undefined): number {
  return Math.min(MAX_LIMIT, Math.max(1, limit ?? DEFAULT_LIMIT));
}

function clampSkip(skip: number | undefined): number {
  return Math.max(0, skip ?? 0);
}

/** Convert the structured SortSpec[] to a native Mongo sort doc. */
function toMongoSort(sort: readonly SortSpec[] | undefined): Record<string, 1 | -1> {
  if (!sort || sort.length === 0) {
    // The listings search route sorts newest-first by onMarketDate.
    return { onMarketDate: -1 };
  }
  const doc: Record<string, 1 | -1> = {};
  for (const s of sort) doc[s.field] = s.dir === "asc" ? 1 : -1;
  return doc;
}

// -----------------------------------------------------------------------------
// Repositories
// -----------------------------------------------------------------------------

function makeListingRepo(conn: MongoConnLike, collectionName: string): ListingRepo {
  const col = () => conn.collection(collectionName);

  async function find(filter: ListingFilter, opts?: FindOpts): Promise<Page<ListingDTO>> {
    const query = buildListingMongoQuery(filter);
    const limit = clampLimit(opts?.limit);
    const skip = clampSkip(opts?.skip);

    // Overfetch one row to derive hasMore without a second count (mirrors the
    // search route's `limit + 1` trick). An exact total only when the caller
    // explicitly opts in via withCount (counting is expensive).
    const rows = await col()
      .find(query)
      .sort(toMongoSort(opts?.sort))
      .skip(skip)
      .limit(limit + 1)
      .toArray();

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;

    let total: number | null = null;
    if (opts?.withCount) {
      total = await col().countDocuments(query);
    } else if (!hasMore) {
      // Exact total is knowable for free when the result fits one page.
      total = skip + pageRows.length;
    }

    return {
      items: pageRows.map((r) => toListingDTO(r as Record<string, any>)),
      total,
      skip,
      limit,
      hasMore,
    };
  }

  async function count(filter: ListingFilter): Promise<number> {
    return col().countDocuments(buildListingMongoQuery(filter));
  }

  async function get(listingKey: string): Promise<ListingDTO | null> {
    const row = await col().findOne({ listingKey });
    return row ? toListingDTO(row as Record<string, any>) : null;
  }

  return { find, count, get };
}

function makeContactRepo(
  conn: MongoConnLike,
  collectionName: string,
  ownerId: string | undefined
): ContactRepo {
  const col = () => conn.collection(collectionName);

  async function find(query: string, opts?: FindOpts): Promise<Page<ContactDTO>> {
    const mongoQuery = buildContactMongoQuery({ ownerId, q: query });
    const limit = clampLimit(opts?.limit);
    const skip = clampSkip(opts?.skip);

    const [rows, total] = await Promise.all([
      col()
        .find(mongoQuery)
        // Contacts route sorts lastContactDate, then createdAt (both desc).
        .sort(toMongoSort(opts?.sort ?? [
          { field: "lastContactDate", dir: "desc" },
          { field: "createdAt", dir: "desc" },
        ]))
        .skip(skip)
        .limit(limit)
        .toArray(),
      col().countDocuments(mongoQuery),
    ]);

    return {
      items: rows.map((r) => toContactDTO(r as Record<string, any>)),
      total,
      skip,
      limit,
      hasMore: skip + rows.length < total,
    };
  }

  async function get(id: string): Promise<ContactDTO | null> {
    // Owner-scope the single read too (a contact id from another tenant's user
    // must not resolve under the legacy single-tenant path).
    const filter: Record<string, unknown> = { _id: id };
    if (ownerId !== undefined) filter.userId = ownerId;
    const row = await col().findOne(filter);
    return row ? toContactDTO(row as Record<string, any>) : null;
  }

  return { find, get };
}

// -----------------------------------------------------------------------------
// Adapter factory
// -----------------------------------------------------------------------------

/**
 * Construct a tenant-scoped Mongo `DbAdapter` over an existing connection
 * handle. Obtained from the keystone resolver (Agent 10) for the legacy /
 * self-host path — never a module-level singleton (build_plan §3.3).
 *
 * @param conn  A native Mongo connection handle (`mongoose.Connection` or raw
 *              `mongodb.Db`). The adapter only ever takes native collection
 *              handles from it — never a Mongoose model — to preserve the
 *              schema-casting bypass that makes the `onMarketDate` string range
 *              work.
 * @param opts  Owner scoping + collection-name overrides.
 */
export function createMongoAdapter(
  conn: MongoConnLike,
  opts: MongoAdapterOptions = {}
): DbAdapter {
  const listingsCollection = opts.collections?.listings ?? DEFAULT_LISTINGS_COLLECTION;
  const contactsCollection = opts.collections?.contacts ?? DEFAULT_CONTACTS_COLLECTION;

  const listings = makeListingRepo(conn, listingsCollection);
  const contacts = makeContactRepo(conn, contactsCollection, opts.ownerId);

  async function find(
    resource: DbResource,
    query: OdataQueryLike
  ): Promise<Page<ListingDTO | ContactDTO>> {
    // The OData-driven generic surface is owned by the REST layer (Agents 05/13)
    // on the Postgres path. The Mongo adapter is the legacy structured-query
    // path; it does not re-parse OData here. Delegate the basic top/skip to the
    // typed repos with an empty filter so the surface is not a hard throw, but
    // full OData translation is intentionally out of scope for the Mongo path.
    const opts: FindOpts = {
      limit: query.top,
      skip: query.skip,
      withCount: query.count,
    };
    if (resource === "contacts") {
      return contacts.find("", opts);
    }
    return listings.find({}, opts);
  }

  async function get(
    resource: DbResource,
    id: string
  ): Promise<ListingDTO | ContactDTO | null> {
    if (resource === "contacts") return contacts.get(id);
    return listings.get(id);
  }

  async function query<T = unknown>(): Promise<T[]> {
    // Raw parameterized SQL is the Postgres/CHAP escape hatch (PostGIS,
    // aggregates). Unsupported on the Mongo adapter by contract (§adapter.ts).
    throw new Error("mongo-adapter: raw SQL query() is unsupported (postgres-only)");
  }

  async function close(): Promise<void> {
    // The connection lifecycle is owned by the resolver (Agent 10) / the legacy
    // shared mongoose connection — the adapter does not own or close it here.
    // No-op, matching the neon-http reader's close() contract.
  }

  return {
    dialect: "mongo",
    listings,
    contacts,
    find,
    get,
    query,
    close,
  };
}
