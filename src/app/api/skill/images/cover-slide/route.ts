// src/app/api/skill/images/cover-slide/route.ts
//
// POST → render a templated cover slide (4:5 portrait) for an MLS listing.
//
// Templates live in src/lib/cover-templates/. The default is
// "simple-luxury". Each template accepts an accent color override so
// the same layout can run in different brand palettes.
//
// Auth: crt_live_ token with `landing_pages:write` scope (same risk tier
// as drafting an LP — generates real branded marketing content).

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import UnifiedListing from "@/models/unified-listing";
import { authenticateSkillRequest, requireScope, skillRateLimit } from "@/lib/skill-auth";
import { getTemplate } from "@/lib/cover-templates";
import { v2 as cloudinary } from "cloudinary";

const NO_STORE = { "Cache-Control": "no-store" };

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function bad(error: string, message: string, status = 400, details?: unknown) {
  return NextResponse.json({ error, message, details }, { status, headers: NO_STORE });
}

// Format $1,234,567 from a number or pass-through string.
function fmtPrice(p: any): string {
  if (typeof p === "number") {
    return "$" + p.toLocaleString("en-US");
  }
  return String(p || "");
}

function defaultHook(subdivision?: string | null, city?: string | null): string {
  if (subdivision && subdivision !== "Not Applicable" && subdivision !== "Not in a Development") {
    return `${subdivision.toUpperCase()} LUXURY`;
  }
  if (city) return `${city.toUpperCase()} LUXURY`;
  return "JUST LISTED";
}

function defaultBody(publicRemarks?: string | null): string {
  if (!publicRemarks) return "";
  // Take the first 1-2 sentences, max ~260 chars.
  const sentences = publicRemarks.split(/(?<=[.!?])\s+/);
  let out = "";
  for (const s of sentences) {
    if ((out + " " + s).trim().length > 260) break;
    out = (out + " " + s).trim();
  }
  return out;
}

