import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { publishArticle, validateForPublish, type ArticleFormData } from '@/lib/publishing-pipeline';
import { IS_PRODUCTION } from '@/lib/environment';

/**
 * POST /api/articles/publish
 *
 * Dual-environment publishing:
 * LOCALHOST: Writes MDX file to src/posts/ + git operations
 * PRODUCTION: Saves to MongoDB + triggers Vercel rebuild
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

    // Publish article with environment-aware logic
    await publishArticle(article as ArticleFormData, slugId, {
      autoDeploy,
      userId: session.user.id,
      userName: session.user.name || session.user.email || 'Unknown',
      userEmail: session.user.email || 'noemail@example.com',
    });

    // Environment-specific response messages
    let message: string;
    let deployed: boolean;

    if (IS_PRODUCTION) {
      message = `Article saved to database! Vercel is rebuilding the site - your article will be live in 2-3 minutes.`;
      deployed = true;
    } else {
      const deployMessage = autoDeploy
        ? ' and deployed to production! Vercel will rebuild in ~2 minutes.'
        : '. Remember to commit and push to deploy to production.';
      message = `Article published successfully to src/posts/${slugId}.mdx${deployMessage}`;
      deployed = autoDeploy;
    }

    return NextResponse.json({
      success: true,
      slugId,
      url: `/insights/${slugId}`,
      warnings: validation.warnings,
      message,
      deployed,
      environment: IS_PRODUCTION ? 'production' : 'localhost',
    });

  } catch (error) {
    console.error('Article publish error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }, { status: 500 });
  }
}
