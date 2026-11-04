// GET /api/agent/listing-posts/search?q=123+main
//
// Address autocomplete for the CMS "listing blog post" generator. Searches
// ACTIVE listings in unified_listings only. Session-gated: it is an agent tool,
// not a public search (the public chat autocomplete is /api/listings/quick-search).

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { searchActiveListingsByAddress } from "@/lib/listings/listing-post";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE });
  }
  const q = (req.nextUrl.searchParams.get("q") || "").slice(0, 120);
  try {
    const results = await searchActiveListingsByAddress(q);
    return NextResponse.json({ results }, { headers: NO_STORE });
  } catch (err) {
    console.error("[listing-posts/search]", err);
    return NextResponse.json({ error: "Search failed" }, { status: 500, headers: NO_STORE });
  }
}
