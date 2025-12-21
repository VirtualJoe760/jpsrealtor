// src/lib/chat-v2/user-analytics.ts
// User behavior tracking with intelligent goal inference

import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import type { UserBehaviorEvent, UserInterestArea, UserInvestmentInterest } from "./types";

/**
 * Track tool usage and infer user interests
 * Non-blocking - runs in background
 */
export async function trackToolUsage(event: UserBehaviorEvent): Promise<void> {
  // Run in background - don't block chat response
  setTimeout(async () => {
    try {
      await updateUserInterests(event);
    } catch (error) {
      console.error("[Analytics] Failed to track tool usage:", error);
      // Don't throw - analytics should never break the chat
    }
  }, 0);
}

/**
 * Update user's interest data based on tool usage
 */
async function updateUserInterests(event: UserBehaviorEvent): Promise<void> {
  if (!event.userId || !event.location) return;

  await dbConnect();

  const { name, type, normalized } = event.location;

  // Build updates based on tool type
  if (event.tool === "searchHomes") {
    await trackSearchInterest(event);
  } else if (event.tool === "getAppreciation") {
    await trackInvestmentInterest(event);
  }
}

/**
 * Track property search interests (favorite communities)
 */
async function trackSearchInterest(event: UserBehaviorEvent) {
  const { userId, location, filters } = event;
  const { name, type, normalized } = location!;

  // Find existing interest or create new
  const user = await User.findOne(
    { email: userId },
    { "interests.favoriteSearchAreas": 1 }
  );

  const existingAreas: UserInterestArea[] = (user as any)?.interests?.favoriteSearchAreas || [];
  const existingIndex = existingAreas.findIndex(area => area.name === normalized);

  if (existingIndex >= 0) {
    // Update existing interest
    const updated = {
      ...existingAreas[existingIndex],
      searchCount: existingAreas[existingIndex].searchCount + 1,
      lastSearched: new Date(),
      filters: filters ? mergeFilters(existingAreas[existingIndex].filters, filters) : existingAreas[existingIndex].filters
    };

    existingAreas[existingIndex] = updated;
  } else {
    // Add new interest
    existingAreas.push({
      name: normalized,
      type: type as any,
      searchCount: 1,
      lastSearched: new Date(),
      filters: filters ? extractFilters(filters) : undefined
    });
  }

  // Sort by search count (most searched first)
  existingAreas.sort((a, b) => b.searchCount - a.searchCount);

  // Update user document
  await User.updateOne(
    { email: userId },
    {
      $set: {
        "interests.favoriteSearchAreas": existingAreas,
        "interests.lastUpdated": new Date()
      }
    }
  );

  console.log(`[Analytics] Updated search interest for ${userId}: ${normalized} (${existingAreas.find(a => a.name === normalized)?.searchCount} searches)`);
}

/**
 * Track appreciation/investment research (watchlist)
 */
async function trackInvestmentInterest(event: UserBehaviorEvent) {
  const { userId, location, filters } = event;
  const { name, type, normalized } = location!;

  const user = await User.findOne(
    { email: userId },
    { "interests.investmentInterest": 1 }
  );

  const existingInterests: UserInvestmentInterest[] = (user as any)?.interests?.investmentInterest || [];
  const existingIndex = existingInterests.findIndex(area => area.name === normalized);

  const period = filters?.period || "5y";

  if (existingIndex >= 0) {
    // Update existing
    const existing = existingInterests[existingIndex];
    const periodsViewed = existing.periodsViewed || [];
    if (!periodsViewed.includes(period)) {
      periodsViewed.push(period);
    }

    existingInterests[existingIndex] = {
      ...existing,
      appreciationChecks: existing.appreciationChecks + 1,
      lastChecked: new Date(),
      periodsViewed
    };
  } else {
    // Add new
    existingInterests.push({
      name: normalized,
      type: type as any,
      appreciationChecks: 1,
      lastChecked: new Date(),
      periodsViewed: [period]
    });
  }

  // Sort by checks (most checked first)
  existingInterests.sort((a, b) => b.appreciationChecks - a.appreciationChecks);

  await User.updateOne(
    { email: userId },
    {
      $set: {
        "interests.investmentInterest": existingInterests,
        "interests.lastUpdated": new Date()
      }
    }
  );

  console.log(`[Analytics] Updated investment interest for ${userId}: ${normalized} (${existingInterests.find(a => a.name === normalized)?.appreciationChecks} checks)`);
}

/**
 * Extract filter preferences from search
 */
function extractFilters(filters: any) {
  return {
    priceRange: {
      min: filters.minPrice,
      max: filters.maxPrice
    },
    beds: filters.beds,
    baths: filters.baths,
    features: [
      filters.pool ? "pool" : null,
      filters.propertyType ? filters.propertyType : null
    ].filter(Boolean)
  };
}

/**
 * Merge new filters with existing (update ranges, add features)
 */
function mergeFilters(existing: any = {}, newFilters: any) {
  return {
    priceRange: {
      min: newFilters.minPrice !== undefined ? newFilters.minPrice : existing.priceRange?.min,
      max: newFilters.maxPrice !== undefined ? newFilters.maxPrice : existing.priceRange?.max
    },
    beds: newFilters.beds !== undefined ? newFilters.beds : existing.beds,
    baths: newFilters.baths !== undefined ? newFilters.baths : existing.baths,
    features: Array.from(new Set([
      ...(existing.features || []),
      ...(newFilters.pool ? ["pool"] : []),
      ...(newFilters.propertyType ? [newFilters.propertyType] : [])
    ]))
  };
}

/**
 * Get user's favorite communities (for personalization)
 */
export async function getUserFavorites(userId: string): Promise<{
  searchAreas: UserInterestArea[];
  investmentAreas: UserInvestmentInterest[];
}> {
  try {
    await dbConnect();
    const user = await User.findOne(
      { email: userId },
      { "interests.favoriteSearchAreas": 1, "interests.investmentInterest": 1 }
    );

    return {
      searchAreas: (user as any)?.interests?.favoriteSearchAreas || [],
      investmentAreas: (user as any)?.interests?.investmentInterest || []
    };
  } catch (error) {
    console.error("[Analytics] Failed to get user favorites:", error);
    return { searchAreas: [], investmentAreas: [] };
  }
}
