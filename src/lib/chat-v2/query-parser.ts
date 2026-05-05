// src/lib/chat-v2/query-parser.ts
// Layer 0 of the search-first chat architecture (see docs/chat-production/
// architecture.md). Pure-function parser that extracts structured intent
// from a user message — no AI, no I/O except the LocationIndex lookup which
// is already <50ms by design.
//
// Output feeds Layer 1 (search service), which does the deterministic data
// fetch and emits the component event. AI only narrates after L1 resolves.

import { identifyEntityType } from "../chat/utils/entity-recognition";
import type { ListingFilters } from "./listing-query";

// =============================================================================
// Public types
// =============================================================================

export type ResolvedEntity =
  | { type: "address"; raw: string; houseNumber: string; street: string; city?: string }
  | { type: "street"; raw: string; street: string; city?: string }
  | {
      type: "subdivision";
      name: string;
      cityId?: string;
      isGroup: boolean;
      subdivisions?: string[];
    }
  | { type: "city"; name: string; cityId: string }
  | { type: "county"; name: string }
  | { type: "region"; name: string }
  | { type: "zip"; value: string };

export type Intent =
  | "listing-detail"
  | "listing-search"
  | "street-listings"
  | "aggregate"
  | "compare"
  | "trend"
  | "cma"
  | "insights"
  | "conversational"
  | "unknown";

export type Dataset = "active" | "closed";

export type TrendMetric =
  | "dom_median"
  | "sale_to_list_ratio"
  | "monthly_volume"
  | "median_close_price_yoy"
  | "price_per_sqft_yoy";

export interface ParsedQuery {
  raw: string;
  entities: ResolvedEntity[];
  filters: ListingFilters & { closedSinceDays?: number };
  intent: Intent;
  dataset: Dataset;
  metric?: TrendMetric[];
  confidence: number;
}

// =============================================================================
// Address regex — captures houseNumber + streetName + suffix
// =============================================================================

// Full street-suffix list — matches what's in the chat-v2 system prompt and
// the existing field-name conventions in unified-listing.ts.
// Standard US street suffixes the parser uses for ADDRESS_REGEX.
// Kept intentionally minimal — addresses with non-standard suffixes
// (Cove, Trail, Vista, Calle, Via, Camino, etc.) are resolved by
// the describe-intent path in preview.ts via search_index, which
// is suffix-agnostic. Don't extend this list to chase new suffixes;
// the describe path already covers them.
const STREET_SUFFIXES = [
  "drive", "dr",
  "street", "st",
  "avenue", "ave",
  "boulevard", "blvd",
  "road", "rd",
  "lane", "ln",
  "way",
  "court", "ct",
  "circle", "cir",
  "place", "pl",
  "terrace", "ter",
  "highway", "hwy",
  "parkway", "pkwy",
  "trail", "tr",
  "loop",
  "alley", "aly",
  "plaza", "plz",
];

const SUFFIX_GROUP = STREET_SUFFIXES.join("|");

// Captures: house number + street name (one or more words, may contain
// directional like N/S/E/W) + suffix.
const ADDRESS_REGEX = new RegExp(
  String.raw`\b(\d{1,6})\s+([NSEW]\s+)?([A-Za-z][\w'\-]*(?:\s+[A-Za-z][\w'\-]*){0,4}?)\s+(${SUFFIX_GROUP})\b`,
  "i"
);

// Street-only: same shape minus the leading number.
const STREET_REGEX = new RegExp(
  String.raw`\b([NSEW]\s+)?([A-Za-z][\w'\-]*(?:\s+[A-Za-z][\w'\-]*){0,3}?)\s+(${SUFFIX_GROUP})\b`,
  "i"
);

// Anchored variant — matches when the WHOLE query is just a street name
// like "desi drive" or "hovley lane". When this fires, route directly to
// street-listings BEFORE the fuzzy entity resolver — that resolver has a
// known false-positive on subdivision names with 1-2 char words ("Palm
// Springs Villas I" matches "desi drive" because both contain the letter
// "i" via the word-by-word matcher in entity-recognition.ts).
const ENTIRE_STREET_REGEX = new RegExp(
  String.raw`^\s*([NSEW]\s+)?([A-Za-z][\w'\-]*(?:\s+[A-Za-z][\w'\-]*){0,3}?)\s+(${SUFFIX_GROUP})\s*$`,
  "i"
);

