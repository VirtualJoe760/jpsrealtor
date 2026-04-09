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

    // Build list of candidate communities. Non-HOA subdivisions get folded
    // into their parent CITY (so "La Quinta Non-HOA" becomes a "La Quinta"
    // city candidate). De-duplicated by name.
    const allCommunities: Array<{ name: string; type: "subdivision" | "city" }> = [];
    const seenNames = new Set<string>();

    function pushUnique(name: string, type: "subdivision" | "city") {
      const key = `${type}:${name.toLowerCase()}`;
      if (seenNames.has(key)) return;
      seenNames.add(key);
      allCommunities.push({ name, type });
    }

    topSubdivisions.slice(0, 8).forEach((sub: any) => {
      const cityFromNonHOA = getCityFromNonHOA(sub.name);
      if (cityFromNonHOA) {
        // Non-HOA → fold into the parent city instead
        pushUnique(cityFromNonHOA, "city");
      } else {
        pushUnique(sub.name, "subdivision");
      }
    });

    topCities.slice(0, 5).forEach((city: any) => {
      pushUnique(city.name, "city");
    });

    // We're no longer EXCLUDING liked listings — instead we sort them last
    // so unseen ones surface first. The set is still useful for that sort.
    const likedKeys = user.likedListings?.map((l: any) => l.listingKey) || [];
    console.log("[COMMUNITY SPOTLIGHT]", likedKeys.length, "liked listings (will sort to bottom)");

    const projection =
      "listingKey slugAddress unparsedAddress city stateOrProvince listPrice bedroomsTotal bedsTotal bathroomsTotalInteger bathroomsFull livingArea buildingAreaTotal subdivisionName primaryPhoto media";

    /**
     * Run the spotlight query for one candidate community. Returns the
     * resolved metadata + listings, or `null` if no sale listings exist.
     */
    async function tryCommunity(
      candidate: { name: string; type: "subdivision" | "city" },
    ): Promise<{
      communityName: string;
      communityType: "subdivision" | "city";
      communityMetadata: any;
      citySlug: string | null;
      subdivisionSlug: string | null;
      listings: any[];
    } | null> {
      const cName = candidate.name;
      const cType = candidate.type;
      let cMeta: any = null;
      let cCitySlug: string | null = null;
      let cSubSlug: string | null = null;

      // Resolve subdivision metadata when applicable
      if (cType === "subdivision") {
        const sub = await Subdivision.findOne({ name: cName })
          .select("name slug city region listingCount avgPrice medianPrice priceRange description")
          .lean();
        if (sub) {
          cMeta = sub;
          cSubSlug = (sub as any).slug;
          cCitySlug = (sub as any).city
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, "")
            .replace(/\s+/g, "-")
            .replace(/-+/g, "-")
            .trim();
        }
      }

      // Build the query — residential-sale only, $50K+ price floor.
      // No more $nin on liked listings — we sort them last instead.
      const baseQuery: any = {
        standardStatus: "Active",
        propertyType: "A",
        listPrice: { $gte: 50_000 },
      };

      if (cType === "subdivision") {
        baseQuery.subdivisionName = cName;
      } else {
        baseQuery.city = cName;
      }

      // Use an aggregation so we can compute "_seen" per listing and sort
      // unseen results to the top.
      const listings = await UnifiedListing.aggregate([
        { $match: baseQuery },
        {
          $addFields: {
            _seen: { $cond: [{ $in: ["$listingKey", likedKeys] }, 1, 0] },
          },
        },
        { $sort: { _seen: 1, modificationTimestamp: -1 } },
        { $limit: 6 },
        {
          $project: {
            listingKey: 1,
            slugAddress: 1,
            unparsedAddress: 1,
            city: 1,
            stateOrProvince: 1,
            listPrice: 1,
            bedroomsTotal: 1,
            bedsTotal: 1,
            bathroomsTotalInteger: 1,
            bathroomsFull: 1,
            livingArea: 1,
            buildingAreaTotal: 1,
            subdivisionName: 1,
            primaryPhoto: 1,
            media: 1,
          },
        },
      ]);

      if (listings.length === 0) return null;

      return {
        communityName: cName,
        communityType: cType,
        communityMetadata: cMeta,
        citySlug: cCitySlug,
        subdivisionSlug: cSubSlug,
        listings,
      };
    }

    /**
     * Count how many propertyType=A sale listings a candidate has. Used to
     * rank candidates by inventory so the busiest community lands first.
     */
    async function inventoryCount(c: { name: string; type: "subdivision" | "city" }) {
      const filter: any = {
        standardStatus: "Active",
        propertyType: "A",
        listPrice: { $gte: 50_000 },
      };
      if (c.type === "subdivision") filter.subdivisionName = c.name;
      else filter.city = c.name;
      return UnifiedListing.countDocuments(filter);
    }

    // Build the candidate list. If the client explicitly requested a
    // community we honor it first; otherwise we sort by sale-inventory size
    // so the most active community surfaces by default.
    let candidates: Array<{ name: string; type: "subdivision" | "city" }> = [];
    if (requestedCommunity) {
      // Fold Non-HOA into the parent city if applicable so the request
      // doesn't bypass the de-duping we did at allCommunities build time.
      const cityFromNonHOA = getCityFromNonHOA(requestedCommunity);
      const requested: { name: string; type: "subdivision" | "city" } = cityFromNonHOA
        ? { name: cityFromNonHOA, type: "city" }
        : {
            name: requestedCommunity,
            type: topSubdivisions.some((s: any) => s.name === requestedCommunity)
              ? "subdivision"
              : "city",
          };
      candidates.push(requested);
      for (const c of allCommunities) {
        if (!candidates.find((x) => x.name === c.name && x.type === c.type)) {
          candidates.push(c);
        }
      }
    } else {
      // Rank by inventory count (descending) — busiest community first.
      const counts = await Promise.all(
        allCommunities.map(async (c) => ({ c, count: await inventoryCount(c) }))
      );
      candidates = counts
        .sort((a, b) => b.count - a.count)
        .map((x) => x.c);
      console.log(
        "[COMMUNITY SPOTLIGHT] Ranked by inventory:",
        counts.map((x) => `${x.c.name}=${x.count}`).join(", ")
      );
    }

    // Iterate until one community returns sale listings
    let resolved: Awaited<ReturnType<typeof tryCommunity>> = null;
    for (const c of candidates) {
      const result = await tryCommunity(c);
      if (result) {
        resolved = result;
        break;
      }
      console.log(`[COMMUNITY SPOTLIGHT] Skipping ${c.name} — no sale listings`);
    }

    if (!resolved) {
      console.log("[COMMUNITY SPOTLIGHT] No candidates yielded any sale listings");
      return NextResponse.json({
        community: null,
        allCommunities,
        listings: [],
      });
    }

    const {
      communityName,
      communityType,
      communityMetadata,
      citySlug,
      subdivisionSlug,
      listings,
    } = resolved;

    console.log(
      `[COMMUNITY SPOTLIGHT] Resolved → ${communityName} (${communityType}) with ${listings.length} listings`
    );

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

      // Extract photo URL server-side (avoids per-listing client fetch)
      let photoUrl = null;
      if (listing.primaryPhoto) {
        photoUrl = listing.primaryPhoto.uri800 || listing.primaryPhoto.uri640 || listing.primaryPhoto.uri1024 || listing.primaryPhoto.uri1280;
      } else if (listing.media?.length > 0) {
        const primary = listing.media.find((m: any) => m.MediaCategory === "Primary Photo" || m.Order === 0) || listing.media[0];
        photoUrl = primary?.Uri800 || primary?.Uri640 || primary?.Uri1024 || primary?.Uri1280;
      }

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
        PhotoUrl: photoUrl,
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
