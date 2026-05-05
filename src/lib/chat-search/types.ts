// src/lib/chat-search/types.ts
//
// Shared types for the search-first chat architecture (parser → preview →
// narrate). Imported by both the test-chat sandbox routes and the
// production /api/chat-v3 endpoint.

import type { ParsedQuery } from "@/lib/chat-v2/query-parser";

export type { ParsedQuery };

// =============================================================================
// Preview output — Layer 1
// =============================================================================
//
// The preview dispatcher returns one of these shapes per intent. The shape
// is keyed by `component` so the renderer (test-chat ComponentPreview or
// chat-v3 MessageRenderer) can pick the right React component.

export interface PreviewListing {
  listingKey: string;
  slugAddress?: string;
  address: string;
  city?: string;
  subdivision?: string;
  price?: number;
  beds?: number;
  baths?: number;
  sqft?: number;
  lotSize?: number;
  yearBuilt?: number;
  propertySubType?: string;
  associationFee?: number;
  primaryPhotoUrl?: string;
  onMarketDate?: string;
  daysOnMarket?: number;
  standardStatus?: string;
  // For ListingOptionsViewer's map mode — projected by preview.ts
  latitude?: number;
  longitude?: number;
}

export interface PreviewStats {
  totalListings: number;
  newListingsCount: number;
  avgPrice: number;
  medianPrice: number;
  priceRange: { min: number; max: number };
  avgPricePerSqft: number;
  medianPricePerSqft: number;
  hoa?: { count: number; min: number; max: number; avg: number } | null;
  amenities?: {
    poolPct: number;
    spaPct: number;
    viewPct: number;
    fireplacePct: number;
    gatedPct: number;
    seniorPct: number;
  };
  propertyTypes?: Array<{
    subType: string;
    count: number;
    avgPrice: number;
    avgPricePerSqft: number;
  }>;
}

export interface PreviewArticle {
  title: string;
  slug?: string;
  excerpt?: string;
  category?: string;
}

export interface PreviewResult {
  component:
    | "listingDetail"
    | "neighborhood"
    | "areaStats"
    | "listingResults"
    | "compare"
    | "trend"
    | "cma"
    | "articles"
    | null;
  listing?: PreviewListing | null;
  listings?: PreviewListing[];
  stats?: PreviewStats | null;
  scope?: { type: string; value: string };
  propertyType?: string;
  totalCount?: number;
  a?: { scope: any; stats: PreviewStats };
  b?: { scope: any; stats: PreviewStats };
  articles?: PreviewArticle[];
  // trend
  appreciation?: any;
  marketData?: any;
  metadata?: any;
  period?: string;
  locationType?: string;
  locationName?: string;
  // cma — "listing" / "subdivision" run a real CMA;
  // "listingOptions" is a disambiguation step (multiple addresses
  // matched a street, ask the user to pick one).
  cmaScope?: "listing" | "subdivision" | "listingOptions";
  listingKey?: string;
  slugAddress?: string;
  subdivisionName?: string;
  slug?: string;
  city?: string;
  cma?: any;
  hasPrebuilt?: boolean;
  // shared
  query?: string;
  reason?: string;
  ms?: number;
  error?: string;
}

// =============================================================================
// Narrator inputs — Layer 2
// =============================================================================

export interface SearchResultRow {
  type: "listing" | "city" | "subdivision" | "county" | "region" | "article";
  entityId?: string;
  label: string;
  sublabel?: string;
  slug?: string;
  price?: number;
  beds?: number;
  baths?: number;
  sqft?: number;
  city?: string;
  subdivision?: string;
  excerpt?: string;
  category?: string;
  source?: "text" | "regex";
}

export interface NarrationInput {
  message: string;
  parsed: ParsedQuery | null;
  searchResults?: SearchResultRow[];
  preview?: PreviewResult | null;
  previewArticles?: PreviewArticle[];
}

export interface NarrationResult {
  narration: string;
  tokens?: number;
  ms?: number;
  model?: string;
  finishReason?: string;
  error?: string;
}
