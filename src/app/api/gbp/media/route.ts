import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';
import { listMedia, uploadMedia, deleteMedia, type GBPCredentials } from '@/lib/gbp-api';

// Platform owner fallback
const FALLBACK_ACCOUNT_ID = 'accounts/101108799337549000917';
const FALLBACK_LOCATION_ID = 'locations/7725888369257069197';

async function resolveUserGBP(email: string): Promise<{
  accountId: string;
  locationId: string;
  credentials?: Partial<GBPCredentials>;
}> {
  await dbConnect();
  const user = await User.findOne({ email }, { adAccounts: 1 }).lean();
  const gbp = (user as any)?.adAccounts?.gbp;

  if (gbp?.refreshToken && gbp?.accountId && gbp?.locationId && gbp?.status !== 'disconnected') {
    return {
      accountId: gbp.accountId,
      locationId: gbp.locationId,
      credentials: { refreshToken: gbp.refreshToken },
    };
  }

  return {
    accountId: FALLBACK_ACCOUNT_ID,
    locationId: FALLBACK_LOCATION_ID,
  };
}

/**
 * GET /api/gbp/media
 *
 * List all GBP photos for the authenticated user.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { accountId, locationId, credentials } = await resolveUserGBP(session.user.email);
    const result = await listMedia(accountId, locationId, credentials);

    return NextResponse.json({
      success: true,
      mediaItems: result.mediaItems || [],
    });
  } catch (error) {
    console.error('[GBP MEDIA LIST] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/gbp/media
 *
 * Upload a photo to GBP. Takes { sourceUrl, category }.
 * sourceUrl should be a publicly accessible URL (e.g., Cloudinary).
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { sourceUrl, category } = body;

    if (!sourceUrl) {
      return NextResponse.json(
        { error: 'Missing required field: sourceUrl' },
        { status: 400 }
      );
    }

    const validCategories = ['COVER', 'PROFILE', 'LOGO', 'ADDITIONAL'] as const;
    const mediaCategory = validCategories.includes(category) ? category : 'ADDITIONAL';

    const { accountId, locationId, credentials } = await resolveUserGBP(session.user.email);

    const result = await uploadMedia(
      accountId,
      locationId,
      {
        mediaFormat: 'PHOTO',
        sourceUrl,
        locationAssociation: { category: mediaCategory },
      },
      credentials
    );

    return NextResponse.json({
      success: true,
      mediaItem: result,
      message: 'Photo uploaded successfully',
    });
  } catch (error) {
    console.error('[GBP MEDIA UPLOAD] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/gbp/media
 *
 * Delete a photo from GBP. Body: { mediaName }.
 */
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { mediaName } = body;

    if (!mediaName) {
      return NextResponse.json(
        { error: 'Missing required field: mediaName' },
        { status: 400 }
      );
    }

    const { accountId, locationId, credentials } = await resolveUserGBP(session.user.email);
    await deleteMedia(accountId, locationId, mediaName, credentials);

    return NextResponse.json({
      success: true,
      message: 'Photo deleted successfully',
    });
  } catch (error) {
    console.error('[GBP MEDIA DELETE] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
