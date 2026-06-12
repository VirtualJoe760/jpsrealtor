import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';
import {
  composeAgentTerms,
  composeAgentPrivacy,
  agentLegalInfoFromUser,
} from '@/lib/legal/agent-legal';

/**
 * GET /api/agent/legal
 * Returns the agent's composed Terms + Privacy (standard or custom body, with the
 * mandatory platform + SMS clauses always appended), plus the editable custom bodies.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    await dbConnect();

    const user = await User.findById((session.user as any).id)
      .select('name email phone agentProfile brokerageName licenseNumber businessName legal')
      .lean();
    if (!user) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });

    const info = agentLegalInfoFromUser(user);
    const legal = (user as any).legal || {};

    return NextResponse.json({
      success: true,
      terms: composeAgentTerms(info, legal.customTerms),
      privacy: composeAgentPrivacy(info, legal.customPrivacy),
      customTerms: legal.customTerms || '',
      customPrivacy: legal.customPrivacy || '',
      hasCustomTerms: !!legal.customTerms,
      hasCustomPrivacy: !!legal.customPrivacy,
      updatedAt: legal.updatedAt || null,
    });
  } catch (error: any) {
    console.error('[agent/legal GET] Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to load legal docs' }, { status: 500 });
  }
}

/**
 * PATCH /api/agent/legal  { customTerms?, customPrivacy? }
 * Save (or clear, with empty string) the agent's custom Terms/Privacy bodies.
 * The platform + SMS clauses are still appended at compose time.
 */
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    await dbConnect();
    const body = await request.json().catch(() => ({}));

    const update: Record<string, any> = {};
    if (typeof body.customTerms === 'string') update['legal.customTerms'] = body.customTerms.trim();
    if (typeof body.customPrivacy === 'string') update['legal.customPrivacy'] = body.customPrivacy.trim();
    if (Object.keys(update).length === 0) {
      return NextResponse.json({ success: false, error: 'Nothing to update' }, { status: 400 });
    }
    update['legal.updatedAt'] = new Date();

    await User.findByIdAndUpdate((session.user as any).id, { $set: update });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[agent/legal PATCH] Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to save' }, { status: 500 });
  }
}
