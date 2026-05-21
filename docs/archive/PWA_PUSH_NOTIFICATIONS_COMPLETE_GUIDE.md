# PWA Push Notifications - Complete Implementation Guide

**Status:** ✅ Fully Implemented
**Last Updated:** 2026-01-13

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Current Implementation](#current-implementation)
3. [How It Works](#how-it-works)
4. [Setup & Configuration](#setup--configuration)
5. [Testing Guide](#testing-guide)
6. [Troubleshooting](#troubleshooting)
7. [Advanced Features](#advanced-features)

---

## Overview

Your PWA is fully configured with **native push notifications** that:

✅ **Alert users when they receive SMS messages**
✅ **Work even when the browser is closed**
✅ **Open the web app directly to the message**
✅ **Support Android, iOS (PWA), Windows, macOS, Linux**
✅ **Include contact name and message preview**
✅ **Vibrate on mobile devices**
✅ **Show action buttons (View/Dismiss)**

---

## Current Implementation

### 🎯 Complete Feature Set

#### Backend Infrastructure
- ✅ **Service Worker** (`/public/sw.js`) - Handles push events
- ✅ **Push Subscription API** (`/api/push/subscribe`) - Saves user subscriptions
- ✅ **Push Unsubscribe API** (`/api/push/unsubscribe`) - Removes subscriptions
- ✅ **Push Notification Service** (`/services/pushNotificationService.ts`) - Sends notifications
- ✅ **SMS Webhook Integration** - Triggers push on inbound SMS
- ✅ **Database Model** (`PushSubscription`) - Stores user devices

#### Frontend Components
- ✅ **usePushNotifications Hook** - Manages subscription state
- ✅ **PushNotificationPrompt** - Beautiful UI prompt
- ✅ **PushNotificationStatus** - Status indicator
- ✅ **Service Worker Registration** - Auto-registers on load

#### Native Features
- ✅ **Web Push Protocol** using VAPID authentication
- ✅ **Notification API** - Native OS notifications
- ✅ **Service Worker Push Events** - Background push handling
- ✅ **Notification Click** - Opens app to specific conversation

---

## How It Works

### 1. User Enables Notifications

```
User clicks "Enable Notifications"
  ↓
Browser requests permission
  ↓
Service worker subscribes to Push Manager
  ↓
Subscription sent to backend (/api/push/subscribe)
  ↓
Saved to MongoDB (PushSubscription model)
```

### 2. SMS Message Arrives

```
SMS received by Twilio
  ↓
Webhook POST to /api/crm/sms/webhook
  ↓
Message saved to database
  ↓
WebSocket emits to browser (real-time)
  ↓
sendSMSNotification() called
  ↓
Push notification sent via Web Push API
  ↓
All user devices receive notification
```

### 3. User Clicks Notification

```
User clicks notification
  ↓
Service worker notificationclick event fires
  ↓
Check if app is already open
  ↓
If open: Focus window + navigate to conversation
  ↓
If closed: Open new window at /agent/messages?phone={number}
```

---

## Setup & Configuration

### Prerequisites

✅ **HTTPS required** - Push notifications only work over HTTPS (or localhost)
✅ **Modern browser** - Chrome, Edge, Firefox, Safari 16.4+
✅ **Service worker registered** - Automatically done in your app

### Environment Variables

You need VAPID keys for Web Push. Generate them if you haven't:

```bash
npx web-push generate-vapid-keys
```

Add to `.env.local`:

```env
# VAPID Keys for Push Notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY=YOUR_PUBLIC_KEY_HERE
VAPID_PRIVATE_KEY=YOUR_PRIVATE_KEY_HERE
```

**Current Configuration Check:**

```typescript
// File: src/services/pushNotificationService.ts
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (!vapidPublicKey || !vapidPrivateKey) {
  console.warn('[Push Service] VAPID keys not configured');
}
```

### Manifest Configuration

Your PWA manifest is already configured:

```json
// public/manifest.json
{
  "name": "Joseph Sardella | Real Estate Agent | eXp Realty",
  "short_name": "JPS",
  "display": "standalone",
  "start_url": "/",
  "icons": [ /* ... */ ],
  "shortcuts": [ /* ... */ ]
}
```

---

## Testing Guide

### Test 1: Enable Notifications (Browser)

1. **Open your app** in Chrome/Edge/Firefox
2. **Navigate to** `/agent/messages`
3. **Look for the prompt** at the top:
   ```
   🔔 Enable Push Notifications
   Get instant alerts when you receive new SMS messages...
   [Enable Notifications] [Maybe Later]
   ```
4. **Click "Enable Notifications"**
5. **Browser will show permission dialog** - Click "Allow"
6. **Verify** - Button should change to "Notifications On"

**Console logs to watch:**
```
[Push] Subscription created: https://fcm.googleapis.com/...
[Push] Subscription saved to backend
[Service Worker] Installing version: 1.0.0
```

### Test 2: Receive SMS Notification

**Method A: Send Real SMS**

1. **Have notifications enabled** (Test 1 complete)
2. **Send an SMS** to your Twilio number from any phone
3. **Notification should appear** within 1-2 seconds:
   ```
   🔔 New SMS from John Doe
   "Hey, I'm interested in the property at..."
   [View] [Dismiss]
   ```
4. **Click notification** - Should open app to that conversation

**Method B: Test with API Call**

```bash
# Simulate an inbound SMS to trigger notification
curl -X POST https://your-domain.com/api/crm/sms/webhook \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "MessageSid=SM1234567890" \
  -d "From=+15551234567" \
  -d "To=+15559876543" \
  -d "Body=Test notification message"
```

**Method C: Direct Push Test**

```javascript
// In browser console (must be logged in)
fetch('/api/push/test', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'Test Notification',
    body: 'This is a test push notification',
    url: '/agent/messages'
  })
});
```

**Note:** You'll need to create `/api/push/test` route for Method C.

### Test 3: Background Notifications

1. **Enable notifications** (Test 1)
2. **Close your browser completely** (don't just minimize!)
3. **Send an SMS** to your number
4. **Notification should still appear** on your desktop/phone
5. **Click it** - Browser should open to the conversation

### Test 4: Mobile Testing (PWA)

**Android:**
1. Open your site in Chrome
2. Install PWA (Add to Home Screen)
3. Enable notifications
4. Lock your phone
5. Send SMS - notification should appear on lock screen
6. Tap notification - app opens to conversation

**iOS (16.4+):**
1. Open your site in Safari
2. Share → Add to Home Screen
3. Enable notifications (iOS 16.4+ required)
4. Lock iPhone
5. Send SMS - notification appears
6. Tap notification - app opens

---

## Troubleshooting

### Issue: "Push notifications not supported"

**Causes:**
- Using HTTP instead of HTTPS (except localhost)
- Browser doesn't support Push API (very old browser)
- Browser has push disabled in settings

**Fix:**
```
✅ Use HTTPS or localhost
✅ Test in Chrome/Edge/Firefox/Safari 16.4+
✅ Check browser settings: chrome://settings/content/notifications
```

### Issue: Permission denied

**Causes:**
- User clicked "Block" on permission dialog
- Browser has notifications disabled globally

**Fix:**
```
1. Chrome: Settings → Privacy → Site Settings → Notifications
2. Click your site → Reset permissions
3. Refresh page and try again
```

### Issue: Notifications not received

**Check service worker:**
```javascript
// In browser console
navigator.serviceWorker.getRegistration().then(reg => {
  console.log('Service worker:', reg);
  reg.pushManager.getSubscription().then(sub => {
    console.log('Subscription:', sub);
  });
});
```

**Check backend:**
```bash
# Check if subscription is saved
# Connect to MongoDB and run:
db.pushsubscriptions.find({ active: true })
```

**Check VAPID keys:**
```typescript
// In your .env.local
console.log(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY); // Should be defined
```

### Issue: Notification shown but clicking does nothing

**Causes:**
- Service worker not intercepting click
- URL not being opened

**Fix:**
```javascript
// Check service worker logs
// In Chrome DevTools:
// Application → Service Workers → sw.js → Console

// You should see:
[Service Worker] Notification clicked: sms-{messageId}
```

### Issue: Multiple notifications for same message

**Causes:**
- User has multiple devices subscribed
- Webhook called multiple times by Twilio

**This is actually correct behavior:**
- Each device (phone, desktop, tablet) gets the notification
- User can respond from any device

**To test single device:**
```javascript
// Check subscriptions
await PushSubscription.find({ userId: 'your-user-id', active: true });
// Should show one subscription per device
```

---

## Advanced Features

### Custom Notification Sounds

```javascript
// Update sw.js
const notificationData = {
  title: 'New SMS',
  body: message,
  sound: '/sounds/notification.mp3', // Add sound file
  vibrate: [200, 100, 200]
};
```

### Rich Notifications (Images)

```javascript
// Include contact photo
const payload = {
  title: 'New SMS from John Doe',
  body: message,
  icon: '/icons/icon-192x192.png',
  image: contact.photo || '/default-avatar.png', // Message preview image
  badge: '/icons/badge-72x72.png'
};
```

### Action Buttons

Already implemented! Your service worker supports actions:

```javascript
actions: [
  { action: 'view', title: 'View' },
  { action: 'dismiss', title: 'Dismiss' },
  // Could add:
  // { action: 'reply', title: 'Quick Reply' },
  // { action: 'mute', title: 'Mute Conversation' }
]
```

### Notification Grouping

```javascript
// Group notifications by conversation
tag: `conversation-${phoneNumber}`,
renotify: false, // Don't vibrate for updates to same conversation
```

### Silent Notifications (Background Sync)

```javascript
// sw.js - Silent background sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-messages') {
    event.waitUntil(syncMessagesInBackground());
  }
});
```

---

## File Reference

### Core Implementation Files

```
📁 Push Notification System
│
├── 🔧 Backend
│   ├── src/app/api/push/subscribe/route.ts          # Subscribe endpoint
│   ├── src/app/api/push/unsubscribe/route.ts        # Unsubscribe endpoint
│   ├── src/services/pushNotificationService.ts      # Core push service
│   ├── src/models/PushSubscription.ts               # Database model
│   └── src/app/api/crm/sms/webhook/route.ts         # SMS integration (line 152-163)
│
├── 🎨 Frontend
│   ├── src/hooks/usePushNotifications.ts            # React hook
│   ├── src/app/components/PushNotificationPrompt.tsx # UI prompt
│   └── src/app/components/ServiceWorkerRegistration.tsx
│
├── ⚙️ Service Worker
│   └── public/sw.js                                  # Push events handler
│
└── 📄 Configuration
    ├── public/manifest.json                          # PWA manifest
    └── .env.local                                    # VAPID keys
```

---

## API Reference

### POST /api/push/subscribe

Subscribe a device to push notifications.

**Request:**
```json
{
  "subscription": {
    "endpoint": "https://fcm.googleapis.com/fcm/send/...",
    "keys": {
      "p256dh": "...",
      "auth": "..."
    }
  },
  "userAgent": "Mozilla/5.0...",
  "deviceType": "mobile"
}
```

**Response:**
```json
{
  "success": true,
  "subscription": {
    "id": "64a1b2c3d4e5f6...",
    "endpoint": "https://fcm.googleapis.com/..."
  }
}
```

### POST /api/push/unsubscribe

Remove a push subscription.

**Request:**
```json
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Subscription removed"
}
```

---

## Security Considerations

✅ **VAPID Authentication** - Prevents unauthorized push messages
✅ **HTTPS Required** - Encrypted communication
✅ **User Permission** - Explicit consent required
✅ **Subscription Validation** - Backend validates all subscriptions
✅ **User ID Association** - Notifications only sent to correct user
✅ **Endpoint Expiration Handling** - Auto-cleanup of invalid subscriptions

---

## Performance & Limits

### Browser Limits
- **Chrome**: No limit on active subscriptions
- **Firefox**: No limit
- **Safari**: 16.4+ supports Web Push
- **Edge**: Same as Chrome

### Server Limits
- **Web Push API**: ~1000 requests/minute (varies by provider)
- **FCM (Google)**: 240 messages/minute per device
- **APNs (Apple)**: No documented limit

### Best Practices
- ✅ Batch notifications when possible
- ✅ Use notification tags to replace old notifications
- ✅ Set `requireInteraction: false` for non-urgent messages
- ✅ Clean up expired subscriptions regularly

---

## Success Criteria

Your push notification system is working correctly if:

✅ **Prompt appears** on first visit to /agent/messages
✅ **Permission can be granted** via browser dialog
✅ **Subscription saved** to database
✅ **Service worker registered** and active
✅ **Notifications appear** when SMS received
✅ **Clicking notification** opens app to conversation
✅ **Works when browser closed** (background notifications)
✅ **Multiple devices supported** (phone + desktop)

---

## Next Steps

### Optional Enhancements

1. **Quick Reply** - Add text input to notification
2. **Notification Settings** - Let users customize alert types
3. **Sound Customization** - Different sounds per contact
4. **Do Not Disturb** - Schedule quiet hours
5. **Badge Count** - Show unread message count on app icon
6. **Analytics** - Track notification delivery and click rates

---

## Support

If push notifications aren't working:

1. Check browser console for errors
2. Verify VAPID keys are set in `.env.local`
3. Ensure app is running on HTTPS (or localhost)
4. Check service worker is registered: DevTools → Application → Service Workers
5. Verify subscription in database: `db.pushsubscriptions.find()`
6. Check server logs when SMS webhook receives message

**Everything is already implemented and should work out of the box once VAPID keys are configured!** 🎉
