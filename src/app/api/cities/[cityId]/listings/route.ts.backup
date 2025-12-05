import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import { Listing } from "@/models/listings";
import { CRMLSListing } from "@/models/crmls-listings";
import Photo from "@/models/photos";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cityId: string }> }
) {
  try {
    await dbConnect();

    const resolvedParams = await params;
    const cityId = resolvedParams.cityId;
    const searchParams = request.nextUrl.searchParams;
    const propertyType = searchParams.get("propertyType") || "all";
    const limit = parseInt(searchParams.get("limit") || "100");

    // Get filter parameters
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const minBeds = searchParams.get("minBeds");
    const maxBeds = searchParams.get("maxBeds");
    const minBaths = searchParams.get("minBaths");
    const maxBaths = searchParams.get("maxBaths");

    // Convert cityId to city name for matching
    // e.g., "palm-springs" -> "Palm Springs"
    const cityName = cityId
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    // Base query for the city
    const baseQuery: any = {
      city: { $regex: new RegExp(`^${cityName}$`, "i") },
      listPrice: { $exists: true, $ne: null, $gt: 0 },
    };

    // Build $and array to combine all filters properly
    const andConditions: any[] = [];

    // Filter by property type
    if (propertyType === "sale") {
      andConditions.push({
        $or: [
          { propertyType: "A" },
          { propertyType: "C" },
          { propertyType: { $exists: false } },
          { propertyType: null },
          { propertyType: "" },
        ],
      });
    } else if (propertyType === "rental") {
      baseQuery.propertyType = "B";
    }

    // Apply price filters
    if (minPrice) {
      baseQuery.listPrice = { ...baseQuery.listPrice, $gte: parseInt(minPrice) };
    }
    if (maxPrice) {
      baseQuery.listPrice = { ...baseQuery.listPrice, $lte: parseInt(maxPrice) };
    }

    // Apply bed filters
    if (minBeds || maxBeds) {
      const bedFilters: any = {};
      if (minBeds) bedFilters.$gte = parseInt(minBeds);
      if (maxBeds) bedFilters.$lte = parseInt(maxBeds);
      andConditions.push({
        $or: [
          { bedsTotal: bedFilters },
          { bedroomsTotal: bedFilters },
        ],
      });
    }

    // Apply bath filters
    if (minBaths || maxBaths) {
      const bathFilters: any = {};
      if (minBaths) bathFilters.$gte = parseInt(minBaths);
      if (maxBaths) bathFilters.$lte = parseInt(maxBaths);
      andConditions.push({
        $or: [
          { bathsTotal: bathFilters },
          { bathroomsTotalInteger: bathFilters },
          { bathroomsFull: bathFilters },
        ],
      });
    }

    // Apply $and conditions if any exist
    if (andConditions.length > 0) {
      baseQuery.$and = andConditions;
    }

    // Fetch listings from both GPS MLS and CRMLS
    const [gpsListings, crmlsListings] = await Promise.all([
      Listing.find(baseQuery)
        .select(
          "listingId listingKey listPrice unparsedAddress slugAddress bedsTotal bedroomsTotal bathsTotal bathroomsTotalInteger bathroomsFull yearBuilt livingArea lotSizeSquareFeet propertyType propertySubType coordinates latitude longitude"
        )
        .limit(limit)
        .lean()
        .exec(),
      CRMLSListing.find(baseQuery)
        .select(
          "listingId listingKey listPrice unparsedAddress slugAddress bedsTotal bedroomsTotal bathroomsTotalInteger bathroomsFull yearBuilt livingArea lotSizeSqft propertyType propertySubType latitude longitude"
        )
        .limit(limit)
        .lean()
        .exec(),
    ]);

    // Combine and normalize listings from both sources
    const listings = [
      ...gpsListings.map((l: any) => ({
        ...l,
        listingId: l.listingId,
        listingKey: l.listingKey,
        mlsSource: "GPS",
      })),
      ...crmlsListings.map((l: any) => ({
        ...l,
        listingId: l.listingId,
        listingKey: l.listingKey || l.listingId,
        mlsSource: "CRMLS",
      })),
    ];

    if (listings.length === 0) {
      return NextResponse.json({ listings: [] });
    }

    // Get listing IDs for photo lookup
    const listingIds = listings.map((l) => l.listingId).filter(Boolean);

    // Fetch primary photos for these listings
    let photos: any[] = await Photo.find({
      listingId: { $in: listingIds },
      primary: true,
    })
      .select({
        listingId: 1,
        uri1600: 1,
        uri1280: 1,
        uri1024: 1,
        uri800: 1,
        uri640: 1,
        uri300: 1,
        uriLarge: 1,
      })
      .lean()
      .exec();

    // For listings without primary photos, get the first available photo
    const listingIdsWithPhotos = new Set(photos.map((p) => p.listingId));
    const listingsWithoutPhotos = listingIds.filter(
      (id) => !listingIdsWithPhotos.has(id)
    );

    if (listingsWithoutPhotos.length > 0) {
      const firstPhotos = await Photo.aggregate([
        { $match: { listingId: { $in: listingsWithoutPhotos } } },
        { $sort: { order: 1, _id: 1 } },
        {
          $group: {
            _id: "$listingId",
            photo: { $first: "$$ROOT" },
          },
        },
        {
          $project: {
            listingId: "$_id",
            uri1600: "$photo.uri1600",
            uri1280: "$photo.uri1280",
            uri1024: "$photo.uri1024",
            uri800: "$photo.uri800",
            uri640: "$photo.uri640",
            uri300: "$photo.uri300",
            uriLarge: "$photo.uriLarge",
          },
        },
      ]);

      photos = [...photos, ...firstPhotos];
    }

    // Create a map of photos by listingId (prefer highest quality)
    const photoMap = new Map();
    photos.forEach((photo) => {
      const photoUrl =
        photo.uri1600 ||
        photo.uri1280 ||
        photo.uri1024 ||
        photo.uri800 ||
        photo.uri640 ||
        photo.uri300 ||
        photo.uriLarge ||
        null;
      photoMap.set(photo.listingId, photoUrl);
    });

    // Combine listings with photos
    const listingsWithPhotos = listings.map((listing: any) => ({
      listingId: listing.listingId,
      listingKey: listing.listingKey,
      listPrice: listing.listPrice,
      address: listing.unparsedAddress,
      unparsedAddress: listing.unparsedAddress,
      slugAddress: listing.slugAddress,
      beds: listing.bedsTotal || listing.bedroomsTotal || 0,
      baths:
        listing.bathsTotal ||
        listing.bathroomsTotalInteger ||
        listing.bathroomsFull ||
        0,
      yearBuilt: listing.yearBuilt,
      livingArea: listing.livingArea,
      lotSize: listing.lotSizeSquareFeet || listing.lotSizeSqft,
      propertyType: listing.propertyType,
      propertySubType: listing.propertySubType,
      // Include both formats for compatibility
      coordinates: listing.coordinates || {
        latitude: listing.latitude,
        longitude: listing.longitude,
      },
      latitude: listing.latitude || listing.coordinates?.latitude,
      longitude: listing.longitude || listing.coordinates?.longitude,
      photoUrl: photoMap.get(listing.listingId) || null,
      primaryPhotoUrl: photoMap.get(listing.listingId) || null,
      mlsSource: listing.mlsSource,
    }));

    return NextResponse.json({ listings: listingsWithPhotos });
  } catch (error) {
    console.error("Error fetching city listings:", error);
    return NextResponse.json(
      { error: "Failed to fetch city listings" },
      { status: 500 }
    );
  }
}
