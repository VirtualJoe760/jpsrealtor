/**
 * Property Enrichment API
 *
 * POST /api/crm/contacts/enrich
 * Body: { address: { street, city, state, zip } }
 *
 * Returns property data from MLS database:
 * - Geocoded coordinates (lat/lng)
 * - Property characteristics (beds, baths, sqft, year built, etc.)
 * - Last sale price and date (if available)
 *
 * Search strategy:
 * 1. Try exact address match in active listings
 * 2. Fall back to closed listings (historical sales)
 * 3. Fall back to nearest property within 0.1 miles
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import { geocodeAddress } from '@/lib/geocoding';
import UnifiedListing from '@/models/unified-listing';
import UnifiedClosedListing from '@/models/unified-closed-listing';

interface Address {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { address }: { address: Address } = await request.json();

    // Validate address
    if (!address?.street || !address?.city || !address?.state) {
      return NextResponse.json(
        {
          success: false,
          error: 'Address required (street, city, and state are mandatory)',
        },
        { status: 400 }
      );
    }

    // Step 1: Geocode address to get lat/lng
    console.log('[Property Enrichment] ========================================');
    console.log('[Property Enrichment] Geocoding address:', address);

    const geocode = await geocodeAddress(address);

    if (!geocode) {
      console.log('[Property Enrichment] Geocoding failed');
      return NextResponse.json(
        {
          success: false,
          error: 'Could not geocode address. Please verify the address is correct.',
        },
        { status: 404 }
      );
    }

    console.log('[Property Enrichment] Geocoded to:', geocode);

    await dbConnect();

    // Step 2: Try exact address match in active listings
    console.log('[Property Enrichment] Searching active listings...');

    const streetNumber = extractStreetNumber(address.street || '');
    const streetName = extractStreetName(address.street || '');

    let property = await UnifiedListing.findOne({
      $or: [
        // Try unparsed address match
        { unparsedAddress: { $regex: new RegExp(address.street || '', 'i') } },
        // Try structured address match
        {
          streetNumber: streetNumber,
          streetName: { $regex: new RegExp(streetName, 'i') },
          city: { $regex: new RegExp(address.city || '', 'i') },
        },
      ],
    })
      .select({
        bedsTotal: 1,
        bathroomsTotalDecimal: 1,
        bathroomsFull: 1,
        livingArea: 1,
        yearBuilt: 1,
        propertyType: 1,
        lotSizeAcres: 1,
        poolYN: 1,
        listPrice: 1,
        unparsedAddress: 1,
      })
      .lean();

    let source = 'unified_listings';

    // Step 3: If not found, try closed listings (historical sales)
    if (!property) {
      console.log('[Property Enrichment] Not found in active listings, searching closed listings...');

      property = await UnifiedClosedListing.findOne({
        $or: [
          { unparsedAddress: { $regex: new RegExp(address.street || '', 'i') } },
          {
            streetNumber: streetNumber,
            streetName: { $regex: new RegExp(streetName, 'i') },
            city: { $regex: new RegExp(address.city || '', 'i') },
          },
        ],
      })
        .sort({ closeDate: -1 }) // Most recent sale
        .select({
          bedsTotal: 1,
          bathroomsTotalDecimal: 1,
          bathroomsFull: 1,
          livingArea: 1,
          yearBuilt: 1,
          propertyType: 1,
          lotSizeAcres: 1,
          poolYN: 1,
          closePrice: 1,
          closeDate: 1,
          unparsedAddress: 1,
        })
        .lean();

      source = 'unified_closed_listings';
    }

    // Step 4: If still not found, use nearest property within 0.1 miles (~528 feet)
    if (!property) {
      console.log('[Property Enrichment] Not found by address, searching nearby properties...');

      // Calculate bounding box for ~0.1 miles
      const latDelta = 0.1 / 69; // 1 degree ≈ 69 miles
      const lngDelta = 0.1 / (69 * Math.cos((geocode.lat * Math.PI) / 180));

      const nearbyListings = await UnifiedListing.find({
        latitude: { $gte: geocode.lat - latDelta, $lte: geocode.lat + latDelta },
        longitude: { $gte: geocode.lng - lngDelta, $lte: geocode.lng + lngDelta },
      })
        .limit(1)
        .select({
          bedsTotal: 1,
          bathroomsTotalDecimal: 1,
          bathroomsFull: 1,
          livingArea: 1,
          yearBuilt: 1,
          propertyType: 1,
          lotSizeAcres: 1,
          poolYN: 1,
          listPrice: 1,
          unparsedAddress: 1,
          latitude: 1,
          longitude: 1,
        })
        .lean();

      if (nearbyListings.length > 0) {
        property = nearbyListings[0];
        source = 'unified_listings_nearby';
        console.log('[Property Enrichment] Found nearby property:', property.unparsedAddress);
      }
    }

    // Step 5: No property data found
    if (!property) {
      console.log('[Property Enrichment] No property data found in any source');
      return NextResponse.json({
        success: true,
        geocode: {
          lat: geocode.lat,
          lng: geocode.lng,
          formattedAddress: geocode.formattedAddress,
        },
        property: null,
        source: 'none',
        message: 'Coordinates found, but no property data available in MLS database.',
      });
    }

    // Step 6: Format and return property data
    const enrichedData = {
      bedrooms: property.bedsTotal || null,
      bathrooms: property.bathroomsTotalDecimal || property.bathroomsFull || null,
      sqft: property.livingArea || null,
      yearBuilt: property.yearBuilt || null,
      propertyType: property.propertyType || null,
      lotSize: property.lotSizeAcres ? `${property.lotSizeAcres} acres` : null,
      pool: property.poolYn || false,
      purchasePrice: (property as any).closePrice || (property as any).listPrice || null,
      purchaseDate: (property as any).closeDate || null,
      matchedAddress: property.unparsedAddress || null,
    };

    console.log('[Property Enrichment] Successfully enriched property data:', enrichedData);
    console.log('[Property Enrichment] Data source:', source);
    console.log('[Property Enrichment] ========================================');

    return NextResponse.json({
      success: true,
      geocode: {
        lat: geocode.lat,
        lng: geocode.lng,
        formattedAddress: geocode.formattedAddress,
      },
      property: enrichedData,
      source,
    });
  } catch (error: any) {
    console.error('[Property Enrichment] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * Extract street number from full street address
 * Example: "50860 Calle Paloma" -> "50860"
 */
function extractStreetNumber(street: string): string {
  const match = street.match(/^\d+/);
  return match ? match[0] : '';
}

/**
 * Extract street name from full street address
 * Example: "50860 Calle Paloma" -> "Calle Paloma"
 */
function extractStreetName(street: string): string {
  return street.replace(/^\d+\s*/, '').trim();
}
