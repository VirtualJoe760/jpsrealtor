import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';
import { getLocationInfo, updateLocationInfo, type GBPCredentials } from '@/lib/gbp-api';

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
 * GET /api/gbp/info
 *
 * Get current business info (hours, description, phone, website).
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { accountId, locationId, credentials } = await resolveUserGBP(session.user.email);
    const info = await getLocationInfo(accountId, locationId, credentials);

    return NextResponse.json({
      success: true,
      info,
    });
  } catch (error) {
    console.error('[GBP INFO GET] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/gbp/info
 *
 * Update business info. Takes { description?, phoneNumbers?, websiteUri?, regularHours? }.
 * Builds the updateMask automatically from provided fields.
 */
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { description, phoneNumbers, websiteUri, regularHours } = body;

    // Build update data and mask from provided fields
    const updateData: Record<string, unknown> = {};
    const maskFields: string[] = [];

    if (description !== undefined) {
      updateData.profile = { description };
      maskFields.push('profile.description');
    }

    if (phoneNumbers !== undefined) {
      updateData.phoneNumbers = phoneNumbers;
      maskFields.push('phoneNumbers');
    }

    if (websiteUri !== undefined) {
      updateData.websiteUri = websiteUri;
      maskFields.push('websiteUri');
    }

    if (regularHours !== undefined) {
      updateData.regularHours = regularHours;
      maskFields.push('regularHours');
    }

    if (maskFields.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update. Provide at least one of: description, phoneNumbers, websiteUri, regularHours' },
        { status: 400 }
      );
    }

    const updateMask = maskFields.join(',');
    const { accountId, locationId, credentials } = await resolveUserGBP(session.user.email);

    const result = await updateLocationInfo(
      accountId,
      locationId,
      updateData,
      updateMask,
      credentials
    );

    return NextResponse.json({
      success: true,
      info: result,
      message: 'Business info updated successfully',
    });
  } catch (error) {
    console.error('[GBP INFO UPDATE] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
