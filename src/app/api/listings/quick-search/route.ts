import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import UnifiedListing from "@/models/unified-listing";
import Subdivision from "@/models/subdivisions";
import { City } from "@/models/cities";

/**
 * GET /api/listings/quick-search?q=desi+drive
 *
 * Fast autocomplete for the chat input. No media, minimal fields,
 * uses slugAddress (indexed, lowercase) to avoid collection scans.
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() || "";
  if (q.length < 2) return NextResponse.json({ results: [] });

  await dbConnect();

  const slug = q.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const startsWithNumber = /^\d/.test(slug);
  const slugRegex = startsWithNumber ? new RegExp(`^${slug}`) : new RegExp(slug);

  // Run listing + subdivision + city searches in parallel
  const [listings, subdivisions, cities] = await Promise.all([
    UnifiedListing.find(
      { slugAddress: slugRegex, standardStatus: "Active" },
      {
        listingKey: 1,
        slugAddress: 1,
        unparsedAddress: 1,
        listPrice: 1,
        bedroomsTotal: 1,
        bathroomsTotalDecimal: 1,
        livingArea: 1,
        city: 1,
        subdivisionName: 1,
        primaryPhotoUrl: 1,
      }
    )
      .sort({ listPrice: -1 })
      .limit(5)
      .lean(),

    Subdivision.find(
      { slug: { $regex: slug } },
      { name: 1, slug: 1, city: 1 }
    )
      .limit(3)
      .lean(),

    City.find(
      { name: { $regex: q, $options: "i" } },
      { name: 1, totalListings: 1 }
    )
      .limit(3)
      .lean(),
  ]);

  const results: any[] = [];

  // Listings first
  for (const l of listings as any[]) {
    results.push({
      type: "listing",
      label: l.unparsedAddress || l.slugAddress,
      slug: l.slugAddress,
      listPrice: l.listPrice,
      bedrooms: l.bedroomsTotal,
      bathrooms: l.bathroomsTotalDecimal,
      sqft: l.livingArea,
      photo: l.primaryPhotoUrl || null,
      city: l.city,
    });
  }

  // Subdivisions
  for (const s of subdivisions as any[]) {
    results.push({
      type: "subdivision",
      label: s.name,
      city: s.city,
    });
  }

  // Cities
  for (const c of cities as any[]) {
    results.push({
      type: "city",
      label: c.name,
      totalListings: c.totalListings || 0,
    });
  }

  return NextResponse.json(
    { results: results.slice(0, 8) },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
  );
}
