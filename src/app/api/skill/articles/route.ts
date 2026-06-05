// src/app/api/skill/articles/route.ts
//
// GET  → list this agent's articles (any non-landing-page category),
//        filterable by status + category, paginated.
// POST → create an article DRAFT. Mirrors POST /api/skill/landing-pages
//        minus the landingPage.* options. Draft-only — publishing stays
//        in the CMS UI (it triggers the MDX + git push pipeline).

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import Article from "@/models/article";
import { authenticateSkillRequest, requireScope, skillRateLimit } from "@/lib/skill-auth";

const NO_STORE = { "Cache-Control": "no-store" };
const MAX_LIST_LIMIT = 50;
const DEFAULT_LIST_LIMIT = 20;

// Articles use the same Article model as landing pages. Restrict the skill
// surface to the three "blog-style" categories so create/update tools can't
// accidentally produce a landing-page through this route.
const ARTICLE_CATEGORIES = ["articles", "market-insights", "real-estate-tips"] as const;
type ArticleCategory = (typeof ARTICLE_CATEGORIES)[number];

function isArticleCategory(s: string): s is ArticleCategory {
  return (ARTICLE_CATEGORIES as readonly string[]).includes(s);
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

export async function GET(req: NextRequest) {
  const auth = await authenticateSkillRequest(req);
  const denied = requireScope(auth, "articles:read");
  if (denied) return denied;
  if (auth.ok === false) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  const rl = skillRateLimit(auth, "read");
  if (rl) return rl;

  const sp = req.nextUrl.searchParams;
  const status = sp.get("status")?.trim();
  const category = sp.get("category")?.trim();
  const limit = Math.min(MAX_LIST_LIMIT, Math.max(1, Number(sp.get("limit")) || DEFAULT_LIST_LIMIT));
  const skip = Math.max(0, Number(sp.get("skip")) || 0);

  await dbConnect();
  const query: Record<string, any> = {
    "author.id": auth.user._id,
    category: { $in: ARTICLE_CATEGORIES },
  };
  if (status && ["draft", "published", "archived"].includes(status)) {
    query.status = status;
  }
  if (category && isArticleCategory(category)) {
    query.category = category;
  }

  const [items, total] = await Promise.all([
    Article.find(query)
      .select("title slug excerpt category status featuredImage seo tags createdAt updatedAt publishedAt")
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Article.countDocuments(query),
  ]);

  return NextResponse.json(
    {
      items: items.map((a: any) => ({
        slugId: a.slug,
        title: a.title,
        excerpt: a.excerpt,
        category: a.category,
        status: a.status,
        featuredImageUrl: a.featuredImage?.url || null,
        tags: a.tags || [],
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
        publishedAt: a.publishedAt || null,
      })),
      total,
      skip,
      limit,
      hasMore: skip + items.length < total,
    },
    { headers: NO_STORE }
  );
}

export async function POST(req: NextRequest) {
  const auth = await authenticateSkillRequest(req);
  const denied = requireScope(auth, "articles:write");
  if (denied) return denied;
  if (auth.ok === false) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  const rl = skillRateLimit(auth, "write");
  if (rl) return rl;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers: NO_STORE });
  }

  const title = String(body.title || "").trim();
  const content = String(body.content || "").trim();
  const category = String(body.category || "articles").trim();
  const errors: string[] = [];

  if (title.length < 10) errors.push("title must be at least 10 characters");
  if (title.length > 200) errors.push("title must be at most 200 characters");
  if (content.length < 500) errors.push("content must be at least 500 characters");
  if (!isArticleCategory(category)) {
    errors.push(`category must be one of: ${ARTICLE_CATEGORIES.join(", ")}`);
  }
  if (errors.length) {
    return NextResponse.json({ error: "validation_failed", errors }, { status: 400, headers: NO_STORE });
  }

  const excerpt = (() => {
    const raw = String(body.excerpt || "").trim();
    if (raw && raw.length <= 300) return raw;
    if (raw) return raw.slice(0, 300);
    const plain = content.replace(/[`*_>#\[\]]/g, "").replace(/\s+/g, " ").trim();
    return plain.slice(0, 250);
  })();

  const featuredImage = body.featuredImage || {};
  const seo = body.seo || {};
  const tags = Array.isArray(body.tags) ? body.tags.map(String) : [];

  await dbConnect();
  const user = auth.user;

  let baseSlug = slugify(title) || `article-${Date.now()}`;
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
    category,
    tags: tags.length > 0 ? tags : (Array.isArray(seo.keywords) ? seo.keywords : []),
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
    metadata: { views: 0, readTime: Math.max(1, Math.round(content.split(/\s+/).length / 200)) },
  });

  const ap = (user.agentProfile as any) || {};
  let host = "https://jpsrealtor.com";
  if (ap.customDomain) {
    host = `https://${ap.customDomain.replace(/^https?:\/\//, "").replace(/\/+$/, "")}`;
  } else if (ap.subdomain) {
    host = `https://${ap.subdomain}.chatrealty.io`;
  }
  const previewUrl = `${host}/insights/${doc.category}/${doc.slug}`;
  const editUrl = `${host}/agent/cms/edit/${doc.slug}`;

  return NextResponse.json(
    {
      slugId: doc.slug,
      id: String(doc._id),
      category: doc.category,
      status: "draft",
      title: doc.title,
      previewUrl,
      editUrl,
      message: "Draft created. Review and publish from the CMS.",
    },
    { status: 201, headers: NO_STORE }
  );
}
