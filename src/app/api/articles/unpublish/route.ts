import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { unpublishArticle, isArticlePublished } from '@/lib/publishing-pipeline';
import { IS_PRODUCTION } from '@/lib/environment';

/**
 * DELETE /api/articles/unpublish
 *
 * Dual-environment unpublishing:
 * LOCALHOST: Deletes MDX file from src/posts/
 * PRODUCTION: Deletes from MongoDB + triggers Vercel rebuild
 */
export async function DELETE(req: Request) {
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

    // Validate request
    if (!slugId) {
      return NextResponse.json(
        { error: 'Missing required parameter: slugId' },
        { status: 400 }
      );
    }

    // Check if article is published
    const isPublished = await isArticlePublished(slugId);

    if (!isPublished) {
      return NextResponse.json({
        success: false,
        error: `Article ${slugId} is not published or does not exist`,
      }, { status: 404 });
    }

    // Unpublish article with environment-aware logic
    await unpublishArticle(slugId);

    // Unified workflow response messages
    const message = IS_PRODUCTION
      ? `Article deleted from MongoDB and removed from main branch! Vercel is rebuilding - changes will be live in 2-3 minutes.`
      : `Article deleted from MongoDB and removed from main branch! Vercel will auto-deploy in ~2 minutes.`;

    return NextResponse.json({
      success: true,
      slugId,
      message,
      environment: IS_PRODUCTION ? 'production' : 'localhost',
      workflow: 'MongoDB delete → MDX delete → Git (main) → Vercel',
    });

  } catch (error) {
    console.error('Article unpublish error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }, { status: 500 });
  }
}
