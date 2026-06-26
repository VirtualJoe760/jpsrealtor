// src/lib/chap/nearby-pois.ts
//
// Agent 29 — PostGIS port of the legacy Mongo nearby-POIs helper
// (`src/lib/chat-search/nearby-pois.ts` `fetchNearbyPOIs` + `describePOIBundle`).
//
// Given a center (lat/lng) and a radius in miles, query the per-tenant
// `points_of_interest` table (build_plan §8.2 / src/lib/db/schema/neighborhoods.ts)
// and return the SAME `POIBundle` the snapshot narrator already consumes:
//   • `byCategory`  — POIs grouped by category, each category trimmed to the top 5
//   • `topPicks`    — the top 8 across all categories
//   • markdown text — `describePOIBundle` renders the bundle for the system prompt
// ranked by rating × log(reviews) — the legacy `pickTop` scoring ported verbatim.
//
// WHY POSTGIS, NOT A BOUNDING BOX (the port's one real change):
//   The Mongo helper used a lat/lng bounding box (a SQUARE) and never computed
//   true distance — "the box is tight enough". On Postgres we have a GiST index on
//   `geom geometry(Point,4326)`, so we do it properly: `ST_DWithin(geom::geography,
//   center::geography, radiusMeters)` is a TRUE great-circle radius (a CIRCLE) and
//   is index-accelerated. We additionally pre-filter with `ST_MakeEnvelope` (the
//   bounding box) so the GiST index narrows candidates before the geography
//   distance is evaluated on the survivors — the classic "bbox && then DWithin"
//   PostGIS pattern. Net: every returned POI is genuinely within `radiusMiles`,
//   and far ones are excluded (the legacy box let corners through; this does not).
//
// DRIVER-AGNOSTIC (build_plan §3.3 / §6.5): this module never opens a connection.
// It takes a runner — either the tenant `DbAdapter` (we call `.query`) or a bare
// parameterized `(sql, params) => rows` function (a raw `TenantSql` handle or a
// test stub). The keystone resolver owns connection lifecycle; we only read.
//
// PARAMETERIZATION: every VALUE (lat, lng, radius) is a bound `$N` positional
// parameter — never interpolated. Nothing user-controlled is concatenated into
// the SQL string.

// -----------------------------------------------------------------------------
// Output shape — IDENTICAL to the legacy `chat-search/nearby-pois.ts` bundle
// -----------------------------------------------------------------------------

export interface POISummary {
  name: string;
  category: string;
  rating?: number;
  userRatingsTotal?: number;
  description?: string;
  city?: string;
}

export interface POIBundle {
  center: { latitude: number; longitude: number } | null;
  radiusMiles: number;
  total: number;
  byCategory: Record<string, POISummary[]>;
  topPicks: POISummary[];
}

// -----------------------------------------------------------------------------
// Runner contract — the thinnest possible SQL surface (mirrors area-stats.ts)
// -----------------------------------------------------------------------------

/** A parameterized SQL runner: `(text, params) => rows`. Params are bound `$N`. */
export type SqlRunner = <T = Record<string, unknown>>(
  sql: string,
  params?: readonly unknown[],
) => Promise<T[]>;

/** Anything exposing a `query<T>(sql, params)` — i.e. the DbAdapter. */
export interface HasQuery {
  query<T = unknown>(sql: string, params?: readonly unknown[]): Promise<T[]>;
}

function toRunner(runnerOrAdapter: SqlRunner | HasQuery): SqlRunner {
  if (typeof runnerOrAdapter === "function") return runnerOrAdapter;
  return <T = Record<string, unknown>>(sql: string, params?: readonly unknown[]) =>
    runnerOrAdapter.query<T>(sql, params) as Promise<T[]>;
}

// -----------------------------------------------------------------------------
// Constants — carried from the legacy helper
// -----------------------------------------------------------------------------

const DEFAULT_RADIUS_MILES = 3;
const METERS_PER_MILE = 1609.344;
/** Hard cap on rows pulled before grouping (legacy used `.limit(200)`). */
const CANDIDATE_LIMIT = 200;
/** Per-category cap after ranking (legacy `pickTop(list, 5)`). */
const PER_CATEGORY = 5;
/** Headline top-picks cap across all categories (legacy `pickTop(all, 8)`). */
const TOP_PICKS = 8;

