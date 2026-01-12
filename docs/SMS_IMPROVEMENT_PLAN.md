# SMS Messaging System - Implementation Plan

**Date:** January 12, 2026
**Status:** Planning Phase
**Goal:** Transform current SMS system from MVP to production-grade messaging platform

---

## 🔍 Current State Analysis

### Issues Identified:
1. **404 Error on `/api/crm/sms/conversations`** - Route exists but not compiling
2. **Client-side polling every 5 seconds** - Inefficient, causes UI flashing
3. **No delivery status updates** - Messages stuck in initial status
4. **Synchronous message sending** - Blocks UI, no retry mechanism
5. **No real-time push** - Delayed message delivery (5-15s)

### What Works:
✅ Basic send/receive functionality
✅ Twilio integration
✅ Database persistence
✅ Contact linking
✅ Webhook for inbound messages

---

## 📋 Implementation Phases

### **PHASE 1: Fix Immediate Issues** ⚡ (1-2 hours)

#### 1.1 Fix 404 Compilation Error
**Files:**
- `src/app/api/crm/sms/conversations/route.ts`
- `src/app/api/crm/sms/messages/route.ts`

**Actions:**
- [ ] Check for TypeScript errors in route files
- [ ] Verify all imports are correct
- [ ] Test API endpoints with curl/Postman
- [ ] Add error logging to identify compilation issues

**Testing:**
```bash
curl -X GET http://localhost:3000/api/crm/sms/conversations \
  -H "Cookie: your-auth-cookie"
```

---

### **PHASE 2: Twilio Status Webhook** 🔔 (30-60 min)

**Priority:** HIGH - Enables real-time delivery tracking

#### 2.1 Create Status Webhook Endpoint
**File:** `src/app/api/crm/sms/status-webhook/route.ts`

**Functionality:**
- Receive Twilio status updates (sent, delivered, failed)
- Update message status in database
- Broadcast status to connected clients (Phase 3)

**Twilio Statuses:**
- `queued` → Message accepted by Twilio
- `sent` → Sent to carrier
- `delivered` → Delivered to device
- `failed` → Delivery failed
- `undelivered` → Not delivered

**Implementation:**
```typescript
// POST /api/crm/sms/status-webhook
// Receives: MessageSid, MessageStatus, ErrorCode (if failed)
// Updates: SMSMessage.status
```

**Twilio Configuration:**
- Set webhook URL in Twilio Console
- URL: `https://your-domain.com/api/crm/sms/status-webhook`
- Method: POST
- Events: All message events

---

### **PHASE 3: WebSocket Integration** 🔌 (3-4 hours)

**Priority:** HIGH - Eliminates polling, instant delivery

#### 3.1 Choose Technology Stack
**Options:**
1. **Socket.io** (Recommended)
   - ✅ Easy to implement
   - ✅ Fallback to long-polling
   - ✅ Room-based messaging
   - ❌ Larger bundle size

2. **Pusher** (Managed Service)
   - ✅ Zero infrastructure
   - ✅ Built-in presence
   - ❌ Monthly cost ($49+)
   - ❌ Vendor lock-in

3. **Native WebSockets**
   - ✅ Lightweight
   - ❌ Manual reconnection logic
   - ❌ No rooms/channels

**Decision:** Use Socket.io for balance of features/ease

#### 3.2 Server Setup
**File:** `src/server/socket-server.ts`

**Events:**
- `message:new` - New message received
- `message:status` - Status update
- `conversation:update` - Conversation metadata changed
- `typing:start` - User started typing
- `typing:stop` - User stopped typing

**Rooms:**
- User joins room: `user:{userId}`
- User joins conversation: `conversation:{phoneNumber}`

#### 3.3 Client Integration
**Files:**
- `src/app/agent/messages/page.tsx`
- `src/hooks/useSocket.ts` (new)

**Changes:**
- Remove polling intervals
- Connect to WebSocket on mount
- Listen for events
- Update UI optimistically

---

### **PHASE 4: Message Queue System** 📬 (4-6 hours)

**Priority:** MEDIUM - Improves reliability, scalability

#### 4.1 Choose Queue Technology
**Options:**
1. **BullMQ (Redis-based)** (Recommended)
   - ✅ Built-in retry logic
   - ✅ Job scheduling
   - ✅ Dashboard UI
   - ❌ Requires Redis

2. **AWS SQS**
   - ✅ Managed service
   - ✅ Infinite scale
   - ❌ Monthly cost
   - ❌ More complex setup

**Decision:** BullMQ with Upstash Redis (free tier)

#### 4.2 Queue Setup
**File:** `src/lib/queue/sms-queue.ts`

**Jobs:**
1. `send-sms` - Send outbound message
2. `sync-conversation` - Sync from Twilio
3. `retry-failed` - Retry failed sends

**Features:**
- Exponential backoff retry (3 attempts)
- Rate limiting (Twilio: 60 msg/sec)
- Priority queue (urgent messages first)
- Job persistence

