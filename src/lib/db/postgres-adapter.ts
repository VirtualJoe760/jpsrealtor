// src/lib/db/postgres-adapter.ts
//
// Agent 09 — the Postgres adapter (the per-tenant Neon data-plane path).
//
// `createPostgresAdapter(conn)` implements the `DbAdapter` contract (Agent 01)
// against a tenant's Neon Postgres database. It is the SQL twin of the Mongo
// adapter (Agent 02): the SAME `ListingFilter`/`FindOpts` inputs that the Mongo
// adapter turns into Mongo query objects, this one turns into parameterized SQL,
// and BOTH map their rows through the SAME `to-dto.ts` mappers (Agent 01) so the
// emitted DTOs are byte-identical across dialects (build_plan §3.6).
//
// DRIVER SPLIT (build_plan §3.1 / §6.2 / §6.3):
//   • READS go over the `@neondatabase/serverless` HTTP driver wrapped by
//     Drizzle — `drizzle(neon(conn), { schema })`. HTTP is a one-shot fetch per
//     query, ideal for serverless, with no pool to leak. Dynamic, parameterized
//     SQL is composed with Drizzle's `sql` tag + `sql.join` (every value is a
//     bound parameter; identifiers come only from a fixed internal allow-list).
//   • WRITES / TRANSACTIONS use a `Pool` (WebSocket), opened lazily and only
//     when `query()` runs a mutating statement. `close()` ends that pool if it
//     was opened; the HTTP reader needs no close.
//
// TENANT SCOPING (build_plan §3.3): a `DbAdapter` is ALWAYS tenant-scoped — the
// connection string already targets exactly one tenant's Neon DB, which IS the
// isolation boundary. There is no `ownerId`/`userId` scoping on the Postgres
// path (unlike Mongo's legacy single-tenant contacts).
//
// CASING BRIDGE: Postgres returns snake_case columns; `to-dto.ts` reads
// camelCase keys (`l.listingKey`, `l.bedroomsTotal`, `l.listAgentName`, …). So
// every SELECT aliases each column to its camelCase name (`list_agent_name AS
// "listAgentName"`). latitude/longitude come from the dedicated numeric columns
// (the adapter never reads the raw `geom` blob). `on_market_date` is a real
// timestamptz — `to-dto.ts` already normalizes a Date to its ISO string.
//
// ATTRIBUTION INVARIANT (build_plan §3.8): `list_agent_name` and
// `list_office_name` are ALWAYS in the projection so every ListingDTO carries
// attribution. The contract test asserts their presence.

import { neon, Pool } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { sql, type SQL } from "drizzle-orm";
import * as schema from "./schema/index";
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
// Tunables (mirror the Mongo adapter)
// -----------------------------------------------------------------------------

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;

const PROPERTY_TYPE_SKIP = new Set(["", "all", "any", "*"]);

// -----------------------------------------------------------------------------
// Column projections — snake_case column → camelCase DTO key
// -----------------------------------------------------------------------------
//
// `to-dto.ts` reads camelCase keys, so each SELECT aliases columns. We project
// the union of fields the DTO consumes (plus the attribution block, always).
// latitude/longitude are the numeric columns; the raw geom blob is never read.
// These are FIXED literal fragments (no user input), composed via `sql.raw`.