// -----------------------------------------------------------------------------
// Ranking — rating × log(reviews + 2), ported verbatim from `pickTop`
// -----------------------------------------------------------------------------
//
// We weight rating heavily but let review volume break ties: a 4.7-star place
// with 200 reviews beats a 4.9-star place with 3 reviews. `+2` keeps the log
// finite and positive for 0/1 reviews.

function score(p: POISummary): number {
  return (p.rating ?? 0) * Math.log((p.userRatingsTotal ?? 0) + 2);
}

/** Up to N top POIs by rating × review count. Pure; does not mutate input. */
function pickTop(pois: POISummary[], n: number): POISummary[] {
  return pois
    .slice()
    .sort((a, b) => score(b) - score(a))
    .slice(0, n);
}

// -----------------------------------------------------------------------------
// Row coercion — numeric(3,2) `rating` comes back as a string from the driver
// -----------------------------------------------------------------------------

interface PoiRow {
  name: unknown;
  category: unknown;
  rating: unknown;
  user_ratings_total: unknown;
  description: unknown;
  city: unknown;
}

function num(v: unknown): number | undefined {
  if (v == null) return undefined;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

function rowToSummary(r: PoiRow): POISummary {
  return {
    name: typeof r.name === "string" ? r.name : String(r.name ?? ""),
    category: (str(r.category) ?? "other"),
    rating: num(r.rating),
    userRatingsTotal: num(r.user_ratings_total),
    description: str(r.description),
    city: str(r.city),
  };
}

// -----------------------------------------------------------------------------
// nearbyPoisPg — the entry point
// -----------------------------------------------------------------------------

export interface NearbyPoisParams {
  readonly lat: number;
  readonly lng: number;
  /** Radius in MILES (default 3, matching the legacy helper). */
  readonly radiusMiles?: number;
}

/**
 * PostGIS port of `fetchNearbyPOIs`. Query `points_of_interest` within
 * `radiusMiles` of (`lat`,`lng`) via a true geography radius, group by category
 * (top 5 each), and pick the top 8 overall — returning the `POIBundle` the
 * snapshot narrator consumes.
 *
 * Returns an empty bundle (center carried, `total: 0`) when no POIs fall in the
 * radius, so the caller can string-concat `describePOIBundle` unconditionally.
 *
 * @param runner  The tenant `DbAdapter` (we use `.query`) or a bare SQL runner.
 *                Already bound to one tenant's Neon DB by the keystone resolver.
 * @param params  Center coordinates + optional radius.
 */
export async function nearbyPoisPg(
  runner: SqlRunner | HasQuery,
  params: NearbyPoisParams,
): Promise<POIBundle> {
  const { lat, lng } = params;
  const radiusMiles =
    typeof params.radiusMiles === "number" && params.radiusMiles > 0
      ? params.radiusMiles
      : DEFAULT_RADIUS_MILES;

  const center: { latitude: number; longitude: number } = {
    latitude: lat,
    longitude: lng,
  };

  // Guard against a non-finite / unresolvable center the same way the legacy
  // helper bailed on `resolveCenter` returning null.
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { center: null, radiusMiles, total: 0, byCategory: {}, topPicks: [] };
  }

  const query = toRunner(runner);
  const radiusMeters = radiusMiles * METERS_PER_MILE;

  // bbox && then DWithin: ST_MakeEnvelope (a tiny bbox padded to the radius) lets
  // the GiST index on `geom` narrow candidates; ST_DWithin on ::geography then
  // applies the TRUE great-circle radius to the survivors. Degrees-per-mile pad
  // for the envelope: ~1/69 lat, /cos(lat) lng — generous so we never clip the
  // circle, then DWithin tightens it to an exact circle.
  const padLatDeg = radiusMiles / 69;
  const cosLat = Math.cos((lat * Math.PI) / 180);
  const padLngDeg = radiusMiles / (69 * (Math.abs(cosLat) < 1e-6 ? 1e-6 : cosLat));

  // $1 lng, $2 lat, $3 radiusMeters, $4 minLng, $5 minLat, $6 maxLng, $7 maxLat,
  // $8 limit. ST_MakePoint takes (lng, lat); ST_MakeEnvelope takes
  // (xmin=minLng, ymin=minLat, xmax=maxLng, ymax=maxLat, srid).
  const sql = `
    SELECT name, category, rating, user_ratings_total, description, city
      FROM points_of_interest
     WHERE (business_status IS NULL OR business_status <> 'CLOSED_PERMANENTLY')
       AND geom && ST_MakeEnvelope($4, $5, $6, $7, 4326)
       AND ST_DWithin(
             geom::geography,
             ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
             $3
           )
     LIMIT $8
  `;

  const rows = await query<PoiRow>(sql, [
    lng,
    lat,
    radiusMeters,
    lng - padLngDeg, // minLng
    lat - padLatDeg, // minLat
    lng + padLngDeg, // maxLng
    lat + padLatDeg, // maxLat
    CANDIDATE_LIMIT,
  ]);

  const total = rows.length;

  // Group by category.
  const byCategory: Record<string, POISummary[]> = {};
  for (const r of rows) {
    const s = rowToSummary(r);
    if (!byCategory[s.category]) byCategory[s.category] = [];
    byCategory[s.category].push(s);
  }

  // Trim each category to the top 5 by rating × review count (compact prompt).
  for (const cat of Object.keys(byCategory)) {
    byCategory[cat] = pickTop(byCategory[cat], PER_CATEGORY);
  }

  // Headline top picks across all (already-trimmed) categories.
  const all = Object.values(byCategory).flat();
  const topPicks = pickTop(all, TOP_PICKS);

  return { center, radiusMiles, total, byCategory, topPicks };
}

