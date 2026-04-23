import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';
import { publishArticleToGBP, type ArticleForGBP } from '@/lib/gbp-publisher';
import { listLocalPosts, deleteLocalPost, type GBPCredentials } from '@/lib/gbp-api';

// Platform owner fallback (used when user has no GBP connected)
const FALLBACK_ACCOUNT_ID = 'accounts/101108799337549000917';
const FALLBACK_LOCATION_ID = 'locations/7725888369257069197';

/**
 * Resolve the GBP account, location, and credentials for the current user.
 * Returns per-user config if available, otherwise falls back to env vars.
 */
async function resolveUserGBP(email: string): Promise<{
  accountId: string;
  locationId: string;
  credentials?: Partial<GBPCredentials>;
  isPerUser: boolean;
}> {
  await dbConnect();
  const user = await User.findOne({ email }, { adAccounts: 1 }).lean();
  const gbp = (user as any)?.adAccounts?.gbp;

  if (gbp?.refreshToken && gbp?.accountId && gbp?.locationId && gbp?.status !== 'disconnected') {
    return {
      accountId: gbp.accountId,
      locationId: gbp.locationId,
      credentials: { refreshToken: gbp.refreshToken },
      isPerUser: true,
    };
  }

  // Fallback to platform owner env vars
  return {
    accountId: FALLBACK_ACCOUNT_ID,
    locationId: FALLBACK_LOCATION_ID,
    isPerUser: false,
  };
}

/**
 * POST /api/gbp/post
 *
 * Manual GBP posting endpoint for the dashboard.
 * Creates a Google Business Profile post from article data.
 * Uses the authenticated user's GBP credentials if connected,
 * otherwise falls back to platform owner env vars.
 *
 * Body: { title, excerpt, image?, url?, category? }
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
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

    // Use publishArticleToGBP which handles per-user credential lookup
    const result = await publishArticleToGBP(
      { title, excerpt, image, url, category },
      (session.user as any).id
    );

    if (!result.success) {
      if (result.skipped) {
        return NextResponse.json(
          {
            success: false,
            error: 'No GBP account connected. Go to Settings > Ad Accounts to connect your Google Business Profile.',
          },
          { status: 422 }
        );
      }
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
 * List existing GBP posts for the authenticated user's account.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { accountId, locationId, credentials } = await resolveUserGBP(session.user.email);

    const result = await listLocalPosts(accountId, locationId, undefined, credentials);

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
    if (!session?.user?.email) {
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

    const { accountId, locationId, credentials } = await resolveUserGBP(session.user.email);

    await deleteLocalPost(accountId, locationId, postName, credentials);

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
