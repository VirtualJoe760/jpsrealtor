// src/app/api/chat/search-listings/route.ts
// AI-powered MLS search endpoint

import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { CRMLSListing } from "@/models/crmls-listings";
import Photo from "@/models/photos";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      minBeds,
      maxBeds,
      minBaths,
      maxBaths,
      minPrice,
      maxPrice,
      minSqft,
      maxSqft,
      cities,
      subdivisions,
      propertyTypes,
      hasPool,
      hasView,
      limit, // Optional limit - if not provided, return ALL results
    } = body;

    await connectDB();

    // Build query
    const query: any = {
      standardStatus: "Active", // Only active listings
      mlsStatus: "Active", // Ensure active
    };

    // Only apply rental filters if NOT searching by subdivision
    // When searching by subdivision, include ALL listings (for sale, rent, multi-family)
    if (!subdivisions || subdivisions.length === 0) {
      // Only show "For Sale" properties by default (exclude rentals)
      // Combined filters: exclude rental types AND ensure sale-level pricing
      query.$and = [
        {
          $or: [
            { propertySubType: { $nin: ["Rental", "Lease", "For Lease", "Residential Lease"] } },
            { propertySubType: { $exists: false } },
          ],
        },
        // Additional safeguard: Rentals typically have monthly prices under $20k
        // For-sale properties have prices starting around $50k+
        { listPrice: { $gte: 50000 } }
      ];
    }

    // Beds
    if (minBeds && maxBeds) {
      query.bedsTotal = { $gte: minBeds, $lte: maxBeds };
    } else if (minBeds) {
      query.bedsTotal = { $gte: minBeds };
    } else if (maxBeds) {
      query.bedsTotal = { $lte: maxBeds };
    }

    // Baths
    if (minBaths && maxBaths) {
      query.bathroomsTotalInteger = { $gte: minBaths, $lte: maxBaths };
    } else if (minBaths) {
      query.bathroomsTotalInteger = { $gte: minBaths };
    } else if (maxBaths) {
      query.bathroomsTotalInteger = { $lte: maxBaths };
    }

    // Price
    if (minPrice && maxPrice) {
      query.listPrice = { $gte: minPrice, $lte: maxPrice };
    } else if (minPrice) {
      query.listPrice = { $gte: minPrice };
    } else if (maxPrice) {
      query.listPrice = { $lte: maxPrice };
    }

    // Square footage
    if (minSqft && maxSqft) {
      query.livingArea = { $gte: minSqft, $lte: maxSqft };
    } else if (minSqft) {
      query.livingArea = { $gte: minSqft };
    } else if (maxSqft) {
      query.livingArea = { $lte: maxSqft };
    }

    // Cities
    if (cities && cities.length > 0) {
      query.city = { $in: cities.map((c: string) => new RegExp(c, "i")) };
    }

    // Subdivisions - fuzzy matching to handle partial names and variations
    if (subdivisions && subdivisions.length > 0) {
      // Use partial matching for flexibility (e.g., "Indian Palms" matches "Indian Palms Country Club")
      // Also handles variations like "Ironwood Country Club" matching "Ironwood Country Club North/South/West"
      query.subdivisionName = {
        $in: subdivisions.map((s: string) => {
          // Escape special regex characters
          const escapedName = s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          // Match the name at the start of the subdivision name to catch variations
          return new RegExp(`^${escapedName}`, "i");
        })
      };
    }

    // Property types
    if (propertyTypes && propertyTypes.length > 0) {
      // If searching by subdivision, include ALL property types (including rentals)
      if (subdivisions && subdivisions.length > 0) {
        // Include all requested types, even rentals
        query.$and = [
          ...(query.$and || []),
          { propertySubType: { $in: propertyTypes } }
        ];
      } else {
        // Otherwise, filter out rental types for general searches
        const saleTypes = propertyTypes.filter(
          (t: string) => !["Rental", "Lease", "For Lease", "Residential Lease"].includes(t)
        );
        if (saleTypes.length > 0) {
          query.$and = [
            ...(query.$and || []),
            { propertySubType: { $in: saleTypes } }
          ];
        }
      }
    }

    // Features (simplified)
    const conditions = [];
    if (hasPool) {
      conditions.push({
        $or: [
          { poolFeatures: { $exists: true, $nin: [null, ""] } },
          { poolPrivateYN: true },
        ],
      });
    }

    if (hasView) {
      conditions.push({ view: { $exists: true, $nin: [null, ""] } });
    }

    if (conditions.length > 0) {
      // Combine with existing $and conditions instead of overwriting
      query.$and = [...(query.$and || []), ...conditions];
    }

    // Execute search
    const listingsQuery = CRMLSListing.find(query)
      .sort({ listPrice: 1 }) // Sort by price ascending
      .select(
        "listingId listingKey listPrice bedsTotal bathroomsTotalInteger livingArea city unparsedAddress primaryPhotoUrl subdivisionName propertyType propertySubType slugAddress latitude longitude"
      );

    // Only apply limit if provided, otherwise return ALL results
    const listings = limit
      ? await listingsQuery.limit(limit).lean()
      : await listingsQuery.lean();

    // Fetch primary photos for all listings
    // IMPORTANT: Photos collection uses listingId (short ID), not listingKey (long ID)
    const listingIds = listings.map((l: any) => l.listingId);
    const photos = await Photo.find({
      listingId: { $in: listingIds },
      primary: true
    }).lean();

    // Create a map of listingId -> photo URL
    const photoMap = new Map();
    photos.forEach((photo: any) => {
      const photoUrl = photo.uri1280 || photo.uri1024 || photo.uri800 || photo.uri640 || photo.uriThumb;
      if (photoUrl) {
        photoMap.set(photo.listingId, photoUrl);
      }
    });

    // Format results
    const results = listings.map((listing: any) => {
      // Priority: 1) Photos collection (use listingId), 2) primaryPhotoUrl from listing, 3) placeholder
      const photoFromCollection = photoMap.get(listing.listingId);
      const photoUrl = photoFromCollection || listing.primaryPhotoUrl;

      // Only use placeholder if no photo found anywhere
      const finalPhotoUrl = photoUrl || `https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=600&fit=crop`;

      return {
        id: listing.listingKey,
        price: listing.listPrice,
        beds: listing.bedsTotal,
        baths: listing.bathroomsTotalInteger,
        sqft: listing.livingArea,
        city: listing.city,
        address: listing.unparsedAddress,
        // Use photo with proper fallback chain
        image: finalPhotoUrl,
        subdivision: listing.subdivisionName,
        propertyType: listing.propertyType, // MLS property type code (A=Sale, B=Rental, C=Multi-Family)
        propertySubType: listing.propertySubType,
        type: listing.propertySubType, // Keep for backward compatibility
        url: `/mls-listings/${listing.slugAddress || listing.listingKey}`,
        // Add coordinates for map display
        latitude: listing.latitude,
        longitude: listing.longitude,
        slug: listing.slugAddress,
        slugAddress: listing.slugAddress,
      };
    });

    return NextResponse.json({
      success: true,
      count: results.length,
      listings: results,
      query: body, // Echo back the query for debugging
    });
  } catch (error) {
    console.error("Error searching listings:", error);
    return NextResponse.json(
      { error: "Failed to search listings" },
      { status: 500 }
    );
  }
}
