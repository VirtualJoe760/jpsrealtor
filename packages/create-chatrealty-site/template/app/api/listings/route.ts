// Proxy: browser → this route → ChatRealty search API (token added server-side).
// The client (filters, map) calls /api/listings so the token never leaves the
// server.

import { NextRequest, NextResponse } from "next/server";
import { searchListings, ChatRealtyError, REVALIDATE } from "@/lib/chatrealty";
import type { ListingFilters } from "@/lib/types";

export const dynamic = "force-dynamic";

// Public listing data — identical for every visitor, so let the agent's
// Cloudflare (or any CDN) edge-cache it, keyed by the full query string. Never
// used for anything user-specific, so there's no cache-leak risk. Favorites,
// leads, and chat stay no-store on their own routes.
const PUBLIC_CACHE = `public, s-maxage=${REVALIDATE.listings}, stale-while-revalidate=600`;

function n(v: string | null): number | undefined {
  if (v === null || v === "") return undefined;
  const x = Number(v);
  return Number.isFinite(x) ? x : undefined;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const filters: ListingFilters = {
    city: sp.get("city") || undefined,
    subdivision: sp.get("subdivision") || undefined,
    propertyType: sp.get("propertyType") || undefined,
    minPrice: n(sp.get("minPrice")),
    maxPrice: n(sp.get("maxPrice")),
    minBeds: n(sp.get("minBeds")),
    minBaths: n(sp.get("minBaths")),
    hasPool: sp.get("hasPool") === "true" ? true : sp.get("hasPool") === "false" ? false : undefined,
    near: sp.get("near") || undefined,
    radiusMiles: n(sp.get("radiusMiles")),
    limit: n(sp.get("limit")),
    skip: n(sp.get("skip")),
  };

  try {
    const result = await searchListings(filters);
    return NextResponse.json(result, { headers: { "Cache-Control": PUBLIC_CACHE } });
  } catch (e) {
    const status = e instanceof ChatRealtyError ? e.status : 500;
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Search failed" },
      { status, headers: { "Cache-Control": "no-store" } }
    );
  }
}