const PROPERTY_SELECT = sql.raw(
  [
    `listing_key AS "listingKey"`,
    `slug AS "slug"`,
    `unparsed_address AS "unparsedAddress"`,
    `city AS "city"`,
    `subdivision_name AS "subdivisionName"`,
    `latitude AS "latitude"`,
    `longitude AS "longitude"`,
    `property_type AS "propertyType"`,
    `standard_status AS "standardStatus"`,
    `list_price AS "listPrice"`,
    `current_price AS "currentPrice"`,
    `bedrooms_total AS "bedroomsTotal"`,
    `beds_total AS "bedsTotal"`,
    `bathrooms_total_integer AS "bathroomsTotalInteger"`,
    `living_area AS "livingArea"`,
    `building_area_total AS "buildingAreaTotal"`,
    `year_built AS "yearBuilt"`,
    // Pool reflects the DUAL signal (typed column OR extras fallback) so the
    // DTO's `pool` matches the `hasPool` FILTER semantics (build_plan §6.5 —
    // the amenity must read both or area stats under-report). Aliased to the
    // camelCase `poolYN` that `to-dto.ts`'s `poolOf` consumes.
    `COALESCE(pool_yn, (extras->>'poolYN')::boolean, false) AS "poolYN"`,
    `days_on_market AS "daysOnMarket"`,
    `on_market_date AS "onMarketDate"`,
    `primary_photo_url AS "primaryPhotoUrl"`,
    // ATTRIBUTION (§3.8) — always projected.
    `list_agent_name AS "listAgentName"`,
    `list_agent_preferred_phone AS "listAgentPreferredPhone"`,
    `list_office_name AS "listOfficeName"`,
    `list_office_phone AS "listOfficePhone"`,
  ].join(", "),
);

const CONTACT_SELECT = sql.raw(
  [
    `id AS "id"`,
    `first_name AS "firstName"`,
    `last_name AS "lastName"`,
    `organization AS "organization"`,
    `status AS "status"`,
    `tags AS "tags"`,
    `phones AS "phones"`,
    `emails AS "emails"`,
    `phone AS "phone"`,
    `email AS "email"`,
    `source AS "source"`,
    `last_contact_date AS "lastContactDate"`,
    `last_contact_method AS "lastContactMethod"`,
    `created_at AS "createdAt"`,
  ].join(", "),
);

// -----------------------------------------------------------------------------
// WHERE-clause builder for ListingFilter → parameterized SQL
// -----------------------------------------------------------------------------
//
// Returns a Drizzle `SQL` fragment (the AND-ed clause body). Mirrors
// `buildListingMongoQuery` clause-for-clause so the two adapters select the same
// listings:
//   • status defaults to "Active" at the call site (ListingFilter.status carries it).
//   • propertyType: skip the wildcard buckets, else exact match.
//   • price / yearBuilt: inclusive ranges.
//   • beds / baths: dual-column OR.
//   • onMarketDate: a real timestamptz range (Postgres has no string trap).
//   • hasPool: typed `pool_yn` OR an `extras` fallback (build_plan §6.5 — reading
//     both avoids the Beverly Hills amenity under-report).
//   • extras: parameterized jsonb `extras->>'k' = $n` equality.
//   • bbox: PostGIS `ST_Contains(ST_MakeEnvelope(...,4326), geom)` with a
//     lat/lng degree-box fallback for rows whose geom is null.
//
// Every VALUE is interpolated through the `sql` tag → a bound parameter. The
// extras KEY is validated against a safe identifier shape before embedding.

