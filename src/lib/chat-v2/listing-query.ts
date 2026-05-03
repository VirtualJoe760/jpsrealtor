// src/lib/chat-v2/listing-query.ts
// Shared filter→Mongo helper + $facet aggregation pipeline for chat-v2 tools.
//
// Three things live here:
//   1. ListingFilters type — the union of everything tool schemas advertise.
//   2. buildListingQuery — translates scope + filters into a Mongo query doc.
//      Mirrors src/app/api/cities/[cityId]/listings/route.ts exactly so the
//      stats the AI sees match what the carousel renders.
//   3. computeAreaStats — single $facet aggregation that replaces the old
//      .limit(50) JS-side averaging. Returns count, avg/median price, sqft,
//      $/sqft, HOA min/max/avg, propertySubType breakdown, amenity rates,
//      and 7-day new-listings count over the FULL filtered set.
//
// Geographic taxonomy: county → city → subdivision. All three resolve to
// listing-level fields (countyOrParish, city, subdivisionName).
// Datasets: 'active' (UnifiedListing) | 'closed' (UnifiedClosedListing —
// uses closePrice instead of listPrice; closeDate available for time windows).

import dbConnect from "@/lib/mongodb";
import UnifiedListing from "@/models/unified-listing";
import UnifiedClosedListing from "@/models/unified-closed-listing";
import { getStreetCoordinate } from "@/lib/geo/street-lookup";
import { escapeRegex } from "@/lib/security";

// =============================================================================
// Types
// =============================================================================

export type ListingDataset = "active" | "closed";

export type ListingScope =
  | { type: "county"; countyName: string }
  | { type: "city"; cityName: string; cityId?: string }
  | { type: "subdivision"; subdivisionName: string; cityName?: string }
  | { type: "subdivisionGroup"; subdivisionNames: string[] }
  | { type: "street"; streetName: string; cityName?: string; cityId?: string }
  | { type: "zip"; zip: string };

export interface ListingFilters {
  // Price
  minPrice?: number;
  maxPrice?: number;
  // Beds/baths (exact match)
  beds?: number;
  baths?: number;
  // Size
  minSqft?: number;
  maxSqft?: number;
  minLotSize?: number;
  maxLotSize?: number;
  // Year
  minYear?: number;
  maxYear?: number;
  // Amenity booleans
  pool?: boolean;
  spa?: boolean;
  view?: boolean;
  fireplace?: boolean;
  gatedCommunity?: boolean;
  seniorCommunity?: boolean;
  // Garage / stories
  garageSpaces?: number;
  stories?: number;
  // Property type
  propertyType?: "A" | "B" | "C" | "D"; // A=sale (default), B=rental, C=multifamily, D=land
  propertySubType?: string;
  // Geographic (street-name based, requires cityId)
  eastOf?: string;
  westOf?: string;
  northOf?: string;
  southOf?: string;
  // HOA
  hasHOA?: boolean;
  minHOA?: number;
  maxHOA?: number;
}

export interface BuildOptions {
  dataset?: ListingDataset; // default 'active'
  // For closed listings, optional time window on closeDate.
  closedSinceDays?: number;
}

export interface AreaStats {
  totalListings: number;
  newListingsCount: number;
  newListingsPct: number;
  avgPrice: number;
  medianPrice: number;
  priceRange: { min: number; max: number };
  avgSqft: number;
  medianSqft: number;
  avgPricePerSqft: number;
  medianPricePerSqft: number;
  propertyTypes: Array<{
    subType: string;
    count: number;
    avgPrice: number;
    avgPricePerSqft: number;
  }>;
  hoa: { count: number; min: number; max: number; avg: number } | null;
  amenities: {
    poolPct: number;
    spaPct: number;
    viewPct: number;
    fireplacePct: number;
    gatedPct: number;
    seniorPct: number;
  };
  // Insights derived from publicRemarks text scan (kept for legacy
  // system-prompt compatibility; will move to a dedicated tool in Phase 4).
  insights?: {
    isGated: boolean;
    hasGolf: boolean;
  };
}

// =============================================================================
// Filter → Mongo query
// =============================================================================

function pickModelAndFields(opts?: BuildOptions) {
  const dataset = opts?.dataset || "active";
  if (dataset === "closed") {
    return {
      Model: UnifiedClosedListing,
      priceField: "closePrice",
      dateField: "closeDate",
    };
  }
  return {
    Model: UnifiedListing,
    priceField: "listPrice",
    dateField: "onMarketDate",
  };
}

