// src/app/api/listings/nearby/route.ts
//
// Geographic-radius listing search. Uses a lat/lng bounding box
// against unified_listings — more reliable than subdivision/city
// name matching (which fails when the subdivision is unique or the
// city is sparsely indexed).
//
// Powers the inline nearby map on the chat ListingDetailCard.
// /api/listings/related stays for the production listing page's
// "similar listings" section which wants subdivision-name affinity;
// this route is for "what's geographically around here".
//
// Query: ?lat=33.7&lng=-116.3&radius=3&exclude=KEY&limit=5
//   - radius is in miles (default 3, capped at 25)
//   - exclude omits a specific listingKey (the subject)
//   - limit caps results (default 5, max 50)

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import UnifiedListing from "@/models/unified-listing";

const DEFAULT_RADIUS_MILES = 3;
const MAX_RADIUS_MILES = 25;
const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 50;

// Convert miles to lat/lng degrees at the given latitude. lat is
// constant ~69mi per degree; lng shrinks toward the poles.
function boundingBox(lat: number, lng: number, radiusMiles: number) {
  const dLat = radiusMiles / 69;
  const dLng = radiusMiles / (69 * Math.cos((lat * Math.PI) / 180));
  return {
    minLat: lat - dLat,
    maxLat: lat + dLat,
    minLng: lng - dLng,
    maxLng: lng + dLng,
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const lat = parseFloat(searchParams.get("lat") || "");
    const lng = parseFloat(searchParams.get("lng") || "");
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json(
        { error: "lat and lng query params are required" },
        { status: 400 }
      );
    }

    const radius = Math.min(
      parseFloat(searchParams.get("radius") || String(DEFAULT_RADIUS_MILES)) ||
        DEFAULT_RADIUS_MILES,
      MAX_RADIUS_MILES
    );
    const limit = Math.min(
      parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT)) ||
        DEFAULT_LIMIT,
      MAX_LIMIT
    );
    const exclude = searchParams.get("exclude") || undefined;

    const box = boundingBox(lat, lng, radius);

    await dbConnect();

    const query: any = {
      standardStatus: "Active",
      latitude: { $gte: box.minLat, $lte: box.maxLat },
      longitude: { $gte: box.minLng, $lte: box.maxLng },
    };
    if (exclude) query.listingKey = { $ne: exclude };

    // Sort by listPrice DESC so the visible cluster is consistent with
    // the rest of the UI (carousels also sort by price). Limit doubles
    // as the cap on the JS-side distance sort below.
    const docs = await UnifiedListing.find(query)
      .select(
        "listingKey slugAddress unparsedAddress city stateOrProvince listPrice bedroomsTotal bathroomsTotalInteger livingArea latitude longitude primaryPhotoUrl"
      )
      .sort({ listPrice: -1 })
      .limit(Math.max(limit * 3, 12)) // overfetch so we can rank by distance
      .lean();

    // Rank by Euclidean distance from subject (close enough at small
    // radii — no need for haversine here since we're sorting, not
    // measuring exact distances). Take the top `limit`.
    const ranked = (docs as any[])
      .map((d) => {
        const dLat = (d.latitude || 0) - lat;
        const dLng = (d.longitude || 0) - lng;
        return { d, distSq: dLat * dLat + dLng * dLng };
      })
      .sort((a, b) => a.distSq - b.distSq)
      .slice(0, limit)
      .map(({ d }) => ({
        listingKey: d.listingKey,
        slugAddress: d.slugAddress,
        unparsedAddress: d.unparsedAddress || "Unknown Address",
        city: d.city || "",
        stateOrProvince: d.stateOrProvince || "CA",
        listPrice: d.listPrice || 0,
        bedroomsTotal: d.bedroomsTotal,
        bathroomsTotalInteger: d.bathroomsTotalInteger,
        livingArea: d.livingArea,
        latitude: d.latitude,
        longitude: d.longitude,
        primaryPhotoUrl: d.primaryPhotoUrl || null,
      }));

    return NextResponse.json({
      listings: ranked,
      center: { lat, lng },
      radiusMiles: radius,
    });
  } catch (error) {
    console.error("[listings/nearby] error:", error);
    return NextResponse.json({ listings: [] }, { status: 200 });
  }
}
