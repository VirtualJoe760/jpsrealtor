// src/app/api/chat/match-location/route.ts
// AI endpoint to intelligently match user queries to counties, cities, or subdivisions
// Priority: Subdivisions → Cities → Counties

import { NextRequest, NextResponse } from "next/server";
import {
  matchLocation,
  findPotentialMatches,
  locationToSearchParams,
  searchSubdivisionsWithDisambiguation
} from "@/lib/location-matcher";

export async function POST(req: NextRequest) {
  try {
    const { query, returnAll = false, specificChoice = null } = await req.json();

    if (!query) {
      return NextResponse.json(
        { error: "Query is required" },
        { status: 400 }
      );
    }

    // If specificChoice provided, user has already disambiguated
    if (specificChoice) {
      console.log('🎯 User selected specific subdivision:', specificChoice);

      const searchParams = {
        subdivisions: [specificChoice.name],
        city: specificChoice.city
      };

      return NextResponse.json({
        success: true,
        query,
        match: {
          type: 'subdivision',
          name: specificChoice.name,
          city: specificChoice.city,
          confidence: 1.0
        },
        searchParams
      });
    }

    // STEP 1: Quick check if this is an exact city match
    // This prevents "corona" from matching "Corona del Mar" subdivisions
    const exactCityMatch = await matchLocation(query);
    if (exactCityMatch && exactCityMatch.type === 'city' && exactCityMatch.confidence === 1.0) {
      console.log('✅ Exact CITY match found, skipping subdivision search:', exactCityMatch.name);

      const searchParams = locationToSearchParams(exactCityMatch);

      return NextResponse.json({
        success: true,
        query,
        match: {
          type: exactCityMatch.type,
          name: exactCityMatch.name,
          confidence: exactCityMatch.confidence
        },
        searchParams
      });
    }

    // STEP 2: Check subdivisions (with disambiguation)
    const subdivisionResult = await searchSubdivisionsWithDisambiguation(query);

    if (subdivisionResult.needsDisambiguation) {
      // Multiple matching subdivisions - ask user to clarify
      console.log('🤔 Disambiguation needed:', subdivisionResult.matches.length, 'options');

      return NextResponse.json({
        success: false,
        query,
        needsDisambiguation: true,
        message: `I found ${subdivisionResult.matches.length} communities with that name. Which one?`,
        options: subdivisionResult.matches.map(m => ({
          name: m.name,
          city: m.city,
          slug: m.slug,
          listingCount: m.listingCount,
          type: m.type,
          displayName: `${m.name} (${m.city})${m.listingCount ? ` - ${m.listingCount} homes` : ''}`
        }))
      });
    }

    if (subdivisionResult.singleMatch) {
      // Clear subdivision match
      const match = subdivisionResult.singleMatch;
      const searchParams = locationToSearchParams(match);

      console.log('✅ Matched to subdivision:', match.name);

      return NextResponse.json({
        success: true,
        query,
        match: {
          type: match.type,
          name: match.name,
          city: match.city,
          confidence: match.confidence
        },
        searchParams
      });
    }

    // If returnAll is true, return all potential matches ranked by confidence
    if (returnAll) {
      const matches = await findPotentialMatches(query);

      return NextResponse.json({
        success: true,
        query,
        matches: matches.map(m => ({
          type: m.type,
          name: m.name,
          confidence: m.confidence,
          searchParams: locationToSearchParams(m)
        }))
      });
    }

    // STEP 3: No subdivision match - try city or county (partial matches)
    const match = await matchLocation(query);

    if (!match) {
      // No confident match - get potential alternatives
      const potentialMatches = await findPotentialMatches(query);

      if (potentialMatches.length > 0) {
        // Return suggestions for user to clarify
        return NextResponse.json({
          success: false,
          query,
          message: "I couldn't find an exact match for that location. Did you mean one of these?",
          suggestions: potentialMatches.slice(0, 3).map(m => ({
            name: m.name,
            type: m.type,
            confidence: m.confidence
          }))
        });
      }

      return NextResponse.json({
        success: false,
        query,
        message: "No matching location found",
        suggestion: "Try searching by city name (e.g., Palm Springs) or subdivision name"
      });
    }

    // Convert match to search parameters
    const searchParams = locationToSearchParams(match);

    // Add county limit indicator
    const isCounty = match.type === 'county';
    const limitApplied = isCounty && searchParams.limit === 100;

    return NextResponse.json({
      success: true,
      query,
      match: {
        type: match.type,
        name: match.name,
        confidence: match.confidence
      },
      searchParams,
      limitApplied, // Indicates if 100-result limit was applied
    });
  } catch (error) {
    console.error("Location matching error:", error);
    return NextResponse.json(
      { error: "Failed to match location" },
      { status: 500 }
    );
  }
}