/**
 * Build a Mongo filter document for a scope + filters combo.
 * Returns the query plus the model and price/date field names so callers
 * can run find/aggregate against the right collection consistently.
 *
 * Mirrors src/app/api/cities/[cityId]/listings/route.ts filter logic so chat
 * stats stay in sync with the carousel.
 */
export async function buildListingQuery(
  scope: ListingScope,
  filters: ListingFilters,
  opts?: BuildOptions
): Promise<{
  query: Record<string, any>;
  Model: any;
  priceField: string;
  dateField: string;
}> {
  await dbConnect();
  const { Model, priceField, dateField } = pickModelAndFields(opts);
  const dataset = opts?.dataset || "active";

  const propertyType = filters.propertyType || "A";

  // ---- Base scope-level constraints ----
  const query: Record<string, any> = {
    propertyType,
    propertySubType: { $nin: ["Co-Ownership", "Timeshare"] },
    [priceField]: { $exists: true, $ne: null, $gt: 0 },
  };

  // Active listings: only Active status. Closed listings: any status (the
  // dataset itself is the filter).
  if (dataset === "active") {
    query.standardStatus = "Active";
  }

  // Optional time window for closed listings.
  if (dataset === "closed" && opts?.closedSinceDays && opts.closedSinceDays > 0) {
    const since = new Date();
    since.setDate(since.getDate() - opts.closedSinceDays);
    query[dateField] = { $gte: since };
  }

  // ---- Scope ----
  switch (scope.type) {
    case "county":
      query.countyOrParish = new RegExp(`^${escapeRegex(scope.countyName)}$`, "i");
      break;
    case "city":
      query.city = new RegExp(`^${escapeRegex(scope.cityName)}$`, "i");
      break;
    case "subdivision":
      query.subdivisionName = new RegExp(
        `^${escapeRegex(scope.subdivisionName).replace(/[-\s]/g, "[-\\s]")}$`,
        "i"
      );
      if (scope.cityName) {
        query.city = new RegExp(`^${escapeRegex(scope.cityName)}$`, "i");
      }
      break;
    case "subdivisionGroup":
      query.subdivisionName = { $in: scope.subdivisionNames };
      break;
    case "street": {
      // Match street name as a word in unparsedAddress. Includes the city
      // when supplied to disambiguate streets that share names across cities.
      const streetRegex = new RegExp(`\\b${escapeRegex(scope.streetName)}\\b`, "i");
      query.unparsedAddress = streetRegex;
      if (scope.cityName) {
        query.city = new RegExp(`^${escapeRegex(scope.cityName)}$`, "i");
      }
      break;
    }
    case "zip":
      query.postalCode = scope.zip;
      break;
  }

  // ---- $and accumulator for filters that need OR sub-clauses ----
  const andConditions: any[] = [];

  // Price
  const priceFilter: any = query[priceField] || {};
  if (filters.minPrice) priceFilter.$gte = filters.minPrice;
  if (filters.maxPrice) priceFilter.$lte = filters.maxPrice;
  query[priceField] = priceFilter;

  // Beds (exact match — "3 beds" means exactly 3, per MLS convention)
  if (filters.beds) {
    query.bedsTotal = filters.beds;
  }

  // Baths (exact match, OR across both fields some MLSs populate)
  if (filters.baths) {
    andConditions.push({
      $or: [
        { bathsTotal: filters.baths },
        { bathroomsTotalDecimal: filters.baths },
        { bathroomsTotalInteger: filters.baths },
      ],
    });
  }

  // Size
  if (filters.minSqft || filters.maxSqft) {
    const f: any = {};
    if (filters.minSqft) f.$gte = filters.minSqft;
    if (filters.maxSqft) f.$lte = filters.maxSqft;
    query.livingArea = f;
  }
  if (filters.minLotSize || filters.maxLotSize) {
    const f: any = {};
    if (filters.minLotSize) f.$gte = filters.minLotSize;
    if (filters.maxLotSize) f.$lte = filters.maxLotSize;
    andConditions.push({
      $or: [{ lotSizeSqft: f }, { lotSizeArea: f }],
    });
  }

  // Year built
  if (filters.minYear || filters.maxYear) {
    const f: any = {};
    if (filters.minYear) f.$gte = filters.minYear;
    if (filters.maxYear) f.$lte = filters.maxYear;
    query.yearBuilt = f;
  }

  // Amenity booleans — the data has both lowercase Yn (schema) and legacy
  // uppercase YN / bare-name fields, so OR across all of them.
  if (filters.pool) {
    andConditions.push({ $or: [{ poolYn: true }, { poolYN: true }, { pool: true }] });
  }
  if (filters.spa) {
    andConditions.push({ $or: [{ spaYn: true }, { spaYN: true }, { spa: true }] });
  }
  if (filters.view) {
    andConditions.push({ $or: [{ viewYn: true }, { viewYN: true }, { view: true }] });
  }
  if (filters.fireplace) {
    andConditions.push({
      $or: [{ fireplacesTotal: { $gte: 1 } }, { fireplaceYN: true }],
    });
  }
  if (filters.gatedCommunity) {
    andConditions.push({
      $or: [
        { gatedCommunity: true },
        { associationAmenities: { $regex: /gated/i } },
      ],
    });
  }
  if (filters.seniorCommunity) {
    andConditions.push({
      $or: [
        { seniorCommunityYn: true },
        { seniorCommunityYN: true },
        { ageRestricted55Plus: true },
      ],
    });
  }

  // Garage / parking
  if (filters.garageSpaces) {
    andConditions.push({
      $or: [
        { garageSpaces: { $gte: filters.garageSpaces } },
        { parkingTotal: { $gte: filters.garageSpaces } },
      ],
    });
  }

  // Stories
  if (filters.stories) {
    andConditions.push({
      $or: [{ stories: filters.stories }, { levels: filters.stories }],
    });
  }

  // PropertySubType (override the $nin if user explicitly asks for one)
  if (filters.propertySubType) {
    query.propertySubType = filters.propertySubType;
  }

  // HOA
  if (filters.hasHOA === false) {
    andConditions.push({
      $or: [
        { hoaYN: false },
        { hoaYN: { $exists: false } },
        { associationFee: 0 },
        { associationFee: { $exists: false } },
      ],
    });
  } else if (filters.hasHOA === true) {
    andConditions.push({
      $and: [{ hoaYN: true }, { associationFee: { $gt: 0 } }],
    });
    if (filters.maxHOA) andConditions.push({ associationFee: { $lte: filters.maxHOA } });
    if (filters.minHOA) andConditions.push({ associationFee: { $gte: filters.minHOA } });
  } else {
    // hasHOA not set, but caller might still bound the fee.
    if (filters.maxHOA || filters.minHOA) {
      const f: any = {};
      if (filters.maxHOA) f.$lte = filters.maxHOA;
      if (filters.minHOA) f.$gte = filters.minHOA;
      andConditions.push({ associationFee: f });
    }
  }

  // Geographic (street-based directional filters).
  // Requires a cityId to look up street coordinates from StreetBoundary.
  const cityIdForGeo = (scope as any).cityId;
  if (cityIdForGeo) {
    if (filters.eastOf) {
      const c = await getStreetCoordinate(filters.eastOf, cityIdForGeo);
      if (c?.longitude) andConditions.push({ longitude: { $gt: c.longitude } });
    }
    if (filters.westOf) {
      const c = await getStreetCoordinate(filters.westOf, cityIdForGeo);
      if (c?.longitude) andConditions.push({ longitude: { $lt: c.longitude } });
    }
    if (filters.northOf) {
      const c = await getStreetCoordinate(filters.northOf, cityIdForGeo);
      if (c?.latitude) andConditions.push({ latitude: { $gt: c.latitude } });
    }
    if (filters.southOf) {
      const c = await getStreetCoordinate(filters.southOf, cityIdForGeo);
      if (c?.latitude) andConditions.push({ latitude: { $lt: c.latitude } });
    }
  }

  if (andConditions.length > 0) {
    query.$and = andConditions;
  }

  return { query, Model, priceField, dateField };
}

