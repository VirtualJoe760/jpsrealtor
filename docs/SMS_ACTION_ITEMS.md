# SMS System - Immediate Action Items

**Created:** January 12, 2026
**Priority:** Fix 404 errors first, then incremental improvements

---

## 🔥 IMMEDIATE FIXES (Do This First!)

### 1. Restart Dev Server
The 404 error on `/api/crm/sms/conversations` is likely due to:
- Route file exists but dev server hasn't picked it up
- Hot reload didn't catch the changes

**Action:**
```bash
# Stop current dev server (Ctrl+C)
npm run dev
```

**Test:**
```bash
# Once server restarts, test the endpoint
curl http://localhost:3000/api/crm/sms/conversations
```

### 2. Verify All Route Files Exist
Check these files exist and export correctly:

```
src/app/api/crm/sms/
├── conversations/
│   └── route.ts          ✅ (GET /api/crm/sms/conversations)
├── messages/
│   └── route.ts          ✅ (GET /api/crm/sms/messages)
├── send/
│   └── route.ts          ✅ (POST /api/crm/sms/send)
├── sync/
│   └── route.ts          ✅ (POST /api/crm/sms/sync)
└── webhook/
    └── route.ts          ✅ (POST /api/crm/sms/webhook)
```

Each must export either:
- `export async function GET(request: NextRequest)`
- `export async function POST(request: NextRequest)`

---

## 📋 PHASE 1: Status Webhook (30-60 minutes)

### Step 1: Create Status Webhook Route
**File to create:** `src/app/api/crm/sms/status-webhook/route.ts`

**Purpose:** Receive delivery status updates from Twilio

```typescript
/**
 * Twilio Status Callback Webhook
 *
 * Receives delivery status updates from Twilio
 * Updates message status in database
 * Emits events to connected clients (Phase 3)
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import SMSMessage from '@/models/sms-message';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const formData = await request.formData();
    const twilioData = {
      MessageSid: formData.get('MessageSid') as string,
      MessageStatus: formData.get('MessageStatus') as string,
      ErrorCode: formData.get('ErrorCode') as string,
      ErrorMessage: formData.get('ErrorMessage') as string,
    };

    console.log('[Status Webhook] Received:', twilioData);

    // Find and update message
    const message = await SMSMessage.findOneAndUpdate(
      { twilioMessageSid: twilioData.MessageSid },
      {
        status: twilioData.MessageStatus,
        ...(twilioData.ErrorCode && {
          errorCode: twilioData.ErrorCode,
          errorMessage: twilioData.ErrorMessage,
        })
      },
      { new: true }
    );

    if (!message) {
      console.log('[Status Webhook] Message not found:', twilioData.MessageSid);
    } else {
      console.log('[Status Webhook] Updated message:', message._id, 'to status:', twilioData.MessageStatus);
    }

    return new NextResponse('OK', { status: 200 });
  } catch (error: any) {
    console.error('[Status Webhook] Error:', error);
    return new NextResponse('OK', { status: 200 }); // Return 200 to prevent retries
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Twilio Status Callback Webhook',
  });
}
```

### Step 2: Update SMSMessage Model
**File:** `src/models/sms-message.ts`

**Add fields:**
```typescript
errorCode?: string;
errorMessage?: string;
```

### Step 3: Configure Twilio
1. Go to Twilio Console
2. Navigate to: Messaging > Settings > Messaging Service (or Phone Number)
3. Set **Status Callback URL:**
   ```
   https://your-domain.com/api/crm/sms/status-webhook
   ```
4. Enable events: `sent`, `delivered`, `failed`, `undelivered`

### Step 4: Test
Send a test message and watch the console for status updates

---

## 📋 PHASE 2: WebSocket Setup (3-4 hours)

### Step 1: Install Dependencies
```bash
npm install socket.io socket.io-client
npm install --save-dev @types/socket.io
```

### Step 2: Create Socket.io Server
**File to create:** `src/server/socket.ts`

```typescript
import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

let io: SocketIOServer | null = null;

export function initSocket(httpServer: HTTPServer) {
  if (io) return io;

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log('[Socket.io] Client connected:', socket.id);

    // Join user-specific room
    socket.on('join:user', (userId: string) => {
      socket.join(`user:${userId}`);
      console.log(`[Socket.io] User ${userId} joined their room`);
    });

    // Join conversation room
    socket.on('join:conversation', (phoneNumber: string) => {
      socket.join(`conversation:${phoneNumber}`);
      console.log(`[Socket.io] Joined conversation: ${phoneNumber}`);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log('[Socket.io] Client disconnected:', socket.id);
    });
  });

  return io;
}

export function getIO() {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
}

// Emit new message to user
export function emitNewMessage(userId: string, message: any) {
  if (io) {
    io.to(`user:${userId}`).emit('message:new', message);
  }
}

// Emit status update
export function emitStatusUpdate(userId: string, messageId: string, status: string) {
  if (io) {
    io.to(`user:${userId}`).emit('message:status', { messageId, status });
  }
}
```

### Step 3: Initialize in Next.js Server
**File:** `server.js` (create in root)

