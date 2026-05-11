import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';

/**
 * POST /api/auth/meta-ads/disconnect
 *
 * Clears the agent's stored Meta credentials. Does NOT revoke the token on
 * Meta's side (the agent would do that in Facebook → Settings → Business Integrations).
 */
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await dbConnect();
  await User.findOneAndUpdate(
    { email: session.user.email.toLowerCase() },
    {
      $unset: {
        'adAccounts.meta.accessToken': '',
        'adAccounts.meta.pageAccessToken': '',
        'adAccounts.meta.tokenExpiresAt': '',
      },
      $set: {
        'adAccounts.meta.status': 'disconnected',
      },
    }
  );

  return NextResponse.json({ success: true });
}