// Partial address — house number followed by 1–4 street-name words but
// WITHOUT a recognized suffix ("45355 Taos", "45355 Taos Cove"). Catches
// what users type when they mean a specific listing but skip "Drive"/"Cove".
// House number must be ≥4 digits to disambiguate from "5 bed", "3 bath", etc.
const PARTIAL_ADDRESS_REGEX = new RegExp(
  String.raw`^\s*(\d{4,6})\s+([A-Za-z][\w'\-]*(?:\s+[A-Za-z][\w'\-]*){0,3})\s*$`,
  "i"
);

const ZIP_REGEX = /\b(\d{5})\b/;

// =============================================================================
// Keyword passes
// =============================================================================

const DATASET_CLOSED_RE = new RegExp(
  [
    String.raw`\bsold\b`,
    String.raw`\bsale[- ]to[- ]list\b`,
    String.raw`\blisting[- ]to[- ]sale\b`,
    String.raw`\bclosed\b`,
    String.raw`\brecently sold\b`,
    String.raw`\blast \d+ months?\b`,
    String.raw`\blast year\b`,
    String.raw`\bpast year\b`,
    String.raw`\byear over year\b`,
    String.raw`\bYoY\b`,
    String.raw`\bdays on market\b`,
    String.raw`\bDOM\b`,
  ].join("|"),
  "i"
);

const AGGREGATE_RE = /\b(average|avg|mean|median|typical|how many|count of|total)\b/i;

const COMPARE_RE = /\b(compare|comparing|comparison|vs\.?|versus)\b|\b(better|worse|cheaper|pricier|nicer)\s+than\b/i;

const TREND_RE = new RegExp(
  [
    String.raw`\bappreciat\w*\b`,
    String.raw`\bROI\b`,
    String.raw`\breturn on (investment|equity)\b`,
    String.raw`\btrend\w*\b`,
    String.raw`\bover (the )?(\d+ )?years?\b`,
    String.raw`\bhot or cool\w*\b`,
    String.raw`\bcooling\b`,
    String.raw`\bheating up\b`,
    String.raw`\bYoY\b`,
    String.raw`\byear over year\b`,
    String.raw`\bsale[- ]to[- ]list\b`,
    String.raw`\blisting[- ]to[- ]sale\b`,
    String.raw`\bDOM\b`,
    String.raw`\bdays on market\b`,
    String.raw`\bgone up or down\b`,
    String.raw`\bmonthly volume\b`,
    String.raw`\bclos(ing|ed) volume\b`,
  ].join("|"),
  "i"
);

