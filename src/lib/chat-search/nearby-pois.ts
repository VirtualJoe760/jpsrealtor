// src/lib/chat-search/nearby-pois.ts
//
// Server-side helper for fetching cached Google Places POIs near a
// location and categorizing them into a structure the AI snapshot
// narrator can ground its "Community Highlights" section in.
//
// Data source: `points_of_interest` collection (model PointOfInterest),
// populated by a periodic Google Places sync. Each doc has lat/lng,
// rating, description, category, etc. — same shape that powers the
// map's POI markers.
//
// Filter strategy: bounding-box query on lat/lng (uses the existing
// {latitude, longitude} index) + post-filter sort by rating × name.
// Distance from center isn't computed — the bounding box is tight
// enough (~3 mile radius) that all hits are walkable/drivable from
// the subject. Groups results by category so the AI can pick the
// most relevant 2-3 highlights without us having to truncate.

import dbConnect from "@/lib/mongoose";
import LocationIndex from "@/models/LocationIndex";
import Subdivision from "@/models/subdivisions";
import PointOfInterest from "@/models/PointOfInterest";

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

const DEFAULT_RADIUS_MILES = 3;

// Bounding-box deltas at the latitude of the Coachella Valley. Close
// enough for any California subject — we don't need centimeter precision
// for "what's near here".
function boxFor(lat: number, lng: number, radiusMiles: number) {
  const dLat = radiusMiles / 69;
  const dLng = radiusMiles / (69 * Math.cos((lat * Math.PI) / 180));
  return {
    minLat: lat - dLat,
    maxLat: lat + dLat,
    minLng: lng - dLng,
    maxLng: lng + dLng,
  };
}

/**
 * Resolve the location's center coordinates. Try LocationIndex first
 * (fastest — keyed on name + type), then Subdivision (in case the
 * name matches a subdivision), then fall back to null.
 */
async function resolveCenter(
  name: string,
  type: string
): Promise<{ latitude: number; longitude: number } | null> {
  // LocationIndex covers cities, subdivisions, counties, regions
  const loc: any = await LocationIndex.findOne({
    name: new RegExp(`^${name}$`, "i"),
  })
    .select("latitude longitude")
    .lean();
  if (loc?.latitude && loc?.longitude) {
    return { latitude: loc.latitude, longitude: loc.longitude };
  }

  // Subdivision lookup as fallback
  if (type === "subdivision") {
    const sub: any = await Subdivision.findOne({
      name: new RegExp(`^${name}$`, "i"),
    })
      .select("coordinates")
      .lean();
    const c = sub?.coordinates;
    if (c?.latitude && c?.longitude) {
      return { latitude: c.latitude, longitude: c.longitude };
    }
  }

  return null;
}

/**
 * Pick up to N top POIs in a category by rating × review count. We
 * weight rating heavily (a 4.7-star place with 200 reviews beats a
 * 4.9-star place with 3 reviews) but the floor is rating itself.
 */
function pickTop(pois: POISummary[], n: number): POISummary[] {
  return pois
    .slice()
    .sort((a, b) => {
      const aScore = (a.rating ?? 0) * Math.log((a.userRatingsTotal ?? 0) + 2);
      const bScore = (b.rating ?? 0) * Math.log((b.userRatingsTotal ?? 0) + 2);
      return bScore - aScore;
    })
    .slice(0, n);
}

/**
 * Main entry — given a location name + type from the locationSnapshot,
 * return a categorized POI bundle ready to inject into the AI prompt.
 * Returns center=null + empty bundle if the location can't be resolved
 * (caller should skip the POI section in that case).
 */
export async function fetchNearbyPOIs(
  name: string,
  type: string,
  radiusMiles: number = DEFAULT_RADIUS_MILES
): Promise<POIBundle> {
  await dbConnect();

  const empty: POIBundle = {
    center: null,
    radiusMiles,
    total: 0,
    byCategory: {},
    topPicks: [],
  };

  const center = await resolveCenter(name, type);
  if (!center) return empty;

  const { minLat, maxLat, minLng, maxLng } = boxFor(
    center.latitude,
    center.longitude,
    radiusMiles
  );

  const pois: any[] = await PointOfInterest.find({
    latitude: { $gte: minLat, $lte: maxLat },
    longitude: { $gte: minLng, $lte: maxLng },
    businessStatus: { $ne: "CLOSED_PERMANENTLY" },
  })
    .select(
      "name category rating userRatingsTotal description city types"
    )
    .limit(200)
    .lean();

  const byCategory: Record<string, POISummary[]> = {};
  for (const p of pois) {
    const cat = p.category || "other";
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push({
      name: p.name,
      category: cat,
      rating: p.rating,
      userRatingsTotal: p.userRatingsTotal,
      description: p.description,
      city: p.city,
    });
  }

  // Trim each category to top 5 by rating × review count so the
  // prompt context stays compact. Categories the snapshot narrator
  // actually uses (golf, parks, restaurants, shopping, attractions,
  // schools) get the budget; long-tail categories get truncated.
  for (const cat of Object.keys(byCategory)) {
    byCategory[cat] = pickTop(byCategory[cat], 5);
  }

  // Top picks across all categories — the AI uses these as
  // headline highlights.
  const all = Object.values(byCategory).flat();
  const topPicks = pickTop(all, 8);

  return {
    center,
    radiusMiles,
    total: pois.length,
    byCategory,
    topPicks,
  };
}

/**
 * Render a POI bundle as a markdown-friendly text block for direct
 * insertion into a system prompt. Empty/null inputs produce an empty
 * string so the caller can string-concat unconditionally.
 */
export function describePOIBundle(bundle: POIBundle | null): string {
  if (!bundle || !bundle.center || bundle.total === 0) return "";

  const parts: string[] = [];
  parts.push(
    `## NEARBY POINTS OF INTEREST (within ~${bundle.radiusMiles} miles, AUTHORITATIVE):`
  );

  // Per-category list — keeps the AI from mixing categories
  const order = [
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
  const seen = new Set<string>();
  for (const cat of order) {
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

  // Anything left in non-standard categories goes in an "other" lump
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
    `\n→ Quote 2–3 of these by name in the Community Highlights section. Do NOT invent businesses, restaurants, parks, or attractions that aren't on this list. If a category has no entries, omit it from your response.`
  );

  return parts.join("\n");
}
