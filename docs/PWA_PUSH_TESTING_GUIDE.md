# PWA Push Notifications - Testing Guide

## ✅ Implementation Complete!

All components have been implemented:
- ✅ Service Worker (`/public/sw.js`)
- ✅ Push Subscription Model
- ✅ API Endpoints (`/api/push/subscribe`, `/api/push/unsubscribe`)
- ✅ Push Notification Service
- ✅ Webhook Integration (SMS → Push)
- ✅ React Hook (`usePushNotifications`)
- ✅ UI Components (Prompt & Status)
- ✅ VAPID Keys configured

---

## 🧪 Testing Steps

### 1. Restart Dev Server

**Stop** your current dev server (Ctrl+C) and restart:

```bash
npm run dev
```

Make sure you see:
```
[Socket.io] 🚀 Server initialized
[Server] Socket.io initialized successfully
```

### 2. Open Messages Page

Navigate to: `http://localhost:3000/agent/messages`

You should see:
- Green notification prompt banner at the top
- "Enable Push Notifications" button

### 3. Enable Browser Notifications

Click **"Enable Notifications"** button:
1. Browser will prompt for notification permission
2. Click **"Allow"**
3. Prompt banner will disappear (you're subscribed!)

Check the console - you should see:
```
[Push] Subscription created: https://...
[Push] Subscription saved to backend
```

### 4. Test Inbound SMS (Desktop)

**Send a text message** to your Twilio number: `+17602620014`

You should get:
1. **Sound**: Two-tone "ding" notification sound 🔔
2. **Browser Notification**: Desktop popup with message preview
3. **Live Update**: Message appears in conversation list instantly

### 5. Test Push Notification (Mobile)

#### A. Install PWA on Mobile

**iOS (Safari):**
1. Open `https://adria-ungeneralizing-nonsynodically.ngrok-free.app/agent/messages` in Safari
2. Tap Share button → "Add to Home Screen"
3. Name it "JP CRM" → Add
4. Open the app from home screen

**Android (Chrome):**
1. Open the ngrok URL in Chrome
2. Tap menu (3 dots) → "Install app" or "Add to Home screen"
3. Follow prompts
4. Open app from home screen

#### B. Enable Push on Mobile

1. Open the installed PWA
2. Log in
3. Click "Enable Notifications" prompt
4. Allow notifications when prompted

#### C. Send Test SMS

1. **Close or minimize the PWA** on your phone
2. **Send a text** from another phone to `+17602620014`
3. **Check your phone** - you should receive a push notification!
4. **Tap the notification** - app opens to that conversation

---

## 🔍 Troubleshooting

### "Enable Notifications" button doesn't appear

**Check:**
- Browser supports push notifications (Chrome, Firefox, Edge, Safari 16.4+)
- Not already subscribed
- Haven't previously denied notification permission

**Fix:**
- Clear site data in browser settings
- Re-enable notifications in browser permissions

### Push notification not received on mobile

**Check:**
1. **ngrok still running?**
   ```bash
   # Should show tunnel URL
   ngrok http 3000
   ```

2. **Dev server still running?**
   ```bash
   npm run dev
   ```

3. **Webhook configured correctly?**
   - Go to Twilio Console
   - Verify webhook URL has current ngrok URL
   - Should be: `https://YOUR-NGROK-URL.ngrok-free.app/api/crm/sms/webhook`

4. **Subscription saved?**
   - Check browser console for errors
   - Check MongoDB for `PushSubscription` documents

### Service Worker not registering

**Check browser console:**
```
[Service Worker] Registered successfully
```

**If not appearing:**
1. Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
2. Check `/public/sw.js` exists
3. Check for console errors

### Sound not playing

**Browser may block autoplay audio:**
- User must interact with page first (click, tap)
- Some browsers require user gesture before playing sounds

---

## 📊 Verify in Database

Check MongoDB for subscriptions:

```javascript
// In MongoDB Compass or shell
db.pushsubscriptions.find()
```

You should see documents like:
```json
{
  "_id": "...",
  "userId": "691604b0d2b9d5140af67b4c",
  "endpoint": "https://fcm.googleapis.com/...",
  "keys": {
    "p256dh": "...",
    "auth": "..."
  },
  "active": true,
  "deviceType": "mobile",
  "createdAt": "2026-01-12T...",
  "lastUsed": "2026-01-12T..."
}
```

---

## 🎯 Expected Behavior

### Desktop (Browser Open)
- ✅ WebSocket delivers message instantly
- ✅ "Ding" sound plays
- ✅ Browser notification shows
- ✅ Message appears in UI immediately

### Desktop (Browser Closed)
- ✅ Push notification wakes browser
- ✅ Notification shows on desktop
- ✅ Clicking opens browser to conversation

### Mobile (PWA)
- ✅ Push notification received even when app closed
- ✅ Notification shows in notification tray
- ✅ Tapping opens PWA to specific conversation
- ✅ Vibration pattern triggers

---

## 🚀 Production Deployment

When deploying to production:

1. **Update webhook URLs** in Twilio:
   - Change from ngrok URL to production URL
   - `https://jpsrealtor.com/api/crm/sms/webhook`
   - `https://jpsrealtor.com/api/crm/sms/status-webhook`

2. **Environment variables** already configured:
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
   - `VAPID_PRIVATE_KEY`

3. **HTTPS required** (already have ✅)

4. **Service Worker** will auto-register in production

---

## 📱 Browser Compatibility

| Platform | Browser | Push Support |
|----------|---------|--------------|
| iOS 16.4+ | Safari | ✅ Yes |
| iOS < 16.4 | Safari | ❌ No |
| Android | Chrome | ✅ Yes |
| Android | Firefox | ✅ Yes |
| Android | Samsung Internet | ✅ Yes |
| Desktop | Chrome | ✅ Yes |
| Desktop | Firefox | ✅ Yes |
| Desktop | Edge | ✅ Yes |
| Desktop | Safari | ✅ Yes (macOS 13+) |

---

## 🎉 Success Checklist

- [ ] Dev server running with Socket.io
- [ ] ngrok tunnel active
- [ ] Twilio webhook configured
- [ ] Browser notification permission granted
- [ ] Push subscription saved to database
- [ ] Test SMS sent
- [ ] Sound played ✅
- [ ] Browser notification appeared ✅
- [ ] Message showed in UI instantly ✅
- [ ] PWA installed on mobile (optional)
- [ ] Push notification received on mobile ✅

---

**Ready to test!** Send a text message and watch the magic happen! 🎊
