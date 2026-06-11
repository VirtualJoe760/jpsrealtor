import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { searchAvailableNumbers } from '@/lib/twilio';

/**
 * GET /api/agent/messaging/numbers?areaCode=760&contains=&limit=10
 *
 * Returns purchasable, SMS-enabled local numbers for the agent to pick from
 * (step 1 of provisioning their own Twilio number).
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const areaCodeRaw = searchParams.get('areaCode');
    const areaCode = areaCodeRaw ? parseInt(areaCodeRaw, 10) : undefined;
    const contains = searchParams.get('contains') || undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 30);

    if (!areaCode && !contains) {
      return NextResponse.json({ success: false, error: 'Provide an areaCode or contains filter' }, { status: 400 });
    }

    const numbers = await searchAvailableNumbers({ areaCode, contains, limit });
    return NextResponse.json({ success: true, numbers });
  } catch (error: any) {
    console.error('[messaging/numbers] Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to search numbers' }, { status: 500 });
  }
}
