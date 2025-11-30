import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';

/**
 * GET /api/articles/load-published?slugId={slugId}
 *
 * Loads a published article from src/posts/ MDX file for editing
 */
export async function GET(req: Request) {
  try {
    // Check auth
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const slugId = searchParams.get('slugId');

    if (!slugId) {
      return NextResponse.json(
        { error: 'Missing required parameter: slugId' },
        { status: 400 }
      );
    }

    // Read MDX file
    const filePath = path.join(process.cwd(), 'src/posts', `${slugId}.mdx`);

    try {
      const fileContents = await fs.readFile(filePath, 'utf-8');
      const { data: frontmatter, content } = matter(fileContents);

      // Map frontmatter to article format
      const article = {
        slugId,
        title: frontmatter.title || '',
        excerpt: frontmatter.metaDescription || '',
        content: content.trim(),
        category: frontmatter.section || 'articles', // section → category mapping
        tags: frontmatter.tags || [],
        featuredImage: {
          url: frontmatter.image || '',
          publicId: frontmatter.image?.split('/').pop()?.split('.')[0] || '',
          alt: frontmatter.altText || frontmatter.title || '',
        },
        seo: {
          title: frontmatter.metaTitle || frontmatter.title || '',
          description: frontmatter.metaDescription || '',
          keywords: frontmatter.keywords || [],
        },
        publishedAt: frontmatter.date || '',
      };

      return NextResponse.json({
        success: true,
        article,
      });

    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return NextResponse.json(
          { error: `Article ${slugId} not found in src/posts/` },
          { status: 404 }
        );
      }
      throw error;
    }

  } catch (error) {
    console.error('Load published article error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }, { status: 500 });
  }
}
