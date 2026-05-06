// src/app/api/listings/featured/route.ts
//
// Theme-transition listing showcase. Returns active eXp Realty
// residential sale listings near a center point. Used by
// ThemeContext.fetchFeaturedListings to populate the property
// overlay shown during theme switches.
//
// Previously this returned Joseph's team listings (filtered by
// listAgentKey). Repurposed to surface the broader eXp brokerage
// nearby the user, so the showcase is location-relevant rather
// than always the same 15 properties.
//
// Query: ?lat=33.7&lng=-116.3&radius=5
//   - lat/lng required (caller resolves them via geolocation +
//     Palm Desert fallback)
//   - radius in miles (default 5, capped at 500)
//
// Cache: per-coord URL gets 1hr CDN cache. ThemeContext also
// caches the response in sessionStorage so the API is only hit
// once per session per (lat,lng,radius) tuple.

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import UnifiedListing from '@/models/unified-listing';

// "eXp" alone catches "Century 21 EXPERIENCE" because of regex
// case-insensitivity, so anchor on `eXp` followed by whitespace.
// Captures all the variants seen in production:
//   "eXp Realty of California Inc"
//   "eXp Realty of California, Inc."
//   "eXp Realty of Greater Los Angeles"
//   "eXp Realty of Southern California, Inc"
//   etc. (~15 spelling/punct variants under one brokerage)
const EXP_OFFICE_REGEX = /^e[Xx]p\s/i;

const DEFAULT_RADIUS_MILES = 5;
const MAX_RADIUS_MILES = 500;
const RESULT_LIMIT = 15;

// Convert miles to lat/lng degrees at the given latitude. Latitude
// is constant ~69mi per degree; longitude shrinks toward the poles.
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
    const lat = parseFloat(searchParams.get('lat') || '');
    const lng = parseFloat(searchParams.get('lng') || '');
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json(
        { success: false, error: 'lat and lng required', listings: [] },
        { status: 400 }
      );
    }

    const radius = Math.min(
      parseFloat(searchParams.get('radius') || String(DEFAULT_RADIUS_MILES)) ||
        DEFAULT_RADIUS_MILES,
      MAX_RADIUS_MILES
    );
    const box = boundingBox(lat, lng, radius);

    await dbConnect();

    const docs = await UnifiedListing.find({
      standardStatus: 'Active',
      propertyType: 'A',
      listPrice: { $gt: 100000 },
      listOfficeName: { $regex: EXP_OFFICE_REGEX },
      latitude: { $gte: box.minLat, $lte: box.maxLat },
      longitude: { $gte: box.minLng, $lte: box.maxLng },
    })
      .select(
        // Project only what the overlay renders. listAgentName +
        // first/last cover both the composed and split forms — we
        // pick whichever is populated below.
        'listingKey unparsedAddress address city listPrice photos ' +
          'bedsTotal bathroomsTotalInteger livingArea propertySubType ' +
          'listAgentName listAgentFirstName listAgentLastName listOfficeName ' +
          'latitude longitude'
      )
      .sort({ listPrice: -1 }) // wider price slice; we'll re-rank below
      .limit(RESULT_LIMIT * 4) // overfetch — we filter for photo + sort by distance
      .lean();

    // Filter to listings that actually have a photo + aren't co-op /
    // timeshare (low-quality showcase material).
    const usable = (docs as any[]).filter(
      (l) =>
        l.photos?.length > 0 &&
        !['Co-Ownership', 'Timeshare'].includes(l.propertySubType)
    );

    // Sort by Euclidean distance from the center, take top N. Cheap
    // approximation — fine at small radii since we only care about
    // ordering, not exact distances.
    const ranked = usable
      .map((l) => {
        const dLat = (l.latitude || 0) - lat;
        const dLng = (l.longitude || 0) - lng;
        return { l, distSq: dLat * dLat + dLng * dLng };
      })
      .sort((a, b) => a.distSq - b.distSq)
      .slice(0, RESULT_LIMIT)
      .map(({ l }) => l);

    const featured = ranked.map((listing: any) => {
      const primaryPhoto =
        listing.photos?.find((p: any) => p.primary) || listing.photos?.[0];

      // Compose agent name. Some MLS sources populate listAgentName
      // (full), others only first/last. Prefer the composed form,
      // fall back to "First Last", fall back to empty string.
      const composedName =
        listing.listAgentName ||
        [listing.listAgentFirstName, listing.listAgentLastName]
          .filter(Boolean)
          .join(' ') ||
        '';

      return {
        listingKey: listing.listingKey,
        address: listing.unparsedAddress || listing.address,
        city: listing.city,
        price: listing.listPrice,
        beds: listing.bedsTotal,
        baths: listing.bathroomsTotalInteger,
        sqft: listing.livingArea,
        photoUrl:
          primaryPhoto?.uri1600 ||
          primaryPhoto?.uri1280 ||
          primaryPhoto?.uri1024 ||
          primaryPhoto?.uriLarge,
        agentName: composedName,
        officeName: listing.listOfficeName,
      };
    }).filter((l) => l.photoUrl);

    return NextResponse.json(
      {
        success: true,
        count: featured.length,
        radiusMiles: radius,
        center: { lat, lng },
        listings: featured,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
        },
      }
    );
  } catch (error: any) {
    console.error('Error fetching featured listings:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch featured listings',
        listings: [],
      },
      { status: 500 }
    );
  }
}
