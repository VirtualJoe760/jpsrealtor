import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { regenerateField, RegenerationContext } from '@/lib/field-regenerator';

/**
 * POST /api/articles/regenerate-field
 *
 * Regenerates a single field of an article using AI
 * Maintains context from the rest of the article
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

    const context: RegenerationContext = await req.json();

    // Validate request
    if (!context.field) {
      return NextResponse.json(
        { error: 'Missing required field: field' },
        { status: 400 }
      );
    }

    if (!context.articleContext) {
      return NextResponse.json(
        { error: 'Missing required field: articleContext' },
        { status: 400 }
      );
    }

    // Regenerate the field
    const result = await regenerateField(context);

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error || 'Failed to regenerate field',
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      field: result.field,
      newValue: result.newValue,
    });

  } catch (error) {
    console.error('Field regeneration error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }, { status: 500 });
  }
}
