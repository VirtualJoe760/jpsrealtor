import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { IS_PRODUCTION } from '@/lib/environment';
import { listArticles } from '@/lib/services/article.service';

interface Article {
  title: string;
  excerpt: string;
  image: string;
  category: string;
  date: string;
  slug: string;
  topics?: string[];
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
export async function GET() {
  try {
    // Check session for agent scoping
    const session = await getServerSession(authOptions);
    const isAdmin = session?.user?.isAdmin;
    const userId = session?.user?.id;

    if (IS_PRODUCTION) {
      // PRODUCTION: Fetch from MongoDB
      const filters: any = {};

      // Agent scoping: filter by authorId (unless admin)
      if (!isAdmin && userId) {
        filters.authorId = userId;
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
        authorId: doc.author.id.toString(),
        authorName: doc.author.name,
      }));

      return NextResponse.json({
        success: true,
        articles,
        total: articles.length,
      });

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

        // Agent scoping: skip articles not authored by this agent (unless admin)
        if (!isAdmin && userId && data.authorId && data.authorId !== userId) {
          continue;
        }

        articles.push({
          title: data.title || '',
          excerpt: data.metaDescription || '',
          image: data.image || data.ogImage || '',
          category: data.section || 'articles',
          date: data.date || '',
          slug: data.slugId || filename.replace('.mdx', ''),
          topics: data.keywords || [],
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

      return NextResponse.json({
        success: true,
        articles,
        total: articles.length,
      });
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
