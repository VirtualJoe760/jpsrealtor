// src/app/api/chat/search-city/route.ts
// Search all properties in a city (city-wide search)

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { city, propertyType } = await req.json();

    if (!city) {
      return NextResponse.json(
        { error: "City is required" },
        { status: 400 }
      );
    }

    console.log("[SEARCH-CITY] Searching city:", city, "propertyType:", propertyType || "sale (default)");

    // Convert city name to slug format
    const citySlug = city.toLowerCase().replace(/\s+/g, "-");

    // Build query params - default to residential sale (Type A) unless specified
    const params = new URLSearchParams({ limit: "100" });
    if (propertyType) {
      params.append("propertyType", propertyType);
    }
    // If no propertyType provided, endpoint defaults to "sale" (Type A)

    // Call the existing working city listings endpoint
    const listingsResponse = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/cities/${citySlug}/listings?${params.toString()}`,
      { method: "GET" }
    );

    if (!listingsResponse.ok) {
      throw new Error(`City listings API failed: ${listingsResponse.status}`);
    }

    const listingsData = await listingsResponse.json();
    const allListings = listingsData.listings || [];

    // ANALYTICS PATTERN: Use accurate stats from API endpoint, not calculated from sample
    const apiStats = listingsData.stats || {};
    const totalCount = apiStats.totalListings || allListings.length;
    const minPrice = apiStats.priceRange?.min || 0;
    const maxPrice = apiStats.priceRange?.max || 0;
    const avgPrice = apiStats.avgPrice || 0;
    const medianPrice = apiStats.medianPrice || 0;

    console.log("[SEARCH-CITY] Found", totalCount, "listings in", city);
    console.log("[SEARCH-CITY] Stats from API:", { avgPrice, medianPrice, minPrice, maxPrice });

    // Calculate center coordinates
    const validCoords = allListings.filter((l: any) => l.latitude && l.longitude);
    const centerLat = validCoords.length > 0
      ? validCoords.reduce((sum: number, l: any) => sum + parseFloat(l.latitude), 0) / validCoords.length
      : 33.72;
    const centerLng = validCoords.length > 0
      ? validCoords.reduce((sum: number, l: any) => sum + parseFloat(l.longitude), 0) / validCoords.length
      : -116.37;

    // Format 10 sample listings for AI
    const sampleListings = allListings.slice(0, 10).map((l: any) => ({
      id: l.listingId || l.listingKey,
      listingKey: l.listingKey || l.listingId,
      price: l.listPrice,
      beds: l.bedroomsTotal || l.bedsTotal || l.beds,
      baths: l.bathroomsTotalDecimal || l.bathroomsTotalInteger || l.baths,
      sqft: l.livingArea,
      address: l.address || l.unparsedAddress,
      city: l.city,
      subdivision: l.subdivisionName || "",
      image: l.primaryPhotoUrl || l.photoUrl || "",
      url: `/mls-listings/${l.slugAddress || l.listingId}`,
      slugAddress: l.slugAddress || "",
      latitude: parseFloat(l.latitude) || (l.coordinates?.latitude ? parseFloat(l.coordinates.latitude) : null),
      longitude: parseFloat(l.longitude) || (l.coordinates?.longitude ? parseFloat(l.coordinates.longitude) : null),
      mlsSource: l.mlsSource || "GPS", // Include MLS source for proper handling
    }));

    return NextResponse.json({
      success: true,
      city,
      summary: {
        count: totalCount,
        priceRange: { min: minPrice, max: maxPrice },
        avgPrice: avgPrice,
        medianPrice: medianPrice,
        center: { lat: centerLat, lng: centerLng },
        sampleListings
      }
    });

  } catch (error: any) {
    console.error("[SEARCH-CITY] Error:", error);
    return NextResponse.json(
      { error: "Failed to search city", details: error.message },
      { status: 500 }
    );
  }
}
