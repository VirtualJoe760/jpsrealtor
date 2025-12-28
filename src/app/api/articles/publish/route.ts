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
    // Check auth - allow both admins and agents
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { article, slugId, autoDeploy = true } = body; // autoDeploy defaults to true

    // Add author information from session
    article.authorId = session.user.id;
    article.authorName = session.user.name || session.user.email;

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

    // Publish article to filesystem (with optional auto-deploy)
    await publishArticle(article as ArticleFormData, slugId, { autoDeploy });

    const deployMessage = autoDeploy
      ? ' and deployed to production! Vercel will rebuild in ~2 minutes.'
      : '. Remember to commit and push to deploy to production.';

    return NextResponse.json({
      success: true,
      slugId,
      url: `/insights/${slugId}`,
      warnings: validation.warnings,
      message: `Article published successfully to src/posts/${slugId}.mdx${deployMessage}`,
      deployed: autoDeploy,
    });

  } catch (error) {
    console.error('Article publish error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }, { status: 500 });
  }
}
