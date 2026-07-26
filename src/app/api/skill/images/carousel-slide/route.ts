// src/app/api/skill/images/carousel-slide/route.ts
//
// POST → render one non-cover slide of a listing carousel.
//
// The cover slide has had a route since day one (../cover-slide). The other
// four slide types shipped only as Node build scripts under scripts/, which
// the Next app cannot import, so an agent working through Claude could produce
// slide 1 of 10 and nothing else. The layouts now live in
// src/lib/cover-templates/carousel-slides.js and this route exposes them.
//
//   kind: "banner" → caption band over a staged room photo   (slides 2-5)
//   kind: "cma"    → subdivision stat card                    (slide 6)
//   kind: "text"   → copy slide                               (slides 7-9)
//   kind: "cta"    → closing card with headshot + license     (slide 10)
//
// Auth: crt_live_ token with `landing_pages:write` — same risk tier as the
// cover route and as drafting a landing page. Rendering is not publishing;
// posting the result to Instagram is separately gated behind `social:post`.
//
// COMPLIANCE: the CTA slide names the agent and prints their DRE number, so
// agentName / agentLicense / headshot / broker logo are resolved from the
// authenticated User record and are NOT accepted from the request body. A
// caller cannot stamp someone else's license onto a card. This is the same
// failure mode that put the wrong agent's DRE on a tenant site in July.

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import { authenticateSkillRequest, requireScope, skillRateLimit } from "@/lib/skill-auth";
import {
  buildBannerTransform,
  buildCmaTransformation,
  buildTextPostTransformation,
  buildCtaTransformation,
} from "@/lib/cover-templates/carousel-slides";
import { v2 as cloudinary } from "cloudinary";

// kind:"banner" fetches a staged image and uploads it to Cloudinary before
// transforming. One upload, but a slow source makes the default budget tight.
export const maxDuration = 60;

const NO_STORE = { "Cache-Control": "no-store" };

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const KINDS = ["banner", "cma", "text", "cta"] as const;
type Kind = (typeof KINDS)[number];

function bad(error: string, message: string, status = 400, details?: unknown) {
  return NextResponse.json({ error, message, details }, { status, headers: NO_STORE });
}

