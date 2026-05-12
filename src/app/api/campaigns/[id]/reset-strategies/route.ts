// src/app/api/campaigns/[id]/reset-strategies/route.ts
//
// POST — manually reset one or more strategy flags + their stored configs on a campaign.
// Useful when the active flag has drifted out of sync (e.g. an ad was deleted on
// Meta's side but the metaAdsConfig is still populated, or a strategy was flagged
// active at campaign creation but never actually run).
//
// Body: { strategies: Array<'voicemail'|'directMail'|'googleAds'|'metaAds'|'email'|'text'> }

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import Campaign from '@/models/Campaign';

const FIELD_BY_STRATEGY: Record<string, string | null> = {
  voicemail: 'dropCowboyConfig',
  directMail: 'thanksioConfig',
  googleAds: 'googleAdsConfig',
  metaAds: 'metaAdsConfig',
  email: null,
  text: null,
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const strategies: string[] = Array.isArray(body.strategies) ? body.strategies : [];

    if (strategies.length === 0) {
      return NextResponse.json({ error: 'strategies array required' }, { status: 400 });
    }

    await dbConnect();
    const set: Record<string, any> = {};
    const unset: Record<string, ''> = {};

    for (const s of strategies) {
      if (!(s in FIELD_BY_STRATEGY)) continue;
      set[`activeStrategies.${s}`] = false;
      const configField = FIELD_BY_STRATEGY[s];
      if (configField) unset[configField] = '';
    }

    await Campaign.updateOne(
      { _id: id },
      {
        $set: set,
        ...(Object.keys(unset).length > 0 ? { $unset: unset } : {}),
      }
    );

    return NextResponse.json({ success: true, reset: strategies });
  } catch (err: any) {
    console.error('[reset-strategies] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to reset' }, { status: 500 });
  }
}
