import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { IS_PRODUCTION } from '@/lib/environment';
import { listArticles } from '@/lib/services/article.service';
import { resolveDomainOwner } from '@/lib/resolveDomainOwner';

interface Article {
  title: string;
  excerpt: string;
  image: string;
  category: string;
  date: string;
  slug: string;
  topics?: string[];
  visibility?: string;
  authorId?: string;
  authorName?: string;
}

/**
 * GET /api/articles/list
 *
 * Dual-environment article listing:
 * LOCALHOST: Reads MDX files from src/posts/
 * PRODUCTION: Fetches from MongoDB database
 *
 * Three scoping modes:
 * - default: DOMAIN-owner scoped (public insights feed) — jpsrealtor.com shows
 *   Joseph's articles, bethanyklier.chatrealty.io shows Bethany's, etc.
 * - ?mine=true: SESSION-scoped (the agent CMS) — the logged-in agent's own
 *   articles, regardless of which domain the portal is opened on. Requires auth.
 * - ?all=true: everything across the network (admins only).
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const excludeLandingPages = searchParams.get("excludeLandingPages") !== "false";
    const showAll = searchParams.get("all") === "true";
    const mine = searchParams.get("mine") === "true";

    const session = await getServerSession(authOptions);
    const isImpersonating = !!(session?.user as any)?.impersonatedBy;
    const isAdmin = !!session?.user?.isAdmin && !isImpersonating;

    // ?mine=true — the agent CMS. Scope to the LOGGED-IN user, not the domain
    // owner: an agent editing content on jpsrealtor.com/chatrealty.io must see
    // THEIR articles, not Joseph's. (Bug fix 2026-07-02: the CMS previously got
    // the domain owner's list here.)
    const selfId = mine ? String((session?.user as any)?.id || "") : null;
    if (mine && !selfId) {
      return NextResponse.json(
        { success: false, error: "Authentication required." },
        { status: 401, headers: { "Cache-Control": "no-store, max-age=0" } }
      );
    }

    // Default: resolve the DOMAIN owner (whose site is this?), not the visitor.
    // Admins can still see everything across the network with ?all=true.
    const { ownerId, source } = await resolveDomainOwner(request);

    console.log('[Articles List] Scoping:', {
      ownerId, source, isAdmin, showAll, mine,
    });

    if (IS_PRODUCTION) {
      // PRODUCTION: Fetch from MongoDB
      const filters: any = {};

      if (mine) {
        // Agent CMS: the logged-in user's own articles.
        filters.authorId = selfId;
      } else if (!(isAdmin && showAll)) {
        // Public feed: scope by domain owner. Admin can bypass with ?all=true.
        if (!ownerId) {
          // Defensive: no owner resolved (PRIMARY_AGENT_EMAIL missing?) ->
          // return nothing rather than leaking the whole network.
          return NextResponse.json({ success: true, articles: [], total: 0 });
        }
        filters.authorId = ownerId;
      }

      // Exclude landing pages from insights feed
      if (excludeLandingPages) {
        filters.category = { $ne: "landing-page" };
      }

      const result = await listArticles({
        filters,
        limit: 100, // Get all articles
        sortBy: 'publishedAt',
        sortOrder: 'desc',
      });

      // Convert MongoDB documents to Article interface
      const articles: Article[] = result.articles.map((doc) => ({
        title: doc.title,
        excerpt: doc.excerpt,
        image: doc.featuredImage.url,
        category: doc.category,
        date: doc.publishedAt.toLocaleDateString('en-US', {
          month: '2-digit',
          day: '2-digit',
          year: 'numeric',
        }),
        slug: doc.slug,
        topics: doc.tags,
        visibility: doc.visibility || 'private',
        authorId: doc.author.id.toString(),
        authorName: doc.author.name,
      }));

      return NextResponse.json(
        {
          success: true,
          articles,
          total: articles.length,
        },
        {
          // no-store needed because vercel.json's catch-all otherwise stamps
          // `immutable, max-age=31536000` on API responses, freezing per-user
          // scoped data in the browser for a year. Same fix needed on any
          // /api/* route that returns dynamic data until vercel.json is
          // tightened to scope the immutable rule to /_next/static/*.
          headers: { "Cache-Control": "no-store, max-age=0" },
        }
      );

    } else {
      // LOCALHOST: Read MDX files
      const postsDirectory = path.join(process.cwd(), 'src/posts');

      if (!fs.existsSync(postsDirectory)) {
        return NextResponse.json({
          success: true,
          articles: [],
          total: 0,
        });
      }

      const filenames = fs.readdirSync(postsDirectory);
      const articles: Article[] = [];

      for (const filename of filenames) {
        if (!filename.endsWith('.mdx')) continue;

        const filePath = path.join(postsDirectory, filename);
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const { data } = matter(fileContent);

        // Skip drafts
        if (data.draft === true) continue;

        // Skip landing pages from insights feed
        if (excludeLandingPages && data.section === "landing-page") continue;

        // Scoping. ?mine=true -> logged-in user's articles (agent CMS);
        // default -> domain owner's articles. Articles with no authorId are
        // legacy (pre-scoping) — visible only to admins with ?all=true.
        if (mine) {
          if (!data.authorId || data.authorId !== selfId) continue;
        } else if (!(isAdmin && showAll)) {
          if (!ownerId || !data.authorId || data.authorId !== ownerId) {
            continue;
          }
        }

        articles.push({
          title: data.title || '',
          excerpt: data.metaDescription || '',
          image: data.image || data.ogImage || '',
          category: data.section || 'articles',
          date: data.date || '',
          slug: data.slugId || filename.replace('.mdx', ''),
          topics: data.keywords || [],
          visibility: data.visibility || 'private',
          authorId: data.authorId,
          authorName: data.authorName,
        });
      }

      // Sort by date (most recent first)
      articles.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB.getTime() - dateA.getTime();
      });

      return NextResponse.json(
        {
          success: true,
          articles,
          total: articles.length,
        },
        { headers: { "Cache-Control": "no-store, max-age=0" } }
      );
    }
  } catch (error) {
    console.error('Article list error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}
