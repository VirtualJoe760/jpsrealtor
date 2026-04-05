/**
 * CMA Engine
 *
 * Core orchestrator: classify tier → resolve attributes → run hierarchy search
 * → score & rank → calculate stats → generate narrative → return CMAResult.
 *
 * Data sources:
 *   - unified_listings (active comps)
 *   - unified_closed_listings (closed comps)
 *   - subdivisions (community data for attribute inference)
 */

import connectDB from "@/lib/mongodb";
import mongoose from "mongoose";
import {
  CMAResult,
  CMAComp,
  CMASubject,
  CMAStats,
  CMATier,
  TierParams,
  parseViewCategories,
  MapListing,
} from "./types";
import { classifyTier, getTierParams, getSqftRange, getLotTolerance } from "./tiers";
import { scoreComp } from "./scoring";
import { resolveAttributes } from "./attribute-resolver";
import { getSubdivisionProfile } from "./subdivision-profile";
import { parseRemarks } from "./remarks-parser";
import { generateNarrative, collectLimitations, collectInferences } from "./narrative";


// ─── Helpers ───

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function buildSubjectFromListing(listing: any): Omit<CMASubject, "resolved"> {
  const lotSize = listing.lotSizeArea || listing.lotSizeSqft || listing.lotSizeSquareFeet || 0;
  const livingArea = listing.livingArea || listing.buildingAreaTotal || 0;
  const listPrice = listing.listPrice || listing.currentPrice || 0;

  return {
    listingKey: listing.listingKey,
    address: listing.unparsedAddress || listing.address || "Unknown",
    city: listing.city || "",
    subdivisionName: listing.subdivisionName || null,
    listPrice,
    livingArea,
    lotSize,
    lotSizeAcres: listing.lotSizeAcres || (lotSize > 0 ? lotSize / 43560 : 0),
    bedsTotal: listing.bedsTotal || listing.bedroomsTotal || 0,
    bathsTotal: listing.bathroomsTotalInteger || listing.bathsTotal || listing.bathroomsTotalDecimal || 0,
    yearBuilt: listing.yearBuilt || 0,
    pricePerSqft: livingArea > 0 ? Math.round(listPrice / livingArea) : 0,
    propertyType: listing.propertyType || "A",
    propertySubType: listing.propertySubType || "Single Family Residence",
    landType: listing.landType || "Fee",
    view: listing.view || null,
    viewCategories: parseViewCategories(listing.view),
    architecturalStyle: listing.architecturalStyle || null,
    stories: listing.stories || listing.storiesTotal || 1,
    garageSpaces: listing.garageSpaces || 0,
    associationFee: listing.associationFee || listing.hoaFee || 0,
    lotFeatures: listing.lotFeatures || null,
    schoolDistrict: listing.schoolDistrict || null,
    latitude: listing.latitude || listing.coordinates?.coordinates?.[1] || 0,
    longitude: listing.longitude || listing.coordinates?.coordinates?.[0] || 0,
  };
}

function buildCompFromListing(listing: any, isClosed: boolean, resolvedAttrs: any, scoreBreakdown: any): CMAComp {
  const livingArea = listing.livingArea || listing.buildingAreaTotal || 0;
  const listPrice = listing.listPrice || listing.currentPrice || 0;
  const closePrice = isClosed ? (listing.closePrice || 0) : undefined;
  const lotSize = listing.lotSizeArea || listing.lotSizeSqft || 0;

  return {
    listingKey: listing.listingKey,
    listingId: listing.listingId || listing.listingKey,
    address: listing.unparsedAddress || listing.address || "Unknown",
    city: listing.city || "",
    subdivisionName: listing.subdivisionName || null,
    yearBuilt: listing.yearBuilt || 0,
    pool: resolvedAttrs.pool,
    spa: resolvedAttrs.spa,
    garageSpaces: listing.garageSpaces || 0,
    date: isClosed ? (listing.closeDate || "") : (listing.onMarketDate || listing.listingContractDate || ""),
    bedsTotal: listing.bedsTotal || listing.bedroomsTotal || 0,
    bathsTotal: listing.bathroomsTotalInteger || listing.bathsTotal || 0,
    livingArea,
    lotSize,
    lotSizeAcres: listing.lotSizeAcres || (lotSize > 0 ? lotSize / 43560 : 0),
    listPricePerSqft: livingArea > 0 ? Math.round(listPrice / livingArea) : 0,
    originalListPrice: listing.originalListPrice || listPrice,
    currentListPrice: listPrice,
    closePrice,
    salePricePerSqft: isClosed && closePrice && livingArea > 0 ? Math.round(closePrice / livingArea) : undefined,
    salePriceToListRatio: isClosed && closePrice && listPrice > 0 ? Number((closePrice / listPrice).toFixed(3)) : undefined,
    daysOnMarket: listing.daysOnMarket || 0,
    similarityScore: scoreBreakdown.total,
    scoreBreakdown,
    propertySubType: listing.propertySubType || "",
    landType: listing.landType || "Fee",
    view: listing.view || null,
    architecturalStyle: listing.architecturalStyle || null,
    stories: listing.stories || 1,
    gatedCommunity: resolvedAttrs.gatedCommunity.value === true,
    seniorCommunity: resolvedAttrs.seniorCommunity.value === true,
    associationFee: listing.associationFee || 0,
    lotFeatures: listing.lotFeatures || null,
    schoolDistrict: listing.schoolDistrict || null,
    resolved: resolvedAttrs,
  };
}

