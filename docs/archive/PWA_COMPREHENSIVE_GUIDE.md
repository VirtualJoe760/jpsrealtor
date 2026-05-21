# Progressive Web App (PWA) - Comprehensive Technical Guide

**Last Updated:** 2026-01-24
**Status:** ✅ All Critical Issues Resolved
**Version:** 2.0

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [Critical Issues Identified & Resolved](#critical-issues-identified--resolved)
3. [PWA Architecture Overview](#pwa-architecture-overview)
4. [Service Worker Implementation](#service-worker-implementation)
5. [Push Notifications System](#push-notifications-system)
6. [Standalone Display Mode](#standalone-display-mode)
7. [Performance Optimizations](#performance-optimizations)
8. [Testing & Debugging](#testing--debugging)
9. [Known Limitations](#known-limitations)
10. [Troubleshooting Guide](#troubleshooting-guide)

---

## Executive Summary

Your application is a **full-featured Progressive Web App** with:
- ✅ Service Worker for offline support and push notifications
- ✅ Installable on iOS, Android, and Desktop
- ✅ Real-time SMS notifications via Web Push API
- ✅ Fullscreen standalone mode with safe area support
- ✅ Optimized performance for mobile devices

### Recent Fixes (2026-01-24)

Five critical issues were identified and resolved:

1. **Interaction Delay Fixed** - Removed aggressive `passive: false` event listeners blocking touch events
2. **Fullscreen Support Added** - Added `@media (display-mode: standalone)` CSS for PWA mode
3. **Service Worker Optimization** - Improved registration timing and activation detection
4. **PushManager Detection Fixed** - Hook now waits for SW activation before checking support
5. **Better Debug Info** - Enhanced diagnostic displays for troubleshooting

---

## Critical Issues Identified & Resolved

### 🔴 Issue #1: Touch Interaction Delays

**Problem:**
The app had `passive: false` event listeners on `touchend` events with `capture: true`, forcing the browser to wait for JavaScript execution before processing touches. This caused a noticeable delay when tapping buttons or UI elements.

**Location:**
`src/app/components/ClientLayoutWrapper.tsx:117-165` (OLD)

**Root Cause:**
```typescript
// ❌ BAD - Blocks all touch events
document.addEventListener('touchend', preventDoubleTap, {
  passive: false,  // Forces browser to wait for JS
  capture: true    // Intercepts during capture phase
});
```

**Fix Applied:**
```typescript
// ✅ GOOD - Only blocks gestures, not touches
document.addEventListener('gesturestart', preventGesture, { passive: false });
document.addEventListener('gesturechange', preventGesture, { passive: false });
document.addEventListener('gestureend', preventGesture, { passive: false });
```

**Impact:**
- ✅ Touch interactions now respond instantly
- ✅ Maintains pinch-zoom prevention
- ✅ Removes `capture: true` overhead

---

### 🔴 Issue #2: PWA Not Fullscreen

**Problem:**
When installed as a PWA (standalone mode), the app didn't utilize the full screen properly. No CSS was targeting standalone display mode specifically.

**Location:**
`src/app/globals.css` - Missing standalone media query

**Fix Applied:**
```css
/* PWA Standalone Mode - Fullscreen Optimizations */
@media (display-mode: standalone) {
  html, body {
    height: 100vh;
    height: 100dvh; /* Dynamic viewport for iOS */
    width: 100vw;
    overflow-x: hidden;
  }

  body {
    /* Extend into safe areas for true fullscreen */
    padding-top: env(safe-area-inset-top);
    padding-bottom: env(safe-area-inset-bottom);
    padding-left: env(safe-area-inset-left);
    padding-right: env(safe-area-inset-right);
  }

  * {
    -webkit-tap-highlight-color: transparent;
  }
}
```

**Impact:**
- ✅ App extends edge-to-edge in standalone mode
- ✅ Respects Dynamic Island and notch on iOS
- ✅ Removes browser chrome artifacts
- ✅ Uses dynamic viewport height (dvh) for better keyboard handling

---

### 🔴 Issue #3: Service Worker Activation Delay

**Problem:**
Service Worker registration had inconsistent timing:
- Only registered in `production` mode initially
- Didn't wait for SW to be fully activated
- PushManager checked before SW was ready

**Location:**
`src/app/components/ServiceWorkerRegistration.tsx:12-62` (OLD)

**Fix Applied:**
```typescript
// Wait for Service Worker to be fully ready
const registration = await navigator.serviceWorker.register('/sw.js', {
  scope: '/',
  updateViaCache: 'none', // Always check for updates
});

// Ensure SW is active before proceeding
const swReady = await navigator.serviceWorker.ready;
console.log('[Service Worker] 🚀 Ready and active');
console.log('[Service Worker] PushManager available:', 'pushManager' in swReady);
```

**Impact:**
- ✅ Works in both development (localhost/ngrok) and production
- ✅ Ensures PushManager is available when checked
- ✅ Better update handling with `updateViaCache: 'none'`
- ✅ Explicit ready state logging for debugging

---

### 🔴 Issue #4: PushManager Detection False Negative

**Problem:**
The `usePushNotifications` hook showed `PM: false` even though Service Worker was registered (`SW: true`). This was because it checked for PushManager **before** the Service Worker finished activating.

**Location:**
`src/hooks/usePushNotifications.ts:30-81` (OLD)

**Fix Applied:**
```typescript
// Wait for Service Worker to be ready before checking PushManager
if (hasServiceWorker) {
  try {
    const swReady = await navigator.serviceWorker.ready;
    const hasPushManagerInSW = 'pushManager' in swReady;

    console.log('[Push] Service Worker ready check:', {
      swState: swReady.active?.state,
      hasPushManagerInSW,
      hasPushManager,
      hasNotification,
    });

    const isSupported = hasPushManagerInSW && hasNotification;
    setSupported(isSupported);
  }
}
```

**Impact:**
- ✅ Correctly detects PushManager after SW activation
- ✅ Provides detailed logging for debugging
- ✅ Graceful fallback if SW fails to activate

---

### 🔴 Issue #5: Poor Debug Information

**Problem:**
When push notifications weren't working, the debug display showed minimal information making it hard to diagnose issues.

**Location:**
`src/app/components/PushNotificationPrompt.tsx:167-181`

**Fix Applied:**
```tsx
<div className="rounded-lg bg-yellow-500/20 border border-yellow-500/50 px-3 py-2 text-xs text-yellow-300">
  <div className="font-semibold mb-1">⚠️ Push Notifications Not Ready</div>
  <div>Supported: {String(supported)}</div>
  <div>SW: {String('serviceWorker' in navigator)}</div>
  <div>PM (window): {String('PushManager' in window)}</div>
  <div>Notification: {String('Notification' in window)}</div>
  <div className="mt-1 text-yellow-400 text-[10px]">
    💡 Tip: Wait a few seconds for Service Worker to activate, then refresh
  </div>
</div>
```

**Impact:**
- ✅ Clear visual distinction (yellow warning vs red error)
- ✅ Helpful user guidance
- ✅ More detailed debug information

---

## PWA Architecture Overview

### File Structure

```
jpsrealtor/
├── public/
│   ├── manifest.json           # PWA manifest (app metadata)
│   ├── sw.js                   # Service Worker (push notifications)
│   └── icons/                  # PWA icons (72x72 to 512x512)
│       ├── icon-192x192.png
│       ├── icon-512x512.png
│       └── badge-72x72.png
├── src/
│   ├── app/
│   │   ├── layout.tsx                      # PWA meta tags
│   │   ├── globals.css                     # Standalone mode CSS
│   │   ├── components/
│   │   │   ├── ServiceWorkerRegistration.tsx  # SW registration
│   │   │   ├── PushNotificationPrompt.tsx     # Push UI
│   │   │   └── ClientLayoutWrapper.tsx        # Event handlers
│   │   └── agent/messages/page.tsx         # WebSocket integration
│   ├── hooks/
│   │   ├── usePushNotifications.ts         # Push notification hook
│   │   └── useSocket.ts                    # WebSocket hook
│   ├── services/
│   │   └── pushNotificationService.ts      # Server-side push
│   └── models/
│       └── PushSubscription.ts             # Database model
├── docs/
│   ├── PWA_COMPREHENSIVE_GUIDE.md (this file)
│   ├── PWA_PUSH_NOTIFICATIONS_COMPLETE_GUIDE.md
│   └── deployment/PWA_SETUP.md
└── next.config.mjs              # Next-PWA configuration
```

### Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| PWA Framework | next-pwa | Service Worker generation |
| Push Protocol | Web Push API | Browser push notifications |
| Service Worker | Custom sw.js | Background notifications |
| WebSocket | Socket.io | Real-time message delivery |
| Backend | Next.js API Routes | Push subscription management |
| Database | MongoDB (PushSubscription model) | Store push subscriptions |
| VAPID | web-push library | Authentication for push messages |

---

## Service Worker Implementation

### Registration Flow

```
1. Page Loads
   ↓
2. ClientLayoutWrapper mounts (agent/messages/page.tsx:248)
   ↓
3. ServiceWorkerRegistration component runs
   ↓
4. navigator.serviceWorker.register('/sw.js')
   ↓
5. Service Worker installs (sw.js:15)
   ↓
6. Service Worker activates (sw.js:21)
   ↓
7. navigator.serviceWorker.ready resolves
   ↓
8. PushManager becomes available
   ↓
9. usePushNotifications sets supported = true
   ↓
10. User can enable push notifications
```

### Service Worker Lifecycle

**File:** `public/sw.js`

```javascript
// Version management
const SW_VERSION = '1.0.0';
const CACHE_NAME = `jpsrealtor-cache-${SW_VERSION}`;

// Install: Activate immediately
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing version:', SW_VERSION);
  self.skipWaiting(); // Don't wait for old SW to finish
});

// Activate: Clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating version:', SW_VERSION);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  return self.clients.claim(); // Take control immediately
});

// Push: Receive and display notification
self.addEventListener('push', (event) => {
  const payload = event.data.json();
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon || '/icons/icon-192x192.png',
      badge: payload.badge || '/icons/badge-72x72.png',
      tag: payload.tag,
      data: payload.data,
      actions: payload.actions,
    })
  );
});

// Click: Open app when notification clicked
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/agent/messages';

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // Focus existing window or open new one
      for (const client of clientList) {
        if (client.url.includes('/agent/messages')) {
          return client.focus();
        }
      }
      return clients.openWindow(urlToOpen);
    })
  );
});
```

### Update Strategy

The Service Worker uses `updateViaCache: 'none'` to ensure fresh updates:

```typescript
const registration = await navigator.serviceWorker.register('/sw.js', {
  scope: '/',
  updateViaCache: 'none', // Browser won't cache sw.js
});

// Check for updates every hour
setInterval(() => {
  registration.update();
}, 60 * 60 * 1000);
```

---

## Push Notifications System

### Architecture

```
1. User clicks "Enable Notifications"
   ↓
2. usePushNotifications.subscribe()
   ↓
3. Request permission (Notification.requestPermission())
   ↓
4. Subscribe to PushManager (registration.pushManager.subscribe())
   ↓
5. Send subscription to /api/push/subscribe
   ↓
6. Save to MongoDB (PushSubscription model)
   ↓
7. When SMS arrives:
   ↓
8. Twilio webhook → /api/crm/sms/webhook
   ↓
9. pushNotificationService.sendSMSNotification()
   ↓
10. web-push sends to browser
    ↓
11. Service Worker receives 'push' event
    ↓
12. showNotification() displays notification
```

### Subscription Management

**Client Side:** `src/hooks/usePushNotifications.ts`

```typescript
const subscribe = async () => {
  // 1. Request permission
  if (Notification.permission === 'default') {
    const result = await Notification.requestPermission();
    if (result !== 'granted') return;
  }

  // 2. Wait for Service Worker
  const reg = await navigator.serviceWorker.ready;

  // 3. Subscribe to PushManager
  const subscription = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  });

  // 4. Send to backend
  await fetch('/api/push/subscribe', {
    method: 'POST',
    body: JSON.stringify({
      subscription: subscription.toJSON(),
      userAgent: navigator.userAgent,
      deviceType: getDeviceType(),
    }),
  });
};
```

**Server Side:** `src/app/api/push/subscribe/route.ts`

```typescript
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { subscription, userAgent, deviceType } = await request.json();

  // Save to database
  await PushSubscription.create({
    userId: new mongoose.Types.ObjectId(session.user.id),
    endpoint: subscription.endpoint,
    keys: subscription.keys,
    userAgent,
    deviceType,
    active: true,
  });

  return NextResponse.json({ success: true });
}
```

### Sending Push Notifications

**File:** `src/services/pushNotificationService.ts`

```typescript
export async function sendSMSNotification(
  userId: string,
  message: {
    from: string;
    body: string;
    contactName?: string;
    messageId?: string;
  }
): Promise<void> {
  // Format phone number for display
  const formatPhoneForDisplay = (phone: string): string => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      const areaCode = cleaned.substring(1, 4);
      const prefix = cleaned.substring(4, 7);
      const lineNumber = cleaned.substring(7);
      return `(${areaCode}) ${prefix}-${lineNumber}`;
    }
    return phone;
  };

  const displayName = message.contactName || formatPhoneForDisplay(message.from);

  const payload: PushNotificationPayload = {
    title: `New SMS from ${displayName}`,
    body: message.body.substring(0, 100),
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: `sms-${message.messageId || Date.now()}`,
    url: `/agent/messages?phone=${message.from}`,
    phoneNumber: message.from,
    messageId: message.messageId,
    contactName: message.contactName,
    actions: [
      { action: 'view', title: 'View' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  await sendPushToUser(userId, payload);
}

export async function sendPushToUser(
  userId: string,
  payload: PushNotificationPayload
): Promise<{ sent: number; failed: number }> {
  // Get all active subscriptions for user
  const subscriptions = await PushSubscription.findActiveByUserId(userId);

  // Send to all devices
  const results = await Promise.allSettled(
    subscriptions.map((sub) => sendPushNotification(sub, payload))
  );

  const sent = results.filter((r) => r.status === 'fulfilled' && r.value === true).length;
  const failed = results.length - sent;

  return { sent, failed };
}
```

### VAPID Configuration

**Environment Variables:** `.env.local`

```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BN86CY-qNREtVMu5yT7-TS4Im_HjbOyJrs6_AkMzOK4imi_Esrwt-dIe5LB7ic8ypGuYMiE525HUmxzDbqFJuR8
VAPID_PRIVATE_KEY=BEe8O9YY223IaGRnY0mO-yKXHraVNTPqLScKvekfQsI
```

**Push Service:** `src/services/pushNotificationService.ts`

```typescript
import webpush from 'web-push';

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

webpush.setVapidDetails(
  'mailto:josephsardella@gmail.com',
  vapidPublicKey,
  vapidPrivateKey
);
```

---

## Standalone Display Mode

### Manifest Configuration

**File:** `public/manifest.json`

```json
{
  "name": "Joseph Sardella | Real Estate Agent | eXp Realty",
  "short_name": "JPS",
  "description": "Your trusted real estate expert in the Coachella Valley.",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#ffffff",
  "orientation": "portrait-primary",
  "scope": "/",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable any"
    }
  ]
}
```

### Viewport Configuration

**File:** `src/app/layout.tsx:131`

```html
<meta
  name="viewport"
  content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes, viewport-fit=cover"
/>
```

Key parameters:
- `viewport-fit=cover` - Extends content into safe areas (Dynamic Island, notch)
- `maximum-scale=5` - Allows some zoom for accessibility
- `user-scalable=yes` - Permits zoom gestures

### Safe Area Handling

**File:** `src/app/globals.css:36-58`

```css
/* PWA Standalone Mode - Fullscreen Optimizations */
@media (display-mode: standalone) {
  html, body {
    height: 100vh;
    height: 100dvh; /* Dynamic viewport height */
    width: 100vw;
    overflow-x: hidden;
  }

  body {
    padding-top: env(safe-area-inset-top);
    padding-bottom: env(safe-area-inset-bottom);
    padding-left: env(safe-area-inset-left);
    padding-right: env(safe-area-inset-right);
  }

  * {
    -webkit-tap-highlight-color: transparent;
  }
}
```

### Detection in JavaScript

**File:** `src/app/components/navbar/MobileBottomNav.tsx:18-29`

```typescript
const [isPWA, setIsPWA] = useState(false);

useEffect(() => {
  if (typeof window !== 'undefined') {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone ||
      document.referrer.includes('android-app://');

    setIsPWA(isStandalone);
  }
}, []);
```

Three detection methods:
1. `matchMedia('(display-mode: standalone)')` - Standard web API
2. `navigator.standalone` - iOS-specific property
3. `document.referrer.includes('android-app://')` - Android launcher detection

---

## Performance Optimizations

### Caching Strategy

**File:** `next.config.mjs:171-319`

The app uses `next-pwa` with strategic caching:

```javascript
runtimeCaching: [
  // Fonts: CacheFirst (1 year)
  {
    urlPattern: /^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,
    handler: "CacheFirst",
    options: {
      cacheName: "google-fonts-webfonts",
      expiration: { maxAgeSeconds: 365 * 24 * 60 * 60 },
    },
  },

  // Images: StaleWhileRevalidate (24 hours)
  {
    urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
    handler: "StaleWhileRevalidate",
    options: {
      cacheName: "static-image-assets",
      expiration: { maxAgeSeconds: 24 * 60 * 60 },
    },
  },

  // API Routes: NetworkFirst (no caching)
  {
    urlPattern: ({ url }) => url.pathname.startsWith("/api/"),
    handler: "NetworkFirst",
  },
]
```

### Event Listener Optimization

**Before (Slow):**
```typescript
document.addEventListener('touchend', handler, {
  passive: false,  // ❌ Blocks scroll
  capture: true    // ❌ Extra overhead
});
```

**After (Fast):**
```typescript
document.addEventListener('gesturestart', handler, {
  passive: false  // ✅ Only for gestures
});
// Removed capture: true for better performance
```

### Dynamic Viewport Units

```css
html {
  height: 100vh;   /* Fallback */
  height: 100dvh;  /* Dynamic (better for iOS) */
}
```

`dvh` (dynamic viewport height) adjusts when the keyboard opens/closes on mobile, preventing layout shifts.

---

## Testing & Debugging

### Local Development Testing

**Requirements:**
- HTTPS (use ngrok or localhost)
- Modern browser (Chrome, Safari, Edge)

**Setup:**
```bash
# 1. Start development server
npm run dev

# 2. In separate terminal, start ngrok
ngrok http 3000

# 3. Open ngrok HTTPS URL on mobile device
```

### Browser DevTools

**Chrome DevTools → Application Tab:**

1. **Manifest**
   - Verify all fields populated
   - Check icons load correctly
   - Validate start_url and scope

2. **Service Workers**
   - Should show "activated and running"
   - Use "Update" button to test changes
   - Check "Offline" to simulate offline mode

3. **Cache Storage**
   - View cached resources
   - Clear cache if needed
   - Check cache names match SW_VERSION

4. **Push Messaging**
   - View active subscriptions
   - Test push notifications

### Console Logging

The app has comprehensive logging:

```typescript
// Service Worker Registration
[Service Worker] Starting registration...
[Service Worker] ✅ Registered successfully: https://example.com/
[Service Worker] 🚀 Ready and active
[Service Worker] PushManager available: true

// Push Notifications
[Push] Initial support check: {...}
[Push] Service Worker ready check: {...}
[Push] Subscription created: https://...

// WebSocket
[Socket.io] 📤 Emitting to room: user:123, clients in room: 1
[Socket.io] ✅ Emitted 'message:new' event

// Messages Page
[Messages] 🎉 RECEIVED NEW MESSAGE VIA WEBSOCKET!
[Messages] ✅ Adding message to state
```

### Common Checks

**Is Service Worker registered?**
```javascript
navigator.serviceWorker.getRegistration().then(reg => {
  console.log('SW registered:', !!reg);
  console.log('SW active:', !!reg.active);
});
```

**Is PushManager available?**
```javascript
navigator.serviceWorker.ready.then(reg => {
  console.log('PushManager available:', 'pushManager' in reg);
});
```

**Is app in standalone mode?**
```javascript
console.log('Standalone:', window.matchMedia('(display-mode: standalone)').matches);
```

**Check push subscription:**
```javascript
navigator.serviceWorker.ready.then(reg => {
  reg.pushManager.getSubscription().then(sub => {
    console.log('Push subscription:', sub);
  });
});
```

---

## Known Limitations

### iOS Safari Restrictions

1. **HTTPS Required**
   - Service Workers only work on HTTPS (or localhost)
   - Use ngrok for local testing on iPhone

2. **Push Notification Limitations**
   - iOS Safari 16.4+ required for Web Push
   - Must add to home screen first (PWA mode)
   - Browser-based push doesn't work (only PWA)

3. **Storage Limits**
   - Cache storage limited to ~50MB on iOS
   - Exceeding limit causes eviction

4. **Background Limits**
   - Service Workers can be killed after ~30 seconds in background
   - Push notifications still work (OS handles)

### Android Limitations

1. **Battery Optimization**
   - Aggressive battery savers may kill background processes
   - Push notifications may be delayed

2. **Chrome Updates**
   - Older Android versions may not support latest features
   - Recommend Chrome 90+

### Desktop Limitations

1. **Notification Permissions**
   - Users must explicitly grant permission
   - No way to bypass browser settings

2. **Background Tabs**
   - Service Worker may be throttled in background tabs
   - WebSocket connections may drop

---

## Troubleshooting Guide

### Symptom: Can't Click Anything on PWA

**Cause:** Aggressive event listeners blocking touches

**Solution:** ✅ **FIXED** - Removed `passive: false` on `touchend` events

**Verify Fix:**
```bash
grep -rn "touchend" src/app/components/ClientLayoutWrapper.tsx
# Should return no results
```

---

### Symptom: PWA Not Fullscreen

**Cause:** Missing `@media (display-mode: standalone)` CSS

**Solution:** ✅ **FIXED** - Added standalone mode CSS

**Verify Fix:**
```bash
grep -A5 "display-mode: standalone" src/app/globals.css
# Should show fullscreen CSS
```

---

### Symptom: "Push Notifications Not Ready" Yellow Banner

**Cause:** Service Worker hasn't finished activating yet

**Solution:**
1. Wait 5-10 seconds
2. Refresh the page
3. Check console for SW activation logs
4. Verify HTTPS connection

**Expected Logs:**
```
[Service Worker] Starting registration...
[Service Worker] ✅ Registered successfully
[Service Worker] 🚀 Ready and active
[Service Worker] PushManager available: true
[Push] Service Worker ready check: {swState: 'activated', ...}
```

---

### Symptom: Push Notifications Not Arriving

**Checklist:**
- [ ] Is app in PWA mode (installed on home screen)?
- [ ] Did user grant notification permission?
- [ ] Is subscription saved in database?
- [ ] Are VAPID keys configured in .env.local?
- [ ] Is Service Worker active?

**Debug Steps:**

1. **Check subscription exists:**
```javascript
navigator.serviceWorker.ready.then(reg => {
  reg.pushManager.getSubscription().then(sub => {
    if (sub) {
      console.log('✅ Subscribed:', sub.endpoint);
    } else {
      console.log('❌ Not subscribed');
    }
  });
});
```

2. **Test with /api/push/test:**
```bash
curl -X POST https://your-domain.com/api/push/test \
  -H "Cookie: next-auth.session-token=YOUR_SESSION"
```

3. **Check server logs:**
```
[Push Service] Sending notification to: https://...
[Push Service] ✅ Notification sent successfully
```

4. **Verify VAPID keys:**
```bash
grep VAPID .env.local
# Should show both public and private keys
```

---

### Symptom: Service Worker Not Updating

**Cause:** Browser cached old sw.js file

**Solutions:**

1. **Hard Refresh:**
   - Chrome/Edge: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
   - Safari: Cmd+Option+R

2. **Unregister and Re-register:**
```javascript
navigator.serviceWorker.getRegistrations().then(registrations => {
  for (let registration of registrations) {
    registration.unregister();
  }
  window.location.reload();
});
```

3. **DevTools Override:**
   - Chrome DevTools → Application → Service Workers
   - Check "Update on reload"

4. **Update SW Version:**
```javascript
// public/sw.js
const SW_VERSION = '1.0.1'; // Increment this
```

---

### Symptom: WebSocket Connection Failing

**Cause:** App trying to connect to localhost instead of ngrok URL

**Solution:** ✅ **ALREADY FIXED** in `useSocket.ts`

**Verify:**
```typescript
// src/hooks/useSocket.ts:33-40
const socketUrl = typeof window !== 'undefined'
  ? window.location.origin  // ✅ Uses current URL
  : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
```

**Check Logs:**
```
[useSocket] Connecting to: https://your-ngrok-url.ngrok-free.dev
[Socket.io] ✅ Client connected: abc123
```

---

### Symptom: Hydration Warnings

**Cause:** Server-rendered HTML doesn't match client

**Common Causes:**
1. Theme mismatches (server vs client)
2. Timestamp rendering
3. Random values in SSR

**Solutions:**
- Use `suppressHydrationWarning` on specific elements
- Render client-only content after mount
- Use consistent theme between server and client

**Example:**
```tsx
const [mounted, setMounted] = useState(false);

useEffect(() => {
  setMounted(true);
}, []);

if (!mounted) {
  return null; // Don't render until client-side
}
```

---

## Next Steps

### Recommended Improvements

1. **Offline Support**
   - Cache critical pages for offline access
   - Add offline fallback page
   - Queue failed requests for retry

2. **Background Sync**
   - Sync messages when connection restored
   - Retry failed message sends

3. **Performance Monitoring**
   - Add Web Vitals tracking
   - Monitor Service Worker performance
   - Track push notification delivery rates

4. **Enhanced Notifications**
   - Add notification sounds
   - Support rich media (images)
   - Implement notification grouping

5. **Analytics**
   - Track PWA install rate
   - Monitor push notification engagement
   - Measure offline usage

### Testing Checklist

Before deploying to production:

- [ ] Test on iOS Safari (latest version)
- [ ] Test on Android Chrome (latest version)
- [ ] Test on desktop Chrome/Edge
- [ ] Verify push notifications work on all platforms
- [ ] Test offline functionality
- [ ] Check performance with Lighthouse (PWA score 90+)
- [ ] Verify manifest loads correctly
- [ ] Test install prompt appears
- [ ] Confirm fullscreen mode works
- [ ] Validate safe area insets on notched devices
- [ ] Test WebSocket fallback when SW updates
- [ ] Verify VAPID keys are secure (not in client code)

---

## References

### Official Documentation
- [Web.dev PWA Guide](https://web.dev/progressive-web-apps/)
- [MDN: Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [MDN: Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Apple: Configuring Web Applications](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html)

### Libraries
- [next-pwa](https://github.com/shadowwalker/next-pwa)
- [web-push](https://github.com/web-push-libs/web-push)
- [workbox](https://developer.chrome.com/docs/workbox/)

### Tools
- [PWA Asset Generator](https://github.com/elegantapp/pwa-asset-generator)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)
- [ngrok](https://ngrok.com/)

---

**Document Version:** 2.0
**Last Updated:** 2026-01-24
**Maintained By:** Development Team
**Status:** ✅ All critical issues resolved