// =============================================================================
// $facet aggregation — full-set stats
// =============================================================================

/**
 * Run a single $facet aggregation that produces all area stats over the FULL
 * filtered set. Replaces the old .limit(50) JS-side averaging in
 * tool-executors.ts so numbers reflect the entire dataset, not a 50-row
 * sample.
 */
export async function computeAreaStats(
  scope: ListingScope,
  filters: ListingFilters,
  opts?: BuildOptions
): Promise<AreaStats> {
  const { query, Model, priceField, dateField } = await buildListingQuery(
    scope,
    filters,
    opts
  );

  const priceRef = `$${priceField}`;
  const dateRef = `$${dateField}`;

  const facetResults = await Model.aggregate([
    { $match: query },
    {
      $facet: {
        // ---- Headline numbers ----
        headline: [
          {
            $group: {
              _id: null,
              count: { $sum: 1 },
              avgPrice: { $avg: priceRef },
              minPrice: { $min: priceRef },
              maxPrice: { $max: priceRef },
              avgSqft: { $avg: "$livingArea" },
              avgPricePerSqft: {
                $avg: {
                  $cond: [
                    { $gt: ["$livingArea", 0] },
                    { $divide: [priceRef, "$livingArea"] },
                    null,
                  ],
                },
              },
              prices: { $push: priceRef },
              sqftsRaw: { $push: "$livingArea" },
              ppsfsRaw: {
                $push: {
                  $cond: [
                    { $gt: ["$livingArea", 0] },
                    { $divide: [priceRef, "$livingArea"] },
                    null,
                  ],
                },
              },
            },
          },
          {
            $project: {
              _id: 0,
              count: 1,
              avgPrice: { $round: ["$avgPrice", 0] },
              minPrice: 1,
              maxPrice: 1,
              avgSqft: { $round: ["$avgSqft", 0] },
              avgPricePerSqft: { $round: ["$avgPricePerSqft", 0] },
              medianPrice: {
                $let: {
                  vars: { sorted: { $sortArray: { input: "$prices", sortBy: 1 } } },
                  in: {
                    $arrayElemAt: [
                      "$$sorted",
                      { $floor: { $divide: [{ $size: "$$sorted" }, 2] } },
                    ],
                  },
                },
              },
              medianSqft: {
                $let: {
                  vars: {
                    sorted: {
                      $sortArray: {
                        input: {
                          $filter: {
                            input: "$sqftsRaw",
                            as: "s",
                            cond: { $gt: ["$$s", 0] },
                          },
                        },
                        sortBy: 1,
                      },
                    },
                  },
                  in: {
                    $cond: [
                      { $gt: [{ $size: "$$sorted" }, 0] },
                      {
                        $arrayElemAt: [
                          "$$sorted",
                          { $floor: { $divide: [{ $size: "$$sorted" }, 2] } },
                        ],
                      },
                      0,
                    ],
                  },
                },
              },
              medianPricePerSqft: {
                $let: {
                  vars: {
                    sorted: {
                      $sortArray: {
                        input: {
                          $filter: {
                            input: "$ppsfsRaw",
                            as: "p",
                            cond: { $ne: ["$$p", null] },
                          },
                        },
                        sortBy: 1,
                      },
                    },
                  },
                  in: {
                    $cond: [
                      { $gt: [{ $size: "$$sorted" }, 0] },
                      {
                        $round: [
                          {
                            $arrayElemAt: [
                              "$$sorted",
                              { $floor: { $divide: [{ $size: "$$sorted" }, 2] } },
                            ],
                          },
                          0,
                        ],
                      },
                      0,
                    ],
                  },
                },
              },
            },
          },
        ],

        // ---- PropertySubType breakdown (capped at 20 categories) ----
        bySubType: [
          {
            $group: {
              _id: "$propertySubType",
              count: { $sum: 1 },
              avgPrice: { $avg: priceRef },
              avgPricePerSqft: {
                $avg: {
                  $cond: [
                    { $gt: ["$livingArea", 0] },
                    { $divide: [priceRef, "$livingArea"] },
                    null,
                  ],
                },
              },
            },
          },
          {
            $project: {
              _id: 0,
              subType: { $ifNull: ["$_id", "Unknown"] },
              count: 1,
              avgPrice: { $round: ["$avgPrice", 0] },
              avgPricePerSqft: { $round: ["$avgPricePerSqft", 0] },
            },
          },
          { $sort: { count: -1 } },
          { $limit: 20 },
        ],

        // ---- HOA stats (only listings with a fee > 0) ----
        hoa: [
          { $match: { associationFee: { $gt: 0 } } },
          {
            $group: {
              _id: null,
              count: { $sum: 1 },
              min: { $min: "$associationFee" },
              max: { $max: "$associationFee" },
              avg: { $avg: "$associationFee" },
            },
          },
          {
            $project: {
              _id: 0,
              count: 1,
              min: 1,
              max: 1,
              avg: { $round: ["$avg", 0] },
            },
          },
        ],

        // ---- Amenity rates (counts; pct computed in JS) ----
        amenities: [
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              poolCount: {
                $sum: {
                  $cond: [
                    {
                      $or: [
                        { $eq: ["$poolYn", true] },
                        { $eq: ["$poolYN", true] },
                        { $eq: ["$pool", true] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
              spaCount: {
                $sum: {
                  $cond: [
                    {
                      $or: [
                        { $eq: ["$spaYn", true] },
                        { $eq: ["$spaYN", true] },
                        { $eq: ["$spa", true] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
              viewCount: {
                $sum: {
                  $cond: [
                    {
                      $or: [
                        { $eq: ["$viewYn", true] },
                        { $eq: ["$viewYN", true] },
                        { $eq: ["$view", true] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
              fireplaceCount: {
                $sum: {
                  $cond: [
                    {
                      $or: [
                        { $gte: ["$fireplacesTotal", 1] },
                        { $eq: ["$fireplaceYN", true] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
              gatedCount: {
                $sum: { $cond: [{ $eq: ["$gatedCommunity", true] }, 1, 0] },
              },
              seniorCount: {
                $sum: {
                  $cond: [
                    {
                      $or: [
                        { $eq: ["$seniorCommunityYn", true] },
                        { $eq: ["$seniorCommunityYN", true] },
                        { $eq: ["$ageRestricted55Plus", true] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
            },
          },
        ],

        // ---- New listings (past 7 days) — only meaningful for active dataset ----
        newListings: [
          {
            $addFields: {
              daysSince: {
                $cond: [
                  { $ne: [dateRef, null] },
                  {
                    $floor: {
                      $divide: [
                        { $subtract: [new Date(), { $toDate: dateRef }] },
                        1000 * 60 * 60 * 24,
                      ],
                    },
                  },
                  null,
                ],
              },
            },
          },
          { $match: { daysSince: { $lte: 7, $gte: 0 } } },
          { $count: "count" },
        ],
      },
    },
  ]);

  // ---- Flatten facet results ----
  const r = facetResults[0] || {};
  const headline = r.headline?.[0] || {};
  const hoa = r.hoa?.[0] || null;
  const amen = r.amenities?.[0] || {};
  const newCount = r.newListings?.[0]?.count || 0;
  const total = headline.count || 0;

  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

  return {
    totalListings: total,
    newListingsCount: newCount,
    newListingsPct: pct(newCount),
    avgPrice: headline.avgPrice || 0,
    medianPrice: headline.medianPrice || 0,
    priceRange: { min: headline.minPrice || 0, max: headline.maxPrice || 0 },
    avgSqft: headline.avgSqft || 0,
    medianSqft: headline.medianSqft || 0,
    avgPricePerSqft: headline.avgPricePerSqft || 0,
    medianPricePerSqft: headline.medianPricePerSqft || 0,
    propertyTypes: r.bySubType || [],
    hoa: hoa
      ? { count: hoa.count, min: hoa.min, max: hoa.max, avg: hoa.avg }
      : null,
    amenities: {
      poolPct: pct(amen.poolCount || 0),
      spaPct: pct(amen.spaCount || 0),
      viewPct: pct(amen.viewCount || 0),
      fireplacePct: pct(amen.fireplaceCount || 0),
      gatedPct: pct(amen.gatedCount || 0),
      seniorPct: pct(amen.seniorCount || 0),
    },
  };
}

/**
 * Lightweight publicRemarks text scan — used to populate the legacy
 * `insights.isGated` / `insights.hasGolf` flags the system prompt still
 * references. Reads up to 100 docs (capped) and runs JS string ops.
 *
 * To be removed in Phase 4 once the system prompt stops asking the model
 * to render these as text.
 */
export async function deriveTextInsights(
  scope: ListingScope,
  filters: ListingFilters,
  opts?: BuildOptions
): Promise<{ isGated: boolean; hasGolf: boolean }> {
  const { query, Model } = await buildListingQuery(scope, filters, opts);
  const sample = await Model.find(query)
    .select("publicRemarks")
    .limit(100)
    .lean();

  const blob = sample
    .map((d: any) => d.publicRemarks)
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const gatedPositive = (blob.match(/\b(gated community|gated subdivision|guard gated|24.?hour guard)/gi) || []).length;
  const gatedNegative = (blob.match(/\b(not gated|non.?gated|no gate)/gi) || []).length;

  return {
    isGated: gatedPositive > gatedNegative,
    hasGolf: blob.includes("golf"),
  };
}
