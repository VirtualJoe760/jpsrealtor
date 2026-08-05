// Shapes returned by the ChatRealty skill API. Confirmed against the live
// endpoints — do not invent fields; extend here if you enable more.

export interface ListingSummary {
  listingKey: string;
  address: string | null;
  city: string | null;
  subdivision: string | null;
  propertyType: string | null;
  status: string | null;
  listPrice: number | null;
  currentPrice: number | null;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  yearBuilt: number | null;
  pool: boolean;
  latitude: number | null;
  longitude: number | null;
  daysOnMarket: number | null;
  primaryPhotoUrl: string | null;
  /** Render-ready optimized thumbnail — safe for a plain <img>. */
  thumbUrl: string | null;
  slug: string;
  /**
   * The listing on the ChatRealty HUB (chatrealty.io) — NOT this site.
   * Do not link visitors here: use `listingHref(listingKey)` from lib/links.
   * Three surfaces once linked to it and sent buyers off the agent's site.
   */
  detailUrl: string;
  distanceMiles?: number;
  // IDX attribution — display "Listed by {office} — {agent}". Search and
  // detail both return these; a given listing can still be missing one (the
  // feed's own gap), so render whichever is present and neither when both are
  // absent. Optional because older API deployments omitted them from search.
  listAgentName?: string | null;
  listOfficeName?: string | null;
}

export interface SearchResult {
  items: ListingSummary[];
  total: number | null;
  skip: number;
  limit: number;
  hasMore: boolean;
  center?: { lat: number; lng: number };
  radiusMiles?: number;
}

export interface ListingDetail extends ListingSummary {
  state: string | null;
  postalCode: string | null;
  propertySubType: string | null;
  originalListPrice: number | null;
  bathsDecimal: number | null;
  lotSize: number | null;
  lotSizeUnits: string | null;
  levels: string | null;
  hoaFee: number | null;
  hoaFeeFrequency: string | null;
  communityFeatures: string | null;
  poolFeatures: string | null;
  spa: boolean;
  spaFeatures: string | null;
  view: string | null;
  garageSpaces: number | null;
  parkingTotal: number | null;
  heating: string | null;
  cooling: string | null;
  publicRemarks: string | null;
  photoCount: number;
  hasOpenHouses: boolean;
}

/** One photo from GET /api/skill/listings/{key}/photos. */
export interface ListingPhoto {
  url: string;
  thumbUrl: string | null;
  caption: string | null;
  order: number | null;
}

export interface MarketStats {
  scope: { city: string | null; subdivision: string | null; propertyType: string | null };
  propertyTypeRecognized?: boolean;
  activeCount: number;
  medianListPrice: number | null;
  averageListPrice: number | null;
  medianDaysOnMarket: number | null;
  priceRange: { min: number; max: number } | null;
}

/** Agent identity served by GET /api/skill/me/profile — hydrates header, footer, About, Contact. */
export interface AgentProfile {
  name: string | null;
  email: string | null;
  phone: string | null;
  licenseNumber: string | null;
  brokerageName: string | null;
  website: string | null;
  bio: string | null;
  headline: string | null;
  tagline: string | null;
  headshot: string | null;
  heroPhoto: string | null;
  serviceAreas: { name: string; type?: string }[];
  specializations: string[];
}

/** Blog post summary from GET /api/skill/articles?status=published. */
export interface BlogPostSummary {
  slugId: string;
  title: string;
  excerpt: string | null;
  category: string | null;
  publishedAt: string | null;
  coverUrl: string | null;
}

export interface BlogPost extends BlogPostSummary {
  /** Markdown body. */
  content: string;
}

export interface ListingFilters {
  city?: string;
  /** Match ANY of these cities. `city` wins when both are set. */
  cities?: string[];
  /**
   * Skip the automatic market scope (see MARKET SCOPE in lib/chatrealty.ts).
   * Only for a deliberate whole-feed search — the default browse must stay
   * scoped to the markets this site serves.
   */
  unscoped?: boolean;
  subdivision?: string;
  propertyType?: string;
  minPrice?: number;
  maxPrice?: number;
  minBeds?: number;
  minBaths?: number;
  hasPool?: boolean;
  near?: string;
  radiusMiles?: number;
  limit?: number;
  skip?: number;
}
