// src/lib/articles/public-articles.ts
//
// The one place public surfaces read articles from. The database is the only
// source: there is no MDX fallback. Before 2026-10-29 the category index, RSS,
// topics, AI search and campaign pages read MDX files in src/posts/, which only
// changed after a GitHub commit and a rebuild. A dead GITHUB_TOKEN therefore
// kept a published article off half the site, and those pages ignored the
// domain owner, so every agent's articles showed on every site.
//
// Every list here is scoped to one owner and to status "published".
// Multi-tenant storage (Neon for non-admin agents) plugs in behind these
// functions — see docs/cms/multi-tenant-articles.md.

import "server-only";
import connectDB from "@/lib/mongodb";
import Article from "@/models/article";
import type { Post } from "@/types/post";

/** Map an Article document (lean or hydrated) to the Post shape pages use. */
export function articleToPost(doc: any): Post {
  return {
    title: doc.title || "",
    slugId: doc.slug,
    slug: doc.slug,
    date: doc.publishedAt ? new Date(doc.publishedAt).toISOString() : "",
    section: doc.category || "",
    description: doc.excerpt || "",
    metaDescription: doc.seo?.description || doc.excerpt || "",
    image: doc.featuredImage?.url || "",
    altText: doc.featuredImage?.alt || "",
    keywords: doc.seo?.keywords?.length ? doc.seo.keywords : doc.tags || [],
    content: doc.content || "",
    authorId: doc.author?.id?.toString(),
    authorName: doc.author?.name,
    visibility: doc.visibility || "private",
    // Landing page fields
    ...(doc.standalone !== undefined && { standalone: doc.standalone }),
    ...(doc.heroType && { heroType: doc.heroType }),
    ...(doc.youtubeUrl && { youtubeUrl: doc.youtubeUrl }),
    ...(doc.videoAutoplay !== undefined && { videoAutoplay: doc.videoAutoplay }),
    ...(doc.themeOverride && { themeOverride: doc.themeOverride }),
    ...(doc.formEnabled !== undefined && { formEnabled: doc.formEnabled }),
    ...(doc.formHeading && { formHeading: doc.formHeading }),
    ...(doc.formButtonText && { formButtonText: doc.formButtonText }),
    ...(doc.formRecipients && { formRecipients: doc.formRecipients }),
    ...(doc.formDisclaimer && { formDisclaimer: doc.formDisclaimer }),
    ...(doc.formFields && {
      formFields: (doc.formFields as any[]).map((f) => ({
        id: f.id,
        label: f.label,
        type: f.type,
        required: f.required,
        options: f.options ? Array.from(f.options) : [],
      })),
    }),
  } as Post;
}

/** One article by slug, any status. Callers decide what a visitor may see. */
export async function getArticlePost(slug: string): Promise<Post | null> {
  await connectDB();
  const doc = await Article.findOne({ slug }).lean();
  return doc ? articleToPost(doc) : null;
}

export interface ListPublishedOptions {
  /** Domain owner's User id. Null or missing returns nothing, never the network. */
  ownerId: string | null | undefined;
  /** One category (section), e.g. "market-insights". "all" or empty = every category. */
  category?: string;
  /** Include category "landing-page". Default false. */
  includeLandingPages?: boolean;
  page?: number;
  limit?: number;
}

/** Published articles for one owner, newest first. */
export async function listPublishedPosts(
  opts: ListPublishedOptions
): Promise<{ posts: Post[]; total: number }> {
  if (!opts.ownerId) return { posts: [], total: 0 };
  await connectDB();

  const query: Record<string, unknown> = {
    "author.id": opts.ownerId,
    status: "published",
  };
  if (opts.category && opts.category !== "all") {
    query.category = opts.category;
  } else if (!opts.includeLandingPages) {
    query.category = { $ne: "landing-page" };
  }

  const limit = opts.limit ?? 100;
  const page = Math.max(1, opts.page ?? 1);

  const [docs, total] = await Promise.all([
    Article.find(query)
      .sort({ publishedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Article.countDocuments(query),
  ]);

  return { posts: docs.map(articleToPost), total };
}

/**
 * Domain owner for a server component, where there is no Request object.
 * Builds one from the incoming headers so resolveDomainOwner sees the same
 * host / x-agent-subdomain a route handler would.
 */
export async function resolvePageOwnerId(): Promise<string | null> {
  const { headers } = await import("next/headers");
  const { resolveDomainOwner } = await import("@/lib/resolveDomainOwner");
  const h = await headers();
  const host = h.get("host") || "localhost";
  const req = new Request(`https://${host}/`, { headers: new Headers(h) });
  const { ownerId } = await resolveDomainOwner(req);
  return ownerId;
}
