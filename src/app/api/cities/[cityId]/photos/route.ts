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
    const limit = parseInt(searchParams.get("limit") || "20");

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

    // Fetch listings from both GPS MLS and CRMLS
    const [gpsListings, crmlsListings] = await Promise.all([
      Listing.find(baseQuery)
        .select(
          "listingKey unparsedAddress slugAddress listPrice bedsTotal bedroomsTotal bathsTotal bathroomsTotalInteger bathroomsTotalDecimal bathroomsFull"
        )
        .limit(limit)
        .lean()
        .exec(),
      CRMLSListing.find(baseQuery)
        .select(
          "listingKey listingId unparsedAddress slugAddress listPrice bedsTotal bedroomsTotal bathroomsTotalInteger bathroomsTotalDecimal bathroomsFull"
        )
        .limit(limit)
        .lean()
        .exec(),
    ]);

    // Combine and normalize listings
    const listings = [
      ...gpsListings.map((l: any) => ({ ...l, listingKey: l.listingKey })),
      ...crmlsListings.map((l: any) => ({
        ...l,
        listingKey: l.listingKey || l.listingId,
      })),
    ];

    if (listings.length === 0) {
      return NextResponse.json({ photos: [] });
    }

    const listingIds = listings.map((l: any) => l.listingKey);

    // Fetch primary photos for these listings
    let photos: any[] = await Photo.find({
      listingId: { $in: listingIds },
      isPrimary: true,
    })
      .select("photoId listingId url thumbnailUrl")
      .lean()
      .exec();

    // For listings without primary photos, get the first available photo
    const listingsWithPhotos = new Set(photos.map((p) => p.listingId));
    const listingsWithoutPhotos = listingIds.filter(
      (id) => !listingsWithPhotos.has(id)
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
      ]);

      const additionalPhotos = firstPhotos.map((fp) => ({
        photoId: fp.photo._id.toString(),
        listingId: fp._id,
        url: fp.photo.url,
        thumbnailUrl: fp.photo.thumbnailUrl,
      }));

      photos = [...photos, ...additionalPhotos];
    }

    // Create a map of listings by listingKey
    const listingMap = new Map(listings.map((l: any) => [l.listingKey, l]));

    // Combine photos with listing info
    const photosWithInfo = photos
      .map((photo) => {
        const listing = listingMap.get(photo.listingId);
        if (!listing) return null;

        return {
          photoId: photo.photoId || photo._id?.toString() || "",
          listingId: photo.listingId,
          slug: listing.slugAddress || listing.listingKey,
          caption: listing.unparsedAddress || "",
          src: photo.url,
          thumb: photo.thumbnailUrl || photo.url,
          address: listing.unparsedAddress || "",
          listPrice: listing.listPrice,
          bedroomsTotal: listing.bedsTotal || listing.bedroomsTotal || 0,
          bathroomsTotalDecimal:
            listing.bathroomsTotalDecimal ||
            listing.bathsTotal ||
            listing.bathroomsTotalInteger ||
            listing.bathroomsFull ||
            0,
        };
      })
      .filter((photo) => photo !== null);

    return NextResponse.json({ photos: photosWithInfo });
  } catch (error) {
    console.error("Error fetching city photos:", error);
    return NextResponse.json(
      { error: "Failed to fetch city photos" },
      { status: 500 }
    );
  }
}
