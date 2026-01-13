/**
 * Push Notification Service
 *
 * Handles sending Web Push notifications using web-push library
 */

import webpush from 'web-push';
import PushSubscription from '@/models/PushSubscription';

// Configure web-push with VAPID keys
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (!vapidPublicKey || !vapidPrivateKey) {
  console.warn('[Push Service] VAPID keys not configured');
} else {
  webpush.setVapidDetails(
    'mailto:josephsardella@gmail.com', // Replace with your email
    vapidPublicKey,
    vapidPrivateKey
  );
  console.log('[Push Service] VAPID details configured');
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  url?: string;
  phoneNumber?: string;
  messageId?: string;
  contactName?: string;
  requireInteraction?: boolean;
  actions?: Array<{ action: string; title: string }>;
  timestamp?: number;
}

/**
 * Send push notification to a single subscription
 */
export async function sendPushNotification(
  subscription: any,
  payload: PushNotificationPayload
): Promise<boolean> {
  try {
    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    };

    const payloadString = JSON.stringify(payload);

    console.log('[Push Service] Sending notification to:', subscription.endpoint.substring(0, 50) + '...');

    await webpush.sendNotification(pushSubscription, payloadString);

    console.log('[Push Service] ✅ Notification sent successfully');
    return true;
  } catch (error: any) {
    console.error('[Push Service] ❌ Error sending notification:', error);

    // Handle specific errors
    if (error.statusCode === 404 || error.statusCode === 410) {
      // Subscription expired or invalid - mark as inactive
      console.log('[Push Service] Subscription expired, marking as inactive');
      await PushSubscription.findOneAndUpdate(
        { endpoint: subscription.endpoint },
        { active: false }
      );
    }

    return false;
  }
}

/**
 * Send push notification to all user's active subscriptions
 */
export async function sendPushToUser(
  userId: string,
  payload: PushNotificationPayload
): Promise<{ sent: number; failed: number }> {
  try {
    // Get all active subscriptions for user
    const subscriptions = await PushSubscription.findActiveByUserId(userId);

    if (subscriptions.length === 0) {
      console.log('[Push Service] No active subscriptions for user:', userId);
      return { sent: 0, failed: 0 };
    }

    console.log(`[Push Service] Sending to ${subscriptions.length} device(s) for user:`, userId);

    // Send to all subscriptions
    const results = await Promise.allSettled(
      subscriptions.map((sub) => sendPushNotification(sub, payload))
    );

    const sent = results.filter((r) => r.status === 'fulfilled' && r.value === true).length;
    const failed = results.length - sent;

    console.log(`[Push Service] Results: ${sent} sent, ${failed} failed`);

    // Update lastUsed for successful subscriptions
    if (sent > 0) {
      await PushSubscription.updateMany(
        {
          userId,
          active: true,
        },
        {
          lastUsed: new Date(),
        }
      );
    }

    return { sent, failed };
  } catch (error) {
    console.error('[Push Service] Error sending to user:', error);
    return { sent: 0, failed: 0 };
  }
}

/**
 * Send SMS notification via push
 */
export async function sendSMSNotification(
  userId: string,
  message: {
    from: string;
    body: string;
    contactName?: string;
    messageId?: string;
  }
): Promise<void> {
  const payload: PushNotificationPayload = {
    title: `New SMS from ${message.contactName || message.from}`,
    body: message.body.substring(0, 100) + (message.body.length > 100 ? '...' : ''),
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: `sms-${message.messageId || Date.now()}`,
    url: `/agent/messages?phone=${message.from}`,
    phoneNumber: message.from,
    messageId: message.messageId,
    contactName: message.contactName,
    requireInteraction: false,
    actions: [
      { action: 'view', title: 'View' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
    timestamp: Date.now(),
  };

  await sendPushToUser(userId, payload);
}

export default {
  sendPushNotification,
  sendPushToUser,
  sendSMSNotification,
};
