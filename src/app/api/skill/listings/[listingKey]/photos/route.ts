// src/app/api/skill/listings/[listingKey]/photos/route.ts
//
// GET → ordered photo URLs for a listing. Used by Claude to pick a hero
// photo URL when drafting a landing page about this listing.

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import { authenticateSkillRequest, requireScope, skillRateLimit } from "@/lib/skill-auth";
import { tenantNotReadyResponse } from "@/lib/skill/tenant-read";
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
  // Per-tenant isolation: a tenant-bound token must not read the shared dogfood
  // dataset through this not-yet-ported route. Refuse cleanly (no leak).
  if (auth.ok && (auth as any).tenantId) return tenantNotReadyResponse("Listing photos");

  const { listingKey } = await params;

  // Default to 12 photos — plenty for hero-pick + a few alternates without
  // dumping 60+ URLs into Claude's context. Cap at 60.
  const sp = req.nextUrl.searchParams;
  const limitParam = Number(sp.get("limit"));
  const limit = Number.isFinite(limitParam) && limitParam > 0
    ? Math.min(60, Math.floor(limitParam))
    : 12;

  await dbConnect();
  const l: any = await UnifiedListing.findOne({ listingKey }).select("media").lean();
  if (!l) {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
  }

  // Media items are stored in camelCase per the photo sync pipeline. The
  // original code read PascalCase (Uri800, Caption, etc.) and silently
  // returned [] for every listing. Both casings tried below for forward
  // compatibility with anything legacy that hasn't been re-synced.
  const media: any[] = Array.isArray(l.media) ? l.media : [];
  const photos = media
    .filter((m) => {
      const cat = m.mediaCategory || m.MediaCategory;
      return !cat || cat === "Photo";
    })
    .sort((a, b) => ((a.order ?? a.Order) ?? 0) - ((b.order ?? b.Order) ?? 0))
    .map((m) => ({
      order: m.order ?? m.Order ?? null,
      caption: m.caption || m.Caption || m.shortDescription || m.ShortDescription || null,
      // Prefer the largest URL we have; fall through smaller ones.
      url:
        m.uri2048 || m.uri1600 || m.uri1280 || m.uri1024 || m.uriLarge ||
        m.Uri2048 || m.Uri1600 || m.Uri1280 || m.Uri1024 || m.UriLarge || m.MediaURL ||
        null,
      thumbUrl:
        m.uriThumb || m.uri300 || m.uri640 ||
        m.UriThumb || m.Uri300 || m.Uri640 ||
        null,
      width: m.imageWidth ?? m.ImageWidth ?? null,
      height: m.imageHeight ?? m.ImageHeight ?? null,
    }))
    .filter((p) => p.url);

  const totalAvailable = photos.length;
  const capped = photos.slice(0, limit);

  return NextResponse.json(
    {
      listingKey,
      photos: capped,
      count: capped.length,
      totalAvailable,
      truncated: totalAvailable > capped.length,
    },
    { headers: NO_STORE }
  );
}
