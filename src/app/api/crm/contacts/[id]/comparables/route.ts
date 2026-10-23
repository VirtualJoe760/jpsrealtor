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
import Contact from '@/models/Contact';
import mongoose from 'mongoose';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return NextResponse.json({ success: false, error: 'Invalid contact ID' }, { status: 400 });
    await dbConnect();
    // The route is contact-scoped: sign-in alone must not authorize another agent's ID.
    const contact = await Contact.findOne({ _id: id, userId: session.user.id }).select('latitude longitude lat lng long').lean();
    if (!contact) return NextResponse.json({ success: false, error: 'Contact not found' }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const latitude = Number(searchParams.get('latitude') ?? contact.latitude ?? contact.lat ?? NaN);
    const longitude = Number(searchParams.get('longitude') ?? contact.longitude ?? contact.lng ?? contact.long ?? NaN);
    const radius = parseFloat(searchParams.get('radius') || '0.5'); // Default 0.5 miles
    const limit = Number(searchParams.get('limit') || '10');
    const days = searchParams.has('days') ? Number(searchParams.get('days')) : null;
    if (!Number.isFinite(radius) || radius <= 0 || radius > 5 || !Number.isInteger(limit) || limit < 1 || limit > 25 || (days !== null && (!Number.isInteger(days) || days < 1 || days > 1825))) {
      return NextResponse.json({ success: false, error: 'Invalid radius, limit, or date window' }, { status: 400 });
    }

    // Subject property characteristics for "like kind" filtering
    const subjectBedrooms = searchParams.get('bedrooms') ? parseInt(searchParams.get('bedrooms')!) : null;
    const subjectBathrooms = searchParams.get('bathrooms') ? parseFloat(searchParams.get('bathrooms')!) : null;
    const subjectSqft = searchParams.get('sqft') ? parseInt(searchParams.get('sqft')!) : null;
    const subjectPropertyType = searchParams.get('propertyType') || null;
    const subjectHasPool = searchParams.get('hasPool') === 'true';

    // Validate coordinates
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) >= 90 || Math.abs(longitude) > 180) {
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
      closeDate: days === null ? { $exists: true } : { $gte: new Date(Date.now() - days * 86400000), $lte: new Date() },
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

    if ([subjectBedrooms, subjectBathrooms, subjectSqft].some(value => value !== null && (!Number.isFinite(value) || value < 0))) {
      return NextResponse.json({ success: false, error: 'Invalid property characteristics' }, { status: 400 });
    }

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
        externalPhotos: 1,
        primaryPhotoUrl: 1,
        media: 1,
        publicRemarks: 1,
        listingId: 1,
        mlsSource: 1,
        standardStatus: 1,
        status: 1,
      })
      .lean();

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
    const finalComparables = comparablesWithDistance.filter(comp => calculateDistance(latitude, longitude, comp.latitude, comp.longitude) <= radius).slice(0, limit);

    return NextResponse.json({
      success: true,
      comparables: finalComparables,
      count: finalComparables.length,
      totalFound: comparablesWithDistance.length,
      radius,
      center: { latitude, longitude },
      days,
      filters: {
        bedrooms: subjectBedrooms,
        bathrooms: subjectBathrooms,
        sqft: subjectSqft,
        propertyType: subjectPropertyType,
        hasPool: subjectHasPool,
      },
    }, { headers: { 'Cache-Control': 'no-store' } });
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
