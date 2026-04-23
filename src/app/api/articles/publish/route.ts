import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { publishArticle, validateForPublish, type ArticleFormData } from '@/lib/publishing-pipeline';
import { IS_PRODUCTION } from '@/lib/environment';
import { publishArticleToGBP } from '@/lib/gbp-publisher';

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

    // GBP auto-posting (non-blocking — don't fail the publish if GBP errors)
    let gbpResult: { success: boolean; postName?: string; error?: string } | null = null;
    if (!article.draft) {
      try {
        gbpResult = await publishArticleToGBP({
          title: article.title,
          excerpt: article.excerpt,
          image: article.featuredImage?.url,
          url: slugId,
          category: article.category,
        });
        if (gbpResult.success) {
          console.log(`[PUBLISH] GBP post created: ${gbpResult.postName}`);
        } else {
          console.warn(`[PUBLISH] GBP post skipped: ${gbpResult.error}`);
        }
      } catch (gbpError) {
        console.error('[PUBLISH] GBP auto-post failed (non-blocking):', gbpError);
      }
    }

    // Unified workflow response messages
    const message = IS_PRODUCTION
      ? `Article saved to MongoDB and pushed to main branch! Vercel is rebuilding - your article will be live in 2-3 minutes.`
      : `Article saved to MongoDB and pushed to main branch! Vercel will auto-deploy in ~2 minutes.`;

    return NextResponse.json({
      success: true,
      slugId,
      url: `/insights/${slugId}`,
      warnings: validation.warnings,
      message,
      deployed: true,
      environment: IS_PRODUCTION ? 'production' : 'localhost',
      workflow: 'MongoDB → MDX → Git (main) → Vercel',
      gbp: gbpResult ? { success: gbpResult.success, postName: gbpResult.postName, error: gbpResult.error } : null,
    });

  } catch (error) {
    console.error('Article publish error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }, { status: 500 });
  }
}
