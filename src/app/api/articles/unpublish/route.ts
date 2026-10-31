import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { unpublishArticle, isArticlePublished } from '@/lib/publishing-pipeline';
import { getArticleBySlug } from '@/lib/services/article.service';

/**
 * DELETE /api/articles/unpublish
 *
 * Deletes the article from the database. Gone from the site immediately.
 *
 * Agents can unpublish their own articles. Admins can unpublish any article.
 */
export async function DELETE(req: Request) {
  try {
    // Check auth — any authenticated user (agents + admins)
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const slugId = searchParams.get('slugId');

    // Validate request
    if (!slugId) {
      return NextResponse.json(
        { error: 'Missing required parameter: slugId' },
        { status: 400 }
      );
    }

    // Ownership check — agents can only unpublish their own articles
    const isImpersonating = !!(session.user as any)?.impersonatedBy;
    const isAdmin = (session.user as any)?.isAdmin && !isImpersonating;
    const userId = (session.user as any)?.id;
    if (!isAdmin) {
      const article = await getArticleBySlug(slugId);
      if (article && article.author?.id?.toString() !== userId) {
        return NextResponse.json(
          { error: 'Forbidden. You can only unpublish your own articles.' },
          { status: 403 }
        );
      }
    }

    // Check if article is published
    const isPublished = await isArticlePublished(slugId);

    if (!isPublished) {
      return NextResponse.json({
        success: false,
        error: `Article ${slugId} is not published or does not exist`,
      }, { status: 404 });
    }

    await unpublishArticle(slugId);

    return NextResponse.json({
      success: true,
      slugId,
      message: 'Article unpublished and removed from your site.',
    });

  } catch (error) {
    console.error('Article unpublish error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }, { status: 500 });
  }
}