// -----------------------------------------------------------------------------
// describePOIBundle — render the bundle as system-prompt markdown
// -----------------------------------------------------------------------------
//
// Ported VERBATIM from the legacy helper so the CHAP system prompt text is
// byte-identical on the Postgres path. Empty/null inputs produce an empty string
// so the caller can concat unconditionally.

const CATEGORY_ORDER = [
  "golf",
  "park",
  "attraction",
  "restaurant",
  "shopping",
  "school",
  "fitness",
  "spa",
  "entertainment",
];

export function describePOIBundle(bundle: POIBundle | null): string {
  if (!bundle || !bundle.center || bundle.total === 0) return "";

  const parts: string[] = [];
  parts.push(
    `## NEARBY POINTS OF INTEREST (within ~${bundle.radiusMiles} miles, AUTHORITATIVE):`,
  );

  const seen = new Set<string>();
  for (const cat of CATEGORY_ORDER) {
    const list = bundle.byCategory[cat];
    if (!list || list.length === 0) continue;
    seen.add(cat);
    parts.push(`\n### ${cat.toUpperCase()}`);
    for (const p of list) {
      const stars = p.rating ? ` ★${p.rating.toFixed(1)}` : "";
      const reviews = p.userRatingsTotal ? ` (${p.userRatingsTotal} reviews)` : "";
      const desc = p.description ? ` — ${p.description}` : "";
      parts.push(`- ${p.name}${stars}${reviews}${desc}`);
    }
  }

  // Anything left in non-standard categories goes in an "other" lump (top 3).
  for (const cat of Object.keys(bundle.byCategory)) {
    if (seen.has(cat)) continue;
    const list = bundle.byCategory[cat];
    if (!list || list.length === 0) continue;
    parts.push(`\n### ${cat.toUpperCase()}`);
    for (const p of list.slice(0, 3)) {
      const stars = p.rating ? ` ★${p.rating.toFixed(1)}` : "";
      parts.push(`- ${p.name}${stars}`);
    }
  }

  parts.push(
    `\n→ Quote 2–3 of these by name in the Community Highlights section. Do NOT invent businesses, restaurants, parks, or attractions that aren't on this list. If a category has no entries, omit it from your response.`,
  );

  return parts.join("\n");
}
