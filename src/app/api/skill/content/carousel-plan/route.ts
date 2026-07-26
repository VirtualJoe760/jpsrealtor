// src/app/api/skill/content/carousel-plan/route.ts
//
// POST → everything needed to author a 10-slide listing carousel, in one call.
//
// THE GAP THIS CLOSES
// -------------------
// Rendering has been reachable since the carousel-slide route shipped, but
// ASSEMBLY was not: nothing turned a listingKey into the material for a post.
// The four carousels that shipped were built by hand-writing a config in
// scripts/data/carousels/*.js -- listing facts, photo picks, CMA figures and
// copy, all gathered manually.
//
// This route does the GATHERING half. It returns listing facts, the photo list
// with indices, real subdivision CMA numbers PRE-FORMATTED for the stat card,
// and the agent's brand marks -- plus a slot-by-slot outline carrying the hard
// constraints each slide renderer enforces.
//
// It deliberately does NOT write copy. Claude writes the hook, room captions,
// text slides and CTA in the agent's voice; this supplies the facts so that
// copy is grounded and so the authored spec cannot violate a renderer limit
// (a 220-char paragraph, a 5th stat) only to be rejected ten calls later.
//
// Auth: crt_live_ token with `listings:read` -- this is a read/aggregate over
// data the agent can already reach via get_listing + get_subdivision_cma.

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import UnifiedListing from "@/models/unified-listing";
import Subdivision from "@/models/subdivisions";
import { authenticateSkillRequest, requireScope, skillRateLimit } from "@/lib/skill-auth";
import { tenantNotReadyResponse } from "@/lib/skill/tenant-read";

const NO_STORE = { "Cache-Control": "no-store" };

function bad(error: string, message: string, status = 400) {
  return NextResponse.json({ error, message }, { status, headers: NO_STORE });
}

/** "$2,599,000" */
function fmtFull(n: any): string {
  const v = Number(n);
  return Number.isFinite(v) ? "$" + Math.round(v).toLocaleString("en-US") : "";
}

/** "$2.36M" / "$570K" / "$570" — the compact form the stat card uses. */
function fmtCompact(n: any): string {
  const v = Number(n);
  if (!Number.isFinite(v)) return "";
  if (v >= 1_000_000) return "$" + (v / 1_000_000).toFixed(2).replace(/\.?0+$/, "") + "M";
  if (v >= 10_000) return "$" + Math.round(v / 1000) + "K";
  return "$" + Math.round(v).toLocaleString("en-US");
}

