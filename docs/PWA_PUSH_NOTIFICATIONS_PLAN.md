# PWA Push Notifications Implementation Plan

## Overview
Implement Web Push Notifications to enable real-time SMS alerts on mobile devices, even when the browser is closed or the app is in the background.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Push Notification Flow                    │
└─────────────────────────────────────────────────────────────┘

1. User visits website → Service Worker registers
2. User grants notification permission
3. Client subscribes to push notifications (gets subscription object)
4. Client sends subscription to backend → Stored in database
5. Inbound SMS arrives at Twilio webhook
6. Backend sends push notification to stored subscriptions
7. Service Worker receives push → Shows notification
8. User clicks notification → Opens app to conversation

┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   Browser    │─────>│ Service      │─────>│  Push        │
│   (Client)   │      │ Worker       │      │  Service     │
└──────────────┘      └──────────────┘      └──────────────┘
       │                     │                      │
       │ 1. Subscribe        │                      │
       ├────────────────────>│                      │
       │                     │ 2. Get subscription  │
       │                     ├─────────────────────>│
       │                     │<─────────────────────┤
       │<────────────────────┤ 3. Return sub object │
       │                     │                      │
       │ 4. Send to backend  │                      │
       ├─────────────────────┼──────────────────────┤
       │                     │                      │
       │              ┌──────────────┐             │
       │              │   Database   │             │
       │              │ (Store subs) │             │
       │              └──────────────┘             │
       │                     │                      │
       │              ┌──────────────┐             │
       │              │ SMS Webhook  │             │
       │              │  (Inbound)   │             │
       │              └──────────────┘             │
       │                     │                      │
       │                     │ 5. Send push         │
       │                     ├─────────────────────>│
       │                     │<─────────────────────┤
       │<────────────────────┤ 6. Deliver to client │
       │ 7. Show notification│                      │
