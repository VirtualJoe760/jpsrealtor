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
    // Check auth — agents and admins can load articles for editing
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
    }
    const isAdmin = session.user.isAdmin && !(session.user as any).impersonatedBy;
    const userId = session.user.id;

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

      // Ownership check: agents can only load their own articles
      if (!isAdmin && doc.author.id.toString() !== userId) {
        return NextResponse.json(
          { error: 'You do not have permission to edit this article' },
          { status: 403 }
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
        visibility: doc.visibility || 'private',
        // Landing page fields from MongoDB
        ...((doc as any).standalone !== undefined && { standalone: (doc as any).standalone }),
        ...((doc as any).heroType && { heroType: (doc as any).heroType }),
        ...((doc as any).youtubeUrl && { youtubeUrl: (doc as any).youtubeUrl }),
        ...((doc as any).videoAutoplay !== undefined && { videoAutoplay: (doc as any).videoAutoplay }),
        ...((doc as any).themeOverride !== undefined && { themeOverride: (doc as any).themeOverride }),
        ...((doc as any).formEnabled !== undefined && { formEnabled: (doc as any).formEnabled }),
        ...((doc as any).formHeading && { formHeading: (doc as any).formHeading }),
        ...((doc as any).formButtonText && { formButtonText: (doc as any).formButtonText }),
        ...((doc as any).formRecipients && { formRecipients: (doc as any).formRecipients }),
        ...((doc as any).formDisclaimer && { formDisclaimer: (doc as any).formDisclaimer }),
        ...((doc as any).formFields && { formFields: (doc as any).formFields }),
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

        // Ownership check for non-admins
        if (!isAdmin && frontmatter.authorId && frontmatter.authorId !== userId) {
          return NextResponse.json(
            { error: 'You do not have permission to edit this article' },
            { status: 403 }
          );
        }

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
          visibility: frontmatter.visibility || 'private',
          // Landing page fields
          ...(frontmatter.standalone !== undefined && { standalone: frontmatter.standalone }),
          ...(frontmatter.heroType && { heroType: frontmatter.heroType }),
          ...(frontmatter.youtubeUrl && { youtubeUrl: frontmatter.youtubeUrl }),
          ...(frontmatter.videoAutoplay !== undefined && { videoAutoplay: frontmatter.videoAutoplay }),
          ...(frontmatter.themeOverride && { themeOverride: frontmatter.themeOverride }),
          ...(frontmatter.formEnabled !== undefined && { formEnabled: frontmatter.formEnabled }),
          ...(frontmatter.formHeading && { formHeading: frontmatter.formHeading }),
          ...(frontmatter.formButtonText && { formButtonText: frontmatter.formButtonText }),
          ...(frontmatter.formRecipients && { formRecipients: frontmatter.formRecipients }),
          ...(frontmatter.formDisclaimer && { formDisclaimer: frontmatter.formDisclaimer }),
          ...(frontmatter.formFields && { formFields: frontmatter.formFields }),
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
