import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { setDraftStatus, articleExists, getArticleBySlug } from '@/lib/services/article.service';

/**
 * POST /api/articles/set-draft
 *
 * Sets the article's status in the database. Pages read it on request, so the
 * change is live immediately.
 *
 * Agents can toggle their own articles. Admins can toggle any article.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
    }

    const { slugId, draft } = await request.json();

    if (!slugId) {
      return NextResponse.json(
        { success: false, error: 'slugId is required' },
        { status: 400 }
      );
    }

    // Ownership check — agents can only modify their own articles
    const isImpersonating = !!(session?.user as any)?.impersonatedBy;
    const isAdmin = (session?.user as any)?.isAdmin && !isImpersonating;
    if (!isAdmin) {
      const article = await getArticleBySlug(slugId);
      if (article && article.author?.id?.toString() !== userId) {
        return NextResponse.json(
          { success: false, error: 'Forbidden. You can only modify your own articles.' },
          { status: 403 }
        );
      }
    }

    const exists = await articleExists(slugId);
    if (!exists) {
      return NextResponse.json(
        { success: false, error: `Article not found: ${slugId}` },
        { status: 404 }
      );
    }

    const article = await setDraftStatus(slugId, draft);
    if (!article) {
      return NextResponse.json(
        { success: false, error: `Failed to update article: ${slugId}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Article ${draft ? 'moved to draft' : 'published'}. The change is live on your site.`,
      slugId,
    });
  } catch (error: any) {
    console.error('Error setting draft status:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to set draft status' },
      { status: 500 }
    );
  }
}
