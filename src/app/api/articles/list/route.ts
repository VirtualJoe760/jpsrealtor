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
 * For agents: returns only their own articles (filtered by authorId)
 * For admins: returns all articles
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const excludeLandingPages = searchParams.get("excludeLandingPages") !== "false";
    const showAll = searchParams.get("all") === "true";

    // Resolve the DOMAIN owner (whose site is this?), not the visitor. Articles
    // should be scoped to the site they're displayed on — jpsrealtor.com shows
    // Joseph's articles, bethanyklier.chatrealty.io shows Bethany's, etc.
    // Admins can still see everything across the network with ?all=true.
    const session = await getServerSession(authOptions);
    const isImpersonating = !!(session?.user as any)?.impersonatedBy;
    const isAdmin = !!session?.user?.isAdmin && !isImpersonating;
    const { ownerId, source } = await resolveDomainOwner(request);

    console.log('[Articles List] Domain scoping:', {
      ownerId, source, isAdmin, showAll,
    });

    if (IS_PRODUCTION) {
      // PRODUCTION: Fetch from MongoDB
      const filters: any = {};

      // Scope by domain owner. Admin can bypass with ?all=true.
      if (!(isAdmin && showAll)) {
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
          headers: {
            "X-Articles-Source": "mongo",
            "X-Articles-IsProd": String(IS_PRODUCTION),
            "X-Articles-OwnerId": String(ownerId),
            "X-Articles-Count": String(articles.length),
            "Cache-Control": "no-store, max-age=0",
          },
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

        // Domain scoping: only show articles authored by the domain owner.
        // Articles with no authorId are legacy (pre-scoping) — visible only
        // to admins with ?all=true.
        if (!(isAdmin && showAll)) {
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
        {
          headers: {
            "X-Articles-Source": "mdx",
            "X-Articles-IsProd": String(IS_PRODUCTION),
            "X-Articles-OwnerId": String(ownerId),
            "X-Articles-Count": String(articles.length),
            "Cache-Control": "no-store, max-age=0",
          },
        }
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
