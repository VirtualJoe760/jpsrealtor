import { NextResponse, NextRequest } from "next/server";
import dbConnect from "@/lib/mongoose";
import UnifiedListing from "@/models/unified-listing";

// Batch-fetch primary photo URLs from Spark Replication API
async function fetchPrimaryPhotos(listings: any[]): Promise<Map<string, string>> {
  const photoMap = new Map<string, string>();
  const token = process.env.SPARK_ACCESS_TOKEN;
  if (!token || listings.length === 0) return photoMap;

  const byMls = new Map<string, string[]>();
  for (const l of listings) {
    if (!l.mlsId || !l.listingKey) continue;
    if (!byMls.has(l.mlsId)) byMls.set(l.mlsId, []);
    byMls.get(l.mlsId)!.push(l.listingKey);
  }

  const fetches: Promise<void>[] = [];
  for (const [mlsId, keys] of byMls) {
    const keyFilter = keys.map(k => `ListingKey Eq '${k}'`).join(' Or ');
    const url = `https://replication.sparkapi.com/v1/listings?_filter=MlsId Eq '${mlsId}' And (${keyFilter})&_expand=Photos&_select=ListingKey&_limit=${keys.length}`;
    fetches.push(
      fetch(url, {
        headers: { Authorization: `Bearer ${token}`, "X-SparkApi-User-Agent": "jpsrealtor.com", Accept: "application/json" },
        next: { revalidate: 3600 },
      })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          for (const result of (data?.D?.Results || [])) {
            const lk = result?.StandardFields?.ListingKey;
            const photos = result?.StandardFields?.Photos || [];
            const primary = photos.find((p: any) => p.Primary === true || p.Order === 0) || photos[0];
            if (lk && primary) {
              const url = primary.Uri800 || primary.Uri640 || primary.Uri1024 || primary.Uri300;
              if (url) photoMap.set(lk, url);
            }
          }
        })
        .catch(() => {})
    );
  }
  await Promise.all(fetches);
  return photoMap;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const city = searchParams.get("city");
  const subdivision = searchParams.get("subdivision");
  const exclude = searchParams.get("exclude");
  const limit = Math.min(parseInt(searchParams.get("limit") || "6"), 12);
  const minPrice = searchParams.get("minPrice");
  const maxPrice = searchParams.get("maxPrice");

  if (!city) {
    return NextResponse.json({ error: "city is required" }, { status: 400 });
  }

  await dbConnect();

  try {
    const query: any = {
      standardStatus: "Active",
      slugAddress: { $exists: true, $ne: null },
    };

    // Try subdivision first for more relevant results
    if (subdivision) {
      query.subdivisionName = { $regex: new RegExp(`^${subdivision}$`, "i") };
    } else {
      query.city = { $regex: new RegExp(`^${city}$`, "i") };
    }

    if (exclude) {
      query.listingKey = { $ne: exclude };
    }

    if (minPrice && maxPrice) {
      query.listPrice = {
        $gte: parseInt(minPrice),
        $lte: parseInt(maxPrice),
      };
    }

    let listings = await UnifiedListing.find(query)
      .select("listingKey slugAddress unparsedAddress city stateOrProvince listPrice bedroomsTotal bathroomsTotalInteger livingArea mlsId")
      .sort({ listPrice: -1 })
      .limit(limit)
      .lean();

    // If subdivision had too few results, fall back to city
    if (listings.length < 3 && subdivision) {
      const cityQuery: any = {
        standardStatus: "Active",
        slugAddress: { $exists: true, $ne: null },
        city: { $regex: new RegExp(`^${city}$`, "i") },
      };
      if (exclude) cityQuery.listingKey = { $ne: exclude };
      if (minPrice && maxPrice) {
        cityQuery.listPrice = { $gte: parseInt(minPrice), $lte: parseInt(maxPrice) };
      }

      listings = await UnifiedListing.find(cityQuery)
        .select("listingKey slugAddress unparsedAddress city stateOrProvince listPrice bedroomsTotal bathroomsTotalInteger livingArea mlsId")
        .sort({ listPrice: -1 })
        .limit(limit)
        .lean();
    }

    // Batch-fetch photos from Spark
    const photoMap = await fetchPrimaryPhotos(listings);

    const mapped = listings.map((l: any) => ({
      listingKey: l.listingKey,
      slugAddress: l.slugAddress,
      unparsedAddress: l.unparsedAddress || "Unknown Address",
      city: l.city || "",
      stateOrProvince: l.stateOrProvince || "CA",
      listPrice: l.listPrice || 0,
      bedroomsTotal: l.bedroomsTotal,
      bathroomsTotalInteger: l.bathroomsTotalInteger,
      livingArea: l.livingArea,
      primaryPhotoUrl: photoMap.get(l.listingKey) || null,
    }));

    return NextResponse.json({ listings: mapped });
  } catch (error) {
    console.error("Related listings error:", error);
    return NextResponse.json({ listings: [] });
  }
}
