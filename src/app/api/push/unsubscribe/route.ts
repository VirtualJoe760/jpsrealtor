/**
 * Push Unsubscribe API
 *
 * POST /api/push/unsubscribe
 * Unsubscribe from push notifications
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import PushSubscription from '@/models/PushSubscription';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const body = await request.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json(
        { success: false, error: 'Endpoint required' },
        { status: 400 }
      );
    }

    console.log('[Push Unsubscribe] Removing subscription:', endpoint);

    // Find and deactivate subscription
    const subscription = await PushSubscription.findOne({
      endpoint,
      userId: session.user.id,
    });

    if (!subscription) {
      return NextResponse.json(
        { success: false, error: 'Subscription not found' },
        { status: 404 }
      );
    }

    // Deactivate instead of delete (keep for analytics)
    subscription.active = false;
    await subscription.save();

    console.log('[Push Unsubscribe] Deactivated subscription:', subscription._id);

    return NextResponse.json({
      success: true,
      message: 'Unsubscribed successfully',
    });
  } catch (error: any) {
    console.error('[Push Unsubscribe] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
