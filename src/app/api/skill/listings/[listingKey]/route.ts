// src/app/api/skill/listings/[listingKey]/route.ts
//
// GET → full listing detail. Most fields readers care about for drafting LP /
// article content: address, status, price, beds/baths/sqft, year, school
// district, HOA, public remarks, features, photos count.

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import { authenticateSkillRequest, requireScope, skillRateLimit } from "@/lib/skill-auth";
import UnifiedListing from "@/models/unified-listing";
import { resolveAdapter } from "@/lib/tenant/resolve-connection";
import { mapErrorToResponse } from "@/lib/skill-api/errors";

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

  // Product-tenant path (additive): read the customer's own listing from their
  // Neon DB. No tenantId -> the unchanged legacy Mongo path below.
  if (auth.ok && auth.tenantId) {
    try {
      const adapter = await resolveAdapter(auth.tenantId);
      const dto = await adapter.listings.get(listingKey);
      if (!dto) {
        return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
      }
      return NextResponse.json(dto, { headers: NO_STORE });
    } catch (e) {
      return mapErrorToResponse(e);
    }
  }

  await dbConnect();
  const l: any = await UnifiedListing.findOne({ listingKey })
    .select(
      "listingKey unparsedAddress city stateOrProvince postalCode subdivisionName " +
      "propertyType propertyTypeLabel propertySubType standardStatus listPrice " +
      "originalListPrice bedroomsTotal bedsTotal " +
      "bathroomsTotalInteger bathroomsTotalDecimal bathsTotal " +
      "livingArea lotSizeArea lotSizeUnits yearBuilt stories levels " +
      "associationFee associationFeeFrequency associationYn communityFeatures " +
      // Both casings on pool/spa — the Python sync writes RESO names verbatim
      // (poolYN / spaYN, capital N), but the model declared lowercase. Strict
      // mode means the lowercase fields are always empty. Reading both.
      "poolYn poolYN pool poolFeatures poolPrivateYn spa spaYn spaYN spaFeatures " +
      "view garageSpaces parkingTotal heating cooling " +
      "daysOnMarket onMarketDate publicRemarks supplement media OpenHouses " +
      // Extras worth surfacing: post-reduction price, coordinates for map,
      // listing-side agent / office for buyer-side context.
      "currentPrice currentPricePublic latitude longitude coordinates " +
      "listAgentName listOfficeName"
    )
    .lean();

  if (!l) {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
  }

  // All listing links point to the ChatRealty hub (per product decision).
  const siteBase = "https://www.chatrealty.io";
  const rawPhoto =
    l.media?.[0]?.uriLarge ||
    l.media?.[0]?.uri1024 ||
    l.media?.[0]?.uri800 ||
    l.media?.[0]?.uri640 ||
    l.media?.[0]?.MediaURL ||
    l.media?.[0]?.Uri800 ||
    null;

  return NextResponse.json(
    {
      listingKey: l.listingKey,
      address: l.unparsedAddress || null,
      city: l.city || null,
      state: l.stateOrProvince || null,
      postalCode: l.postalCode || null,
      subdivision: l.subdivisionName || null,
      propertyType: l.propertyTypeLabel || l.propertyType || null,
      propertySubType: l.propertySubType || null,
      status: l.standardStatus || null,
      listPrice: l.listPrice ?? null,
      currentPrice: l.currentPrice ?? l.currentPricePublic ?? l.listPrice ?? null,
      originalListPrice: l.originalListPrice ?? null,
      beds: l.bedroomsTotal ?? l.bedsTotal ?? null,
      baths: l.bathroomsTotalInteger ?? l.bathsTotal ?? null,
      bathsDecimal: l.bathroomsTotalDecimal ?? null,
      sqft: l.livingArea ?? null,
      lotSize: l.lotSizeArea ?? null,
      lotSizeUnits: l.lotSizeUnits || null,
      yearBuilt: l.yearBuilt ?? null,
      // stories is essentially never populated in the feed; the equivalent
      // info lives in `levels` ("One", "Two", "Ground"). Removed to avoid
      // false-null noise. Use levels.
      levels: l.levels || null,
      hoaFee: l.associationFee ?? null,
      hoaFeeFrequency: l.associationFeeFrequency || null,
      communityFeatures: l.communityFeatures || null,
      // Pool / spa booleans use RESO casing in the DB (poolYN, spaYN — capital N),
      // but the legacy model schema declared poolYn/spaYn — those are always empty.
      // Read both, plus the features strings, plus the privacy variant.
      pool: !!(l.poolYN || l.poolYn || l.pool || l.poolPrivateYn || (l.poolFeatures && !/^\s*none\s*$/i.test(l.poolFeatures))),
      poolFeatures: l.poolFeatures || null,
      spa: !!(l.spaYN || l.spaYn || l.spa || (l.spaFeatures && !/^\s*none\s*$/i.test(l.spaFeatures))),
      spaFeatures: l.spaFeatures || null,
      view: l.view || null,
      garageSpaces: l.garageSpaces ?? null,
      parkingTotal: l.parkingTotal ?? null,
      heating: l.heating || null,
      cooling: l.cooling || null,
      // daysOnMarket isn't sync'd into the doc. Derive from onMarketDate
      // (which is always present on active listings).
      daysOnMarket:
        l.daysOnMarket ??
        (l.onMarketDate
          ? Math.max(0, Math.floor((Date.now() - new Date(l.onMarketDate).getTime()) / 86400000))
          : null),
      onMarketDate: l.onMarketDate || null,
      publicRemarks: l.publicRemarks || null,
      supplement: l.supplement || null,
      photoCount: Array.isArray(l.media) ? l.media.length : 0,
      primaryPhotoUrl: rawPhoto,
      // Render-ready optimized thumbnail for an <img> in a Claude artifact.
      thumbUrl: rawPhoto
        ? `${siteBase}/_next/image?url=${encodeURIComponent(rawPhoto)}&w=640&q=75`
        : null,
      latitude: typeof l.latitude === "number" ? l.latitude : l.coordinates?.[1] ?? null,
      longitude: typeof l.longitude === "number" ? l.longitude : l.coordinates?.[0] ?? null,
      listAgentName: l.listAgentName || null,
      listOfficeName: l.listOfficeName || null,
      hasOpenHouses: Array.isArray(l.OpenHouses) && l.OpenHouses.length > 0,
      slug: `/mls-listings/${l.listingKey}`,
      detailUrl: `${siteBase}/mls-listings/${l.listingKey}`,
    },
    { headers: NO_STORE }
  );
}
