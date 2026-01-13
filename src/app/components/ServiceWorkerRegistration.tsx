/**
 * Service Worker Registration Component
 *
 * Registers the service worker for push notifications
 * Place this in the root layout or app component
 */

'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      process.env.NODE_ENV === 'production'
    ) {
      // Register service worker
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[Service Worker] Registered successfully:', registration.scope);

          // Check for updates periodically
          setInterval(() => {
            registration.update();
          }, 60 * 60 * 1000); // Check every hour
        })
        .catch((error) => {
          console.error('[Service Worker] Registration failed:', error);
        });

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        console.log('[Service Worker] Message received:', event.data);

        if (event.data && event.data.type === 'OPEN_CONVERSATION') {
          // Handle conversation opening from notification click
          const phoneNumber = event.data.phoneNumber;
          if (phoneNumber) {
            // Navigate to messages page with phone number
            window.location.href = `/agent/messages?phone=${encodeURIComponent(phoneNumber)}`;
          }
        }
      });
    } else if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Development mode - register without HTTPS requirement
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[Service Worker] Registered in dev mode:', registration.scope);
        })
        .catch((error) => {
          console.error('[Service Worker] Registration failed in dev:', error);
        });
    }
  }, []);

  // This component doesn't render anything
  return null;
}
