import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getArticleBySlug } from '@/lib/services/article.service';

/**
 * GET /api/articles/load-published?slugId={slugId}
 *
 * Loads an article from the database for editing.
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

  } catch (error) {
    console.error('Load published article error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }, { status: 500 });
  }
}
