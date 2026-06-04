// src/app/api/skill/landing-pages/route.ts
//
// POST → creates a landing page DRAFT on behalf of the authenticated agent.
// Per design: the skill is draft-only in v1 — the agent reviews and publishes
// on the CMS. No publish endpoint here.
//
// Body (all fields optional except title + content):
// {
//   title:          string  (required, 10-200 chars)
//   excerpt:        string  (≤ 300 chars; auto-derived from content if missing)
//   content:        string  (MDX body; required, ≥ 500 chars)
//   featuredImage:  { url, publicId?, alt? }   // url required for image
//   seo:            { title?, description?, keywords?: string[] }
//   landingPage:    {
//     standalone?:    boolean
//     heroType?:      "photo" | "video"
//     youtubeUrl?:    string
//     videoAutoplay?: boolean
//     themeOverride?: "" | "lightgradient" | "blackspace"
//     formEnabled?:   boolean
//     formHeading?:   string
//     formButtonText?: string
//     formRecipients?: string
//     formDisclaimer?: string
//     formFields?:    Array<{ id, label, type, required, options? }>
//   }
// }
//
// Returns: { slugId, editUrl, previewUrl, status: "draft" }

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import Article from "@/models/article";
import { authenticateSkillRequest } from "@/lib/skill-auth";

const NO_STORE = { "Cache-Control": "no-store" };

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

export async function POST(req: NextRequest) {
  const auth = await authenticateSkillRequest(req);
  if (auth.ok === false) {
    return NextResponse.json(
      { error: auth.reason },
      { status: auth.status, headers: NO_STORE }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers: NO_STORE });
  }

  const title = String(body.title || "").trim();
  const content = String(body.content || "").trim();
  const errors: string[] = [];

  if (title.length < 10) errors.push("title must be at least 10 characters");
  if (title.length > 200) errors.push("title must be at most 200 characters");
  if (content.length < 500) errors.push("content must be at least 500 characters");
  if (errors.length) {
    return NextResponse.json({ error: "validation_failed", errors }, { status: 400, headers: NO_STORE });
  }

  // Derive excerpt if not supplied — first 250 chars of plain text content.
  const excerpt = (() => {
    const raw = String(body.excerpt || "").trim();
    if (raw && raw.length <= 300) return raw;
    if (raw) return raw.slice(0, 300);
    const plain = content.replace(/[`*_>#\[\]]/g, "").replace(/\s+/g, " ").trim();
    return plain.slice(0, 250);
  })();

  const featuredImage = body.featuredImage || {};
  const seo = body.seo || {};
  const lp = body.landingPage || {};

  await dbConnect();
  const user = auth.user;

  // Slug — collision-safe by appending a short suffix if taken.
  let baseSlug = slugify(title) || `landing-${Date.now()}`;
  let slug = baseSlug;
  let suffix = 1;
  while (await Article.exists({ slug })) {
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
    if (suffix > 50) {
      slug = `${baseSlug}-${Date.now()}`;
      break;
    }
  }

  const now = new Date();
  const doc = await Article.create({
    title,
    slug,
    excerpt,
    content,
    category: "landing-page",
    tags: Array.isArray(seo.keywords) ? seo.keywords : [],
    publishedAt: now,
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    status: "draft",
    featured: false,
    visibility: "private",
    featuredImage: {
      url: featuredImage.url || "",
      publicId: featuredImage.publicId || "",
      alt: featuredImage.alt || title,
    },
    seo: {
      title: seo.title || title,
      description: seo.description || excerpt,
      keywords: Array.isArray(seo.keywords) ? seo.keywords : [],
    },
    author: {
      id: user._id,
      name: user.name || "",
      email: user.email || "",
    },
    metadata: { views: 0, readTime: 1 },
    // Landing-page fields
    standalone: !!lp.standalone,
    heroType: lp.heroType === "video" ? "video" : "photo",
    youtubeUrl: lp.youtubeUrl || "",
    videoAutoplay: lp.videoAutoplay !== false,
    themeOverride: ["", "lightgradient", "blackspace"].includes(lp.themeOverride)
      ? lp.themeOverride
      : "",
    formEnabled: !!lp.formEnabled,
    formHeading: lp.formHeading || "Get Started",
    formButtonText: lp.formButtonText || "Submit",
    formRecipients: lp.formRecipients || user.email || "",
    formDisclaimer: lp.formDisclaimer || "",
    formFields: Array.isArray(lp.formFields) && lp.formFields.length > 0
      ? lp.formFields
      : [
          { id: "name", label: "Full Name", type: "text", required: true },
          { id: "email", label: "Email Address", type: "email", required: true },
          { id: "phone", label: "Phone Number", type: "tel", required: false },
        ],
  });

  // Build URLs. We don't know the host the skill is running against, so reuse
  // the /me logic: prefer custom domain → subdomain → jpsrealtor.com.
  const ap = (user.agentProfile as any) || {};
  let host = "https://jpsrealtor.com";
  if (ap.customDomain) {
    host = `https://${ap.customDomain.replace(/^https?:\/\//, "").replace(/\/+$/, "")}`;
  } else if (ap.subdomain) {
    host = `https://${ap.subdomain}.chatrealty.io`;
  }
  const previewUrl = `${host}/lp/${doc.slug}`;
  const editUrl = `${host}/agent/cms/edit/${doc.slug}`;

  return NextResponse.json(
    {
      slugId: doc.slug,
      id: String(doc._id),
      status: "draft",
      title: doc.title,
      previewUrl,
      editUrl,
      message: "Draft created. Review and publish from the CMS.",
    },
    { status: 201, headers: NO_STORE }
  );
}
