import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import UnifiedListing from "@/models/unified-listing";

const OPENCAGE_API_KEY = process.env.OPENCAGE_API_KEY;
const OPENCAGE_URL = "https://api.opencagedata.com/geocode/v1/json";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.toLowerCase() || "";

  if (!q || q.length < 2) return NextResponse.json({ results: [] });

  await dbConnect();

  const listings = await UnifiedListing.find(
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
    }
  )
    .limit(10)
    .lean();

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
    };
  });

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

  return NextResponse.json({ results: [...geoResults, ...listingResults] });
}
