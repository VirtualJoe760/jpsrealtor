/**
 * Subdivision Profile Builder
 *
 * Aggregates attribute prevalence across all listings in a subdivision.
 * Used to infer missing attributes on individual listings.
 *
 * Data sources: unified_listings (active) + unified_closed_listings (closed)
 * Also enriches with data from the subdivisions collection when available.
 *
 * Caching: In-memory Map with 24h TTL.
 */

import connectDB from "@/lib/mongodb";
import mongoose from "mongoose";
import { SubdivisionProfile } from "./types";

// ─── Cache ───

const profileCache = new Map<string, { profile: SubdivisionProfile; expiresAt: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function getCached(key: string): SubdivisionProfile | null {
  const entry = profileCache.get(key);
  if (entry && entry.expiresAt > Date.now()) return entry.profile;
  if (entry) profileCache.delete(key);
  return null;
}

function setCache(key: string, profile: SubdivisionProfile) {
  // Limit cache size
  if (profileCache.size > 500) {
    const oldest = profileCache.keys().next().value;
    if (oldest) profileCache.delete(oldest);
  }
  profileCache.set(key, { profile, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ─── Helpers ───

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

// ─── Main Builder ───

export async function getSubdivisionProfile(
  subdivisionName: string,
  forceRefresh: boolean = false
): Promise<SubdivisionProfile | null> {
  if (!subdivisionName) return null;

  const cacheKey = subdivisionName.toLowerCase().trim();

  if (!forceRefresh) {
    const cached = getCached(cacheKey);
    if (cached) return cached;
  }

  await connectDB();

  const activeColl = mongoose.connection.collection("unified_listings");
  const closedColl = mongoose.connection.collection("unified_closed_listings");
  const subdivColl = mongoose.connection.collection("subdivisions");

  // Regex for case-insensitive exact match
  const nameRegex = new RegExp(`^${subdivisionName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");

  // Query both collections in parallel
  const [activeListings, closedListings, subdivDoc] = await Promise.all([
    activeColl.find(
      { subdivisionName: nameRegex, standardStatus: "Active" },
      {
        projection: {
          poolYn: 1, pool: 1, spaYn: 1, spa: 1, garageSpaces: 1,
          viewYn: 1, view: 1, gatedCommunity: 1, seniorCommunityYn: 1,
          livingArea: 1, lotSizeArea: 1, lotSizeSqft: 1, listPrice: 1,
          yearBuilt: 1, architecturalStyle: 1, propertySubType: 1,
          landType: 1, communityFeatures: 1, lotFeatures: 1, city: 1,
        },
      }
    ).toArray(),
    closedColl.find(
      { subdivisionName: nameRegex, closeDate: { $gte: new Date(Date.now() - 3 * 365 * 24 * 60 * 60 * 1000) } },
      {
        projection: {
          poolYn: 1, pool: 1, spaYn: 1, spa: 1, garageSpaces: 1,
          viewYn: 1, view: 1, gatedCommunity: 1, seniorCommunityYn: 1,
          livingArea: 1, lotSizeArea: 1, lotSizeSqft: 1, closePrice: 1,
          yearBuilt: 1, architecturalStyle: 1, propertySubType: 1,
          landType: 1, communityFeatures: 1, city: 1,
        },
      }
    ).toArray(),
    subdivColl.findOne({ name: nameRegex }),
  ]);

  const allListings = [...activeListings, ...closedListings];
  const total = allListings.length;

  if (total < 3) return null; // Not enough data for a meaningful profile

  // ── Compute prevalence ──
  const hasPool = allListings.filter(l => l.poolYn === true || l.pool === true).length;
  const hasSpa = allListings.filter(l => l.spaYn === true || l.spa === true).length;
  const hasGarage = allListings.filter(l => l.garageSpaces && l.garageSpaces > 0).length;
  const garageSpacesArr = allListings.filter(l => l.garageSpaces > 0).map(l => l.garageSpaces);
  const hasView = allListings.filter(l => l.viewYn === true || (l.view && l.view.length > 0)).length;
  const hasGated = allListings.filter(l => l.gatedCommunity === true).length;
  const hasSenior = allListings.filter(l => l.seniorCommunityYn === true).length;

  // Golf detection: from view field or communityFeatures
  const hasGolf = allListings.filter(l =>
    (l.view && /golf/i.test(l.view)) ||
    (l.communityFeatures && /golf/i.test(l.communityFeatures)) ||
    (l.lotFeatures && /golf/i.test(l.lotFeatures))
  ).length;

  // ── View types ──
  const viewCounts = new Map<string, number>();
  allListings.forEach(l => {
    if (l.view) {
      const parts = (l.view as string).split(",").map((s: string) => s.trim());
      parts.forEach((p: string) => viewCounts.set(p, (viewCounts.get(p) || 0) + 1));
    }
  });
  const commonViewTypes = [...viewCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([type]) => type);

  // ── Ranges ──
  const sqfts = allListings.map(l => l.livingArea).filter((v): v is number => v != null && v > 0);
  const lotSizes = allListings.map(l => l.lotSizeArea || l.lotSizeSqft).filter((v): v is number => v != null && v > 0);
  const prices = [
    ...activeListings.map(l => l.listPrice),
    ...closedListings.map(l => l.closePrice),
  ].filter((v): v is number => v != null && v > 0);
  const years = allListings.map(l => l.yearBuilt).filter((v): v is number => v != null && v > 1900);

  // ── Architectural styles ──
  const styleCounts = new Map<string, number>();
  allListings.forEach(l => {
    if (l.architecturalStyle) {
      const parts = (l.architecturalStyle as string).split(",").map((s: string) => s.trim());
      parts.forEach((p: string) => styleCounts.set(p, (styleCounts.get(p) || 0) + 1));
    }
  });
  const commonArchStyles = [...styleCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([style]) => style);

  // ── Property sub types ──
  const subTypeCounts = new Map<string, number>();
  allListings.forEach(l => {
    if (l.propertySubType) subTypeCounts.set(l.propertySubType, (subTypeCounts.get(l.propertySubType) || 0) + 1);
  });
  const commonPropertySubTypes = [...subTypeCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([type]) => type);

  // ── Dominant land type ──
  const feeLand = allListings.filter(l => l.landType === "Fee").length;
  const leaseLand = allListings.filter(l => l.landType === "Lease").length;

  const profile: SubdivisionProfile = {
    subdivisionName,
    city: allListings[0]?.city || "",
    totalListings: total,
    lastUpdated: new Date(),

    poolPrevalence: total > 0 ? hasPool / total : 0,
    spaPrevalence: total > 0 ? hasSpa / total : 0,
    garagePrevalence: total > 0 ? hasGarage / total : 0,
    avgGarageSpaces: garageSpacesArr.length > 0
      ? garageSpacesArr.reduce((a, b) => a + b, 0) / garageSpacesArr.length
      : 0,
    viewPrevalence: total > 0 ? hasView / total : 0,
    commonViewTypes,
    gatedPrevalence: total > 0 ? hasGated / total : 0,
    seniorPrevalence: total > 0 ? hasSenior / total : 0,
    golfPrevalence: total > 0 ? hasGolf / total : 0,

    sqftRange: {
      min: sqfts.length > 0 ? Math.min(...sqfts) : 0,
      median: median(sqfts),
      max: sqfts.length > 0 ? Math.max(...sqfts) : 0,
      p25: percentile(sqfts, 25),
      p75: percentile(sqfts, 75),
    },
    lotSizeRange: {
      min: lotSizes.length > 0 ? Math.min(...lotSizes) : 0,
      median: median(lotSizes),
      max: lotSizes.length > 0 ? Math.max(...lotSizes) : 0,
    },
    priceRange: {
      min: prices.length > 0 ? Math.min(...prices) : 0,
      median: median(prices),
      max: prices.length > 0 ? Math.max(...prices) : 0,
    },
    yearBuiltRange: {
      min: years.length > 0 ? Math.min(...years) : 0,
      median: median(years),
      max: years.length > 0 ? Math.max(...years) : 0,
    },
    commonArchStyles,
    commonPropertySubTypes,
    commonLandType: feeLand >= leaseLand ? "Fee" : "Lease",

    communityFeatures: subdivDoc?.communityFeatures || null,
    communityFacts: subdivDoc?.communityFacts || null,
  };

  setCache(cacheKey, profile);
  return profile;
}

/**
 * Clear the in-memory cache (for testing or manual refresh).
 */
export function clearProfileCache() {
  profileCache.clear();
}
