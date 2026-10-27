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
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.toLowerCase() || "";

    if (!q || q.length < 2) return NextResponse.json({ results: [] });

    await dbConnect();

    // Slug alphabet is [a-z0-9-], so the result is regex-safe as-is.
    const qSlug = q.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

  // Search all data sources in parallel with smaller limits for better UX
  const [listings, cities, subdivisions, counties, regions] = await Promise.all([
    // Listings search. Match on the indexed slugAddress only, with the query slugified the
    // same way ("PGA West" → "pga-west"). The old $or of case-insensitive
    // regexes on unparsedAddress/address/slugAddress forced a collection
    // scan of ~85k listings: ~42s whenever nothing matched (any subdivision
    // or region name), and Promise.all held the whole response for it, so
    // the map search looked dead. No listing has an `address` field.
    UnifiedListing.find(
      { slugAddress: { $regex: qSlug || "^$" } },
      {
        listingKey: 1,
        slugAddress: 1,
        unparsedAddress: 1,
        listPrice: 1,
        bedsTotal: 1,
        bathsTotal: 1,
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
      { name: 1, coordinates: 1, listingCount: 1 }
    )
      .limit(3)
      .lean(),

    // Subdivisions search - limit to 3
    Subdivision.find(
      { name: { $regex: q, $options: "i" } },
      { name: 1, coordinates: 1, city: 1 }
    )
      .limit(3)
      .lean(),

    // Counties search - limit to 2
    County.find(
      { name: { $regex: q, $options: "i" } },
      { name: 1, coordinates: 1 }
    )
      .limit(2)
      .lean(),

    // Regions search - limit to 2
    Region.find(
      { name: { $regex: q, $options: "i" } },
      { name: 1, coordinates: 1 }
    )
      .limit(2)
      .lean(),
  ]);

  const listingResults = listings.map((l: any) => {
    const bedrooms = l.bedsTotal ?? 0;
    const bathrooms = l.bathsTotal ?? l.bathroomsTotalInteger ?? l.bathroomsTotalDecimal ?? 0;

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

  // Map cities to results. Cities, subdivisions, counties and regions keep
  // their centre under `coordinates.{latitude,longitude}`; projecting the
  // top-level fields (as this route used to) returned 0,0 for every place,
  // which pushed the map search onto the /api/geocode fallback.
  const cityResults = cities.map((c: any) => ({
    type: "city" as const,
    label: c.name,
    latitude: parseFloat(c.coordinates?.latitude) || 0,
    longitude: parseFloat(c.coordinates?.longitude) || 0,
    totalListings: c.listingCount || 0,
  }));

  // Map subdivisions to results
  const subdivisionResults = subdivisions.map((s: any) => ({
    type: "subdivision" as const,
    label: s.name,
    city: s.city,
    latitude: parseFloat(s.coordinates?.latitude) || 0,
    longitude: parseFloat(s.coordinates?.longitude) || 0,
  }));

  // Map counties to results
  const countyResults = counties.map((c: any) => ({
    type: "county" as const,
    label: c.name,
    latitude: parseFloat(c.coordinates?.latitude) || 0,
    longitude: parseFloat(c.coordinates?.longitude) || 0,
  }));

  // Map regions to results
  const regionResults = regions.map((r: any) => ({
    type: "region" as const,
    label: r.name,
    latitude: parseFloat(r.coordinates?.latitude) || 0,
    longitude: parseFloat(r.coordinates?.longitude) || 0,
  }));

  const normalizedQuery = q.trim().toLowerCase();

  // Only use geocoding as a fallback if we have NO local results
  const hasLocalResults = cities.length > 0 || subdivisions.length > 0 ||
                         counties.length > 0 || regions.length > 0;

  const geoResults = [];

  // Fast city overrides (no API call needed)
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
  }

  // Skip slow OpenCage API call - we have enough local data for speed
  // OpenCage adds 100-500ms latency for external HTTP request

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
  } catch (error) {
    console.error("[Search API] Error:", error);
    // Return empty results instead of 500 error
    return NextResponse.json({ results: [] });
  }
}