export async function POST(req: NextRequest) {
  const auth = await authenticateSkillRequest(req);
  const denied = requireScope(auth, "landing_pages:write");
  if (denied) return denied;
  if (auth.ok === false) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  }
  const rl = skillRateLimit(auth, "write");
  if (rl) return rl;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad("invalid_json", "Body must be JSON.");
  }

  const listingKey = String(body.listingKey || "").trim();
  if (!listingKey) return bad("validation_failed", "listingKey is required.");

  const templateId = String(body.template || "simple-luxury").trim();
  const template = getTemplate(templateId);
  if (!template) return bad("unknown_template", `Template "${templateId}" is not registered.`);

  const accentColor = String(body.accentColor || "1C4A5A").replace(/^#/, "").trim();
  if (!/^[0-9a-fA-F]{6,8}$/.test(accentColor)) {
    return bad("invalid_color", `accentColor must be hex (e.g. "1C4A5A"). Got: ${accentColor}`);
  }

  // Optional copy overrides
  const hookOverride = body.hook ? String(body.hook).trim() : undefined;
  const bodyCopy = body.body ? String(body.body).trim() : undefined;
  const cityOverride = body.city ? String(body.city).trim() : undefined;

  // Optional photo index — which listing photo becomes the background.
  // If omitted, defaults to 8 (heuristic: GPS feeds front exteriors in later
  // positions). Front-exterior auto-detection via Gemini is a follow-up.
  const photoIndex = Number.isFinite(Number(body.photoIndex)) ? Number(body.photoIndex) : 8;

  await dbConnect();

  // Pull listing record
  const listing: any = await UnifiedListing.collection.findOne(
    { listingKey },
    {
      projection: {
        listingKey: 1,
        unparsedAddress: 1, city: 1, stateOrProvince: 1, postalCode: 1,
        subdivisionName: 1,
        listPrice: 1, currentPrice: 1, currentPricePublic: 1,
        bedroomsTotal: 1, bedsTotal: 1, bathroomsTotalInteger: 1, bathsTotal: 1,
        livingArea: 1,
        publicRemarks: 1,
        listAgentName: 1, listOfficeName: 1,
      },
    }
  );
  if (!listing) return bad("listing_not_found", `Unknown listingKey: ${listingKey}`, 404);

  // Pull agent headshot
  const userDoc: any = await User.findById(auth.user._id).select("agentProfile").lean();
  const headshotPublicIdRaw: string =
    userDoc?.agentProfile?.headshotPublicId ||
    extractPublicIdFromUrl(userDoc?.agentProfile?.headshot) ||
    "";
  if (!headshotPublicIdRaw) {
    return bad("no_headshot", "Agent profile has no headshot. Add one in Settings → Profile.");
  }

  // Fetch the source photo URL and upload to Cloudinary as our base asset
  const photosRes = await fetch(
    `${req.nextUrl.origin}/api/listings/${encodeURIComponent(listingKey)}/photos`
  );
  if (!photosRes.ok) {
    return bad("listing_photos_unavailable", `Could not fetch photos for ${listingKey}`, 404);
  }
  const photosData: any = await photosRes.json();
  const photos = photosData.photos || [];
  if (photos.length === 0) {
    return bad("no_photos", "Listing has no photos to use as the cover background.");
  }
  const photo = photos[Math.min(Math.max(0, photoIndex), photos.length - 1)];
  const sourceUrl = photo.uri2048 || photo.uri1280 || photo.uri1024 || photo.url;
  if (!sourceUrl) return bad("no_photo_url", "Selected photo has no usable URL.");

  let baseUpload: any;
  try {
    baseUpload = await cloudinary.uploader.upload(sourceUrl, {
      folder: `jpsrealtor/ai-staged/${listingKey}/covers`,
      public_id: `${templateId}-${Date.now()}`,
    });
  } catch (err: any) {
    return bad("cloudinary_upload_failed", err?.message || "Upload failed", 502);
  }

  // Resolve template inputs
  const beds = listing.bedroomsTotal ?? listing.bedsTotal ?? null;
  const baths = listing.bathroomsTotalInteger ?? listing.bathsTotal ?? null;
  const sqft = listing.livingArea ?? null;
  const specs = [
    beds ? `${beds} BD` : null,
    baths ? `${baths} BA` : null,
    sqft ? `${sqft.toLocaleString("en-US")} SQFT` : null,
  ].filter(Boolean).join("  |  ");

  const data = {
    basePhotoPublicId: baseUpload.public_id,
    headshotPublicId: headshotPublicIdRaw,
    hook: hookOverride || defaultHook(listing.subdivisionName, listing.city),
    city: (cityOverride || listing.city || "").toUpperCase(),
    price: fmtPrice(listing.currentPrice ?? listing.currentPricePublic ?? listing.listPrice),
    addressLine1: (parseAddressLines(listing.unparsedAddress).line1 || "").toUpperCase(),
    addressLine2: [
      listing.city,
      listing.stateOrProvince,
    ].filter(Boolean).join(", ").toUpperCase(),
    specs,
    body: bodyCopy || defaultBody(listing.publicRemarks),
    listingCredit: buildListingCredit(listing.listAgentName, listing.listOfficeName),
    accentColor,
  };

  const transformations = template.build(data as any);
  const url = cloudinary.url(baseUpload.public_id, { transformation: transformations });

  return NextResponse.json(
    {
      url,
      template: template.id,
      accentColor,
      listingKey,
      data: {
        hook: data.hook,
        city: data.city,
        price: data.price,
        addressLine1: data.addressLine1,
        addressLine2: data.addressLine2,
        specs: data.specs,
        body: data.body,
        listingCredit: data.listingCredit,
      },
      basePhotoPublicId: baseUpload.public_id,
    },
    { headers: NO_STORE }
  );
}

function extractPublicIdFromUrl(url?: string | null): string | null {
  if (!url) return null;
  // e.g. https://res.cloudinary.com/<cloud>/image/upload/v1774327194/headshots/head-shot-2026.png
  const m = url.match(/\/image\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-z0-9]+)?$/i);
  return m ? m[1] : null;
}

function parseAddressLines(unparsed?: string | null): { line1: string; line2: string } {
  if (!unparsed) return { line1: "", line2: "" };
  // "75809 Via Pisa, Indian Wells, CA 92210" → "75809 VIA PISA" + "INDIAN WELLS, CA 92210"
  const parts = unparsed.split(",").map((s) => s.trim()).filter(Boolean);
  return {
    line1: parts[0] || "",
    line2: parts.slice(1).join(", "),
  };
}

function buildListingCredit(agent?: string | null, office?: string | null): string {
  if (!agent && !office) return "";
  if (agent && office) return `Listed by ${agent}  ·  ${office}`;
  return `Listed by ${agent || office}`;
}

