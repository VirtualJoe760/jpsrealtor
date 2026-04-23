import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { publishArticleToGBP, type ArticleForGBP } from '@/lib/gbp-publisher';
import { listLocalPosts, deleteLocalPost } from '@/lib/gbp-api';

const GBP_ACCOUNT_ID = 'accounts/101108799337549000917';
const GBP_LOCATION_ID = 'locations/7725888369257069197';

/**
 * POST /api/gbp/post
 *
 * Manual GBP posting endpoint for the admin dashboard.
 * Creates a Google Business Profile post from article data.
 *
 * Body: { title, excerpt, image?, url?, category? }
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { title, excerpt, image, url, category } = body as ArticleForGBP;

    if (!title || !excerpt) {
      return NextResponse.json(
        { error: 'Missing required fields: title, excerpt' },
        { status: 400 }
      );
    }

    const result = await publishArticleToGBP({ title, excerpt, image, url, category });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      postName: result.postName,
      message: 'GBP post created successfully',
    });
  } catch (error) {
    console.error('[GBP POST] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/gbp/post
 *
 * List existing GBP posts for the admin dashboard.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await listLocalPosts(GBP_ACCOUNT_ID, GBP_LOCATION_ID);

    return NextResponse.json({
      success: true,
      posts: result.localPosts || [],
      nextPageToken: result.nextPageToken,
    });
  } catch (error) {
    console.error('[GBP LIST] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/gbp/post
 *
 * Delete a GBP post by its resource name.
 * Body: { postName: string }
 */
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { postName } = body;

    if (!postName) {
      return NextResponse.json(
        { error: 'Missing required field: postName' },
        { status: 400 }
      );
    }

    await deleteLocalPost(GBP_ACCOUNT_ID, GBP_LOCATION_ID, postName);

    return NextResponse.json({
      success: true,
      message: 'GBP post deleted successfully',
    });
  } catch (error) {
    console.error('[GBP DELETE] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