```

## Phase 1: Service Worker Setup

### 1.1 Create Service Worker
**File**: `public/sw.js`

Features:
- Listen for push events
- Display notifications with message content
- Handle notification clicks → open app to specific conversation
- Background sync for offline messages
- Cache management

### 1.2 Register Service Worker
**File**: `src/app/layout.tsx` or dedicated hook

Features:
- Register service worker on app load
- Handle registration errors
- Update service worker when new version available

### 1.3 VAPID Keys Generation
Generate VAPID (Voluntary Application Server Identification) keys for secure push notifications.

```bash
npx web-push generate-vapid-keys
```

Store in `.env.local`:
```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
```

## Phase 2: Push Subscription Management

### 2.1 Database Schema
**Model**: `PushSubscription`

```typescript
{
  _id: ObjectId,
  userId: ObjectId,
  endpoint: String,
  keys: {
    p256dh: String,
    auth: String
  },
  userAgent: String,
  deviceType: String,  // 'mobile', 'desktop', 'tablet'
  createdAt: Date,
  lastUsed: Date,
  active: Boolean
}
```

### 2.2 API Endpoints

**POST /api/push/subscribe**
- Receive push subscription from client
- Store in database linked to user
- Return success/failure

**POST /api/push/unsubscribe**
- Remove subscription from database
- Return success

**GET /api/push/subscriptions**
- Get all active subscriptions for current user
- Used for management UI

## Phase 3: Client-Side Subscription

### 3.1 Push Notification Hook
**File**: `src/hooks/usePushNotifications.ts`

Features:
- Check if push notifications supported
- Request notification permission
- Subscribe to push notifications
- Unsubscribe from push notifications
- Get subscription status

### 3.2 Subscription UI Component
**File**: `src/app/components/PushNotificationPrompt.tsx`

Features:
- Friendly prompt to enable notifications
- Explain benefits (get SMS alerts on mobile)
- Handle permission flow
- Show subscription status

### 3.3 Settings Integration
Add push notification toggle to user settings:
- Enable/disable push notifications
- View active devices
- Remove specific device subscriptions

## Phase 4: Backend Push Sending

### 4.1 Web Push Library
Install `web-push` library:
```bash
npm install web-push
```

### 4.2 Push Service Module
**File**: `src/services/pushNotificationService.ts`

Features:
- Initialize web-push with VAPID keys
- Send push notification to subscription
- Handle expired/invalid subscriptions
- Batch send to multiple devices

### 4.3 Integrate with SMS Webhook
**File**: `src/app/api/crm/sms/webhook/route.ts`

Update to:
1. Receive inbound SMS
2. Save to database
3. Emit WebSocket event (already done ✅)
4. **Send push notification to all user's devices** (NEW)

## Phase 5: Notification Content & Actions

### 5.1 Rich Notification Format
```javascript
{
  title: "New SMS from John Doe",
  body: "Hey, I'm interested in the property...",
  icon: "/icons/icon-192x192.png",
  badge: "/icons/badge-72x72.png",
  tag: "sms-message-123",
  requireInteraction: false,
  data: {
    phoneNumber: "+17603333676",
    messageId: "abc123",
    conversationUrl: "/agent/messages?phone=+17603333676"
  },
  actions: [
    { action: "view", title: "View" },
    { action: "reply", title: "Quick Reply" }
  ]
}
```

### 5.2 Notification Actions
- **View**: Open app to conversation
- **Reply**: Open quick reply interface (future enhancement)
- **Dismiss**: Close notification

## Phase 6: PWA Manifest Updates

### 6.1 Update manifest.json
**File**: `public/manifest.json`

Ensure proper PWA configuration:
```json
{
  "name": "JP's Realtor CRM",
  "short_name": "JP CRM",
  "description": "Real Estate CRM with SMS Messaging",
  "start_url": "/agent/messages",
  "display": "standalone",
  "background_color": "#000000",
  "theme_color": "#000000",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "permissions": [
    "notifications",
    "push"
  ]
}
```

## Phase 7: Testing & Deployment

### 7.1 Local Testing
- Test on localhost with ngrok
- Verify service worker registration
- Test push subscription flow
- Send test push notifications
- Verify notification click behavior

### 7.2 Mobile Testing
- Install PWA on mobile device (iOS/Android)
- Test background notifications
- Test notification actions
- Verify offline behavior

### 7.3 Production Considerations
- HTTPS required for service workers (already have ✅)
- Service worker scope and caching strategy
- Handle multiple devices per user
- Clean up expired subscriptions
- Rate limiting for push notifications
- Analytics for notification engagement

## Security Considerations

1. **VAPID Keys**: Keep private key secure, never expose to client
2. **Subscription Validation**: Verify user owns subscription before storing
3. **Content Security**: Don't send sensitive data in push payload
4. **Rate Limiting**: Prevent notification spam
5. **Subscription Cleanup**: Remove inactive subscriptions regularly

## Browser Support

- ✅ Chrome/Edge (Android, Desktop)
- ✅ Firefox (Android, Desktop)
- ✅ Safari (iOS 16.4+, macOS)
- ✅ Samsung Internet
- ❌ iOS Safari (< 16.4)

## Implementation Timeline

1. **Phase 1-2**: Service Worker + Database (30 min)
2. **Phase 3**: Client subscription (20 min)
3. **Phase 4**: Backend push sending (20 min)
4. **Phase 5**: Rich notifications (15 min)
5. **Phase 6**: PWA manifest (10 min)
6. **Phase 7**: Testing (20 min)

**Total estimated time**: ~2 hours

## Success Criteria

- ✅ User can enable push notifications from browser
- ✅ Push notification appears on mobile device when SMS received
- ✅ Clicking notification opens app to correct conversation
- ✅ Works when browser is closed or in background
- ✅ Multiple devices can be registered per user
- ✅ Graceful fallback if push not supported

## Next Steps

1. Generate VAPID keys
2. Create service worker
3. Build push subscription API
4. Add subscription UI
5. Integrate with SMS webhook
6. Test on mobile device

---

**Ready to implement!** 🚀
