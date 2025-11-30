import { NextResponse } from 'next/server';
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
}

/**
 * GET /api/articles/list
 *
 * Returns all published articles (non-drafts) from MDX files
 */
export async function GET() {
  try {
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

      articles.push({
        title: data.title || '',
        excerpt: data.metaDescription || '',
        image: data.image || data.ogImage || '',
        category: data.section || 'articles',
        date: data.date || '',
        slug: data.slugId || filename.replace('.mdx', ''),
        topics: data.keywords || [],
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
