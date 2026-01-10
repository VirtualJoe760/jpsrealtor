/**
 * Contact Comparables API
 *
 * Fetches recently closed properties near a contact's location
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import UnifiedClosedListing from '@/models/unified-closed-listing';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const latitude = parseFloat(searchParams.get('latitude') || '0');
    const longitude = parseFloat(searchParams.get('longitude') || '0');
    const radius = parseFloat(searchParams.get('radius') || '0.5'); // Default 0.5 miles
    const limit = parseInt(searchParams.get('limit') || '10');

    // Subject property characteristics for "like kind" filtering
    const subjectBedrooms = searchParams.get('bedrooms') ? parseInt(searchParams.get('bedrooms')!) : null;
    const subjectBathrooms = searchParams.get('bathrooms') ? parseFloat(searchParams.get('bathrooms')!) : null;
    const subjectSqft = searchParams.get('sqft') ? parseInt(searchParams.get('sqft')!) : null;
    const subjectPropertyType = searchParams.get('propertyType') || null;
    const subjectHasPool = searchParams.get('hasPool') === 'true';

    // Validate coordinates
    if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
      return NextResponse.json(
        { success: false, error: 'Invalid coordinates' },
        { status: 400 }
      );
    }

    // Calculate bounding box (approximate, 1 degree ≈ 69 miles)
    const latDelta = radius / 69;
    const lngDelta = radius / (69 * Math.cos((latitude * Math.PI) / 180));

    const bounds = {
      north: latitude + latDelta,
      south: latitude - latDelta,
      east: longitude + lngDelta,
      west: longitude - lngDelta,
    };

    // Build query with "like kind" filters
    const query: any = {
      latitude: { $gte: bounds.south, $lte: bounds.north },
      longitude: { $gte: bounds.west, $lte: bounds.east },
      closeDate: { $exists: true },
      // Exclude leases/rentals - only show actual sales
      // Using string pattern instead of regex object for MongoDB compatibility
      $and: [
        {
          $or: [
            { standardStatus: { $exists: false } },
            { standardStatus: { $not: /lease|rent/i } }
          ]
        },
        {
          $or: [
            { status: { $exists: false } },
            { status: { $not: /lease|rent/i } }
          ]
        },
        {
          $or: [
            { propertySubType: { $exists: false } },
            { propertySubType: { $not: /lease|rent/i } }
          ]
        }
      ],
      // Additional filter: exclude suspiciously low prices (likely monthly lease amounts)
      closePrice: { $gte: 50000 } // Minimum $50k to exclude lease amounts
    };

    // Filter by bedrooms (exact match)
    if (subjectBedrooms !== null) {
      query.bedsTotal = subjectBedrooms;
    }

    // Filter by bathrooms (same or more)
    if (subjectBathrooms !== null) {
      query.$or = [
        { bathroomsTotalDecimal: { $gte: subjectBathrooms } },
        { bathroomsFull: { $gte: subjectBathrooms } }
      ];
    }

    // Filter by sqft (within ±250 sqft)
    if (subjectSqft !== null) {
      query.livingArea = {
        $gte: subjectSqft - 250,
        $lte: subjectSqft + 250
      };
    }

    // Filter by property type (exact match)
    if (subjectPropertyType) {
      query.propertyType = subjectPropertyType;
    }

    // Filter by pool (if subject has pool, comp must have pool)
    if (subjectHasPool) {
      query.poolYN = true;
    }

    console.log('[Comparables API] ========================================');
    console.log('[Comparables API] Executing query with filters:', {
      bedrooms: subjectBedrooms,
      bathrooms: subjectBathrooms,
      sqft: subjectSqft,
      propertyType: subjectPropertyType,
      hasPool: subjectHasPool,
      excludingLeases: true,
      bounds
    });
    console.log('[Comparables API] Full MongoDB query:', JSON.stringify(query, null, 2));

    // Query closed listings within bounds, sorted by close date (most recent first)
    const comparables = await UnifiedClosedListing.find(query)
      .sort({ closeDate: -1 })
      .limit(limit * 2) // Fetch more to account for filtering
      .select({
        listingKey: 1,
        unparsedAddress: 1,
        streetNumber: 1,
        streetName: 1,
        city: 1,
        stateOrProvince: 1,
        postalCode: 1,
        latitude: 1,
        longitude: 1,
        closePrice: 1,
        closeDate: 1,
        bedsTotal: 1,
        bathroomsFull: 1,
        bathroomsTotalDecimal: 1,
        livingArea: 1,
        yearBuilt: 1,
        propertyType: 1,
        propertySubType: 1,
        lotSizeAcres: 1,
        poolYN: 1,
        photos: 1,
        mlsSource: 1,
        standardStatus: 1,
        status: 1,
      })
      .lean();

    console.log('[Comparables API] Found', comparables.length, 'listings');

    // Log each comparable with its status and price
    comparables.forEach((comp: any, idx: number) => {
      const address = comp.unparsedAddress || `${comp.streetNumber} ${comp.streetName}`;
      const isLease = (comp.standardStatus || comp.status || comp.propertySubType || '').toLowerCase().match(/lease|rent/);
      console.log(`[Comparables API] [${idx + 1}] ${address}`);
      console.log(`  - Close Price: $${comp.closePrice?.toLocaleString() || 'N/A'}`);
      console.log(`  - Close Date: ${comp.closeDate}`);
      console.log(`  - Status: "${comp.status || 'N/A'}"`);
      console.log(`  - Standard Status: "${comp.standardStatus || 'N/A'}"`);
      console.log(`  - Property Sub Type: "${comp.propertySubType || 'N/A'}"`);
      console.log(`  - Is Lease?: ${isLease ? 'YES ⚠️' : 'NO ✓'}`);
    });
    console.log('[Comparables API] ========================================');

    // Calculate distance for each comparable
    const comparablesWithDistance = comparables.map((comp: any) => {
      const distance = calculateDistance(
        latitude,
        longitude,
        comp.latitude,
        comp.longitude
      );

      return {
        ...comp,
        distance: Math.round(distance * 100) / 100, // Round to 2 decimals
        address: comp.unparsedAddress ||
          `${comp.streetNumber || ''} ${comp.streetName || ''}, ${comp.city || ''}, ${comp.stateOrProvince || ''} ${comp.postalCode || ''}`.trim(),
      };
    });

    // Sort by distance and limit to requested count
    comparablesWithDistance.sort((a, b) => a.distance - b.distance);
    const finalComparables = comparablesWithDistance.slice(0, limit);

    return NextResponse.json({
      success: true,
      comparables: finalComparables,
      count: finalComparables.length,
      totalFound: comparablesWithDistance.length,
      radius,
      center: { latitude, longitude },
      filters: {
        bedrooms: subjectBedrooms,
        bathrooms: subjectBathrooms,
        sqft: subjectSqft,
        propertyType: subjectPropertyType,
        hasPool: subjectHasPool,
      },
    });
  } catch (error: any) {
    console.error('[Comparables API] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}
