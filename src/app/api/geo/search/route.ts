// src/app/api/geo/search/route.ts
//
// GET /api/geo/search?q=<query>
//
// Server-side proxy to OpenStreetMap Nominatim. Done server-side because:
//   1. Nominatim's usage policy requires a real User-Agent identifying the
//      application — browsers can't set User-Agent on fetch.
//   2. We can cache + rate-limit centrally.
//   3. We strip the response to only the fields the client needs.
//
// Free service. Be polite — debounce client-side and don't hammer it.

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    house_number?: string;
    road?: string;
    city?: string;
    town?: string;
    village?: string;
    hamlet?: string;
    suburb?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country?: string;
    country_code?: string;
  };
}

// Map US state full names → 2-letter codes (Nominatim returns full names)
const STATE_NAME_TO_CODE: Record<string, string> = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA",
  colorado: "CO", connecticut: "CT", delaware: "DE", "district of columbia": "DC",
  florida: "FL", georgia: "GA", hawaii: "HI", idaho: "ID", illinois: "IL",
  indiana: "IN", iowa: "IA", kansas: "KS", kentucky: "KY", louisiana: "LA",
  maine: "ME", maryland: "MD", massachusetts: "MA", michigan: "MI", minnesota: "MN",
  mississippi: "MS", missouri: "MO", montana: "MT", nebraska: "NE", nevada: "NV",
  "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM", "new york": "NY",
  "north carolina": "NC", "north dakota": "ND", ohio: "OH", oklahoma: "OK",
  oregon: "OR", pennsylvania: "PA", "rhode island": "RI", "south carolina": "SC",
  "south dakota": "SD", tennessee: "TN", texas: "TX", utah: "UT", vermont: "VT",
  virginia: "VA", washington: "WA", "west virginia": "WV", wisconsin: "WI",
  wyoming: "WY",
};

function normalizeState(state?: string): string {
  if (!state) return "";
  if (state.length === 2) return state.toUpperCase();
  return STATE_NAME_TO_CODE[state.toLowerCase()] || state;
}

function pickCity(addr: NominatimResult["address"]): string {
  if (!addr) return "";
  return (
    addr.city ||
    addr.town ||
    addr.village ||
    addr.hamlet ||
    addr.suburb ||
    addr.county ||
    ""
  );
}

function buildStreet(addr: NominatimResult["address"]): string {
  if (!addr) return "";
  const parts = [addr.house_number, addr.road].filter(Boolean);
  return parts.join(" ");
}

export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get("q")?.trim() || "";
    if (q.length < 3) {
      return NextResponse.json({ results: [] });
    }

    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", q);
    url.searchParams.set("format", "json");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("limit", "5");
    url.searchParams.set("countrycodes", "us");

    const res = await fetch(url.toString(), {
      headers: {
        // Nominatim requires a real UA per their policy.
        "User-Agent": "jpsrealtor.com (admin@jpsrealtor.com)",
        Accept: "application/json",
      },
      // Cache successful queries for 24h at the edge
      next: { revalidate: 86400 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { results: [], error: `Nominatim error ${res.status}` },
        { status: 502 }
      );
    }

    const raw = (await res.json()) as NominatimResult[];
    const results = raw.map((r) => ({
      placeId: r.place_id,
      label: r.display_name,
      street: buildStreet(r.address),
      city: pickCity(r.address),
      state: normalizeState(r.address?.state),
      zip: r.address?.postcode || "",
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
    }));

    return NextResponse.json(
      { results },
      {
        headers: {
          "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
        },
      }
    );
  } catch (err: any) {
    console.error("[geo/search] Error:", err);
    return NextResponse.json(
      { results: [], error: err?.message || "Search failed" },
      { status: 500 }
    );
  }
}
