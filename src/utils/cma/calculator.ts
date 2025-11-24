// src/utils/cma/calculator.ts
// CMA Calculation Utilities

import type {
  ComparableProperty,
  SubjectProperty,
  MarketStatistics,
  CMAFilters
} from "@/types/cma";
import type { IListing } from "@/models/listings";

/**
 * Calculate distance between two geographic points using Haversine formula
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate price per square foot
 */
export function calculatePricePerSqFt(price: number, sqft: number): number {
  if (!sqft || sqft === 0) return 0;
  return Math.round(price / sqft);
}

/**
 * Calculate similarity score between subject and comparable property
 * Returns a score from 0-100
 */
export function calculateSimilarityScore(
  subject: SubjectProperty,
  comp: ComparableProperty
): number {
  let score = 100;

  // Price difference (max -30 points)
  if (subject.listPrice && comp.listPrice) {
    const priceDiff = Math.abs(subject.listPrice - comp.listPrice) / subject.listPrice;
    score -= Math.min(30, priceDiff * 100);
  }

  // Square footage difference (max -20 points)
  if (subject.livingArea && comp.livingArea) {
    const sqftDiff = Math.abs(subject.livingArea - comp.livingArea) / subject.livingArea;
    score -= Math.min(20, sqftDiff * 100);
  }

  // Bedroom difference (max -15 points)
  if (subject.bedroomsTotal && comp.bedroomsTotal) {
    const bedDiff = Math.abs(subject.bedroomsTotal - comp.bedroomsTotal);
    score -= Math.min(15, bedDiff * 5);
  }

  // Bathroom difference (max -15 points)
  if (subject.bathroomsTotalInteger && comp.bathroomsTotalInteger) {
    const bathDiff = Math.abs(subject.bathroomsTotalInteger - comp.bathroomsTotalInteger);
    score -= Math.min(15, bathDiff * 7.5);
  }

  // Year built difference (max -10 points)
  if (subject.yearBuilt && comp.yearBuilt) {
    const yearDiff = Math.abs(subject.yearBuilt - comp.yearBuilt);
    score -= Math.min(10, yearDiff / 10);
  }

  // Distance penalty (max -10 points)
  if (comp.distanceFromSubject) {
    score -= Math.min(10, comp.distanceFromSubject * 2);
  }

  return Math.max(0, Math.round(score));
}

/**
 * Convert IListing to ComparableProperty
 */
export function listingToComparable(
  listing: IListing,
  subjectLat?: number,
  subjectLon?: number
): ComparableProperty {
  const comp: ComparableProperty = {
    listingKey: listing.listingKey,
    address: listing.unparsedAddress || listing.address || "Unknown",
    city: listing.city || "Unknown",
    listPrice: listing.listPrice || 0,
    soldPrice: listing.closePrice,
    soldDate: listing.closeDate ? new Date(listing.closeDate) : undefined,
    daysOnMarket: listing.daysOnMarket || 0,
    bedroomsTotal: listing.bedroomsTotal || listing.bedsTotal,
    bathroomsTotalInteger: listing.bathroomsTotalInteger,
    livingArea: listing.livingArea,
    lotSizeArea: listing.lotSizeArea,
    yearBuilt: listing.yearBuilt,
    latitude: listing.latitude,
    longitude: listing.longitude,
    primaryPhotoUrl: listing.primaryPhotoUrl,
    standardStatus: listing.standardStatus || "Unknown",
  };

  // Calculate distance from subject property
  if (subjectLat && subjectLon && comp.latitude && comp.longitude) {
    comp.distanceFromSubject = calculateDistance(
      subjectLat,
      subjectLon,
      comp.latitude,
      comp.longitude
    );
  }

  // Calculate price per sqft
  if (comp.listPrice && comp.livingArea) {
    comp.pricePerSqFt = calculatePricePerSqFt(comp.listPrice, comp.livingArea);
  }

  return comp;
}

/**
 * Filter and rank comparable properties
 */
export function filterAndRankComps(
  subject: SubjectProperty,
  listings: IListing[],
  filters: CMAFilters = {}
): ComparableProperty[] {
  const {
    radius = 2, // default 2 mile radius
    minPrice,
    maxPrice,
    minBeds,
    maxBeds,
    minBaths,
    maxBaths,
    minSqFt,
    maxSqFt,
    minYearBuilt,
    maxYearBuilt,
    standardStatus = ["Active", "Closed"],
    maxComps = 10,
  } = filters;

  // Convert listings to comparables
  const comparables = listings
    .map((listing) =>
      listingToComparable(listing, subject.latitude, subject.longitude)
    )
    .filter((comp) => {
      // Exclude the subject property itself
      if (comp.listingKey === subject.listingKey) return false;

      // Radius filter
      if (comp.distanceFromSubject && comp.distanceFromSubject > radius) return false;

      // Price filters
      if (minPrice && comp.listPrice < minPrice) return false;
      if (maxPrice && comp.listPrice > maxPrice) return false;

      // Bedroom filters
      if (minBeds && (!comp.bedroomsTotal || comp.bedroomsTotal < minBeds)) return false;
      if (maxBeds && comp.bedroomsTotal && comp.bedroomsTotal > maxBeds) return false;

      // Bathroom filters
      if (minBaths && (!comp.bathroomsTotalInteger || comp.bathroomsTotalInteger < minBaths)) return false;
      if (maxBaths && comp.bathroomsTotalInteger && comp.bathroomsTotalInteger > maxBaths) return false;

      // Square footage filters
      if (minSqFt && (!comp.livingArea || comp.livingArea < minSqFt)) return false;
      if (maxSqFt && comp.livingArea && comp.livingArea > maxSqFt) return false;

      // Year built filters
      if (minYearBuilt && (!comp.yearBuilt || comp.yearBuilt < minYearBuilt)) return false;
      if (maxYearBuilt && comp.yearBuilt && comp.yearBuilt > maxYearBuilt) return false;

      // Status filter
      if (!standardStatus.includes(comp.standardStatus)) return false;

      return true;
    });

  // Calculate similarity scores
  comparables.forEach((comp) => {
    comp.similarity = calculateSimilarityScore(subject, comp);
  });

  // Sort by similarity score (highest first) and return top N
  return comparables
    .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
    .slice(0, maxComps);
}