function hex(v: any, fallback: string): string | null {
  const c = String(v ?? fallback).replace(/^#/, "").trim();
  return /^[0-9a-fA-F]{6,8}$/.test(c) ? c : null;
}

function extractPublicIdFromUrl(url?: string | null): string | null {
  if (!url) return null;
  const m = url.match(/\/image\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-z0-9]+)?$/i);
  return m ? m[1] : null;
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

  const kind = String(body.kind || "").trim() as Kind;
  if (!KINDS.includes(kind)) {
    return bad("validation_failed", `kind must be one of: ${KINDS.join(", ")}. Got: ${kind || "(none)"}`);
  }

  await dbConnect();
  const userDoc: any = await User.findById(auth.user._id)
    .select("name licenseNumber agentProfile")
    .lean();
  const profile = userDoc?.agentProfile || {};

  // Handle defaults to the agent's own IG handle; the slides print it as the
  // attribution mark in the footer.
  const handle =
    String(body.handle || "").trim() ||
    (profile?.socialMedia?.instagram
      ? `@${String(profile.socialMedia.instagram).replace(/^@/, "")}`
      : "");

  let transformation: any[];
  let baseAsset = "sample"; // solid-color slides paint over Cloudinary's sample asset
  let uploadedPublicId: string | null = null;

  // ---- banner: caption band over an already-staged room photo -------------
  if (kind === "banner") {
    const label = String(body.label || "").trim();
    const caption = String(body.caption || "").trim();
    if (!label || !caption) {
      return bad("validation_failed", "banner requires both `label` and `caption`.");
    }
    const imageUrl = String(body.imageUrl || "").trim();
    const publicId = String(body.publicId || "").trim();
    if (!imageUrl && !publicId) {
      return bad(
        "validation_failed",
        "banner requires `imageUrl` (an https URL, e.g. the output of stage_listing_with_agent) or `publicId`."
      );
    }
    if (publicId) {
      baseAsset = publicId;
    } else {
      if (!imageUrl.startsWith("https://")) {
        return bad("validation_failed", "imageUrl must be an https URL.");
      }
      try {
        const up = await cloudinary.uploader.upload(imageUrl, {
          folder: `jpsrealtor/carousel/${new Date().getFullYear()}/banners`,
        });
        baseAsset = up.public_id;
        uploadedPublicId = up.public_id;
      } catch (err: any) {
        return bad("cloudinary_upload_failed", err?.message || "Upload failed", 502);
      }
    }
    transformation = buildBannerTransform(label, caption);
  }

  // ---- cma: subdivision stat card ----------------------------------------
  else if (kind === "cma") {
    const color = hex(body.color, "1C4A5A");
    if (!color) return bad("invalid_color", "color must be hex, e.g. \"B86341\".");
    const stats = Array.isArray(body.stats) ? body.stats : [];
    if (stats.length !== 4) {
      // The grid is laid out for exactly four cells (2x2). Anything else
      // renders off-card rather than reflowing.
      return bad(
        "validation_failed",
        `cma requires exactly 4 stats (got ${stats.length}). Each is { value, label } — e.g. { value: "$2.36M", label: "MEDIAN CLOSE" }.`
      );
    }
    for (const s of stats) {
      if (!s || !String(s.value ?? "").trim() || !String(s.label ?? "").trim()) {
        return bad("validation_failed", "each stat needs a non-empty `value` and `label`.");
      }
    }
    const required = ["scope", "period", "listingLabel", "listingPrice", "pitch"];
    for (const f of required) {
      if (!String(body[f] ?? "").trim()) {
        return bad("validation_failed", `cma requires \`${f}\`.`);
      }
    }
    transformation = buildCmaTransformation(
      {
        color,
        scope: String(body.scope).trim(),
        period: String(body.period).trim(),
        stats: stats.map((s: any) => ({
          value: String(s.value).trim(),
          label: String(s.label).trim(),
        })),
        listingLabel: String(body.listingLabel).trim(),
        listingPrice: String(body.listingPrice).trim(),
        pitch: String(body.pitch).trim(),
      },
      handle
    );
  }

  // ---- text: copy slide ---------------------------------------------------
  else if (kind === "text") {
    const paragraphs = Array.isArray(body.paragraphs)
      ? body.paragraphs.map((p: any) => String(p || "").trim()).filter(Boolean)
      : [];
    const italicLast = String(body.italicLast || "").trim();
    if (paragraphs.length === 0) {
      return bad("validation_failed", "text requires a non-empty `paragraphs` array.");
    }
    if (!italicLast) {
      return bad("validation_failed", "text requires `italicLast` — the closing italic line.");
    }
    // Vertical flow is estimated at 32 chars/line because Cloudinary wraps
    // server-side and cannot report rendered height. Long paragraphs push the
    // italic line off the canvas, so refuse rather than render a broken slide.
    const overflow = paragraphs.find((p: string) => p.length > 220);
    if (overflow) {
      return bad(
        "validation_failed",
        `Paragraph too long (${overflow.length} chars; max 220). The layout advances by an estimated line count, so long paragraphs push the closing line off the slide. Split it into another paragraph.`
      );
    }
    const bg = hex(body.bg, "F1EBE0");
    if (!bg) return bad("invalid_color", "bg must be hex, e.g. \"F1EBE0\".");
    transformation = buildTextPostTransformation({ paragraphs, italicLast, bg }, handle);
  }

  // ---- cta: closing card (identity resolved server-side) ------------------
  else {
    const color = hex(body.color, "1C4A5A");
    if (!color) return bad("invalid_color", "color must be hex, e.g. \"B86341\".");
    const paragraphs = Array.isArray(body.paragraphs)
      ? body.paragraphs.map((p: any) => String(p || "").trim()).filter(Boolean)
      : [];
    if (paragraphs.length !== 2) {
      // Both paragraphs sit at fixed y positions; a third has nowhere to go.
      return bad(
        "validation_failed",
        `cta requires exactly 2 paragraphs (got ${paragraphs.length}) — they render at fixed positions.`
      );
    }
    const italicLast = String(body.italicLast || "").trim();
    if (!italicLast) return bad("validation_failed", "cta requires `italicLast` — the closing ask.");

    const headshotPublicId =
      profile?.headshotPublicId || extractPublicIdFromUrl(profile?.headshot) || "";
    if (!headshotPublicId) {
      return bad("no_headshot", "Agent profile has no headshot. Add one in Settings → Profile.");
    }
    const brokerLogoPublicId =
      profile?.brokerLogoPublicId ||
      extractPublicIdFromUrl(profile?.brokerLogo) ||
      extractPublicIdFromUrl(profile?.teamLogo) ||
      "";
    if (!brokerLogoPublicId) {
      return bad(
        "no_broker_logo",
        "Agent profile has no brokerage logo. Add one in Settings → Brand."
      );
    }

    // Identity is NOT caller-supplied — see the compliance note in the header.
    const agentName = String(userDoc?.name || "").toUpperCase();
    const license = profile?.licenseNumber || userDoc?.licenseNumber || "";
    if (!agentName) return bad("no_agent_name", "Agent profile has no name.");
    if (!license) {
      return bad(
        "no_license",
        "Agent profile has no license number. The closing slide prints it for compliance — add it in Settings → Profile."
      );
    }

    transformation = buildCtaTransformation({
      color,
      label: String(body.label || "WHY WORK WITH ME").trim(),
      agentName,
      agentLicense: `DRE ${String(license).replace(/^DRE\s*/i, "")}`,
      paragraphs,
      italicLast,
      handle,
      headshotPublicId,
      brokerLogoPublicId,
    });
  }

  const url = cloudinary.url(baseAsset, { transformation });

  return NextResponse.json(
    { url, kind, handle, basePublicId: uploadedPublicId },
    { headers: NO_STORE }
  );
}
