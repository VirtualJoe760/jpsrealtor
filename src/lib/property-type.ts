// src/lib/property-type.ts
//
// UnifiedListing.propertyType is a single-letter code: A / B / C / D.
// Public-facing APIs (and the MCP tools that wrap them) advertise the
// human-readable propertyTypeLabel ("Residential", "Residential Lease",
// "Land") so callers don't have to know the code.
//
// resolvePropertyType() lets a caller pass either the code OR the label
// (or common synonyms) and gets back the code to filter on.
//
// Convention:
//   A = Residential (sale, single-family / condo / townhome)
//   B = Residential Lease (rental — listPrice carries monthly rent)
//   C = Multi-family / Income
//   D = Land
//
// Special value "all" / "any" → undefined (skips the filter entirely; both
// sales and rentals come through). Use sparingly; price filters become
// confusing when leases ($2k/mo) and sales ($800k) share a result set.

export type PropertyTypeCode = "A" | "B" | "C" | "D";

const NORMALIZED_MAP: Record<string, PropertyTypeCode | "all"> = {
  // codes (pass-through)
  "a": "A",
  "b": "B",
  "c": "C",
  "d": "D",
  // sale
  "residential": "A",
  "residential sale": "A",
  "sale": "A",
  "for sale": "A",
  "sales": "A",
  "house": "A",
  "houses": "A",
  "home": "A",
  "homes": "A",
  "single family": "A",
  "single-family": "A",
  "condo": "A",
  "condos": "A",
  "townhome": "A",
  "townhomes": "A",
  // rental
  "residential lease": "B",
  "lease": "B",
  "leases": "B",
  "rental": "B",
  "rentals": "B",
  "rent": "B",
  "for rent": "B",
  "for lease": "B",
  // multi-family / income
  "multifamily": "C",
  "multi-family": "C",
  "multi family": "C",
  "income": "C",
  "income property": "C",
  "duplex": "C",
  "triplex": "C",
  "fourplex": "C",
  // land
  "land": "D",
  "lot": "D",
  "lots": "D",
  "vacant land": "D",
  "vacant lot": "D",
  "raw land": "D",
  // wildcard
  "all": "all",
  "any": "all",
  "*": "all",
};

// ---------------------------------------------------------------------------
// Stored-value aliases — what a bucket can actually look like IN THE DATABASE
// ---------------------------------------------------------------------------
//
// The map above answers "what did the CALLER mean". This one answers the other
// half: "what values are STORED that belong to this bucket". They are not the
// same question, and conflating them cost a tenant its entire catalog.
//
// A BYOD tenant's Postgres `property.property_type` is written by
// @chatrealty/sync straight off the RESO wire, where PropertyType is a label
// ("Residential", "Land", "Residential Lease") — NOT the A/B/C/D bucket code
// this platform filters on. So `property_type = 'A'` matched ZERO of 500
// correctly-seeded rows and the site served an empty catalog while the data sat
// right there. The sync now normalizes on write (see packages/chatrealty-sync/
// src/map.ts), but tenants seeded before that fix still hold RESO labels, so
// every read must accept BOTH spellings. Reading tolerantly is permanent;
// normalizing on write is what keeps new rows tidy.
//
// Deliberately residential-only: Commercial Sale / Commercial Lease / Business
// Opportunity / Farm get no bucket, so they never surface in an agent site's
// default browse. An unbucketed value is invisible, not miscategorized.
const STORED_ALIASES: Record<PropertyTypeCode, readonly string[]> = {
  A: ["A", "Residential", "Manufactured In Park", "Manufactured Home"],
  B: ["B", "Residential Lease"],
  C: ["C", "Residential Income"],
  D: ["D", "Land"],
};

/**
 * Every stored `property_type` / `propertyType` value that means `code`.
 * Use for an IN (...) / $in filter instead of an equality test on the code.
 */
export function propertyTypeStoredValues(code: PropertyTypeCode): readonly string[] {
  return STORED_ALIASES[code];
}

export function resolvePropertyType(input: string | null | undefined): PropertyTypeCode | "all" | null {
  if (input === null || input === undefined) return null;
  const key = input.trim().toLowerCase();
  if (!key) return null;
  return NORMALIZED_MAP[key] ?? null;
}

// Returns the Mongo $-clause to apply to a query. null/"all" → no clause.
// Pass the result of resolvePropertyType().
export function propertyTypeMongoFilter(
  resolved: PropertyTypeCode | "all" | null
): { propertyType: PropertyTypeCode } | null {
  if (resolved === null || resolved === "all") return null;
  return { propertyType: resolved };
}

// Convenience: combined parse + apply with a default code applied when
// the input is null/empty. Returns the code that was applied (or "all").
export function applyPropertyTypeFilter(
  query: Record<string, any>,
  input: string | null | undefined,
  defaultCode: PropertyTypeCode | "all" = "A"
): { applied: PropertyTypeCode | "all"; recognized: boolean } {
  const resolved = resolvePropertyType(input);
  // If the caller passed something but it didn't resolve, fall back to default
  // but report it back so the route can warn.
  const recognized = input === null || input === undefined || input.trim() === "" || resolved !== null;
  const effective = (resolved ?? defaultCode) as PropertyTypeCode | "all";
  const clause = propertyTypeMongoFilter(effective);
  if (clause) Object.assign(query, clause);
  return { applied: effective, recognized };
}
