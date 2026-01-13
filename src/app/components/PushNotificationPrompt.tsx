/**
 * Push Notification Prompt Component
 *
 * Prompts user to enable push notifications
 * Shows in Messages page for mobile/desktop alerts
 */

'use client';

import { useState } from 'react';
import { Bell, BellOff, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePushNotifications } from '@/hooks/usePushNotifications';

interface PushNotificationPromptProps {
  userId?: string;
  onClose?: () => void;
}

export default function PushNotificationPrompt({ userId, onClose }: PushNotificationPromptProps) {
  const [dismissed, setDismissed] = useState(false);
  const { supported, permission, subscribed, subscribing, error, subscribe } = usePushNotifications(userId);

  // Don't show if not supported or already subscribed
  if (!supported || subscribed || dismissed || permission === 'denied') {
    return null;
  }

  const handleEnable = async () => {
    await subscribe();
    if (onClose) onClose();
  };

  const handleDismiss = () => {
    setDismissed(true);
    if (onClose) onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="relative mb-4 rounded-lg border border-green-500/30 bg-gradient-to-r from-green-500/10 to-emerald-500/10 p-4 backdrop-blur-sm"
      >
        <button
          onClick={handleDismiss}
          className="absolute right-2 top-2 rounded-full p-1 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 rounded-full bg-green-500/20 p-2">
            <Bell className="h-5 w-5 text-green-400" />
          </div>

          <div className="flex-1">
            <h3 className="font-semibold text-white">Enable Push Notifications</h3>
            <p className="mt-1 text-sm text-gray-300">
              Get instant alerts when you receive new SMS messages, even when the browser is closed.
            </p>

            {error && (
              <p className="mt-2 text-sm text-red-400">
                {error}
              </p>
            )}

            <div className="mt-3 flex gap-2">
              <button
                onClick={handleEnable}
                disabled={subscribing}
                className="rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-600 disabled:opacity-50"
              >
                {subscribing ? 'Enabling...' : 'Enable Notifications'}
              </button>
              <button
                onClick={handleDismiss}
                className="rounded-lg border border-gray-600 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-white/5"
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Compact notification status indicator
 */
export function PushNotificationStatus({ userId }: { userId?: string }) {
  const { supported, subscribed, subscribing, subscribe } = usePushNotifications(userId);

  if (!supported) return null;

  return (
    <button
      onClick={subscribe}
      disabled={subscribed || subscribing}
      className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors ${
        subscribed
          ? 'bg-green-500/20 text-green-400'
          : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
      }`}
      title={subscribed ? 'Push notifications enabled' : 'Enable push notifications'}
    >
      {subscribed ? (
        <>
          <Bell className="h-4 w-4" />
          <span>Notifications On</span>
        </>
      ) : (
        <>
          <BellOff className="h-4 w-4" />
          <span>{subscribing ? 'Enabling...' : 'Enable Alerts'}</span>
        </>
      )}
    </button>
  );
}
