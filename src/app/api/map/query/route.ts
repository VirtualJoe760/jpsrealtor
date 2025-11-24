// src/app/api/map/query/route.ts
// Real-time map query endpoint with bounding box search

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Listing } from '@/models/listings';
import {
  buildMapQuery,
  validateBoundingBox,
  type MapFilters
} from '@/app/utils/mls/filterListingsServerSide';
import {
  normalizeListings,
  type NormalizedListing
} from '@/app/utils/mls/normalizeListing';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface QueryRequest {
  bounds: {
    west: number;
    south: number;
    east: number;
    north: number;
  };
  filters?: MapFilters;
  limit?: number;
}

/**
 * POST /api/map/query
 *
 * Queries active listings within map viewport with optional filters
 *
 * Request Body:
 * {
 *   bounds: { west, south, east, north },
 *   filters?: { minPrice, maxPrice, beds, baths, ... },
 *   limit?: number (default 1000)
 * }
 *
 * Response:
 * {
 *   success: true,
 *   listings: NormalizedListing[],
 *   count: number,
 *   source: 'realtime',
 *   timestamp: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body: QueryRequest = await request.json();
    const { bounds, filters = {}, limit = 1000 } = body;

    // Validate required parameters
    if (!bounds || typeof bounds.west !== 'number' || typeof bounds.south !== 'number' ||
        typeof bounds.east !== 'number' || typeof bounds.north !== 'number') {
      return NextResponse.json(
        { success: false, error: 'Invalid bounds parameter' },
        { status: 400 }
      );
    }

    // Validate bounding box size
    if (!validateBoundingBox(bounds)) {
      return NextResponse.json(
        { success: false, error: 'Bounding box too large (max ~500 miles)' },
        { status: 400 }
      );
    }

    // Connect to MongoDB
    await dbConnect();

    // Build MongoDB query combining filters + bounding box
    const query = buildMapQuery(filters, bounds);

    // Determine which collections to query based on mlsSource filter
    const mlsSource = filters.mlsSource || 'ALL';

    let gpsListings: any[] = [];
    let crmlsListings: any[] = [];

    // Query GPS collection
    if (mlsSource === 'GPS' || mlsSource === 'ALL') {
      gpsListings = await Listing.find(query)
        .select('listingKey listingId slug listPrice city bedroomsTotal bedsTotal bathroomsTotalDecimal bathroomsTotalInteger propertyType propertySubType livingArea poolYn spaYn associationFee unparsedAddress address latitude longitude')
        .limit(limit)
        .lean()
        .exec();
    }

    // Query CRMLS collection
    if (mlsSource === 'CRMLS' || mlsSource === 'ALL') {
      const crmlsModel = Listing.db.collection('crmls_listings');
      crmlsListings = await crmlsModel
        .find(query)
        .project({
          listingKey: 1,
          listingId: 1,
          slug: 1,
          listPrice: 1,
          city: 1,
          bedroomsTotal: 1,
          bedsTotal: 1,
          bathroomsTotalDecimal: 1,
          bathroomsTotalInteger: 1,
          propertyType: 1,
          propertySubType: 1,
          livingArea: 1,
          poolYn: 1,
          spaYn: 1,
          associationFee: 1,
          unparsedAddress: 1,
          address: 1,
          latitude: 1,
          longitude: 1
        })
        .limit(limit)
        .toArray();
    }

    // Normalize and merge results
    const normalizedListings = normalizeListings(gpsListings, crmlsListings);

    // Apply limit after merging (in case both sources returned results)
    const finalListings = normalizedListings.slice(0, limit);

    return NextResponse.json({
      success: true,
      listings: finalListings,
      count: finalListings.length,
      source: 'realtime',
      timestamp: new Date().toISOString(),
      debug: {
        gpsCount: gpsListings.length,
        crmlsCount: crmlsListings.length,
        mergedCount: normalizedListings.length,
        finalCount: finalListings.length
      }
    });

  } catch (error) {
    console.error('❌ Error in /api/map/query:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/map/query (for testing/debugging)
 *
 * Simple test endpoint - queries all active listings in default bounds
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // Default to Palm Desert area for testing
  const defaultBounds = {
    west: parseFloat(searchParams.get('west') || '-116.5'),
    south: parseFloat(searchParams.get('south') || '33.5'),
    east: parseFloat(searchParams.get('east') || '-116.0'),
    north: parseFloat(searchParams.get('north') || '34.0')
  };

  const limit = parseInt(searchParams.get('limit') || '100', 10);

  try {
    await dbConnect();

    const query = buildMapQuery({}, defaultBounds);

    const gpsListings = await Listing.find(query)
      .select('listingKey listPrice city beds baths latitude longitude')
      .limit(limit)
      .lean()
      .exec();

    return NextResponse.json({
      success: true,
      listings: gpsListings,
      count: gpsListings.length,
      bounds: defaultBounds,
      message: 'Test query successful (GPS only)'
    });

  } catch (error) {
    console.error('❌ Error in GET /api/map/query:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
