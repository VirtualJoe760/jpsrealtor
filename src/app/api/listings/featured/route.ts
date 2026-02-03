// src/app/api/listings/featured/route.ts
// API endpoint to fetch Obsidian Group featured listings

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import UnifiedListing from '@/models/unified-listing';

export const dynamic = 'force-dynamic';

/**
 * GET /api/listings/featured
 * Returns active listings from Obsidian Group team members
 */
export async function GET() {
  try {
    await dbConnect();

    // Query for Obsidian Group listings
    // Co-listing agent is "The Obsidian Group"
    const listings = await UnifiedListing.find({
      $and: [
        {
          $or: [
            { coListAgentName: /obsidian/i },
            { coListAgentMarketingName: /obsidian/i },
            { listAgentName: /joseph.*sardella/i },
            { listOfficeName: /exp.*realty/i } // Also include all eXp listings as fallback
          ]
        },
        { standardStatus: 'Active' },
        { 'photos.0': { $exists: true } }, // Must have at least one photo
      ]
    })
      .select('listingKey address city listPrice photos unparsedAddress publicRemarks bedsTotal bathroomsTotal livingArea')
      .sort({ modificationTimestamp: -1 })
      .limit(20) // Get up to 20 listings
      .lean();

    // Transform data to return clean photo URLs
    const featured = listings.map((listing: any) => {
      // Get primary photo or first photo
      const primaryPhoto = listing.photos?.find((p: any) => p.primary) || listing.photos?.[0];

      return {
        listingKey: listing.listingKey,
        address: listing.unparsedAddress || listing.address,
        city: listing.city,
        price: listing.listPrice,
        beds: listing.bedsTotal,
        baths: listing.bathroomsTotal,
        sqft: listing.livingArea,
        description: listing.publicRemarks?.substring(0, 200) + '...',
        // Use highest quality available
        photoUrl: primaryPhoto?.uri1600 || primaryPhoto?.uri1280 || primaryPhoto?.uri1024 || primaryPhoto?.uriLarge,
      };
    });

    return NextResponse.json({
      success: true,
      count: featured.length,
      listings: featured,
    });
  } catch (error: any) {
    console.error('Error fetching featured listings:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch featured listings',
      },
      { status: 500 }
    );
  }
}