function buildListingWhere(filter: ListingFilter): SQL {
  const clauses: SQL[] = [];

  // standardStatus is always present (defaults to "Active" at the call site).
  clauses.push(sql`standard_status = ${filter.status ?? "Active"}`);

  if (filter.city) clauses.push(sql`city = ${filter.city}`);
  if (filter.subdivision) clauses.push(sql`subdivision_name = ${filter.subdivision}`);

  if (filter.propertyType !== undefined) {
    const pt = String(filter.propertyType).trim();
    if (!PROPERTY_TYPE_SKIP.has(pt.toLowerCase())) {
      clauses.push(sql`property_type = ${pt}`);
    }
  }

  // listPrice range.
  if (filter.price?.min !== undefined) clauses.push(sql`list_price >= ${filter.price.min}`);
  if (filter.price?.max !== undefined) clauses.push(sql`list_price <= ${filter.price.max}`);

  // yearBuilt range.
  if (filter.yearBuilt?.min !== undefined) clauses.push(sql`year_built >= ${filter.yearBuilt.min}`);
  if (filter.yearBuilt?.max !== undefined) clauses.push(sql`year_built <= ${filter.yearBuilt.max}`);

  // beds — dual-column OR (bedrooms_total | beds_total).
  if (filter.beds?.min !== undefined) {
    clauses.push(sql`(bedrooms_total >= ${filter.beds.min} OR beds_total >= ${filter.beds.min})`);
  }
  if (filter.beds?.max !== undefined) {
    clauses.push(sql`(bedrooms_total <= ${filter.beds.max} OR beds_total <= ${filter.beds.max})`);
  }

  // baths — dual-column OR (bathrooms_total_integer | bathrooms_total_decimal,
  // the only other bath column the schema keeps).
  if (filter.baths?.min !== undefined) {
    clauses.push(
      sql`(bathrooms_total_integer >= ${filter.baths.min} OR bathrooms_total_decimal >= ${filter.baths.min})`,
    );
  }
  if (filter.baths?.max !== undefined) {
    clauses.push(
      sql`(bathrooms_total_integer <= ${filter.baths.max} OR bathrooms_total_decimal <= ${filter.baths.max})`,
    );
  }

  // onMarketDate — real timestamptz range.
  if (filter.onMarketDate?.min !== undefined) {
    clauses.push(sql`on_market_date >= ${filter.onMarketDate.min}`);
  }
  if (filter.onMarketDate?.max !== undefined) {
    clauses.push(sql`on_market_date <= ${filter.onMarketDate.max}`);
  }

  // hasPool — typed column OR extras fallback (amenity correctness, §6.5).
  if (filter.hasPool === true) {
    clauses.push(sql`(pool_yn IS TRUE OR (extras->>'poolYN')::boolean IS TRUE)`);
  } else if (filter.hasPool === false) {
    clauses.push(
      sql`(pool_yn IS NOT TRUE AND COALESCE((extras->>'poolYN')::boolean, false) IS NOT TRUE)`,
    );
  }

  // Registered custom fields → parameterized jsonb equality. Keys are
  // registry-validated upstream; the VALUE is always bound. The key is
  // validated against a safe identifier shape before embedding via sql.raw.
  if (filter.extras) {
    for (const [key, value] of Object.entries(filter.extras)) {
      if (!/^[a-zA-Z][a-zA-Z0-9_]{0,62}$/.test(key)) continue; // skip unsafe keys
      clauses.push(sql`extras->>${sql.raw(`'${key}'`)} = ${String(value)}`);
    }
  }

  // bbox — PostGIS envelope containment, with a lat/lng box fallback so rows
  // that have lat/lng but a null geom still match (parity with the Mongo box).
  if (filter.bbox) {
    const { minLng, minLat, maxLng, maxLat } = filter.bbox;
    clauses.push(
      sql`((geom IS NOT NULL AND ST_Contains(ST_MakeEnvelope(${minLng}, ${minLat}, ${maxLng}, ${maxLat}, 4326), geom)) OR (geom IS NULL AND latitude BETWEEN ${minLat} AND ${maxLat} AND longitude BETWEEN ${minLng} AND ${maxLng}))`,
    );
  }

  return sql.join(clauses, sql` AND `);
}

// -----------------------------------------------------------------------------
// ORDER BY builder (column allow-list — never user-interpolated)
// -----------------------------------------------------------------------------

const SORTABLE_COLUMNS: Readonly<Record<string, string>> = {
  onMarketDate: "on_market_date",
  on_market_date: "on_market_date",
  listPrice: "list_price",
  list_price: "list_price",
  city: "city",
  yearBuilt: "year_built",
  year_built: "year_built",
  daysOnMarket: "days_on_market",
  days_on_market: "days_on_market",
  listingKey: "listing_key",
  listing_key: "listing_key",
};

const DEFAULT_ORDER = sql.raw(`ORDER BY on_market_date DESC NULLS LAST`);

function buildListingOrderBy(sortSpec: readonly SortSpec[] | undefined): SQL {
  if (!sortSpec || sortSpec.length === 0) return DEFAULT_ORDER;
  const terms: string[] = [];
  for (const s of sortSpec) {
    const col = SORTABLE_COLUMNS[s.field];
    if (!col) continue;
    terms.push(`${col} ${s.dir === "asc" ? "ASC" : "DESC"} NULLS LAST`);
  }
  return terms.length > 0 ? sql.raw(`ORDER BY ${terms.join(", ")}`) : DEFAULT_ORDER;
}

