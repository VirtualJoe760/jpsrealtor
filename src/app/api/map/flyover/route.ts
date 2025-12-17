// src/app/api/map/flyover/route.ts
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/map/flyover
 *
 * Handles map flyover animation requests from MapSearchBar autocomplete.
 * Accepts location data and returns flyover parameters.
 *
 * Request body:
 * {
 *   name: string;          // Location name (e.g., "Palm Desert")
 *   type: string;          // Type: city, subdivision, county, address
 *   lat: number;           // Latitude
 *   lng: number;           // Longitude
 *   city?: string;         // City name (optional)
 *   state?: string;        // State code (optional)
 * }
 *
 * Response:
 * {
 *   success: boolean;
 *   flyover: {
 *     lat: number;
 *     lng: number;
 *     zoom: number;
 *     bounds: string;      // URL bounds parameter
 *   }
 * }
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, type, lat, lng, city, state } = body;

    console.log('🗺️ [Flyover API] Request received:', { name, type, lat, lng });

    // Validate required fields
    if (!name || !type || lat === undefined || lng === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: name, type, lat, lng' },
        { status: 400 }
      );
    }

    // Validate coordinates
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return NextResponse.json(
        { success: false, error: 'Invalid coordinates - must be numbers' },
        { status: 400 }
      );
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json(
        { success: false, error: 'Coordinates out of valid range' },
        { status: 400 }
      );
    }

    // Determine zoom level based on location type
    const zoomLevel = type === 'subdivision' ? 13 :
                     type === 'city' ? 11 :
                     type === 'county' ? 9 :
                     type === 'address' ? 15 : 12;

    console.log('🗺️ [Flyover API] Calculated zoom level:', zoomLevel, 'for type:', type);

    // Calculate bounds for URL (approximate)
    // This creates a bounding box around the center point
    const latDelta = type === 'subdivision' ? 0.05 :
                    type === 'city' ? 0.15 :
                    type === 'county' ? 0.5 :
                    type === 'address' ? 0.01 : 0.1;

    const lngDelta = latDelta * 1.2; // Adjust for aspect ratio

    const bounds = `${(lat - latDelta).toFixed(6)},${(lng - lngDelta).toFixed(6)},${(lat + latDelta).toFixed(6)},${(lng + lngDelta).toFixed(6)}`;

    console.log('🗺️ [Flyover API] Generated bounds:', bounds);

    // Prepare response
    const flyover = {
      lat,
      lng,
      zoom: zoomLevel,
      bounds,
      name,
      type,
      city,
      state,
    };

    console.log('🗺️ [Flyover API] Success - returning flyover params:', flyover);

    return NextResponse.json({
      success: true,
      flyover,
    });

  } catch (error) {
    console.error('❌ [Flyover API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
