/**
 * CMA Type Definitions
 *
 * All TypeScript interfaces for the Comparative Market Analysis system.
 * Consumed by: engine, scoring, remarks-parser, attribute-resolver, UI components, API routes.
 */

// ─── Tier Classification ───

export type CMATier = "affordable" | "residential" | "luxury";

export interface TierParams {
  tier: CMATier;
  sqftRange: number;           // +/- from subject sqft
  lotTolerancePct: number;     // Percentage tolerance for lot size
  lotToleranceFlat: number;    // Flat sqft tolerance for small lots
  yearBuiltTolerance: number;  // +/- years
  maxCompsPerStatus: number;   // Cap per active/closed
  radiusFallbackMiles: number; // For Level 5 search
  dateRanges: {                // Months to search at each hierarchy level
    level1: number;
    level2: number;
    level3: number;
    level4: number;
    level5: number;
  };
  weights: ScoringWeights;     // Tier-adjusted scoring weights
}

// ─── Confidence System ───

export type ConfidenceLevel = "confirmed" | "inferred-remarks" | "inferred-subdivision" | "inferred-neighbor" | "unknown";

export interface ConfidenceSignal {
  value: boolean | string | number | null;
  confidence: number;          // 0.0 - 1.0
  level: ConfidenceLevel;
  source: string;              // Human-readable: "MLS field", "publicRemarks", "subdivision profile (92% prevalence)", etc.
  snippet?: string;            // Relevant text excerpt (for remarks-based inference)
}

export interface ResolvedAttribute<T = boolean> {
  value: T | null;             // Resolved value, null if truly unknown
  confidence: number;          // 0.0 - 1.0
  level: ConfidenceLevel;
  source: string;
  snippet?: string;
}

export interface ResolvedListingAttributes {
  pool: ResolvedAttribute<boolean>;
  spa: ResolvedAttribute<boolean>;
  view: ResolvedAttribute<string>;       // Resolved view string, e.g. "Golf Course, Mountain(s)"
  viewCategories: string[];              // Parsed categories: ["Golf", "Mountain"]
  garage: ResolvedAttribute<number>;     // Resolved garage space count
  gatedCommunity: ResolvedAttribute<boolean>;
  seniorCommunity: ResolvedAttribute<boolean>;
  golf: ResolvedAttribute<boolean>;      // On/adjacent to golf course
  remodeled: ResolvedAttribute<boolean>;
  furnished: ResolvedAttribute<string>;  // "Furnished", "Turnkey", "Unfurnished", etc.
}

// ─── Remarks Parser ───

export interface ParsedRemarks {
  pool: { detected: boolean; confidence: number; snippet: string; isPrivate: boolean };
  spa: { detected: boolean; confidence: number; snippet: string };
  view: { detected: boolean; categories: string[]; confidence: number; snippet: string };
  garage: { detected: boolean; spaces: number | null; confidence: number; snippet: string };
  gated: { detected: boolean; confidence: number; snippet: string };
  golf: { detected: boolean; confidence: number; snippet: string };
  remodeled: { detected: boolean; confidence: number; snippet: string };
  furnished: { detected: boolean; level: string | null; confidence: number; snippet: string };
  negatives: string[];  // Explicit "no pool", "no spa", etc.
}

// ─── Subdivision Profile ───

export interface SubdivisionProfile {
  subdivisionName: string;
  city: string;
  totalListings: number;       // Active + closed used for aggregation
  lastUpdated: Date;

  // Attribute prevalence (0.0 - 1.0)
  poolPrevalence: number;
  spaPrevalence: number;
  garagePrevalence: number;
  avgGarageSpaces: number;
  viewPrevalence: number;
  commonViewTypes: string[];
  gatedPrevalence: number;
  seniorPrevalence: number;
  golfPrevalence: number;

  // Typical ranges
  sqftRange: { min: number; median: number; max: number; p25: number; p75: number };
  lotSizeRange: { min: number; median: number; max: number };
  priceRange: { min: number; median: number; max: number };
  yearBuiltRange: { min: number; median: number; max: number };
  commonArchStyles: string[];
  commonPropertySubTypes: string[];
  commonLandType: string;      // Dominant land type: "Fee" or "Lease"

  // From subdivisions collection (if available)
  communityFeatures: string | null;
  communityFacts: any | null;
}

// ─── Scoring ───

export interface ScoringWeights {
  sqft: number;
  subdivision: number;
  bedBath: number;
  poolSpa: number;
  lotSize: number;
  view: number;
  recency: number;
  yearBuilt: number;
  archStyle: number;
  stories: number;
  garage: number;
  landType: number;
}

export interface ScoreBreakdown {
  sqft: number;
  subdivision: number;
  bedBath: number;
  poolSpa: number;
  lotSize: number;
  view: number;
  recency: number;
  yearBuilt: number;
  archStyle: number;
  stories: number;
  garage: number;
  landType: number;
  total: number;
}

// ─── CMA Subject ───

