/**
 * usePushNotifications Hook
 *
 * Manages push notification subscription and permissions
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

interface UsePushNotificationsReturn {
  supported: boolean;
  permission: NotificationPermission;
  subscribed: boolean;
  subscribing: boolean;
  error: string | null;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
  requestPermission: () => Promise<NotificationPermission>;
}

export function usePushNotifications(userId?: string): UsePushNotificationsReturn {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscribed, setSubscribed] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // Check if push notifications are supported
  useEffect(() => {
    const isSupported =
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window;

    setSupported(isSupported);

    if (isSupported) {
      setPermission(Notification.permission);
    }
  }, []);

  // Get service worker registration
  useEffect(() => {
    if (!supported) return;

    navigator.serviceWorker.ready.then((reg) => {
      setRegistration(reg);
      checkSubscription(reg);
    });
  }, [supported]);

  // Check if already subscribed
  const checkSubscription = async (reg: ServiceWorkerRegistration) => {
    try {
      const sub = await reg.pushManager.getSubscription();
      setSubscribed(!!sub);
    } catch (err) {
      console.error('[Push] Error checking subscription:', err);
    }
  };

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!supported) {
      throw new Error('Push notifications not supported');
    }

    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  }, [supported]);

  // Subscribe to push notifications
  const subscribe = useCallback(async () => {
    if (!supported) {
      setError('Push notifications not supported');
      return;
    }

    if (!userId) {
      setError('User not logged in');
      return;
    }

    setSubscribing(true);
    setError(null);

    try {
      // Request permission if not granted
      if (Notification.permission === 'default') {
        const result = await requestPermission();
        if (result !== 'granted') {
          throw new Error('Notification permission denied');
        }
      } else if (Notification.permission === 'denied') {
        throw new Error('Notification permission denied. Please enable in browser settings.');
      }

      // Wait for service worker to be ready
      const reg = await navigator.serviceWorker.ready;
      setRegistration(reg);

      // Subscribe to push manager
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        throw new Error('VAPID public key not configured');
      }

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      console.log('[Push] Subscription created:', subscription.endpoint);

      // Send subscription to backend
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          userAgent: navigator.userAgent,
          deviceType: getDeviceType(),
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to save subscription');
      }

      console.log('[Push] Subscription saved to backend');
      setSubscribed(true);
    } catch (err: any) {
      console.error('[Push] Subscription error:', err);
      setError(err.message || 'Failed to subscribe');
    } finally {
      setSubscribing(false);
    }
  }, [supported, userId, requestPermission]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    if (!registration) return;

    try {
      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        setSubscribed(false);
        return;
      }

      // Unsubscribe from push manager
      await subscription.unsubscribe();

      // Remove from backend
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
        }),
      });

      console.log('[Push] Unsubscribed successfully');
      setSubscribed(false);
    } catch (err: any) {
      console.error('[Push] Unsubscribe error:', err);
      setError(err.message || 'Failed to unsubscribe');
    }
  }, [registration]);

  return {
    supported,
    permission,
    subscribed,
    subscribing,
    error,
    subscribe,
    unsubscribe,
    requestPermission,
  };
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Detect device type
function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet';
  }
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return 'mobile';
  }
  return 'desktop';
}
