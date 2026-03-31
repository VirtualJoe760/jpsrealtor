import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import Subdivision from "@/models/subdivisions";
import UnifiedListing from "@/models/unified-listing";
import { normalizeSubdivisionName, getCityFromNonHOA } from "@/app/utils/subdivisionUtils";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    // Get query parameter for specific community
    const { searchParams } = new URL(req.url);
    const requestedCommunity = searchParams.get('community');

    // Get user's swipe analytics and liked listings
    const user = await User.findOne({ email: session.user.email }).select('swipeAnalytics likedListings');

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get top subdivision or city from analytics
    const topSubdivisions = user.swipeAnalytics?.topSubdivisions || [];
    const topCities = user.swipeAnalytics?.topCities || [];

    console.log(`[COMMUNITY SPOTLIGHT] ${user.likedListings?.length || 0} liked listings, ${topSubdivisions.length} subdivisions, ${topCities.length} cities`);

    // If no analytics, return empty
    if (topSubdivisions.length === 0 && topCities.length === 0) {
      return NextResponse.json({
        community: null,
        allCommunities: [],
        listings: [],
      });
    }

    // Build list of top 5 communities (subdivisions first, then cities)
    const allCommunities: Array<{ name: string; type: 'subdivision' | 'city' }> = [];

    topSubdivisions.slice(0, 5).forEach((sub: any) => {
      allCommunities.push({ name: sub.name, type: 'subdivision' });
    });

    if (allCommunities.length < 5) {
      const remaining = 5 - allCommunities.length;
      topCities.slice(0, remaining).forEach((city: any) => {
        allCommunities.push({ name: city.name, type: 'city' });
      });
    }

    let communityType: 'subdivision' | 'city' = 'subdivision';
    let communityName: string;
    let communityMetadata: any = null;
    let citySlug: string | null = null;
    let subdivisionSlug: string | null = null;

    // Determine which community to show
    if (requestedCommunity) {
      // Use the requested community
      communityName = requestedCommunity;
      // Determine type by checking if it's in subdivisions or cities
      const isSubdivision = topSubdivisions.some((s: any) => s.name === requestedCommunity);
      communityType = isSubdivision ? 'subdivision' : 'city';
    } else {
      // Default to first in list
      communityName = allCommunities[0]?.name || '';
      communityType = allCommunities[0]?.type || 'subdivision';
    }

    // Try subdivision first (if type is subdivision)
    if (communityType === 'subdivision') {

      // Fetch subdivision metadata
      const subdivision = await Subdivision.findOne({
        name: communityName
      }).select('name slug city region listingCount avgPrice medianPrice priceRange description').lean();

      if (subdivision) {
        communityMetadata = subdivision;
        subdivisionSlug = subdivision.slug;

        // Create city slug for URL
        citySlug = subdivision.city
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim();

        console.log('[COMMUNITY SPOTLIGHT] Using subdivision:', communityName);
      } else {
        // Subdivision not found in DB, fall back to city
        console.log('[COMMUNITY SPOTLIGHT] Subdivision not found in DB, falling back to city');
        communityType = 'city';
        communityName = topCities.length > 0 ? topCities[0].name : '';
      }
    } else {
      // No favorite subdivisions, use city
      communityType = 'city';
      communityName = topCities[0].name;
      console.log('[COMMUNITY SPOTLIGHT] Using city:', communityName);
    }

    if (!communityName) {
      return NextResponse.json({
        community: null,
        listings: [],
      });
    }

    // Get array of liked listing keys to exclude
    const likedKeys = user.likedListings?.map((l: any) => l.listingKey) || [];

    console.log('[COMMUNITY SPOTLIGHT] Excluding', likedKeys.length, 'liked listings');

    // Query UnifiedListing for fresh listings
    const query: any = {
      standardStatus: "Active",
      listingKey: { $nin: likedKeys }
    };

    if (communityType === 'subdivision') {
      // Check if this is a Non-HOA subdivision (e.g., "Palm Desert Non-HOA")
      const cityFromNonHOA = getCityFromNonHOA(communityName);

      if (cityFromNonHOA) {
        // Query for Non-HOA properties (subdivisionName is null/"Not Applicable")
        query.city = cityFromNonHOA;
        query.$or = [
          { subdivisionName: "Not Applicable" },
          { subdivisionName: null },
          { subdivisionName: "" },
          { subdivisionName: "N/A" }
        ];
      } else {
        // Regular subdivision - query by exact name
        query.subdivisionName = communityName;
      }
    } else {
      query.city = communityName;
    }

    const listings = await UnifiedListing.find(query)
      .sort({ modificationTimestamp: -1 })
      .limit(6)
      .select('listingKey unparsedAddress city stateOrProvince listPrice bedroomsTotal bedsTotal bathroomsTotalInteger bathroomsFull livingArea buildingAreaTotal subdivisionName')
      .lean();

    console.log(`[COMMUNITY SPOTLIGHT] Found ${listings.length} new listings in ${communityName}`);

    // Format listings for frontend
    const formattedListings = listings.map((listing: any) => {
      // Try multiple field name variations for beds
      const beds = listing.bedroomsTotal ?? listing.bedsTotal ?? 0;
      // Try multiple field name variations for baths
      const baths = listing.bathroomsTotalInteger ?? listing.bathroomsFull ?? 0;
      // Try multiple field name variations for sqft
      const sqft = listing.livingArea ?? listing.buildingAreaTotal ?? 0;

      // Normalize subdivision name (converts "Not Applicable" to "{City} Non-HOA")
      const normalizedSubdivision = normalizeSubdivisionName(
        listing.subdivisionName,
        listing.city
      );

      return {
        ListingKey: listing.listingKey,
        UnparsedAddress: listing.unparsedAddress || listing.unparsedFirstLineAddress || listing.address || 'Address not available',
        City: listing.city || '',
        StateOrProvince: listing.stateOrProvince || 'CA',
        ListPrice: listing.listPrice || listing.currentPrice || 0,
        BedroomsTotal: beds,
        BathroomsTotalInteger: baths,
        LivingArea: sqft,
        SubdivisionName: normalizedSubdivision,
      };
    });

    // Build community response
    const communityResponse: any = {
      type: communityType,
      name: communityName,
    };

    if (communityType === 'subdivision' && communityMetadata) {
      communityResponse.slug = subdivisionSlug;
      communityResponse.citySlug = citySlug;
      communityResponse.city = communityMetadata.city;
      communityResponse.region = communityMetadata.region;
      communityResponse.stats = {
        listingCount: communityMetadata.listingCount,
        avgPrice: communityMetadata.avgPrice,
        medianPrice: communityMetadata.medianPrice,
        priceRange: communityMetadata.priceRange,
      };
      communityResponse.description = communityMetadata.description;
      communityResponse.url = `/neighborhoods/${citySlug}/${subdivisionSlug}`;
    } else if (communityType === 'city') {
      // Create city slug for URL
      const citySlugComputed = communityName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();

      communityResponse.slug = citySlugComputed;
      communityResponse.url = `/neighborhoods/${citySlugComputed}`;

      // Calculate basic stats from listings
      const avgPrice = listings.length > 0
        ? listings.reduce((sum: number, l: any) => sum + (l.listPrice || 0), 0) / listings.length
        : 0;

      communityResponse.stats = {
        listingCount: listings.length,
        avgPrice: Math.round(avgPrice),
      };
    }

    return NextResponse.json({
      success: true,
      community: communityResponse,
      allCommunities,
      listings: formattedListings,
    });

  } catch (error: any) {
    console.error("[COMMUNITY SPOTLIGHT] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch community spotlight" },
      { status: 500 }
    );
  }
}