const CMA_RE = /\b(CMA|comparable sales|comp(s)?|what'?s it worth|what is .* worth|what are .* worth|valuation|what did .* sell for)\b/i;

// Insights / educational keywords. Bare "HOA" is intentionally NOT here —
// in the chat corpus it's overwhelmingly used as a filter ("no HOA",
// "HOA under $300"). We only route to insights when HOA appears in an
// explicit educational construction ("how do HOAs work", "explain HOA fees").
const INSIGHTS_RE = new RegExp(
  [
    String.raw`\belectric(ity)?\b`,
    String.raw`\butility\b`,
    String.raw`\bschool\w*\b`,
    String.raw`\bclimate\b`,
    String.raw`\bweather\b`,
    String.raw`\bshort sale\b`,
    String.raw`\bfirst[- ]time\b`,
    String.raw`\btax(es)?\b`,
    String.raw`\bmortgage\b`,
    String.raw`\bloan\b`,
    String.raw`\bhow do (I|you|HOA)\b`,
    String.raw`\bwhat (is|are) (a |an |the )?(short sale|HOA|escrow|easement|appraisal|earnest money)\b`,
    String.raw`\bexplain\b`,
    String.raw`\bdescribe\b`,
  ].join("|"),
  "i"
);

// =============================================================================
// Filter extraction
// =============================================================================

const PRICE_TOKEN = /\$?(\d{1,3}(?:[,.]?\d{3})*|\d+)\s*([kKmM]?)/;

function parsePrice(token: string): number | null {
  const m = token.match(/^\$?(\d+(?:[,.]?\d+)*)\s*([kKmM]?)$/);
  if (!m) return null;
  const numStr = m[1].replace(/[,.]/g, "");
  const n = parseInt(numStr, 10);
  if (isNaN(n)) return null;
  const mult = m[2].toLowerCase();
  if (mult === "k") return n * 1_000;
  if (mult === "m") return n * 1_000_000;
  return n;
}

/**
 * Extract all filter constraints from a free-text query. Each pattern is
 * independent — they all get a chance to fire against the raw text. Returns
 * a `ListingFilters` plus an optional `closedSinceDays` for time-window
 * queries (`last 6 months`, `past 90 days`, `past year`).
 */
function extractFilters(raw: string): ListingFilters & { closedSinceDays?: number } {
  const f: ListingFilters & { closedSinceDays?: number } = {};
  const lower = raw.toLowerCase();

  // ---- Price ----
  // Returns true if the match should be SKIPPED because the surrounding
  // context indicates it's an HOA fee or a square-footage number, not the
  // home price.
  const isPriceContextWrong = (idx: number): boolean => {
    const before = lower.slice(Math.max(0, idx - 20), idx);
    return /\b(HOA|fee|month|sq\.?\s*ft|sqft|square\s+feet)\b/i.test(before);
  };

  // "under $1M", "under 500k", "below $750k"
  const underM = lower.match(/(?:under|below|less than|up to|max(?:imum)?)\s+(\$?\d+(?:[,.]?\d+)*\s*[km]?)/i);
  if (underM && underM.index !== undefined && !isPriceContextWrong(underM.index)) {
    const p = parsePrice(underM[1]);
    if (p) f.maxPrice = p;
  }
  // "over $500k", "above $1M", "more than $2M"
  const overM = lower.match(/(?:over|above|more than|min(?:imum)?|starting at)\s+(\$?\d+(?:[,.]?\d+)*\s*[km]?)/i);
  if (overM && overM.index !== undefined && !isPriceContextWrong(overM.index)) {
    const p = parsePrice(overM[1]);
    if (p) f.minPrice = p;
  }
  // "$500k-$1M", "between $500k and $1M", "$500k to $1M"
  const rangeM = lower.match(
    /(\$?\d+(?:[,.]?\d+)*\s*[km]?)\s*(?:-|–|to|and)\s*(\$?\d+(?:[,.]?\d+)*\s*[km]?)/i
  );
  if (rangeM && rangeM.index !== undefined && !isPriceContextWrong(rangeM.index)) {
    // Only treat as price range if both sides parse to plausible price numbers (>= $1000)
    const a = parsePrice(rangeM[1]);
    const b = parsePrice(rangeM[2]);
    if (a !== null && b !== null && a >= 1000 && b >= 1000) {
      f.minPrice = Math.min(a, b);
      f.maxPrice = Math.max(a, b);
    }
  }

  // ---- Beds (exact) ----
  const bedsM = lower.match(/\b(\d+)\s*(?:-?\s*)?(?:bed|bd|br|bedroom)s?\b/);
  if (bedsM) f.beds = parseInt(bedsM[1], 10);

  // ---- Baths (exact) ----
  const bathsM = lower.match(/\b(\d+)\s*(?:-?\s*)?(?:bath|ba|bathroom)s?\b/);
  if (bathsM) f.baths = parseInt(bathsM[1], 10);

  // ---- Sqft ----
  const sqftUnder = lower.match(/(?:under|below|less than|up to)\s+(\d{3,5})\s*(?:sq\.?\s*ft|sqft|square feet)/i);
  if (sqftUnder) f.maxSqft = parseInt(sqftUnder[1], 10);
  const sqftOver = lower.match(/(?:over|above|more than|min)\s+(\d{3,5})\s*(?:sq\.?\s*ft|sqft|square feet)/i);
  if (sqftOver) f.minSqft = parseInt(sqftOver[1], 10);

  // ---- Year built ----
  const yearOver = lower.match(/(?:newer than|after|built after)\s+(\d{4})/i);
  if (yearOver) f.minYear = parseInt(yearOver[1], 10);
  const yearUnder = lower.match(/(?:older than|before|built before)\s+(\d{4})/i);
  if (yearUnder) f.maxYear = parseInt(yearUnder[1], 10);

  // ---- Amenity booleans ----
  if (/\b(with (a )?pool|pool homes?|pools?\b)/i.test(lower) && !/no pool/i.test(lower)) {
    f.pool = true;
  }
  if (/\b(with (a )?spa|hot tub)\b/i.test(lower)) f.spa = true;
  if (/\b(view|mountain view|valley view|golf view)\b/i.test(lower)) f.view = true;
  if (/\b(fireplace)\b/i.test(lower)) f.fireplace = true;
  if (/\b(gated( community)?|guard gated)\b/i.test(lower) && !/non.?gated|not gated/i.test(lower)) {
    f.gatedCommunity = true;
  }
  if (/\b(senior|55\+|55 plus|active adult)\b/i.test(lower)) f.seniorCommunity = true;

  // ---- Garage ----
  const garageM = lower.match(/\b(\d+)[- ]?car garage\b/i);
  if (garageM) f.garageSpaces = parseInt(garageM[1], 10);

  // ---- Stories ----
  if (/\b(single[- ]story|one story|1 story)\b/i.test(lower)) f.stories = 1;
  if (/\b(two[- ]story|2 story)\b/i.test(lower)) f.stories = 2;

  // ---- Property type (lowercase strings — searchHomes-style; downstream
  // code maps these to propertySubType filtering) ----
  if (/\b(condo|condominium)\b/i.test(lower)) (f as any).propertyType = "condo";
  else if (/\b(townhouse|town home|townhome)\b/i.test(lower)) (f as any).propertyType = "townhouse";
  else if (/\b(single[- ]family|sfr|house|home)\b/i.test(lower) && !/\bhomes?\s+in\b/i.test(lower)) {
    // Only set "house" if it's a clear noun, not "homes in Beverly Hills"
    (f as any).propertyType = "house";
  }

  // ---- HOA ----
  if (/\bno HOA\b|\bnon[- ]?HOA\b|\bwithout HOA\b/i.test(lower)) {
    f.hasHOA = false;
  } else if (/\bwith HOA\b|\bhas HOA\b/i.test(lower)) {
    f.hasHOA = true;
  }
  const hoaUnder = lower.match(/HOA\s+(?:under|below|less than)\s+\$?(\d+(?:[,.]?\d+)*)/i);
  if (hoaUnder) {
    const n = parseInt(hoaUnder[1].replace(/[,.]/g, ""), 10);
    if (!isNaN(n)) {
      f.maxHOA = n;
      if (f.hasHOA === undefined) f.hasHOA = true;
    }
  }

  // ---- Geographic (directional) — capture full street name incl. suffix ----
  // e.g. "east of Washington Street" → "Washington Street"
  const dirSuffixGroup = `(?:\\s+(?:${SUFFIX_GROUP}))`;
  const dirRe = (dir: string) =>
    new RegExp(
      String.raw`\b${dir} of\s+([A-Z][\w-]+(?:\s+[A-Z][\w-]+){0,3}${dirSuffixGroup}?)\b`,
      "i"
    );
  const eastM = raw.match(dirRe("east"));
  if (eastM) f.eastOf = eastM[1].trim();
  const westM = raw.match(dirRe("west"));
  if (westM) f.westOf = westM[1].trim();
  const northM = raw.match(dirRe("north"));
  if (northM) f.northOf = northM[1].trim();
  const southM = raw.match(dirRe("south"));
  if (southM) f.southOf = southM[1].trim();

  // ---- Time window for closed-data queries ----
  // "last 6 months" / "past 30 days" / "last year" / "past 2 years"
  const monthsM = lower.match(/(?:last|past)\s+(\d+)\s+months?/i);
  if (monthsM) f.closedSinceDays = parseInt(monthsM[1], 10) * 30;
  const daysM = lower.match(/(?:last|past)\s+(\d+)\s+days?/i);
  if (daysM) f.closedSinceDays = parseInt(daysM[1], 10);
  const yearsM = lower.match(/(?:last|past)\s+(\d+)\s+years?/i);
  if (yearsM) f.closedSinceDays = parseInt(yearsM[1], 10) * 365;
  if (/\b(?:last|past) year\b/i.test(lower) && !f.closedSinceDays) {
    f.closedSinceDays = 365;
  }

  return f;
}

// =============================================================================
// Trend metric extraction (when intent === 'trend')
// =============================================================================

function extractTrendMetrics(raw: string): TrendMetric[] {
  const lower = raw.toLowerCase();
  const metrics: TrendMetric[] = [];
  if (/\b(DOM|days on market)\b/i.test(raw)) metrics.push("dom_median");
  if (/\bsale[- ]to[- ]list\b/i.test(lower)) metrics.push("sale_to_list_ratio");
  if (/\bmonthly volume\b|\bvolume\b|\bhow many .* sold\b|\bclosing\s*volume\b/i.test(lower)) {
    metrics.push("monthly_volume");
  }
  if (/\b(YoY|year over year|appreciation)\b/i.test(raw)) {
    metrics.push("median_close_price_yoy");
  }
  if (/\bprice per (sq\.?\s*ft|sqft|square foot)\b/i.test(lower)) {
    metrics.push("price_per_sqft_yoy");
  }
  // Sensible default for an unspecified "how's the market" query
  if (metrics.length === 0) {
    metrics.push("median_close_price_yoy", "monthly_volume");
  }
  return metrics;
}

// =============================================================================
// Entity resolution
// =============================================================================

// Subdivision entries that are placeholder/fallback values in the data —
// the entity recognizer fuzzy-matches against random words and surfaces these.
// We treat them as "no real entity matched."
const ENTITY_BLOCKLIST = new Set([
  "not in a development",
  "n/a",
  "none",
  "unknown",
]);

function isBlocked(name: string | undefined): boolean {
  if (!name) return true;
  return ENTITY_BLOCKLIST.has(name.toLowerCase().trim());
}

async function resolveEntityFromText(text: string): Promise<ResolvedEntity | null> {
  if (!text || text.trim().length < 2) return null;

  const result = await identifyEntityType(text.trim());
  if (!result || result.type === "general" || result.type === "listing") return null;
  if (isBlocked(result.value)) return null;

  switch (result.type) {
    case "city":
      return {
        type: "city",
        name: result.value,
        cityId: result.value.toLowerCase().replace(/\s+/g, "-"),
      };
    case "subdivision":
      return {
        type: "subdivision",
        name: result.value,
        isGroup: false,
      };
    case "subdivision-group":
      return {
        type: "subdivision",
        name: result.value,
        isGroup: true,
        subdivisions: result.subdivisions,
      };
    case "county":
      return { type: "county", name: result.value };
    case "region":
      return { type: "region", name: result.value };
    default:
      return null;
  }
}

/**
 * Multi-attempt entity resolution. The full message often contains filter
 * words and intent keywords the entity index can't match against; this tries
 * progressively narrower extractions.
 *
 *   1. Full text — fastest path; works for bare entity queries like "PGA West"
 *   2. After "in" / "for" / "around" / "near" — captures city/subdivision
 *      mentioned at the end of a sentence ("...in Palm Desert")
 *   3. Strip common filter/intent words, retry
 */
async function resolveEntitySmart(raw: string): Promise<ResolvedEntity | null> {
  const direct = await resolveEntityFromText(raw);
  if (direct) return direct;

  // Capture phrase after a preposition. Require the captured entity to be a
  // sequence of TitleCase words (no lowercase mid-stream), so we naturally
  // stop at filter modifiers ("with", "under", "over", "and", etc.).
  const prepM = raw.match(
    /\b(?:in|for|around|near|at|inside)\s+(?:the\s+)?([A-Z][\w]*(?:\s+[A-Z][\w]*){0,4})(?=\s+[a-z]|[,.?!]|\s*$)/
  );
  if (prepM) {
    const candidate = prepM[1].trim();
    const result = await resolveEntityFromText(candidate);
    if (result) return result;
  }

  // Strip recognized filter/intent words and retry
  const stripped = raw
    .replace(/\b(?:show me|tell me|find|get|give me|i (?:want|need|am looking))\b/gi, "")
    .replace(/\b(?:homes?|listings?|properties|rentals?|condos?|townhomes?|townhouses?)\b/gi, "")
    .replace(/\b(?:average|median|typical|how many|count of|total)\b/gi, "")
    .replace(/\b(?:sold|closed|recently sold|last \d+ months?|past \d+ months?|last year|past year)\b/gi, "")
    .replace(/\b(?:appreciation|trend|ROI|YoY|year over year)\b/gi, "")
    .replace(/\b(?:CMA|comparable sales|comp(?:s)?|valuation)\b/gi, "")
    .replace(/\b(?:under|over|above|below|less than|more than|max|min)\s+\$?\d+\s*[km]?\b/gi, "")
    .replace(/\b\d+\s*(?:bed|bd|br|bedroom|bath|ba|bathroom)s?\b/gi, "")
    .replace(/\b(?:with a |with )?(?:pool|spa|view|fireplace|gated|senior)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  if (stripped && stripped !== raw && stripped.length >= 2) {
    const result = await resolveEntityFromText(stripped);
    if (result) return result;
  }

  return null;
}

/**
 * For compare-intent queries, split on `vs`/`versus`/`compared with` and
 * resolve each side independently. Returns up to 2 entities.
 */
async function resolveCompareEntities(raw: string): Promise<ResolvedEntity[]> {
  const split = raw.split(/\s+(?:vs\.?|versus|compared with|compared to)\s+/i);
  if (split.length < 2) return [];
  const entities: ResolvedEntity[] = [];
  for (const half of split.slice(0, 2)) {
    // Strip common compare-intro words from the left side
    const cleaned = half.replace(/^\s*compare\s+/i, "").trim();
    const e = await resolveEntityFromText(cleaned);
    if (e) entities.push(e);
  }
  return entities;
}

// =============================================================================
// Main parser
// =============================================================================

export async function parseQuery(message: string): Promise<ParsedQuery> {
  const raw = message.trim();
  const filters = extractFilters(raw);
  const dataset: Dataset = DATASET_CLOSED_RE.test(raw) ? "closed" : "active";

  // Pre-extract address candidate (used by listing-detail AND CMA)
  const addrMatch = raw.match(ADDRESS_REGEX);
  const addrEntity: ResolvedEntity | null = addrMatch
    ? {
        type: "address",
        raw: addrMatch[0],
        houseNumber: addrMatch[1],
        street: `${(addrMatch[2] || "").trim() ? (addrMatch[2] || "").trim() + " " : ""}${addrMatch[3].trim()} ${addrMatch[4]}`.trim(),
      }
    : null;

  // ----------------------------------------------------------------------
  // STRONG-SIGNAL INTENT CHECKS (run before listing-detail / listing-search
  // defaults so an explicit CMA/insights/trend/compare keyword wins over
  // a bare address or city match)
  // ----------------------------------------------------------------------

  // Conversational fallback for clearly open-ended messages — checked first
  // so "I'm thinking about relocating to..." doesn't accidentally entity-match.
  if (/\bI(?:'m| am)\s+(?:thinking|looking|considering|wondering|planning)\b/i.test(raw)) {
    return { raw, entities: [], filters, intent: "conversational", dataset, confidence: 0.4 };
  }

  // CMA — explicit valuation request, possibly over an address
  if (CMA_RE.test(raw)) {
    const entity = addrEntity || (await resolveEntitySmart(raw));
    return {
      raw,
      entities: entity ? [entity] : [],
      filters,
      intent: "cma",
      dataset: "closed",
      confidence: entity ? 0.92 : 0.65,
    };
  }

  // Insights — educational keywords win even when a city is also present
  if (INSIGHTS_RE.test(raw)) {
    const entity = await resolveEntitySmart(raw);
    return {
      raw,
      entities: entity ? [entity] : [],
      filters,
      intent: "insights",
      dataset,
      confidence: entity ? 0.85 : 0.7,
    };
  }

  // Compare — binary entity check
  if (COMPARE_RE.test(raw)) {
    const entities = await resolveCompareEntities(raw);
    if (entities.length >= 2) {
      return { raw, entities, filters, intent: "compare", dataset, confidence: 0.9 };
    }
    // fall through if not actually comparing two entities
  }

  // Trend — over a resolved entity
  if (TREND_RE.test(raw)) {
    const entity = await resolveEntitySmart(raw);
    if (entity) {
      return {
        raw,
        entities: [entity],
        filters,
        intent: "trend",
        dataset: "closed",
        metric: extractTrendMetrics(raw),
        confidence: 0.88,
      };
    }
  }

  // Aggregate — over a resolved entity
  if (AGGREGATE_RE.test(raw)) {
    const entity = await resolveEntitySmart(raw);
    if (entity) {
      return {
        raw,
        entities: [entity],
        filters,
        intent: "aggregate",
        dataset,
        confidence: 0.88,
      };
    }
  }

  // ----------------------------------------------------------------------
  // ENTITY-DEFAULTED INTENTS
  // ----------------------------------------------------------------------

  // Address → listing detail (already extracted above)
  if (addrEntity) {
    return {
      raw,
      entities: [addrEntity],
      filters,
      intent: "listing-detail",
      dataset,
      confidence: 0.95,
    };
  }

  // Explicit street structure — "homes on Hovley Lane", "listings on El Paseo"
  // — checked BEFORE fuzzy entity resolution, since common street suffixes
  // ("Lane", "Way", "Court") fuzzy-match against subdivision names that
  // happen to contain those words.
  const explicitStreetM = raw.match(
    new RegExp(
      String.raw`\b(?:homes?|listings?|properties|houses?|condos?)\s+on\s+([A-Z][\w'\-]*(?:\s+[A-Z][\w'\-]*){0,3}\s+(?:${SUFFIX_GROUP}))\b`,
      "i"
    )
  );
  if (explicitStreetM) {
    return {
      raw,
      entities: [{ type: "street", raw: explicitStreetM[1], street: explicitStreetM[1].trim() }],
      filters,
      intent: "street-listings",
      dataset,
      confidence: 0.9,
    };
  }

  // Partial address — "45355 Taos", "12345 Main" — number + street name
  // without a suffix word. Checked BEFORE the ZIP regex so the leading
  // number isn't mis-resolved as a zip code.
  const partialM = raw.match(PARTIAL_ADDRESS_REGEX);
  if (partialM) {
    const houseNumber = partialM[1];
    const streetName = partialM[2].trim();
    return {
      raw,
      entities: [{
        type: "address",
        raw: partialM[0].trim(),
        houseNumber,
        street: streetName,
      }],
      filters,
      intent: "listing-detail",
      dataset,
      confidence: 0.85, // slightly below full-suffix address (0.95)
    };
  }

  // ZIP code (must be a bare 5-digit token, not the start of a partial
  // address — that's caught above).
  const zipMatch = raw.match(ZIP_REGEX);
  if (zipMatch) {
    return {
      raw,
      entities: [{ type: "zip", value: zipMatch[1] }],
      filters,
      intent: "listing-search",
      dataset,
      confidence: 0.88,
    };
  }

  // Bare street name — "desi drive", "hovley lane", "el paseo dr". Checked
  // BEFORE the fuzzy entity resolver because that resolver has a known
  // false-positive on subdivisions with 1-2 char words (see ENTIRE_STREET_REGEX
  // comment). Pure street-shape queries should route to street-listings,
  // not to a fuzzy subdivision match.
  const entireStreetMatch = raw.match(ENTIRE_STREET_REGEX);
  if (entireStreetMatch) {
    const dir = (entireStreetMatch[1] || "").trim();
    const namePart = entireStreetMatch[2].trim();
    const suffix = entireStreetMatch[3];
    const street = `${dir ? dir + " " : ""}${namePart} ${suffix}`.trim();
    return {
      raw,
      entities: [{ type: "street", raw: entireStreetMatch[0].trim(), street }],
      filters,
      intent: "street-listings",
      dataset,
      confidence: 0.85,
    };
  }

  // Resolve entity for default-path intents
  const entity = await resolveEntitySmart(raw);

  // Street-only — when no city/subdivision matched OR only a region matched
  if (!entity || entity.type === "region") {
    const streetMatch = raw.match(STREET_REGEX);
    if (streetMatch) {
      const dir = (streetMatch[1] || "").trim();
      const namePart = streetMatch[2].trim();
      const suffix = streetMatch[3];
      const street = `${dir ? dir + " " : ""}${namePart} ${suffix}`.trim();
      return {
        raw,
        entities: [{ type: "street", raw: streetMatch[0], street }],
        filters,
        intent: "street-listings",
        dataset,
        confidence: 0.82,
      };
    }
  }

  if (entity) {
    return {
      raw,
      entities: [entity],
      filters,
      intent: "listing-search",
      dataset,
      confidence: 0.85,
    };
  }

  // Conversational fallback
  return {
    raw,
    entities: [],
    filters,
    intent: "conversational",
    dataset,
    confidence: 0.3,
  };
}
