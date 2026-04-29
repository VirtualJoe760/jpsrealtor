// src/app/api/listings/featured/route.ts
// API endpoint to fetch Obsidian Group featured listings for theme transitions

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import UnifiedListing from '@/models/unified-listing';

// Cache for 1 hour — team listings don't change frequently
export const revalidate = 3600;

/**
 * GET /api/listings/featured
 * Returns active RESIDENTIAL SALE listings from the Obsidian Group team only.
 * Used for theme transition property showcases.
 */
export async function GET() {
  try {
    await dbConnect();

    // Query for Obsidian Group / Joseph Sardella team listings ONLY
    // Uses listAgentKey for fast indexed lookup instead of regex on name
    const AGENT_KEY = '20200107210308238447000000'; // Joseph Sardella's agent key

    const listings = await UnifiedListing.find({
      standardStatus: 'Active',
      propertyType: 'A',
      listPrice: { $gt: 100000 },
      $or: [
        { listAgentKey: AGENT_KEY },
        { coListAgentKey: AGENT_KEY },
      ],
    })
      .select('listingKey address city listPrice photos unparsedAddress bedsTotal bathroomsTotalInteger livingArea propertySubType')
      .sort({ listPrice: -1 })
      .limit(20)
      .lean()
      .then(results => results.filter((l: any) =>
        // Post-filter: exclude co-ownership/timeshares, require photos
        !['Co-Ownership', 'Timeshare'].includes(l.propertySubType) &&
        l.photos?.length > 0
      ).slice(0, 15));

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
