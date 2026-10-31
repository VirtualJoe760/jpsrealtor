import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { publishArticle, validateForPublish, type ArticleFormData } from '@/lib/publishing-pipeline';
import { publishArticleToGBP } from '@/lib/gbp-publisher';

/**
 * POST /api/articles/publish
 *
 * Validates, then saves the article to the database (upsert by slug). Live on
 * the author's site as soon as this returns — no file, commit or rebuild.
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
    const { article, slugId } = body;

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

    // Save to the database (the only copy of the article)
    const { warnings: publishWarnings } = await publishArticle(article as ArticleFormData, slugId, {
      userId: session.user.id,
      userName: session.user.name || session.user.email || 'Unknown',
      userEmail: session.user.email || 'noemail@example.com',
    });

    // GBP auto-posting (non-blocking — don't fail the publish if GBP errors)
    // Passes userId so the publisher uses per-user GBP credentials if connected
    let gbpResult: { success: boolean; postName?: string; error?: string } | null = null;
    if (!article.draft) {
      try {
        gbpResult = await publishArticleToGBP(
          {
            title: article.title,
            excerpt: article.excerpt,
            image: article.featuredImage?.url,
            url: slugId,
            category: article.category,
          },
          session.user.id
        );
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
    const message = publishWarnings.length
      ? `Article saved and live on your site. Some follow-up steps didn't finish — see warnings.`
      : `Article published and live on your site.`;

    return NextResponse.json({
      success: true,
      slugId,
      url: `/insights/${slugId}`,
      warnings: [...(validation.warnings || []), ...publishWarnings],
      message,
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
