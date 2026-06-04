// src/app/api/skill/listings/[listingKey]/route.ts
//
// GET → full listing detail. Most fields readers care about for drafting LP /
// article content: address, status, price, beds/baths/sqft, year, school
// district, HOA, public remarks, features, photos count.

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
  const l: any = await UnifiedListing.findOne({ listingKey })
    .select(
      "listingKey unparsedAddress city stateOrProvince postalCode subdivisionName " +
      "propertyType propertyTypeLabel propertySubType standardStatus listPrice " +
      "originalListPrice bedroomsTotal bedsTotal " +
      "bathroomsTotalInteger bathroomsTotalDecimal bathsTotal " +
      "livingArea lotSizeArea lotSizeUnits yearBuilt stories levels " +
      "associationFee associationFeeFrequency associationYn communityFeatures " +
      "poolYn spa view garageSpaces parkingTotal heating cooling " +
      "daysOnMarket onMarketDate publicRemarks supplement media OpenHouses"
    )
    .lean();

  if (!l) {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
  }

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
      originalListPrice: l.originalListPrice ?? null,
      beds: l.bedroomsTotal ?? l.bedsTotal ?? null,
      baths: l.bathroomsTotalInteger ?? l.bathsTotal ?? null,
      bathsDecimal: l.bathroomsTotalDecimal ?? null,
      sqft: l.livingArea ?? null,
      lotSize: l.lotSizeArea ?? null,
      lotSizeUnits: l.lotSizeUnits || null,
      yearBuilt: l.yearBuilt ?? null,
      stories: l.stories ?? null,
      levels: l.levels || null,
      hoaFee: l.associationFee ?? null,
      hoaFeeFrequency: l.associationFeeFrequency || null,
      communityFeatures: l.communityFeatures || null,
      pool: !!l.poolYn,
      spa: !!l.spa,
      view: l.view || null,
      garageSpaces: l.garageSpaces ?? null,
      parkingTotal: l.parkingTotal ?? null,
      heating: l.heating || null,
      cooling: l.cooling || null,
      daysOnMarket: l.daysOnMarket ?? null,
      onMarketDate: l.onMarketDate || null,
      publicRemarks: l.publicRemarks || null,
      supplement: l.supplement || null,
      photoCount: Array.isArray(l.media) ? l.media.length : 0,
      primaryPhotoUrl:
        l.media?.[0]?.uriLarge ||
        l.media?.[0]?.uri1024 ||
        l.media?.[0]?.uri800 ||
        l.media?.[0]?.uri640 ||
        l.media?.[0]?.MediaURL ||
        l.media?.[0]?.Uri800 ||
        null,
      hasOpenHouses: Array.isArray(l.OpenHouses) && l.OpenHouses.length > 0,
      slug: `/mls-listings/${l.listingKey}`,
    },
    { headers: NO_STORE }
  );
}