export async function POST(req: NextRequest) {
  const auth = await authenticateSkillRequest(req);
  const denied = requireScope(auth, "listings:read");
  if (denied) return denied;
  if (auth.ok === false) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  }
  const rl = skillRateLimit(auth, "read");
  if (rl) return rl;
  if (auth.ok && (auth as any).tenantId) return tenantNotReadyResponse("Carousel planning");

  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad("invalid_json", "Body must be JSON.");
  }
  const listingKey = String(body.listingKey || "").trim();
  if (!listingKey) return bad("validation_failed", "listingKey is required.");

  await dbConnect();

  const listing: any = await UnifiedListing.collection.findOne(
    { listingKey },
    {
      projection: {
        listingKey: 1, unparsedAddress: 1, city: 1, stateOrProvince: 1,
        subdivisionName: 1, listPrice: 1, currentPrice: 1, currentPricePublic: 1,
        bedroomsTotal: 1, bedsTotal: 1, bathroomsTotalInteger: 1, bathsTotal: 1,
        livingArea: 1, lotSizeAcres: 1, yearBuilt: 1, publicRemarks: 1,
        listAgentName: 1, listOfficeName: 1, daysOnMarket: 1, propertyType: 1,
      },
    }
  );
  if (!listing) return bad("listing_not_found", `Unknown listingKey: ${listingKey}`, 404);

  // ---- agent brand marks -------------------------------------------------
  const userDoc: any = await User.findById(auth.user._id)
    .select("name licenseNumber agentProfile")
    .lean();
  const profile = userDoc?.agentProfile || {};
  const handle = profile?.socialMedia?.instagram
    ? `@${String(profile.socialMedia.instagram).replace(/^@/, "")}`
    : null;

  // ---- photos (indices are what create_listing_cover / staging accept) ----
  let photos: any[] = [];
  try {
    const r = await fetch(
      `${req.nextUrl.origin}/api/listings/${encodeURIComponent(listingKey)}/photos`
    );
    if (r.ok) {
      const d: any = await r.json();
      photos = (d.photos || []).map((p: any, i: number) => ({
        index: i,
        url: p.uri2048 || p.uri1280 || p.uri1024 || p.url || null,
      })).filter((p: any) => p.url);
    }
  } catch {
    /* non-fatal — the plan is still useful without the photo list */
  }

  // ---- subdivision CMA ---------------------------------------------------
  // Listings carry a subdivision NAME; stats live on the Subdivision doc.
  // Match on name within the listing's city so same-named tracts in different
  // cities don't cross-contaminate.
  let cma: any = { available: false, reason: "no subdivision on this listing" };
  const subName = String(listing.subdivisionName || "").trim();
  const GENERIC = ["", "not applicable", "not in a development", "unknown", "none"];
  if (!GENERIC.includes(subName.toLowerCase())) {
    const sub: any = await Subdivision.findOne({
      name: new RegExp(`^${subName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
      ...(listing.city ? { city: new RegExp(`^${String(listing.city).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") } : {}),
    })
      .select("name slug city cmaStats")
      .lean();

    const closed = sub?.cmaStats?.closed;
    if (!sub) {
      cma = { available: false, reason: `no subdivision record matched "${subName}"` };
    } else if (!closed?.count) {
      // Parent subdivisions (e.g. "PGA West") carry no leaf stats.
      cma = {
        available: false,
        slug: sub.slug,
        reason: `"${sub.name}" has no closed-sale stats — it may be a parent subdivision. Call get_subdivision_cma with its slug to inspect.`,
      };
    } else {
      const months = sub.cmaStats?.sampleWindow?.months || 12;
      const subjectPrice = Number(
        listing.currentPrice ?? listing.currentPricePublic ?? listing.listPrice
      );
      // NOTE: these are the pre-built nightly aggregate for the WHOLE tract --
      // no bed/price-band filter. The shipped carousels used band-filtered
      // comps from search_closed_listings instead (Villa Lima's card is
      // subheaded "4BR+ · $1.5M-$3.5M"). Same underlying sales -- verified,
      // top close agrees to the dollar -- but a broader, weaker comparison for
      // a listing near the top of its tract. `scopeNote` tells the caller when
      // to go get filtered comps instead. See docs/content-templates/
      // carousel-slides.md.
      cma = {
        available: true,
        slug: sub.slug,
        confidence: sub.cmaStats?.quality?.confidence || null,
        scopeNote:
          "Whole-subdivision closed sales, unfiltered. If this listing sits well above or below the tract's typical price, pull band-filtered comps with search_closed_listings and pass those instead — then set `period` to describe the filter you applied.",
        // Ready to pass straight into create_carousel_slide kind:"cma".
        scope: String(sub.name).toUpperCase(),
        period: `LAST ${months} MONTHS`,
        stats: [
          { value: String(closed.count), label: "HOMES SOLD" },
          { value: fmtCompact(closed.medianClosePrice), label: "MEDIAN CLOSE" },
          { value: fmtCompact(closed.medianPricePerSqft), label: "PRICE / SQFT" },
          { value: fmtCompact(closed.maxClosePrice), label: "TOP CLOSE" },
        ],
        listingLabel: "THIS LISTING",
        listingPrice: fmtFull(subjectPrice),
        // FACTS for Claude's `pitch` line — stated as comparisons, not judgements.
        positioning: {
          vsMedianClose:
            Number.isFinite(subjectPrice) && closed.medianClosePrice
              ? subjectPrice >= closed.medianClosePrice ? "above" : "below"
              : null,
          vsTopClose:
            Number.isFinite(subjectPrice) && closed.maxClosePrice
              ? subjectPrice >= closed.maxClosePrice ? "above" : "below"
              : null,
          medianClosePrice: closed.medianClosePrice ?? null,
          maxClosePrice: closed.maxClosePrice ?? null,
        },
      };
    }
  }

  // ---- listing facts -----------------------------------------------------
  const beds = listing.bedroomsTotal ?? listing.bedsTotal ?? null;
  const baths = listing.bathroomsTotalInteger ?? listing.bathsTotal ?? null;
  const sqft = listing.livingArea ?? null;
  const addrParts = String(listing.unparsedAddress || "").split(",").map((s) => s.trim());

  const plan = {
    listing: {
      listingKey,
      addressLine1: (addrParts[0] || "").toUpperCase(),
      addressLine2: [listing.city, listing.stateOrProvince].filter(Boolean).join(", ").toUpperCase(),
      city: listing.city || null,
      subdivision: listing.subdivisionName || null,
      price: fmtFull(listing.currentPrice ?? listing.currentPricePublic ?? listing.listPrice),
      specs: [
        beds ? `${beds} BD` : null,
        baths ? `${baths} BA` : null,
        sqft ? `${Number(sqft).toLocaleString("en-US")} SQFT` : null,
      ].filter(Boolean).join("  |  "),
      beds, baths, sqft,
      lotSizeAcres: listing.lotSizeAcres ?? null,
      yearBuilt: listing.yearBuilt ?? null,
      daysOnMarket: listing.daysOnMarket ?? null,
      publicRemarks: listing.publicRemarks || null,
      listingCredit:
        listing.listAgentName && listing.listOfficeName
          ? `Listed by ${listing.listAgentName}  ·  ${listing.listOfficeName}`
          : listing.listAgentName
          ? `Listed by ${listing.listAgentName}`
          : null,
    },
    photos: { count: photos.length, items: photos },
    cma,
    brand: {
      agentName: userDoc?.name || null,
      license: profile?.licenseNumber || userDoc?.licenseNumber || null,
      handle,
      accentColor: profile?.brandColors?.primary
        ? String(profile.brandColors.primary).split(",")[0].replace(/^#/, "").trim()
        : null,
      hasHeadshot: !!(profile?.headshotPublicId || profile?.headshot),
      hasBrokerLogo: !!(profile?.brokerLogoPublicId || profile?.brokerLogo || profile?.teamLogo),
    },
    outline: buildOutline(photos.length, cma.available),
  };

  return NextResponse.json(plan, { headers: NO_STORE });
}

/**
 * The slot-by-slot brief. Carries the HARD limits each renderer enforces so
 * copy is authored inside them rather than rejected after the fact.
 */
function buildOutline(photoCount: number, cmaAvailable: boolean) {
  return [
    {
      slide: 1,
      kind: "cover",
      tool: "create_listing_cover",
      write: ["hook", "body"],
      constraints: {
        hook: "2-3 words. Auto-fits the panel and stacks onto multiple lines if long, so it cannot overflow — but short reads bolder (a 1-line hook renders at full 96pt).",
        body: "1-2 sentences, magazine tone, under 260 chars.",
      },
    },
    {
      slides: photoCount >= 4 ? "2-5" : `2-${Math.max(2, Math.min(5, photoCount))}`,
      kind: "staged room photos",
      tools: ["stage_listing_with_agent", "create_carousel_slide (kind:\"banner\")"],
      write: ["label", "caption"],
      constraints: {
        order: "Stage FIRST, then band each returned URL. Staging generates no text by design — an unbanded photo is a bare photo.",
        label: 'Room name in caps, e.g. "THE GREAT ROOM", "THE PRIMARY", "THE COURTYARD".',
        caption: "One line. Concrete detail beats adjectives.",
      },
    },
    {
      slide: 6,
      kind: "cma",
      tool: "create_carousel_slide (kind:\"cma\")",
      write: ["pitch"],
      available: cmaAvailable,
      constraints: {
        stats: "EXACTLY 4 — pass `cma.stats` from this plan through unchanged; the numbers are real closed-sale figures.",
        pitch:
          "One line positioning the listing against the stats. Use `cma.positioning` for the direction. Keep it factual and neutral — state where the price sits, do not characterize anyone's pricing.",
        skip: cmaAvailable ? null : "No stats for this subdivision — omit this slide rather than inventing figures.",
      },
    },
    {
      slides: "7-9",
      kind: "text",
      tool: "create_carousel_slide (kind:\"text\")",
      write: ["paragraphs", "italicLast"],
      constraints: {
        paragraphs: "Each under 220 chars (hard limit — the layout advances by estimated line count, so longer copy pushes the closing line off-slide). 2-3 short paragraphs reads best.",
        italicLast: "One closing italic line.",
        voice: "The agent's own voice, first person. These carry the post — the photos sell the house, the text slides sell the agent.",
      },
    },
    {
      slide: 10,
      kind: "cta",
      tool: "create_carousel_slide (kind:\"cta\")",
      write: ["paragraphs", "italicLast"],
      constraints: {
        paragraphs: "EXACTLY 2 — both render at fixed positions.",
        italicLast: 'The ask, e.g. "DM me. Let\'s talk before you tour another house."',
        identity: "Name, DRE, headshot and broker logo are pulled from the agent's profile server-side. Do not pass them.",
      },
    },
    {
      step: "publish",
      tool: "post_instagram_carousel",
      constraints: {
        order: "Pass slide URLs in order, 2-10 images. Requires the social:post scope.",
        review: "Show the full set to the agent and get explicit approval first — publishing is immediate and cannot be un-notified.",
      },
    },
  ];
}
