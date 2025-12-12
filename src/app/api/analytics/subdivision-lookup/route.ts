import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import mongoose from "mongoose";

/**
 * Subdivision Lookup API
 *
 * Finds subdivision names that match a partial or fuzzy search term.
 * Helps the AI find the correct subdivision name when users use variations.
 *
 * Examples:
 * - "Vintage" → "Vintage Country Club"
 * - "The Vintage" → "Vintage Country Club"
 * - "Indian Wells CC" → "Indian Wells Country Club"
 * - "PGA" → "PGA West", "PGA West - Nicklaus Tournament", etc.
 *
 * Query Parameters:
 * - query: string (required) - The search term
 * - city: string (optional) - Filter by city
 * - limit: number (optional) - Max results to return (default: 5)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query");
    const city = searchParams.get("city");
    const limit = parseInt(searchParams.get("limit") || "5");

    if (!query) {
      return NextResponse.json(
        { error: "Query parameter is required" },
        { status: 400 }
      );
    }

    await dbConnect();
    const db = mongoose.connection.db;

    // Build search criteria
    const searchCriteria: any = {
      subdivisionName: {
        $regex: new RegExp(escapeRegex(query), "i")
      }
    };

    if (city) {
      searchCriteria.city = { $regex: new RegExp(`^${escapeRegex(city)}$`, "i") };
    }

    // Search in both active and closed listings
    const [activeDocs, closedDocs] = await Promise.all([
      db!.collection("unifiedlistings")
        .find(searchCriteria)
        .project({ subdivisionName: 1, city: 1 })
        .limit(1000)
        .toArray(),
      db!.collection("unifiedclosedlistings")
        .find(searchCriteria)
        .project({ subdivisionName: 1, city: 1 })
        .limit(1000)
        .toArray()
    ]);

    // Group results manually
    const activeMap = new Map<string, { subdivisionName: string; city: string; count: number }>();
    const closedMap = new Map<string, { subdivisionName: string; city: string; count: number }>();

    activeDocs.forEach((doc: any) => {
      const key = doc.subdivisionName;
      if (!activeMap.has(key)) {
        activeMap.set(key, { subdivisionName: doc.subdivisionName, city: doc.city, count: 0 });
      }
      activeMap.get(key)!.count++;
    });

    closedDocs.forEach((doc: any) => {
      const key = doc.subdivisionName;
      if (!closedMap.has(key)) {
        closedMap.set(key, { subdivisionName: doc.subdivisionName, city: doc.city, count: 0 });
      }
      closedMap.get(key)!.count++;
    });

    const activeMatches = Array.from(activeMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
      .map(m => ({ _id: m.subdivisionName, city: m.city, count: m.count }));

    const closedMatches = Array.from(closedMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
      .map(m => ({ _id: m.subdivisionName, city: m.city, count: m.count }));

    // Combine and deduplicate results
    const matchesMap = new Map<string, any>();

    activeMatches.forEach((match) => {
      const key = `${match._id}-${match.city}`;
      matchesMap.set(key, {
        subdivisionName: match._id,
        city: match.city,
        activeListings: match.count,
        closedSales: 0,
        hasAppreciationData: false
      });
    });

    closedMatches.forEach((match) => {
      const key = `${match._id}-${match.city}`;
      if (matchesMap.has(key)) {
        matchesMap.get(key)!.closedSales = match.count;
        matchesMap.get(key)!.hasAppreciationData = true;
      } else {
        matchesMap.set(key, {
          subdivisionName: match._id,
          city: match.city,
          activeListings: 0,
          closedSales: match.count,
          hasAppreciationData: true
        });
      }
    });

    // Convert to array and sort by relevance
    const matches = Array.from(matchesMap.values())
      .sort((a, b) => {
        // Prioritize subdivisions with both active and closed listings
        const scoreA = (a.activeListings > 0 ? 1 : 0) + (a.closedSales > 0 ? 1 : 0);
        const scoreB = (b.activeListings > 0 ? 1 : 0) + (b.closedSales > 0 ? 1 : 0);

        if (scoreA !== scoreB) return scoreB - scoreA;

        // Then by total volume
        return (b.activeListings + b.closedSales) - (a.activeListings + a.closedSales);
      })
      .slice(0, limit);

    // Calculate match score for each result
    const queryLower = query.toLowerCase();
    const results = matches.map((match) => {
      const nameLower = match.subdivisionName.toLowerCase();

      // Calculate match score (0-100)
      let score = 0;

      // Exact match
      if (nameLower === queryLower) {
        score = 100;
      }
      // Starts with query
      else if (nameLower.startsWith(queryLower)) {
        score = 90;
      }
      // Contains query as whole word
      else if (new RegExp(`\\b${escapeRegex(queryLower)}\\b`).test(nameLower)) {
        score = 80;
      }
      // Contains query
      else if (nameLower.includes(queryLower)) {
        score = 70;
      }
      // Fuzzy match (all words present)
      else {
        const queryWords = queryLower.split(/\s+/);
        const matchedWords = queryWords.filter(word => nameLower.includes(word));
        score = Math.round((matchedWords.length / queryWords.length) * 60);
      }

      return {
        ...match,
        matchScore: score
      };
    }).sort((a, b) => b.matchScore - a.matchScore);

    // Determine best match
    const bestMatch = results.length > 0 ? results[0] : null;

    return NextResponse.json({
      query,
      city: city || null,
      matches: results,
      bestMatch: bestMatch ? {
        subdivisionName: bestMatch.subdivisionName,
        city: bestMatch.city,
        matchScore: bestMatch.matchScore,
        confidence: bestMatch.matchScore >= 80 ? "high" : bestMatch.matchScore >= 60 ? "medium" : "low",
        hasAppreciationData: bestMatch.hasAppreciationData,
        activeListings: bestMatch.activeListings,
        closedSales: bestMatch.closedSales
      } : null,
      totalMatches: results.length
    });

  } catch (error: any) {
    console.error("Subdivision lookup error:", error);
    return NextResponse.json(
      { error: "Failed to lookup subdivision", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