function computeStats(comps: CMAComp[], isClosed: boolean): CMAStats {
  if (comps.length === 0) {
    return {
      count: 0, avgPrice: 0, minPrice: 0, maxPrice: 0, medianPrice: 0,
      avgPricePerSqft: 0, avgSqft: 0, minSqft: 0, maxSqft: 0, medianSqft: 0,
      avgLotSize: 0, avgDaysOnMarket: 0, avgBedsTotal: 0, avgBathsTotal: 0,
    };
  }

  const prices = comps.map(c => isClosed ? (c.closePrice || 0) : c.currentListPrice).filter(p => p > 0);
  const sqfts = comps.map(c => c.livingArea).filter(s => s > 0);
  const lots = comps.map(c => c.lotSize).filter(l => l > 0);
  const doms = comps.map(c => c.daysOnMarket).filter(d => d >= 0);
  const ppsfs = comps.map(c => isClosed ? (c.salePricePerSqft || 0) : c.listPricePerSqft).filter(p => p > 0);
  const ratios = isClosed ? comps.map(c => c.salePriceToListRatio).filter((r): r is number => r != null && r > 0) : [];

  return {
    count: comps.length,
    avgPrice: prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0,
    minPrice: prices.length > 0 ? Math.min(...prices) : 0,
    maxPrice: prices.length > 0 ? Math.max(...prices) : 0,
    medianPrice: median(prices),
    avgPricePerSqft: ppsfs.length > 0 ? Math.round(ppsfs.reduce((a, b) => a + b, 0) / ppsfs.length) : 0,
    avgSqft: sqfts.length > 0 ? Math.round(sqfts.reduce((a, b) => a + b, 0) / sqfts.length) : 0,
    minSqft: sqfts.length > 0 ? Math.min(...sqfts) : 0,
    maxSqft: sqfts.length > 0 ? Math.max(...sqfts) : 0,
    medianSqft: median(sqfts),
    avgLotSize: lots.length > 0 ? Math.round(lots.reduce((a, b) => a + b, 0) / lots.length) : 0,
    avgDaysOnMarket: doms.length > 0 ? Math.round(doms.reduce((a, b) => a + b, 0) / doms.length) : 0,
    avgBedsTotal: Math.round(comps.reduce((a, c) => a + c.bedsTotal, 0) / comps.length * 10) / 10,
    avgBathsTotal: Math.round(comps.reduce((a, c) => a + c.bathsTotal, 0) / comps.length * 10) / 10,
    ...(ratios.length > 0 ? { avgSalePriceToListRatio: Number((ratios.reduce((a, b) => a + b, 0) / ratios.length).toFixed(3)) } : {}),
  };
}

// ─── Hierarchy Search ───

interface SearchLevel {
  level: number;
  query: any;
  dateMonths: number;
}

