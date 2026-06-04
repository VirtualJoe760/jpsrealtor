// src/app/api/skill/listings/[listingKey]/photos/route.ts
//
// GET → ordered photo URLs for a listing. Used by Claude to pick a hero
// photo URL when drafting a landing page about this listing.

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import { authenticateSkillRequest, requireScope, skillRateLimit } from "@/lib/skill-auth";
import UnifiedListing from "@/models/unified-listing";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ listingKey: string }> }
) {
  const auth = await authenticateSkillRequest(req);
  const denied = requireScope(auth, "listings:read");
  if (denied) return denied;
  if (auth.ok === false) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  const rl = skillRateLimit(auth, "read");
  if (rl) return rl;

  const { listingKey } = await params;
  await dbConnect();
  const l: any = await UnifiedListing.findOne({ listingKey }).select("media").lean();
  if (!l) {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
  }

  const media: any[] = Array.isArray(l.media) ? l.media : [];
  const photos = media
    .filter((m) => !m.MediaCategory || m.MediaCategory === "Photo")
    .sort((a, b) => (a.Order ?? 0) - (b.Order ?? 0))
    .map((m) => ({
      order: m.Order ?? null,
      caption: m.Caption || m.ShortDescription || null,
      // Prefer the largest URL we have; fall through smaller ones.
      url: m.Uri2048 || m.Uri1600 || m.Uri1280 || m.Uri1024 || m.MediaURL || m.UriLarge || null,
      thumbUrl: m.UriThumb || m.Uri300 || m.Uri640 || null,
      width: m.ImageWidth ?? null,
      height: m.ImageHeight ?? null,
    }))
    .filter((p) => p.url);

  return NextResponse.json({ listingKey, photos, count: photos.length }, { headers: NO_STORE });
}
