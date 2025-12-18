import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import UnifiedListing from "@/models/unified-listing";
import { City } from "@/models/cities";
import Subdivision from "@/models/subdivisions";
import { County } from "@/models/counties";
import { Region } from "@/models/regions";

const OPENCAGE_API_KEY = process.env.OPENCAGE_API_KEY;
const OPENCAGE_URL = "https://api.opencagedata.com/geocode/v1/json";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.toLowerCase() || "";

  if (!q || q.length < 2) return NextResponse.json({ results: [] });

  await dbConnect();

  // Search all data sources in parallel with smaller limits for better UX
  const [listings, cities, subdivisions, counties, regions] = await Promise.all([
    // Listings search - limit to 3 for better mix
    UnifiedListing.find(
      {
        $or: [
          { address: { $regex: q, $options: "i" } },
          { unparsedAddress: { $regex: q, $options: "i" } },
          { slugAddress: { $regex: q, $options: "i" } },
        ],
      },
      {
        listingKey: 1,
        slugAddress: 1,
        unparsedAddress: 1,
        listPrice: 1,
        bedroomsTotal: 1,
        bedsTotal: 1,
        bathroomsFull: 1,
        bathroomsHalf: 1,
        bathroomsTotalDecimal: 1,
        bathroomsTotalInteger: 1,
        livingArea: 1,
        latitude: 1,
        longitude: 1,
        media: 1,
        mlsSource: 1,
      }
    )
      .limit(3)
      .lean(),

    // Cities search - limit to 3
    City.find(
      { name: { $regex: q, $options: "i" } },
      { name: 1, latitude: 1, longitude: 1, totalListings: 1 }
    )
      .limit(3)
      .lean(),

    // Subdivisions search - limit to 3
    Subdivision.find(
      { name: { $regex: q, $options: "i" } },
      { name: 1, latitude: 1, longitude: 1, city: 1 }
    )
      .limit(3)
      .lean(),

    // Counties search - limit to 2
    County.find(
      { name: { $regex: q, $options: "i" } },
      { name: 1, latitude: 1, longitude: 1 }
    )
      .limit(2)
      .lean(),

    // Regions search - limit to 2
    Region.find(
      { name: { $regex: q, $options: "i" } },
      { name: 1, latitude: 1, longitude: 1 }
    )
      .limit(2)
      .lean(),
  ]);

  const listingResults = listings.map((l: any) => {
    const bedrooms = l.bedroomsTotal ?? l.bedsTotal ?? 0;
    const bathrooms =
      l.bathroomsFull != null
        ? l.bathroomsFull + (l.bathroomsHalf ? 0.5 : 0)
        : l.bathroomsTotalDecimal ?? 0;

    // Get primary photo from media array
    const media = l.media || [];
    const primaryPhoto = media.find(
      (m: any) => m.MediaCategory === "Primary Photo" || m.Order === 0
    ) || media[0];

    return {
      type: "listing" as const,
      slug: l.slugAddress,
      label: l.unparsedAddress ?? l.slugAddress,
      photo: primaryPhoto?.Uri640 || primaryPhoto?.Uri800,
      listPrice: l.listPrice,
      bedrooms,
      bathrooms,
      sqft: l.livingArea,
      latitude: l.latitude,
      longitude: l.longitude,
      mlsSource: l.mlsSource || "GPS", // Include MLS source
    };
  });

  // Map cities to results
  const cityResults = cities.map((c: any) => ({
    type: "city" as const,
    label: c.name,
    latitude: parseFloat(c.latitude) || 0,
    longitude: parseFloat(c.longitude) || 0,
    totalListings: c.totalListings || 0,
  }));

  // Map subdivisions to results
  const subdivisionResults = subdivisions.map((s: any) => ({
    type: "subdivision" as const,
    label: s.name,
    city: s.city,
    latitude: parseFloat(s.latitude) || 0,
    longitude: parseFloat(s.longitude) || 0,
  }));

  // Map counties to results
  const countyResults = counties.map((c: any) => ({
    type: "county" as const,
    label: c.name,
    latitude: parseFloat(c.latitude) || 0,
    longitude: parseFloat(c.longitude) || 0,
  }));

  // Map regions to results
  const regionResults = regions.map((r: any) => ({
    type: "region" as const,
    label: r.name,
    latitude: parseFloat(r.latitude) || 0,
    longitude: parseFloat(r.longitude) || 0,
  }));

  const listingLabels = new Set(
    listingResults.map((l) => l.label?.toLowerCase())
  );

  const geoResults = [];

  const normalizedQuery = q.trim().toLowerCase();

  const cityOverrides: Record<string, { label: string; latitude: number; longitude: number }> = {
    "la quinta": {
      label: "La Quinta, California, United States of America",
      latitude: 33.6634,
      longitude: -116.3100,
    },
    // You can add more overrides here as needed
  };

  if (cityOverrides[normalizedQuery]) {
    geoResults.push({
      type: "geocode" as const,
      ...cityOverrides[normalizedQuery],
    });
  } else if (OPENCAGE_API_KEY) {
    try {
      const res = await fetch(
        `${OPENCAGE_URL}?q=${encodeURIComponent(q)}&key=${OPENCAGE_API_KEY}&limit=1&countrycode=us`
      );
      const data = await res.json();
      const result = data?.results?.[0];

      const label = result?.formatted;
      const state = result?.components?.state;

      if (
        result?.geometry?.lat &&
        result?.geometry?.lng &&
        state === "California" &&
        label &&
        !listingLabels.has(label.toLowerCase())
      ) {
        geoResults.push({
          type: "geocode" as const,
          label,
          latitude: result.geometry.lat,
          longitude: result.geometry.lng,
        });
      }
    } catch (err) {
    }
  }

  // Add "Ask AI" option at the top for general queries
  const askAiOption = {
    type: "ask_ai" as const,
    label: q,
    query: q,
  };

  // Smart priority: Exact matches first, then by specificity
  // This ensures "Palm Springs" query returns Palm Springs city first,
  // not "Outdoor Resorts Palm Springs" subdivision

  const allResults = [
    ...subdivisionResults,
    ...cityResults,
    ...countyResults,
    ...regionResults,
    ...geoResults,
    ...listingResults,
  ];

  // Sort by exact match priority
  allResults.sort((a, b) => {
    const aLabel = a.label.toLowerCase();
    const bLabel = b.label.toLowerCase();
    const queryLower = normalizedQuery.toLowerCase();

    // Exact match wins (e.g., "palm springs" matches "Palm Springs" city)
    const aExact = aLabel === queryLower;
    const bExact = bLabel === queryLower;
    if (aExact && !bExact) return -1;
    if (!aExact && bExact) return 1;

    // If both exact or neither exact, prioritize by type:
    // City > Subdivision > County > Region > Geocode > Listing
    const typePriority: Record<string, number> = {
      city: 1,
      subdivision: 2,
      county: 3,
      region: 4,
      geocode: 5,
      listing: 6,
    };

    const aPriority = typePriority[a.type] || 999;
    const bPriority = typePriority[b.type] || 999;

    return aPriority - bPriority;
  });

  return NextResponse.json({
    results: [
      askAiOption,
      ...allResults,
    ],
  });
}
