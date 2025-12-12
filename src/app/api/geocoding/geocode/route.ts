/**
 * Geocoding API Endpoint
 *
 * Provides real-time geocoding for addresses.
 *
 * @example
 * POST /api/geocoding/geocode
 * {
 *   "address": "561 West Maple Avenue",
 *   "city": "Orange",
 *   "state": "CA",
 *   "zip": "92868"
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { geocodeAddress } from '@/lib/geocoding/geocode-service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { address, city, state, zip } = body;

    if (!address) {
      return NextResponse.json(
        {
          success: false,
          error: 'Address is required',
        },
        { status: 400 }
      );
    }

    const result = await geocodeAddress(address, city, state, zip);

    if (result) {
      return NextResponse.json({
        success: true,
        latitude: result.latitude,
        longitude: result.longitude,
        confidence: result.confidence,
        source: result.source,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Could not geocode address',
        },
        { status: 404 }
      );
    }
  } catch (error: any) {
    console.error('Geocoding API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}
