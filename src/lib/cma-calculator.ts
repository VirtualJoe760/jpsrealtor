// Client-side CMA calculator - generates instant CMA from listing data in memory
import { Listing } from "@/app/components/chat/ListingCarousel";

export interface CMAMetrics {
  medianPrice: number;
  averagePrice: number;
  medianPricePerSqft: number;
  averagePricePerSqft: number;
  priceRange: { min: number; max: number };
  sqftRange: { min: number; max: number };
  bedsRange: { min: number; max: number };
  bathsRange: { min: number; max: number };
  totalProperties: number;
}

export interface CMAResult {
  selectedProperties: Listing[];
  metrics: CMAMetrics;
  timestamp: string;
  location: string;
}

/**
 * Calculate CMA metrics from selected listings (client-side, instant)
 */
export function generateClientCMA(selectedListings: Listing[]): CMAResult {
  if (selectedListings.length === 0) {
    throw new Error("No listings selected for CMA generation");
  }

  // Calculate prices
  const prices = selectedListings.map(l => l.price).filter(p => p > 0);
  const sortedPrices = [...prices].sort((a, b) => a - b);
  const medianPrice = sortedPrices[Math.floor(sortedPrices.length / 2)] || 0;
  const averagePrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;

  // Calculate price per sqft
  const pricesPerSqft = selectedListings
    .filter(l => l.sqft > 0 && l.price > 0)
    .map(l => l.price / l.sqft);
  const sortedPricesPerSqft = [...pricesPerSqft].sort((a, b) => a - b);
  const medianPricePerSqft = sortedPricesPerSqft[Math.floor(sortedPricesPerSqft.length / 2)] || 0;
  const averagePricePerSqft = pricesPerSqft.reduce((sum, p) => sum + p, 0) / pricesPerSqft.length;

  // Calculate ranges
  const priceRange = {
    min: Math.min(...prices),
    max: Math.max(...prices),
  };

  const sqfts = selectedListings.map(l => l.sqft).filter(s => s > 0);
  const sqftRange = {
    min: Math.min(...sqfts),
    max: Math.max(...sqfts),
  };

  const beds = selectedListings.map(l => l.beds).filter(b => b > 0);
  const bedsRange = {
    min: Math.min(...beds),
    max: Math.max(...beds),
  };

  const baths = selectedListings.map(l => l.baths).filter(b => b > 0);
  const bathsRange = {
    min: Math.min(...baths),
    max: Math.max(...baths),
  };

  // Determine location (use first listing's city/subdivision)
  const location = selectedListings[0].subdivision || selectedListings[0].city || "Selected Area";

  return {
    selectedProperties: selectedListings,
    metrics: {
      medianPrice,
      averagePrice,
      medianPricePerSqft,
      averagePricePerSqft,
      priceRange,
      sqftRange,
      bedsRange,
      bathsRange,
      totalProperties: selectedListings.length,
    },
    timestamp: new Date().toISOString(),
    location,
  };
}

/**
 * Format price for display
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

/**
 * Format price per sqft
 */
export function formatPricePerSqft(pricePerSqft: number): string {
  return `$${pricePerSqft.toFixed(2)}/sqft`;
}
