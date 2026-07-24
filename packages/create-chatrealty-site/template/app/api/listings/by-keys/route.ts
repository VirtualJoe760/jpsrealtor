// Proxy: resolve a set of listing keys → full listing summaries. Used to
// hydrate a signed-in visitor's server-synced favorites that were saved on
// another device (so this device has the key but not the listing object).
// Public listing data, but keyed to an arbitrary set → keep it no-store.

import { NextRequest, NextResponse } from "next/server";
import { getListing } from "@/lib/chatrealty";
import type { ListingSummary } from "@/lib/types";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store" };
const MAX_KEYS = 100;

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("keys") || "";
  const keys = raw
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean)
    .slice(0, MAX_KEYS);
  if (keys.length === 0) {
    return NextResponse.json({ items: [] }, { headers: NO_STORE });
  }
  // getListing returns the fuller ListingDetail; a ListingSummary is a subset,
  // so these render fine in cards/lists. Missing/removed keys drop out.
  const settled = await Promise.all(keys.map((k) => getListing(k).catch(() => null)));
  const items = settled.filter(Boolean) as ListingSummary[];
  return NextResponse.json({ items }, { headers: NO_STORE });
}
