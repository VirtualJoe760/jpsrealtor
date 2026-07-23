// src/app/api/skill/articles/[slugId]/route.ts
//
// GET   → fetch one article (owner-scoped). Mirrors landing-page GET.
// PATCH → update a DRAFT article. Refuses to touch published articles —
//         publishing triggers the MDX + git push pipeline, so a Claude
//         edit on a live article would silently desync. Take it back to
//         draft in the CMS first.

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import Article from "@/models/article";
import { authenticateSkillRequest, requireScope, skillRateLimit } from "@/lib/skill-auth";

const NO_STORE = { "Cache-Control": "no-store" };

const ARTICLE_CATEGORIES = ["articles", "market-insights", "real-estate-tips"] as const;
type ArticleCategory = (typeof ARTICLE_CATEGORIES)[number];

function isArticleCategory(s: string): s is ArticleCategory {
  return (ARTICLE_CATEGORIES as readonly string[]).includes(s);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slugId: string }> }
) {
  const auth = await authenticateSkillRequest(req);
  const denied = requireScope(auth, "articles:read");
  if (denied) return denied;
  if (auth.ok === false) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  const rl = skillRateLimit(auth, "read");
  if (rl) return rl;

  const { slugId } = await params;
  await dbConnect();
  const doc = await Article.findOne({
    slug: slugId,
    category: { $in: ARTICLE_CATEGORIES },
    "author.id": auth.user._id,
  }).lean();

  if (!doc) {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
  }
  return NextResponse.json(doc, { headers: NO_STORE });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slugId: string }> }
) {
  const auth = await authenticateSkillRequest(req);
  const denied = requireScope(auth, "articles:write");
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
    category: { $in: ARTICLE_CATEGORIES },
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
          "This article is already published. Content edits require taking it back to draft in the CMS first — publishing runs the MDX + git pipeline, so silent edits would desync. (Drafts can be published directly from here with { status: \"published\" }.)",
        status: doc.status,
      },
      { status: 409, headers: NO_STORE }
    );
  }

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
    doc.metadata = doc.metadata || {};
    doc.metadata.readTime = Math.max(1, Math.round(c.split(/\s+/).length / 200));
  }
  if (typeof body.category === "string" && isArticleCategory(body.category)) {
    doc.category = body.category;
  }
  if (Array.isArray(body.tags)) {
    doc.tags = body.tags.map(String);
  }
  if (body.featuredImage && typeof body.featuredImage === "object") {
    doc.featuredImage = {
      url: body.featuredImage.url ?? doc.featuredImage?.url ?? "",
      publicId: body.featuredImage.publicId ?? doc.featuredImage?.publicId ?? "",
      alt: body.featuredImage.alt ?? doc.featuredImage?.alt ?? doc.title,
    };
  }
  if (body.seo && typeof body.seo === "object") {
    doc.seo = {
      title: body.seo.title ?? doc.seo?.title ?? doc.title,
      description: body.seo.description ?? doc.seo?.description ?? doc.excerpt,
      keywords: Array.isArray(body.seo.keywords) ? body.seo.keywords : (doc.seo?.keywords || []),
    };
  }

  await doc.save();

  // Explicit publish (2026-07-23, free-tier CMS blog): { status: "published" }
  // on a draft runs the SAME pipeline as the CMS UI publish button
  // (validate → Mongo status → MDX/git → Vercel rebuild → per-user GBP
  // cross-post), so Claude can take an agent-approved draft live without a
  // chatrealty.io login. Any content edits in the same request applied above
  // are included. Publish is opt-in per request — never implicit.
  if (body.status === "published") {
    const { validateForPublish, publishArticle } = await import("@/lib/publishing-pipeline");
    const article = {
      title: doc.title,
      excerpt: doc.excerpt || "",
      content: doc.content,
      category: doc.category,
      draft: false,
      authorId: String(auth.user._id),
      authorName: auth.user.name || auth.user.email || "Unknown",
      featuredImage: {
        url: doc.featuredImage?.url || "",
        publicId: doc.featuredImage?.publicId || "",
        alt: doc.featuredImage?.alt || doc.title,
      },
      seo: {
        title: doc.seo?.title || doc.title,
        description: doc.seo?.description || doc.excerpt || "",
        keywords: doc.seo?.keywords || [],
      },
    };
    const validation = await validateForPublish(article);
    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: "publish_validation_failed",
          message: "The draft is saved, but it doesn't meet publishing requirements yet.",
          errors: validation.errors,
          warnings: validation.warnings,
        },
        { status: 400, headers: NO_STORE }
      );
    }
    await publishArticle(article, doc.slug, {
      autoDeploy: true,
      userId: String(auth.user._id),
      userName: auth.user.name || auth.user.email || "Unknown",
      userEmail: auth.user.email || "noemail@example.com",
    });
    // GBP cross-post — per-user credentials, non-blocking (mirrors the CMS route).
    try {
      const { publishArticleToGBP } = await import("@/lib/gbp-publisher");
      await publishArticleToGBP(
        {
          title: article.title,
          excerpt: article.excerpt,
          image: article.featuredImage.url,
          url: doc.slug,
          category: article.category,
        },
        String(auth.user._id)
      );
    } catch {
      /* non-blocking */
    }
    return NextResponse.json(
      {
        slugId: doc.slug,
        status: "published",
        warnings: validation.warnings,
        message:
          "Published. The article is live (rebuild takes ~2-3 minutes) and will appear wherever this agent's published posts are served.",
      },
      { headers: NO_STORE }
    );
  }

  return NextResponse.json(
    {
      slugId: doc.slug,
      id: String(doc._id),
      category: doc.category,
      status: doc.status,
      title: doc.title,
      message: "Draft updated. Review and publish from the CMS.",
    },
    { headers: NO_STORE }
  );
}
