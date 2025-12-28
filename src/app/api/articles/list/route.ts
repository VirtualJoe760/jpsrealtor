import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

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
 * Returns published articles (non-drafts) from MDX files
 * For agents: returns only their own articles (filtered by authorId)
 * For admins: returns all articles
 */
export async function GET() {
  try {
    // Check session for agent scoping
    const session = await getServerSession(authOptions);
    const isAdmin = session?.user?.isAdmin;
    const userId = session?.user?.id;

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
