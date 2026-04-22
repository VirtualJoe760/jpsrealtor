// src/app/api/listings/featured/route.ts
// API endpoint to fetch Obsidian Group featured listings for theme transitions

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import UnifiedListing from '@/models/unified-listing';

export const dynamic = 'force-dynamic';

/**
 * GET /api/listings/featured
 * Returns active RESIDENTIAL SALE listings from the Obsidian Group team only.
 * Used for theme transition property showcases.
 */
export async function GET() {
  try {
    await dbConnect();

    // Query for Obsidian Group / Joseph Sardella team listings ONLY
    // Restricted to residential sales with photos
    const listings = await UnifiedListing.find({
      $and: [
        {
          $or: [
            { coListAgentName: /obsidian/i },
            { coListAgentMarketingName: /obsidian/i },
            { listAgentName: /joseph.*sardella/i },
            { listAgentName: /sardella/i },
          ]
        },
        { standardStatus: 'Active' },
        { propertyType: 'A' }, // Residential sale only (not rental, land, commercial)
        { propertySubType: { $nin: ['Co-Ownership', 'Timeshare', 'Stock Cooperative'] } },
        { 'photos.0': { $exists: true } }, // Must have at least one photo
        { listPrice: { $gt: 100000 } }, // Filter out placeholder/junk listings
      ]
    })
      .select('listingKey address city listPrice photos unparsedAddress bedsTotal bathroomsTotalInteger livingArea')
      .sort({ listPrice: -1 }) // Show highest value properties first
      .limit(15)
      .lean();

    // Transform to clean format
    const featured = listings.map((listing: any) => {
      const primaryPhoto = listing.photos?.find((p: any) => p.primary) || listing.photos?.[0];

      return {
        listingKey: listing.listingKey,
        address: listing.unparsedAddress || listing.address,
        city: listing.city,
        price: listing.listPrice,
        beds: listing.bedsTotal,
        baths: listing.bathroomsTotalInteger,
        sqft: listing.livingArea,
        photoUrl: primaryPhoto?.uri1600 || primaryPhoto?.uri1280 || primaryPhoto?.uri1024 || primaryPhoto?.uriLarge,
      };
    }).filter(l => l.photoUrl); // Only include listings with valid photos

    return NextResponse.json({
      success: true,
      count: featured.length,
      listings: featured,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    });
  } catch (error: any) {
    console.error('Error fetching featured listings:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch featured listings',
      listings: [],
    }, { status: 500 });
  }
}
