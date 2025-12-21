import { NextResponse } from "next/server";

const OPENCAGE_API_KEY = process.env.OPENCAGE_API_KEY;
const OPENCAGE_URL = "https://api.opencagedata.com/geocode/v1/json";

/**
 * Geocoding API - Converts location names to coordinates
 *
 * Only called when clicking a search suggestion without coordinates.
 * Not used during autocomplete to keep search fast.
 *
 * Usage: GET /api/geocode?q=Palm Springs, CA
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";

    if (!q || q.length < 2) {
      return NextResponse.json({
        success: false,
        error: "Query too short"
      });
    }

    if (!OPENCAGE_API_KEY) {
      console.error("[Geocode API] Missing OPENCAGE_API_KEY");
      return NextResponse.json({
        success: false,
        error: "Geocoding not configured"
      });
    }

    // Call OpenCage Geocoding API
    const res = await fetch(
      `${OPENCAGE_URL}?q=${encodeURIComponent(q)}&key=${OPENCAGE_API_KEY}&limit=1&countrycode=us`
    );

    if (!res.ok) {
      console.error("[Geocode API] OpenCage error:", res.status);
      return NextResponse.json({
        success: false,
        error: "Geocoding service error"
      });
    }

    const data = await res.json();
    const result = data?.results?.[0];

    if (!result?.geometry?.lat || !result?.geometry?.lng) {
      return NextResponse.json({
        success: false,
        error: "No coordinates found"
      });
    }

    // Only return California results
    const state = result?.components?.state;
    if (state !== "California") {
      return NextResponse.json({
        success: false,
        error: "Location not in California"
      });
    }

    return NextResponse.json({
      success: true,
      result: {
        label: result.formatted,
        latitude: result.geometry.lat,
        longitude: result.geometry.lng,
        city: result.components?.city || result.components?.town || result.components?.village,
        state: result.components?.state,
        county: result.components?.county,
      }
    });
  } catch (error) {
    console.error("[Geocode API] Error:", error);
    return NextResponse.json({
      success: false,
      error: "Internal server error"
    });
  }
}