```javascript
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { initSocket } = require('./src/server/socket');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  // Initialize Socket.io
  initSocket(server);

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`> Ready on http://localhost:${PORT}`);
  });
});
```

### Step 4: Update package.json
```json
{
  "scripts": {
    "dev": "node server.js",
    "dev:next": "next dev",
    "build": "next build",
    "start": "NODE_ENV=production node server.js"
  }
}
```

### Step 5: Create Client Hook
**File:** `src/hooks/useSocket.ts`

```typescript
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export function useSocket(userId?: string) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!userId) return;

    const socketInstance = io(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');

    socketInstance.on('connect', () => {
      console.log('[Socket] Connected');
      setConnected(true);
      socketInstance.emit('join:user', userId);
    });

    socketInstance.on('disconnect', () => {
      console.log('[Socket] Disconnected');
      setConnected(false);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [userId]);

  return { socket, connected };
}
```

### Step 6: Update Messages Page
**File:** `src/app/agent/messages/page.tsx`

**Add:**
```typescript
import { useSocket } from '@/hooks/useSocket';

export default function MessagesPage() {
  const { socket, connected } = useSocket(session?.user?.id);

  // Listen for new messages
  useEffect(() => {
    if (!socket) return;

    socket.on('message:new', (message) => {
      setMessages(prev => [...prev, message]);
      fetchConversations(); // Update conversation list
    });

    socket.on('message:status', ({ messageId, status }) => {
      setMessages(prev => prev.map(m =>
        m._id === messageId ? { ...m, status } : m
      ));
    });

    return () => {
      socket.off('message:new');
      socket.off('message:status');
    };
  }, [socket]);

  // Remove polling intervals (lines 410-429)
  // They're no longer needed!
}
```

---

## 📋 PHASE 3: Message Queue (Optional, 4-6 hours)

### Step 1: Setup Redis
**Option A: Local Redis**
```bash
# Install Redis locally
# Windows: Use WSL or Docker
docker run -d -p 6379:6379 redis:alpine
```

**Option B: Upstash Redis (Free)**
1. Sign up at https://upstash.com
2. Create Redis database
3. Copy connection URL

### Step 2: Install BullMQ
```bash
npm install bullmq ioredis
```

### Step 3: Create Queue
**File:** `src/lib/queue/sms-queue.ts`

```typescript
import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { sendSMS } from '@/lib/twilio';
import SMSMessage from '@/models/sms-message';
import { emitNewMessage } from '@/server/socket';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');

export const smsQueue = new Queue('sms', { connection });

// Worker to process messages
export const smsWorker = new Worker('sms', async (job) => {
  const { to, body, userId, contactId } = job.data;

  console.log('[SMS Worker] Processing:', job.id);

  // Send via Twilio
  const result = await sendSMS({ to, body });

  if (result.success) {
    // Save to database
    const message = await SMSMessage.create({
      userId,
      contactId,
      twilioMessageSid: result.messageSid,
      from: process.env.TWILIO_PHONE_NUMBER,
      to,
      body,
      direction: 'outbound',
      status: 'sent',
      twilioCreatedAt: new Date(),
    });

    // Emit via WebSocket
    emitNewMessage(userId, message);

    return { success: true, messageId: message._id };
  } else {
    throw new Error(result.error);
  }
}, {
  connection,
  concurrency: 5,
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000,
  },
});

smsWorker.on('completed', (job) => {
  console.log('[SMS Worker] Job completed:', job.id);
});

smsWorker.on('failed', (job, err) => {
  console.error('[SMS Worker] Job failed:', job?.id, err);
});
```

### Step 4: Update Send API
**File:** `src/app/api/crm/sms/send/route.ts`

**Replace Twilio call with queue:**
```typescript
import { smsQueue } from '@/lib/queue/sms-queue';

// Instead of await sendSMS(...)
const job = await smsQueue.add('send-message', {
  to: formattedPhone,
  body: messageBody,
  userId: session.user.id,
  contactId,
});

return NextResponse.json({
  success: true,
  jobId: job.id,
  message: 'Message queued for delivery',
});
```

---

## ✅ Testing Checklist

### Phase 1 (Status Webhook):
- [ ] Webhook endpoint returns 200
- [ ] Message status updates in database
- [ ] Console logs show status changes
- [ ] Failed messages show error codes

### Phase 2 (WebSocket):
- [ ] Socket connects on page load
- [ ] New messages appear instantly
- [ ] Status updates in real-time
- [ ] No 404 or polling errors
- [ ] Connection indicator shows status

### Phase 3 (Queue):
- [ ] Messages queue successfully
- [ ] Worker processes jobs
- [ ] Failed messages retry
- [ ] Queue dashboard accessible

---

## 🎯 Success Criteria

**Phase 1:**
- ✅ No 404 errors
- ✅ Message status updates automatically
- ✅ Delivery confirmations visible

**Phase 2:**
- ✅ Messages appear instantly (<1s)
- ✅ No polling intervals
- ✅ WebSocket connection stable
- ✅ Reconnects automatically

**Phase 3:**
- ✅ Messages send asynchronously
- ✅ Failed messages retry 3 times
- ✅ System handles 100+ concurrent sends

---

## 🚀 Ready to Start?

1. **First:** Restart your dev server to fix 404
2. **Then:** Implement Phase 1 (Status Webhook)
3. **Next:** Add WebSocket support (Phase 2)
4. **Finally:** Optional queue system (Phase 3)

**Questions?** I'm here to help implement each phase!