#### 4.3 Worker Process
**File:** `src/workers/sms-worker.ts`

**Responsibilities:**
- Process queued messages
- Call Twilio API
- Update database
- Emit WebSocket events

---

### **PHASE 5: Additional Improvements** 🚀 (Optional)

#### 5.1 Redis Caching (2 hours)
- Cache recent conversations (5-10 min TTL)
- Cache message history per conversation
- Reduce MongoDB load

#### 5.2 Typing Indicators (1-2 hours)
- Detect typing in textarea
- Emit `typing:start` event
- Show "User is typing..." in UI
- Auto-stop after 3s inactivity

#### 5.3 Read Receipts (2-3 hours)
- Track when user views conversation
- Mark messages as "read"
- Update UI with read status

#### 5.4 Rate Limiting (1 hour)
- Prevent spam (max 10 msg/min per user)
- Show warning to user
- Queue excess messages

#### 5.5 Message Search (2-3 hours)
- Full-text search in MongoDB
- Search by phone, contact name, body
- Highlight results

---

## 🎯 Recommended Execution Order

### Sprint 1 (Week 1)
**Goal:** Fix critical issues, add real-time delivery

1. ✅ Fix 404 compilation errors (Phase 1)
2. ✅ Implement status webhook (Phase 2)
3. ✅ Test delivery tracking end-to-end

**Success Metrics:**
- No 404 errors
- Message status updates in real-time
- Delivery confirmations visible in UI

---

### Sprint 2 (Week 2)
**Goal:** Eliminate polling, add instant messaging

1. ✅ Setup Socket.io server (Phase 3.2)
2. ✅ Create WebSocket hooks (Phase 3.3)
3. ✅ Remove all polling intervals
4. ✅ Add optimistic UI updates

**Success Metrics:**
- Messages appear instantly
- No visible loading states
- WebSocket connection stable

---

### Sprint 3 (Week 3)
**Goal:** Add reliability and scale

1. ✅ Setup Redis + BullMQ (Phase 4.1)
2. ✅ Create queue processors (Phase 4.2)
3. ✅ Implement retry logic (Phase 4.3)
4. ✅ Add rate limiting (Phase 5.4)

**Success Metrics:**
- Failed messages retry automatically
- No duplicate sends
- System handles 1000+ msg/day

---

## 📊 Architecture Diagram

### Before (Current):
```
[Browser] --5s poll--> [Next.js API] --> [MongoDB]
                           |
                           v
                      [Twilio API]
```

### After (Target):
```
[Browser] <--WebSocket--> [Socket.io Server]
                               |
                          [Redis Queue]
                               |
                          [Worker Pool]
                          /          \
                     [MongoDB]   [Twilio API]
                                      |
                                 [Webhooks]
                                      |
                            [Status + Inbound]
```

---

## 🛠️ Technical Requirements

### Infrastructure:
- **Redis**: Upstash (free tier) or local Redis
- **Socket.io**: Runs alongside Next.js server
- **Worker**: Separate Node process or Vercel cron

### Dependencies to Add:
```json
{
  "socket.io": "^4.7.0",
  "socket.io-client": "^4.7.0",
  "bullmq": "^5.0.0",
  "ioredis": "^5.3.0"
}
```

### Environment Variables:
```env
REDIS_URL=redis://localhost:6379
SOCKET_IO_PORT=3001
TWILIO_STATUS_WEBHOOK_SECRET=your_secret
```

---

## 🧪 Testing Strategy

### Unit Tests:
- Queue job processing
- WebSocket event handling
- Message deduplication

### Integration Tests:
- End-to-end message flow
- Webhook delivery
- Status updates

### Load Tests:
- 100 concurrent users
- 1000 messages/minute
- WebSocket connection stability

---

## 📈 Success Metrics

### Performance:
- Message delivery time: < 1s (currently ~5s)
- UI responsiveness: No flashing/loading
- Webhook processing: < 100ms

### Reliability:
- Message delivery rate: > 99%
- Failed message retry: 100%
- Zero duplicate messages

### User Experience:
- Typing indicators active
- Read receipts working
- Search results < 500ms

---

## 🚨 Risks & Mitigation

### Risk 1: WebSocket Connection Issues
**Mitigation:** Implement fallback to long-polling

### Risk 2: Redis Downtime
**Mitigation:** Queue persistence, graceful degradation

### Risk 3: Twilio Rate Limits
**Mitigation:** Queue with rate limiting, priority system

### Risk 4: Message Ordering
**Mitigation:** Timestamp-based ordering, sequence numbers

---

## 📝 Next Steps

1. **Review this plan** with team
2. **Approve Phase 1-2** for immediate implementation
3. **Setup infrastructure** (Redis, Socket.io)
4. **Begin Sprint 1** execution

---

**Questions?** Contact: Claude Code Assistant
**Last Updated:** January 12, 2026
