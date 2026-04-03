import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import { normalizeSubdivisionName } from "@/app/utils/subdivisionUtils";

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

    // Get top communities from analytics
    const topSubdivisions = user.swipeAnalytics?.topSubdivisions || [];
    const topCities = user.swipeAnalytics?.topCities || [];

    console.log(`[FAVORITE SPOTLIGHT] ${user.likedListings?.length || 0} liked listings, ${topSubdivisions.length} subdivisions, ${topCities.length} cities`);

    // If no analytics, return empty
    if (topSubdivisions.length === 0 && topCities.length === 0) {
      return NextResponse.json({
        topCommunities: [],
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

    // Determine which community to show (requested or default to first)
    const selectedCommunity = requestedCommunity || allCommunities[0]?.name;

    // Get top 2 communities for display text (subdivisions first, then cities)
    const topCommunities: string[] = [];

    if (topSubdivisions.length > 0) {
      topCommunities.push(topSubdivisions[0].name);
    }

    if (topCommunities.length < 2 && topCities.length > 0) {
      topCommunities.push(topCities[0].name);
    }

    // Filter liked listings from selected community
    const likedListings = user.likedListings || [];

    const communityListings = likedListings.filter((liked: any) => {
      // Check if subdivision matches
      if (liked.subdivision && liked.subdivision === selectedCommunity) {
        return true;
      }
      // Check if city matches
      if (liked.city && liked.city === selectedCommunity) {
        return true;
      }
      return false;
    });

    // Deduplicate by listingKey (keep most recent swipe for each unique listing)
    const uniqueListingsMap = new Map();
    communityListings.forEach((liked: any) => {
      const existingListing = uniqueListingsMap.get(liked.listingKey);
      if (!existingListing || new Date(liked.swipedAt) > new Date(existingListing.swipedAt)) {
        uniqueListingsMap.set(liked.listingKey, liked);
      }
    });

    const uniqueListings = Array.from(uniqueListingsMap.values());
    console.log(`[FAVORITE SPOTLIGHT] ${communityListings.length} community listings, ${uniqueListings.length} unique`);

    // Sort by most recently liked and limit to 10
    const sortedListings = uniqueListings
      .sort((a: any, b: any) => new Date(b.swipedAt).getTime() - new Date(a.swipedAt).getTime())
      .slice(0, 10);

    // Transform to match expected format
    const formattedListings = sortedListings.map((liked: any) => {
      const listing = liked.listingData || {};
      const city = listing.city || liked.city || '';

      // Normalize subdivision name (converts "Not Applicable" to "{City} Non-HOA")
      const rawSubdivision = listing.subdivisionName || liked.subdivision || '';
      const normalizedSubdivision = normalizeSubdivisionName(rawSubdivision, city);

      // Extract photo URL server-side
      let photoUrl = null;
      if (listing.primaryPhoto) {
        photoUrl = listing.primaryPhoto.uri800 || listing.primaryPhoto.uri640 || listing.primaryPhoto.uri1024;
      } else if (listing.media?.length > 0) {
        const primary = listing.media.find((m: any) => m.MediaCategory === "Primary Photo" || m.Order === 0) || listing.media[0];
        photoUrl = primary?.Uri800 || primary?.Uri640 || primary?.Uri1024;
      }

      return {
        ListingKey: liked.listingKey,
        UnparsedAddress: listing.unparsedAddress || listing.unparsedFirstLineAddress || listing.address || 'Address not available',
        City: city,
        StateOrProvince: listing.stateOrProvince || 'CA',
        PostalCode: listing.postalCode || '',
        ListPrice: listing.listPrice || listing.currentPrice || 0,
        BedroomsTotal: listing.bedroomsTotal || listing.bedsTotal || 0,
        BathroomsTotalInteger: listing.bathroomsTotalInteger || 0,
        LivingArea: listing.livingArea || listing.buildingAreaTotal || 0,
        SubdivisionName: normalizedSubdivision,
        SlugAddress: listing.slugAddress || null,
        PhotoUrl: photoUrl,
      };
    });

    return NextResponse.json({
      success: true,
      topCommunities,
      allCommunities,
      selectedCommunity,
      listings: formattedListings,
    });

  } catch (error: any) {
    console.error("[FAVORITE SPOTLIGHT] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch favorite spotlight" },
      { status: 500 }
    );
  }
}