// -----------------------------------------------------------------------------
// Pagination clamps (mirror the Mongo adapter)
// -----------------------------------------------------------------------------

function clampLimit(limit: number | undefined): number {
  return Math.min(MAX_LIMIT, Math.max(1, limit ?? DEFAULT_LIMIT));
}

function clampSkip(skip: number | undefined): number {
  return Math.max(0, skip ?? 0);
}

// -----------------------------------------------------------------------------
// Row-extraction helper — Drizzle neon-http `execute` returns `{ rows, … }`
// -----------------------------------------------------------------------------

function rowsOf(res: unknown): Record<string, any>[] {
  if (Array.isArray(res)) return res as Record<string, any>[];
  const r = (res as { rows?: unknown }).rows;
  return Array.isArray(r) ? (r as Record<string, any>[]) : [];
}

// -----------------------------------------------------------------------------
// Adapter factory
// -----------------------------------------------------------------------------

/**
 * Construct a tenant-scoped Postgres `DbAdapter` over a Neon connection string.
 * Obtained from the keystone resolver (Agent 10) — never a module-level
 * singleton (build_plan §3.3).
 *
 * @param conn  A tenant's Neon connection string. The POOLED (`-pooler`) URI is
 *              the right one for runtime reads. Writes/tx lazily open a WS Pool
 *              over the same string.
 */
