import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { unpublishArticle, isArticlePublished } from '@/lib/publishing-pipeline';

/**
 * DELETE /api/articles/unpublish
 *
 * Unpublishes an article by deleting MDX file from src/posts/ directory
 * Article will no longer appear on /insights pages
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

    // Unpublish article from filesystem
    await unpublishArticle(slugId);

    return NextResponse.json({
      success: true,
      slugId,
      message: `Article unpublished successfully. Deleted src/posts/${slugId}.mdx`,
    });

  } catch (error) {
    console.error('Article unpublish error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }, { status: 500 });
  }
}
