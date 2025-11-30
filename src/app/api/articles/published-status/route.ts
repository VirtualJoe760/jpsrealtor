import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { isArticlePublished } from '@/lib/publishing-pipeline';

/**
 * GET /api/articles/published-status?slugId={slugId}
 *
 * Checks if an article is published (MDX file exists in src/posts/)
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

    const isPublished = await isArticlePublished(slugId);

    return NextResponse.json({
      slugId,
      isPublished,
    });

  } catch (error) {
    console.error('Published status check error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }, { status: 500 });
  }
}