export function createPostgresAdapter(conn: string): DbAdapter {
  // Drizzle over the neon HTTP one-shot reader (build_plan §6.3).
  const db: NeonHttpDatabase<typeof schema> = drizzle(neon(conn), { schema });

  // Lazily-opened WS pool for writes/transactions only. `close()` ends it.
  let pool: Pool | null = null;
  const getPool = (): Pool => {
    if (!pool) pool = new Pool({ connectionString: conn });
    return pool;
  };

  // ---------------------------------------------------------------------------
  // Listing repo
  // ---------------------------------------------------------------------------

  const listings: ListingRepo = {
    async find(filter: ListingFilter, opts?: FindOpts): Promise<Page<ListingDTO>> {
      const where = buildListingWhere(filter);
      const limit = clampLimit(opts?.limit);
      const skip = clampSkip(opts?.skip);
      const orderBy = buildListingOrderBy(opts?.sort);

      // Overfetch one row to derive hasMore without a second count (mirrors the
      // Mongo adapter's `limit + 1` trick).
      const res = await db.execute(
        sql`SELECT ${PROPERTY_SELECT} FROM property WHERE ${where} ${orderBy} LIMIT ${limit + 1} OFFSET ${skip}`,
      );
      const rows = rowsOf(res);

      const hasMore = rows.length > limit;
      const pageRows = hasMore ? rows.slice(0, limit) : rows;

      let total: number | null = null;
      if (opts?.withCount) {
        const cr = rowsOf(await db.execute(sql`SELECT COUNT(*)::int AS n FROM property WHERE ${where}`));
        total = (cr[0]?.n as number) ?? 0;
      } else if (!hasMore) {
        total = skip + pageRows.length;
      }

      return { items: pageRows.map((r) => toListingDTO(r)), total, skip, limit, hasMore };
    },

    async count(filter: ListingFilter): Promise<number> {
      const where = buildListingWhere(filter);
      const cr = rowsOf(await db.execute(sql`SELECT COUNT(*)::int AS n FROM property WHERE ${where}`));
      return (cr[0]?.n as number) ?? 0;
    },

    async get(listingKey: string): Promise<ListingDTO | null> {
      const rows = rowsOf(
        await db.execute(
          sql`SELECT ${PROPERTY_SELECT} FROM property WHERE listing_key = ${listingKey} LIMIT 1`,
        ),
      );
      return rows[0] ? toListingDTO(rows[0]) : null;
    },
  };

  // ---------------------------------------------------------------------------
  // Contact repo (no owner scoping — the DB is the tenant boundary, §3.3)
  // ---------------------------------------------------------------------------

  const contacts: ContactRepo = {
    async find(query: string, opts?: FindOpts): Promise<Page<ContactDTO>> {
      const limit = clampLimit(opts?.limit);
      const skip = clampSkip(opts?.skip);

      const q = query?.trim();
      const where: SQL = q
        ? sql`WHERE (first_name ILIKE ${"%" + q + "%"} OR last_name ILIKE ${"%" + q + "%"} OR organization ILIKE ${"%" + q + "%"} OR phone ILIKE ${"%" + q + "%"} OR email ILIKE ${"%" + q + "%"})`
        : sql``;

      const res = await db.execute(
        sql`SELECT ${CONTACT_SELECT} FROM contact ${where} ORDER BY last_contact_date DESC NULLS LAST, created_at DESC NULLS LAST LIMIT ${limit} OFFSET ${skip}`,
      );
      const rows = rowsOf(res);

      const cr = rowsOf(await db.execute(sql`SELECT COUNT(*)::int AS n FROM contact ${where}`));
      const total = (cr[0]?.n as number) ?? 0;

      return {
        items: rows.map((r) => toContactDTO(r)),
        total,
        skip,
        limit,
        hasMore: skip + rows.length < total,
      };
    },

    async get(id: string): Promise<ContactDTO | null> {
      const rows = rowsOf(
        await db.execute(sql`SELECT ${CONTACT_SELECT} FROM contact WHERE id = ${id} LIMIT 1`),
      );
      return rows[0] ? toContactDTO(rows[0]) : null;
    },
  };

  // ---------------------------------------------------------------------------
  // Generic OData-driven collection surface
  // ---------------------------------------------------------------------------
  //
  // The full OData→SQL translation (field maps, $filter clauses) is the handler
  // layer's job (Agents 05/13); here we honor the pagination/count knobs and
  // delegate to the typed repos, matching the Mongo adapter's behavior.

  async function find(
    resource: DbResource,
    query: OdataQueryLike,
  ): Promise<Page<ListingDTO | ContactDTO>> {
    const opts: FindOpts = { limit: query.top, skip: query.skip, withCount: query.count };
    if (resource === "contacts") return contacts.find("", opts);
    return listings.find({}, opts);
  }

  async function get(
    resource: DbResource,
    id: string,
  ): Promise<ListingDTO | ContactDTO | null> {
    if (resource === "contacts") return contacts.get(id);
    return listings.get(id);
  }

  // ---------------------------------------------------------------------------
  // Raw parameterized SQL runner (the CHAP/PostGIS escape hatch)
  // ---------------------------------------------------------------------------
  //
  // Contract (adapter.ts): `query<T>(sql, params)` runs a positional-parameter
  // (`$1`, `$2`, …) statement and returns its rows. Params are ALWAYS bound,
  // never interpolated.
  //
  //   • A param-less read goes over the fast Drizzle HTTP path (`sql.raw`).
  //   • Any statement with positional params, and every mutating statement, runs
  //     over the WS `Pool` — the only path that natively binds a `(text, params)`
  //     pair end-to-end (the neon HTTP tagged-template form cannot consume a
  //     pre-built `$N` string + params array). This keeps CHAP's PostGIS/
  //     aggregate queries parameterized and injection-safe (build_plan §6.5).

  const WRITE_RE = /^\s*(INSERT|UPDATE|DELETE|MERGE|CREATE|ALTER|DROP|TRUNCATE|GRANT|REVOKE)\b/i;

  async function rawQuery<T = unknown>(
    text: string,
    params: readonly unknown[] = [],
  ): Promise<T[]> {
    if (params.length === 0 && !WRITE_RE.test(text)) {
      // Param-less read → Drizzle HTTP one-shot.
      const res = await db.execute(sql.raw(text));
      return rowsOf(res) as T[];
    }
    // Parameterized or mutating → WS Pool (binds $N positional params natively).
    const res = await getPool().query(text, params as unknown[]);
    return res.rows as T[];
  }

  // ---------------------------------------------------------------------------
  // close — end the WS pool if it was opened; the HTTP reader needs no close
  // ---------------------------------------------------------------------------

  async function close(): Promise<void> {
    if (pool) {
      const p = pool;
      pool = null;
      await p.end();
    }
  }

  return {
    dialect: "postgres",
    listings,
    contacts,
    find,
    get,
    query: rawQuery,
    close,
  };
}
