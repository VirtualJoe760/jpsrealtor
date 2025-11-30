import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { publishArticle, validateForPublish, type ArticleFormData } from '@/lib/publishing-pipeline';

/**
 * POST /api/articles/publish
 *
 * Publishes an article by writing MDX file to src/posts/ directory
 * This is how articles appear on /insights pages
 */
export async function POST(req: Request) {
  try {
    // Check auth
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { article, slugId } = body;

    // Validate request
    if (!article) {
      return NextResponse.json(
        { error: 'Missing required field: article' },
        { status: 400 }
      );
    }

    if (!slugId) {
      return NextResponse.json(
        { error: 'Missing required field: slugId' },
        { status: 400 }
      );
    }

    // Validate article data meets publishing requirements
    const validation = await validateForPublish(article as ArticleFormData);

    if (!validation.isValid) {
      return NextResponse.json({
        success: false,
        errors: validation.errors,
        warnings: validation.warnings,
      }, { status: 400 });
    }

    // Publish article to filesystem
    await publishArticle(article as ArticleFormData, slugId);

    return NextResponse.json({
      success: true,
      slugId,
      url: `/insights/${slugId}`,
      warnings: validation.warnings,
      message: `Article published successfully to src/posts/${slugId}.mdx`,
    });

  } catch (error) {
    console.error('Article publish error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }, { status: 500 });
  }
}
