import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import { IS_PRODUCTION } from '@/lib/environment';
import { getArticleBySlug } from '@/lib/services/article.service';

/**
 * GET /api/articles/load-published?slugId={slugId}
 *
 * Dual-environment article loading for editing:
 * LOCALHOST: Loads from MDX file in src/posts/
 * PRODUCTION: Loads from MongoDB database
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

    if (IS_PRODUCTION) {
      // PRODUCTION: Load from MongoDB
      const doc = await getArticleBySlug(slugId);

      if (!doc) {
        return NextResponse.json(
          { error: `Article ${slugId} not found in database` },
          { status: 404 }
        );
      }

      // Map MongoDB document to article format
      const article = {
        slugId: doc.slug,
        title: doc.title,
        excerpt: doc.excerpt,
        content: doc.content,
        category: doc.category,
        tags: doc.tags,
        featuredImage: {
          url: doc.featuredImage.url,
          publicId: doc.featuredImage.publicId,
          alt: doc.featuredImage.alt,
        },
        seo: {
          title: doc.seo.title,
          description: doc.seo.description,
          keywords: doc.seo.keywords,
        },
        publishedAt: doc.publishedAt.toLocaleDateString('en-US', {
          month: '2-digit',
          day: '2-digit',
          year: 'numeric',
        }),
        draft: doc.status === 'draft',
        authorId: doc.author.id.toString(),
        authorName: doc.author.name,
      };

      return NextResponse.json({
        success: true,
        article,
      });

    } else {
      // LOCALHOST: Read MDX file
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
          draft: frontmatter.draft || false,
          authorId: frontmatter.authorId,
          authorName: frontmatter.authorName,
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
    }

  } catch (error) {
    console.error('Load published article error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }, { status: 500 });
  }
}