/**
 * Calculate market statistics from comparable properties
 */
export function calculateMarketStatistics(
  comparables: ComparableProperty[]
): MarketStatistics {
  if (comparables.length === 0) {
    return {
      averageListPrice: 0,
      medianListPrice: 0,
      averageSoldPrice: 0,
      medianSoldPrice: 0,
      averageDaysOnMarket: 0,
      medianDaysOnMarket: 0,
      averagePricePerSqFt: 0,
      medianPricePerSqFt: 0,
      totalActiveListings: 0,
      totalSoldListings: 0,
      listToSoldRatio: 0,
    };
  }

  // List prices
  const listPrices = comparables.map((c) => c.listPrice).filter((p) => p > 0);
  const averageListPrice = listPrices.reduce((a, b) => a + b, 0) / listPrices.length;
  const medianListPrice = median(listPrices);

  // Sold prices
  const soldPrices = comparables
    .map((c) => c.soldPrice)
    .filter((p): p is number => p !== undefined && p > 0);
  const averageSoldPrice = soldPrices.length > 0
    ? soldPrices.reduce((a, b) => a + b, 0) / soldPrices.length
    : 0;
  const medianSoldPrice = soldPrices.length > 0 ? median(soldPrices) : 0;

  // Days on market
  const daysOnMarket = comparables.map((c) => c.daysOnMarket).filter((d) => d > 0);
  const averageDaysOnMarket = daysOnMarket.length > 0
    ? daysOnMarket.reduce((a, b) => a + b, 0) / daysOnMarket.length
    : 0;
  const medianDaysOnMarket = daysOnMarket.length > 0 ? median(daysOnMarket) : 0;

  // Price per sqft
  const pricesPerSqFt = comparables
    .map((c) => c.pricePerSqFt)
    .filter((p): p is number => p !== undefined && p > 0);
  const averagePricePerSqFt = pricesPerSqFt.length > 0
    ? pricesPerSqFt.reduce((a, b) => a + b, 0) / pricesPerSqFt.length
    : 0;
  const medianPricePerSqFt = pricesPerSqFt.length > 0 ? median(pricesPerSqFt) : 0;

  // Active vs Sold
  const activeListings = comparables.filter((c) => c.standardStatus === "Active");
  const soldListings = comparables.filter((c) => c.standardStatus === "Closed");
  const listToSoldRatio = soldListings.length > 0
    ? (soldListings.length / comparables.length) * 100
    : 0;

  return {
    averageListPrice: Math.round(averageListPrice),
    medianListPrice: Math.round(medianListPrice),
    averageSoldPrice: Math.round(averageSoldPrice),
    medianSoldPrice: Math.round(medianSoldPrice),
    averageDaysOnMarket: Math.round(averageDaysOnMarket),
    medianDaysOnMarket: Math.round(medianDaysOnMarket),
    averagePricePerSqFt: Math.round(averagePricePerSqFt),
    medianPricePerSqFt: Math.round(medianPricePerSqFt),
    totalActiveListings: activeListings.length,
    totalSoldListings: soldListings.length,
    listToSoldRatio: Math.round(listToSoldRatio),
  };
}

/**
 * Estimate property value based on comparables
 */
export function estimatePropertyValue(
  subject: SubjectProperty,
  comparables: ComparableProperty[]
): { estimated: number; low: number; high: number } {
  if (comparables.length === 0) {
    return { estimated: subject.listPrice || 0, low: 0, high: 0 };
  }

  // Use price per sqft method if subject has living area
  if (subject.livingArea) {
    const pricesPerSqFt = comparables
      .map((c) => c.pricePerSqFt)
      .filter((p): p is number => p !== undefined && p > 0);

    if (pricesPerSqFt.length > 0) {
      const avgPricePerSqFt = pricesPerSqFt.reduce((a, b) => a + b, 0) / pricesPerSqFt.length;
      const medianPricePerSqFt = median(pricesPerSqFt);

      const estimated = Math.round(avgPricePerSqFt * subject.livingArea);
      const low = Math.round(Math.min(...pricesPerSqFt) * subject.livingArea);
      const high = Math.round(Math.max(...pricesPerSqFt) * subject.livingArea);

      return { estimated, low, high };
    }
  }

  // Fallback to average of comparable prices weighted by similarity
  const weightedSum = comparables.reduce((sum, comp) => {
    const weight = (comp.similarity || 50) / 100;
    return sum + (comp.soldPrice || comp.listPrice) * weight;
  }, 0);

  const totalWeight = comparables.reduce((sum, comp) => {
    return sum + ((comp.similarity || 50) / 100);
  }, 0);

  const estimated = Math.round(weightedSum / totalWeight);
  const prices = comparables.map((c) => c.soldPrice || c.listPrice);

  return {
    estimated,
    low: Math.round(Math.min(...prices) * 0.95),
    high: Math.round(Math.max(...prices) * 1.05),
  };
}

/**
 * Calculate median value
 */
function median(values: number[]): number {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }

  return sorted[mid];
}
