/**
 * Push Subscription API
 *
 * POST /api/push/subscribe
 * Subscribe to push notifications
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import PushSubscription from '@/models/PushSubscription';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const body = await request.json();
    const { subscription, userAgent, deviceType } = body;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json(
        { success: false, error: 'Invalid subscription data' },
        { status: 400 }
      );
    }

    console.log('[Push Subscribe] Saving subscription for user:', session.user.id);

    // Check if subscription already exists
    const existing = await PushSubscription.findOne({
      endpoint: subscription.endpoint,
    });

    if (existing) {
      // Update existing subscription
      existing.userId = new mongoose.Types.ObjectId(session.user.id);
      existing.keys = subscription.keys;
      existing.userAgent = userAgent || existing.userAgent;
      existing.deviceType = deviceType || existing.deviceType;
      existing.active = true;
      existing.lastUsed = new Date();
      await existing.save();

      console.log('[Push Subscribe] Updated existing subscription:', existing._id);

      return NextResponse.json({
        success: true,
        subscription: {
          id: existing._id,
          endpoint: existing.endpoint,
        },
      });
    }

    // Create new subscription
    const newSubscription = await PushSubscription.create({
      userId: new mongoose.Types.ObjectId(session.user.id),
      endpoint: subscription.endpoint,
      keys: subscription.keys,
      userAgent,
      deviceType,
      active: true,
      lastUsed: new Date(),
    });

    console.log('[Push Subscribe] Created new subscription:', newSubscription._id);

    return NextResponse.json({
      success: true,
      subscription: {
        id: newSubscription._id,
        endpoint: newSubscription.endpoint,
      },
    });
  } catch (error: any) {
    console.error('[Push Subscribe] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
