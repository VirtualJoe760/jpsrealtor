/**
 * Test Push Notification Endpoint
 * Sends a test notification to the current user
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { sendPushToUser } from '@/services/pushNotificationService';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Send test notification
    const result = await sendPushToUser(userId, {
      title: '🎉 Push Notifications Enabled!',
      body: 'You will now receive instant alerts when new SMS messages arrive.',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      tag: 'test-notification',
      url: '/agent/messages',
      requireInteraction: false,
      timestamp: Date.now(),
    });

    console.log('[Push Test] Sent test notification:', result);

    return NextResponse.json({
      success: true,
      sent: result.sent,
      failed: result.failed,
      message: `Test notification sent to ${result.sent} device(s)`,
    });
  } catch (error: any) {
    console.error('[Push Test] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
