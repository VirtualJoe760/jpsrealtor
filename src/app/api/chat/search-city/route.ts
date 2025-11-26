// src/app/api/chat/search-city/route.ts
// Search all properties in a city (city-wide search)

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { city } = await req.json();

    if (!city) {
      return NextResponse.json(
        { error: "City is required" },
        { status: 400 }
      );
    }

    console.log("[SEARCH-CITY] Searching city:", city);

    // Convert city name to slug format
    const citySlug = city.toLowerCase().replace(/\s+/g, "-");

    // Call the existing working city listings endpoint
    const listingsResponse = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/cities/${citySlug}/listings?limit=100`,
      { method: "GET" }
    );

    if (!listingsResponse.ok) {
      throw new Error(`City listings API failed: ${listingsResponse.status}`);
    }

    const listingsData = await listingsResponse.json();
    const allListings = listingsData.listings || [];
    const totalCount = listingsData.pagination?.total || allListings.length;

    console.log("[SEARCH-CITY] Found", totalCount, "listings in", city);

    // Calculate summary stats
    const prices = allListings.map((l: any) => l.listPrice || 0).filter((p: number) => p > 0);
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
    const avgPrice = prices.length > 0 ? Math.round(prices.reduce((a: number, b: number) => a + b, 0) / prices.length) : 0;

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
