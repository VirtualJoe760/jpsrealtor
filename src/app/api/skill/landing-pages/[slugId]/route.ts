// src/app/api/skill/landing-pages/[slugId]/route.ts
//
// GET   → returns one landing-page record (agent's own only).
// PATCH → updates a DRAFT landing page. Refuses to touch published pages —
//         the agent must take a published page back to draft from the CMS UI
//         first. Field whitelist mirrors POST in ../route.ts.

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import Article from "@/models/article";
import { authenticateSkillRequest, requireScope, skillRateLimit } from "@/lib/skill-auth";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slugId: string }> }
) {
  const auth = await authenticateSkillRequest(req);
  const denied = requireScope(auth, "landing_pages:read");
  if (denied) return denied;
  if (auth.ok === false) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  const rateLimited = skillRateLimit(auth, "read");
  if (rateLimited) return rateLimited;
  const { slugId } = await params;

  await dbConnect();
  const doc = await Article.findOne({
    slug: slugId,
    category: "landing-page",
    "author.id": auth.user._id,
  }).lean();

  if (!doc) {
    return NextResponse.json(
      { error: "not_found" },
      { status: 404, headers: NO_STORE }
    );
  }
  return NextResponse.json(doc, { headers: NO_STORE });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slugId: string }> }
) {
  const auth = await authenticateSkillRequest(req);
  const denied = requireScope(auth, "landing_pages:write");
  if (denied) return denied;
  if (auth.ok === false) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  const rl = skillRateLimit(auth, "write");
  if (rl) return rl;

  const { slugId } = await params;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers: NO_STORE });
  }

  await dbConnect();
  const doc: any = await Article.findOne({
    slug: slugId,
    category: "landing-page",
    "author.id": auth.user._id,
  });
  if (!doc) {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
  }
  if (doc.status !== "draft") {
    return NextResponse.json(
      {
        error: "not_a_draft",
        message:
          "This landing page is published. To edit it, take it back to draft from the CMS first.",
        status: doc.status,
      },
      { status: 409, headers: NO_STORE }
    );
  }

  // Whitelisted top-level fields
  if (typeof body.title === "string") {
    const t = body.title.trim();
    if (t.length < 10 || t.length > 200) {
      return NextResponse.json(
        { error: "validation_failed", message: "title must be 10-200 characters" },
        { status: 400, headers: NO_STORE }
      );
    }
    doc.title = t;
  }
  if (typeof body.excerpt === "string") {
    doc.excerpt = body.excerpt.trim().slice(0, 300);
  }
  if (typeof body.content === "string") {
    const c = body.content.trim();
    if (c.length < 500) {
      return NextResponse.json(
        { error: "validation_failed", message: "content must be at least 500 characters" },
        { status: 400, headers: NO_STORE }
      );
    }
    doc.content = c;
  }

  // featuredImage (partial replace)
  if (body.featuredImage && typeof body.featuredImage === "object") {
    doc.featuredImage = {
      url: body.featuredImage.url ?? doc.featuredImage?.url ?? "",
      publicId: body.featuredImage.publicId ?? doc.featuredImage?.publicId ?? "",
      alt: body.featuredImage.alt ?? doc.featuredImage?.alt ?? doc.title,
    };
  }

  // SEO (partial replace)
  if (body.seo && typeof body.seo === "object") {
    doc.seo = {
      title: body.seo.title ?? doc.seo?.title ?? doc.title,
      description: body.seo.description ?? doc.seo?.description ?? doc.excerpt,
      keywords: Array.isArray(body.seo.keywords) ? body.seo.keywords : (doc.seo?.keywords || []),
    };
  }

  // Landing-page-specific options
  const lp = body.landingPage;
  if (lp && typeof lp === "object") {
    if (typeof lp.standalone === "boolean") doc.standalone = lp.standalone;
    if (lp.heroType === "photo" || lp.heroType === "video") doc.heroType = lp.heroType;
    if (typeof lp.youtubeUrl === "string") doc.youtubeUrl = lp.youtubeUrl;
    if (typeof lp.videoAutoplay === "boolean") doc.videoAutoplay = lp.videoAutoplay;
    if (["", "lightgradient", "blackspace"].includes(lp.themeOverride)) {
      doc.themeOverride = lp.themeOverride;
    }
    if (typeof lp.formEnabled === "boolean") doc.formEnabled = lp.formEnabled;
    if (typeof lp.formHeading === "string") doc.formHeading = lp.formHeading;
    if (typeof lp.formButtonText === "string") doc.formButtonText = lp.formButtonText;
    if (typeof lp.formRecipients === "string") doc.formRecipients = lp.formRecipients;
    if (typeof lp.formDisclaimer === "string") doc.formDisclaimer = lp.formDisclaimer;
    if (Array.isArray(lp.formFields)) doc.formFields = lp.formFields;
  }

  await doc.save();

  return NextResponse.json(
    {
      slugId: doc.slug,
      id: String(doc._id),
      status: doc.status,
      title: doc.title,
      message: "Draft updated. Review and publish from the CMS.",
    },
    { headers: NO_STORE }
  );
}