export interface CMASubject {
  listingKey: string;
  address: string;
  city: string;
  subdivisionName: string | null;
  listPrice: number;
  livingArea: number;
  lotSize: number;
  lotSizeAcres: number;
  bedsTotal: number;
  bathsTotal: number;
  yearBuilt: number;
  pricePerSqft: number;
  propertyType: string;
  propertySubType: string;
  landType: string;
  view: string | null;
  viewCategories: string[];
  architecturalStyle: string | null;
  stories: number;
  garageSpaces: number;
  associationFee: number;
  lotFeatures: string | null;
  schoolDistrict: string | null;
  latitude: number;
  longitude: number;

  // Resolved attributes (with confidence)
  resolved: ResolvedListingAttributes;
}

// ─── CMA Comparable ───

export interface CMAComp {
  listingKey: string;
  listingId: string;
  address: string;
  city: string;
  subdivisionName: string | null;
  yearBuilt: number;
  pool: ResolvedAttribute<boolean>;
  spa: ResolvedAttribute<boolean>;
  garageSpaces: number;
  date: string;                    // onMarketDate (active) or closeDate (closed)
  bedsTotal: number;
  bathsTotal: number;
  livingArea: number;
  lotSize: number;
  lotSizeAcres: number;
  listPricePerSqft: number;
  originalListPrice: number;
  currentListPrice: number;
  closePrice?: number;             // Closed only
  salePricePerSqft?: number;       // Closed only
  salePriceToListRatio?: number;   // closePrice / listPrice
  daysOnMarket: number;
  similarityScore: number;         // 0-100
  scoreBreakdown: ScoreBreakdown;

  // Extended attributes
  propertySubType: string;
  landType: string;
  view: string | null;
  architecturalStyle: string | null;
  stories: number;
  gatedCommunity: boolean;
  seniorCommunity: boolean;
  associationFee: number;
  lotFeatures: string | null;
  schoolDistrict: string | null;

  // Resolved attributes
  resolved: ResolvedListingAttributes;
}

// ─── CMA Stats ───

export interface CMAStats {
  count: number;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  medianPrice: number;
  avgPricePerSqft: number;
  avgSqft: number;
  minSqft: number;
  maxSqft: number;
  medianSqft: number;
  avgLotSize: number;
  avgDaysOnMarket: number;
  avgBedsTotal: number;
  avgBathsTotal: number;
  avgSalePriceToListRatio?: number;  // Closed only
}

// ─── CMA Result ───

export interface CMAResult {
  subject: CMASubject;
  tier: CMATier;
  activeComps: CMAComp[];
  closedComps: CMAComp[];
  stats: {
    active: CMAStats;
    closed: CMAStats;
  };
  limitations: string[];
  inferences: string[];        // "Pool for 123 Main St inferred from remarks (92%)"
  narrative: string;
  generatedAt: string;
  searchCriteria: {
    levelsUsed: { active: number; closed: number };
    subdivisionMatched: boolean;
    dateRangeUsed: { active: string; closed: string };
    sqftRangeUsed: string;
    totalCandidatesEvaluated: { active: number; closed: number };
  };
}

// ─── Map Integration ───
// Re-export for convenience — matches the ListingsMap component interface

export interface MapListing {
  listingKey: string;
  slugAddress?: string;
  latitude: number;
  longitude: number;
  listPrice?: number;
  propertyType?: string;
  mlsSource?: string;
  bedsTotal?: number;
  bathsTotal?: number;
  bathroomsTotalInteger?: number;
  livingArea?: number;
  lotSize?: number;
  associationFee?: number;
  subdivisionName?: string;
  address?: string;
  photoUrl?: string;
}

// ─── View Categories ───

export const VIEW_CATEGORIES: Record<string, string[]> = {
  Golf: ["Golf Course", "Golf"],
  Mountain: ["Mountain(s)", "Mountain", "Mountains"],
  Desert: ["Desert"],
  Water: ["Ocean", "Beach", "Water", "Lake", "River", "Creek"],
  City: ["City Lights", "Panoramic", "City"],
  Pool: ["Pool"],
};

export function parseViewCategories(viewString: string | null | undefined): string[] {
  if (!viewString) return [];
  const categories: string[] = [];
  const lower = viewString.toLowerCase();
  for (const [category, keywords] of Object.entries(VIEW_CATEGORIES)) {
    if (keywords.some(kw => lower.includes(kw.toLowerCase()))) {
      categories.push(category);
    }
  }
  return categories;
}

// ─── Lot Size Categories ───

export type LotSizeCategory = "standard" | "large" | "acreage" | "estate";

export function getLotSizeCategory(sqft: number): LotSizeCategory {
  if (sqft >= 217800) return "estate";    // 5+ acres
  if (sqft >= 43560) return "acreage";    // 1-5 acres
  if (sqft >= 10000) return "large";      // 10,000 sqft - 1 acre
  return "standard";                       // < 10,000 sqft
}