function buildSearchLevels(
  subject: CMASubject,
  params: TierParams,
  isClosed: boolean,
): SearchLevel[] {
  const sqftRange = getSqftRange(subject.livingArea, params.tier);
  const baseDateField = isClosed ? "closeDate" : "onMarketDate";

  const baseFilters: any = {
    propertyType: subject.propertyType,
    propertySubType: subject.propertySubType,
    listingKey: { $ne: subject.listingKey }, // Exclude subject
    livingArea: { $gte: sqftRange.min, $lte: sqftRange.max },
  };

  // Hard filters
  if (subject.landType) baseFilters.landType = subject.landType;
  if (subject.resolved.seniorCommunity.value === true) baseFilters.seniorCommunityYn = true;
  else if (subject.resolved.seniorCommunity.value === false) baseFilters.seniorCommunityYn = { $ne: true };

  if (isClosed) {
    baseFilters.standardStatus = { $in: ["Closed", "Sold"] };
  } else {
    baseFilters.standardStatus = "Active";
  }

  const levels: SearchLevel[] = [];

  // Level 1: Same subdivision + tight match
  if (subject.subdivisionName) {
    const l1 = { ...baseFilters };
    l1.subdivisionName = new RegExp(`^${subject.subdivisionName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
    l1.bedsTotal = { $gte: subject.bedsTotal - 1, $lte: subject.bedsTotal + 1 };
    if (subject.resolved.pool.value === true) l1.$or = [{ poolYn: true }, { pool: true }];
    levels.push({ level: 1, query: l1, dateMonths: params.dateRanges.level1 });

    // Level 2: Same subdivision relaxed
    const l2 = { ...baseFilters };
    l2.subdivisionName = l1.subdivisionName;
    l2.livingArea = { $gte: sqftRange.min - 200, $lte: sqftRange.max + 200 };
    levels.push({ level: 2, query: l2, dateMonths: params.dateRanges.level2 });
  }

  // Level 3: Same city + tight match
  const l3 = { ...baseFilters };
  l3.city = new RegExp(`^${(subject.city || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
  l3.bedsTotal = { $gte: subject.bedsTotal - 1, $lte: subject.bedsTotal + 1 };
  if (subject.resolved.pool.value === true) l3.$or = [{ poolYn: true }, { pool: true }];
  levels.push({ level: 3, query: l3, dateMonths: params.dateRanges.level3 });

  // Level 4: Same city relaxed
  const l4 = { ...baseFilters };
  l4.city = l3.city;
  l4.livingArea = { $gte: sqftRange.min - 300, $lte: sqftRange.max + 300 };
  levels.push({ level: 4, query: l4, dateMonths: params.dateRanges.level4 });

  // Level 5: Radius fallback
  if (subject.latitude && subject.longitude) {
    const l5: any = { ...baseFilters };
    delete l5.city; // Remove city filter
    l5.coordinates = {
      $nearSphere: {
        $geometry: { type: "Point", coordinates: [subject.longitude, subject.latitude] },
        $maxDistance: params.radiusFallbackMiles * 1609.34, // miles to meters
      },
    };
    levels.push({ level: 5, query: l5, dateMonths: params.dateRanges.level5 });
  }

  return levels;
}

async function searchComps(
  collection: any,
  levels: SearchLevel[],
  subject: CMASubject,
  params: TierParams,
  isClosed: boolean,
  subdivisionProfile: any,
): Promise<{ comps: CMAComp[]; levelUsed: number; totalEvaluated: number }> {
  const maxComps = params.maxCompsPerStatus;
  let totalEvaluated = 0;

  const projection = {
    listingKey: 1, listingId: 1, unparsedAddress: 1, address: 1, city: 1,
    subdivisionName: 1, yearBuilt: 1, bedsTotal: 1, bedroomsTotal: 1,
    bathsTotal: 1, bathroomsTotalInteger: 1, bathroomsTotalDecimal: 1,
    livingArea: 1, buildingAreaTotal: 1, lotSizeArea: 1, lotSizeSqft: 1, lotSizeAcres: 1,
    listPrice: 1, currentPrice: 1, originalListPrice: 1, closePrice: 1, closeDate: 1,
    onMarketDate: 1, listingContractDate: 1, daysOnMarket: 1,
    propertyType: 1, propertySubType: 1, landType: 1, architecturalStyle: 1,
    stories: 1, storiesTotal: 1, garageSpaces: 1,
    poolYn: 1, pool: 1, spaYn: 1, spa: 1, viewYn: 1, view: 1,
    gatedCommunity: 1, seniorCommunityYn: 1, associationFee: 1,
    publicRemarks: 1, communityFeatures: 1, lotFeatures: 1,
    schoolDistrict: 1, latitude: 1, longitude: 1, coordinates: 1,
    slugAddress: 1, mlsSource: 1, standardStatus: 1,
    photoUrl: 1, primaryPhotoUrl: 1,
  };

  for (const level of levels) {
    const dateField = isClosed ? "closeDate" : "onMarketDate";
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - level.dateMonths);
    const query = { ...level.query, [dateField]: { $gte: cutoffDate } };

    const candidates = await collection.find(query, { projection }).limit(50).toArray();
    totalEvaluated += candidates.length;

    if (candidates.length === 0) continue;

    // Resolve attributes and score each candidate
    const scored: CMAComp[] = [];
    for (const candidate of candidates) {
      const remarks = parseRemarks(candidate.publicRemarks);
      const resolved = resolveAttributes(candidate, subdivisionProfile, remarks);
      const breakdown = scoreComp(subject, {
        subdivisionName: candidate.subdivisionName || null,
        livingArea: candidate.livingArea || 0,
        lotSize: candidate.lotSizeArea || candidate.lotSizeSqft || 0,
        bedsTotal: candidate.bedsTotal || candidate.bedroomsTotal || 0,
        bathsTotal: candidate.bathroomsTotalInteger || candidate.bathsTotal || 0,
        yearBuilt: candidate.yearBuilt || 0,
        garageSpaces: candidate.garageSpaces || 0,
        stories: candidate.stories || 1,
        landType: candidate.landType || "Fee",
        architecturalStyle: candidate.architecturalStyle || null,
        closeDate: isClosed ? candidate.closeDate?.toISOString?.() || candidate.closeDate : undefined,
        onMarketDate: !isClosed ? candidate.onMarketDate?.toISOString?.() || candidate.onMarketDate : undefined,
        resolved,
      }, params);

      scored.push(buildCompFromListing(candidate, isClosed, resolved, breakdown));
    }

    // Sort by score descending, take top N
    scored.sort((a, b) => b.similarityScore - a.similarityScore);
    const top = scored.slice(0, maxComps);

    if (top.length >= 3) {
      return { comps: top, levelUsed: level.level, totalEvaluated };
    }

    // If we got some but not enough, try next level to get more
    if (top.length > 0 && level.level === levels[levels.length - 1].level) {
      return { comps: top, levelUsed: level.level, totalEvaluated };
    }
  }

  return { comps: [], levelUsed: 0, totalEvaluated };
}

// ─── Main Engine ───

export interface GenerateCMAOptions {
  maxCompsPerStatus?: number;
  tierOverride?: CMATier;
}

export async function generateCMA(
  subjectListing: any,
  options?: GenerateCMAOptions,
): Promise<CMAResult> {
  await connectDB();

  const activeColl = mongoose.connection.collection("unified_listings");
  const closedColl = mongoose.connection.collection("unified_closed_listings");

  // 1. Build subject
  const subjectBase = buildSubjectFromListing(subjectListing);
  const tier = options?.tierOverride || classifyTier(subjectBase.listPrice, subjectBase.livingArea);
  const params = getTierParams(tier);
  if (options?.maxCompsPerStatus) params.maxCompsPerStatus = options.maxCompsPerStatus;

  // 2. Get subdivision profile
  const subdivisionProfile = subjectBase.subdivisionName
    ? await getSubdivisionProfile(subjectBase.subdivisionName)
    : null;

  // 3. Resolve subject attributes
  const subjectRemarks = parseRemarks(subjectListing.publicRemarks);
  const subjectResolved = resolveAttributes(subjectListing, subdivisionProfile, subjectRemarks);
  const subject: CMASubject = { ...subjectBase, resolved: subjectResolved };

  // 4. Build search levels
  const activeLevels = buildSearchLevels(subject, params, false);
  const closedLevels = buildSearchLevels(subject, params, true);

  // 5. Search in parallel
  const [activeResult, closedResult] = await Promise.all([
    searchComps(activeColl, activeLevels, subject, params, false, subdivisionProfile),
    searchComps(closedColl, closedLevels, subject, params, true, subdivisionProfile),
  ]);

  // 6. Compute stats
  const activeStats = computeStats(activeResult.comps, false);
  const closedStats = computeStats(closedResult.comps, true);

  // 7. Build result
  const result: CMAResult = {
    subject,
    tier,
    activeComps: activeResult.comps,
    closedComps: closedResult.comps,
    stats: { active: activeStats, closed: closedStats },
    limitations: [],
    inferences: [],
    narrative: "",
    generatedAt: new Date().toISOString(),
    searchCriteria: {
      levelsUsed: { active: activeResult.levelUsed, closed: closedResult.levelUsed },
      subdivisionMatched: activeResult.levelUsed <= 2 || closedResult.levelUsed <= 2,
      dateRangeUsed: {
        active: `${params.dateRanges[`level${activeResult.levelUsed}` as keyof typeof params.dateRanges] || "?"} months`,
        closed: `${params.dateRanges[`level${closedResult.levelUsed}` as keyof typeof params.dateRanges] || "?"} months`,
      },
      sqftRangeUsed: `${getSqftRange(subject.livingArea, tier).min.toLocaleString()} - ${getSqftRange(subject.livingArea, tier).max.toLocaleString()} sqft`,
      totalCandidatesEvaluated: {
        active: activeResult.totalEvaluated,
        closed: closedResult.totalEvaluated,
      },
    },
  };

  // 8. Collect inferences + limitations + narrative
  result.inferences = collectInferences(subject, [...activeResult.comps, ...closedResult.comps]);
  result.limitations = collectLimitations(result);
  result.narrative = generateNarrative(result);

  return result;
}

