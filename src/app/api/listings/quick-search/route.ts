import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import { multiSourceSearch } from "@/lib/search/multi-source-search";

/**
 * GET /api/listings/quick-search?q=desi+drive
 *
 * Unified entity autocomplete used by the chat input.
 * Combines (in parallel):
 *   - $text search on the pre-built `search_index` collection (sub-50ms)
 *   - Live regex on counties + regions (gap fill — not in search_index)
 *   - Prefix regex on cities + subdivisions (gap fill — $text can't prefix-match)
 *
 * See src/lib/search/multi-source-search.ts for the merge / dedupe / rank logic.
 *
 * Response shape: { results: SearchResult[] } where each item carries BOTH
 * the new field names (price/beds/baths) and the legacy names
 * (listPrice/bedrooms/bathrooms) for back-compat with the existing
 * ChatInput.tsx consumer during the rollout.
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() || "";
  if (q.length < 2) return NextResponse.json({ results: [] });

  await dbConnect();
  const results = await multiSourceSearch(q, { limit: 8 });

  return NextResponse.json(
    { results },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
  );
}
