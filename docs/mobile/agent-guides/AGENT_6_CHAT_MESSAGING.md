# Agent 6: Chat & Messaging

**Runs:** Parallel (after Agents 1-3 complete)
**Estimated Time:** 2-4 weeks

---

## Mission

Build the AI chat interface and SMS messaging system for React Native. Handle streaming AI responses, real-time WebSocket messaging, push notifications, and voice/audio features.

---

## Component Inventory (25-35 components)

### AI Chat Components (`src/app/components/chat/`)

| Component | Complexity | Key Challenges |
|---|---|---|
| **ChatWidget.tsx** | HIGH | Main chat container — streaming SSE responses, tool call rendering, multi-component display |
| **ChatProvider.tsx** | HIGH | Chat context with complex state: messages, component data (listings, maps, appreciation), sources, metadata |
| **ChatHeader.tsx** | LOW | Header bar — straightforward |
| **ChatInput.tsx** | MEDIUM | Text input with send button, multiline, keyboard handling |
| **ChatResultsContainer.tsx** | HIGH | Renders tool results: listing carousels, map views, market stats, CMA data, articles |
| **TypingAnimation.tsx** | LOW | Animated dots — replace CSS animation with Reanimated |
| **ListingCarousel.tsx** (chat) | MEDIUM | Horizontal FlatList of listing cards from AI results |
| **ListingListView.tsx** (chat) | MEDIUM | Vertical list of listings from AI results |
| **CMADisplay.tsx** | MEDIUM | CMA analysis display with metrics |
| **MarketStatsCard.tsx** | MEDIUM | Market statistics visualization |
| **SubdivisionComparisonChart.tsx** | MEDIUM | Chart — replace Recharts with RN chart lib |
| **ArticleCard.tsx** (chat) | LOW | Article result card |
| **SourceBubble.tsx** | LOW | Source attribution chip |
| **AppreciationContainer.tsx** | MEDIUM | Property appreciation display |
| **AnalyticsFormulaModal.tsx** | LOW | Analytics explanation modal |
| **ChatMapView.tsx** | MEDIUM | Map in chat — use react-native-maps (Agent 5 pattern) |
| **NewChatModal.tsx** | LOW | New conversation modal |

### SMS Messaging Components (`src/app/components/crm/messages/`)

| Component | Complexity | Key Challenges |
|---|---|---|
| **ConversationList.tsx** | MEDIUM | FlatList of conversations with search, unread counts |
| **ConversationItem.tsx** | LOW | Single conversation row |
| **MessageThread.tsx** | MEDIUM | FlatList of messages with auto-scroll to bottom, inverted list |
| **MessageBubble.tsx** | LOW | Inbound/outbound bubble styling + status icons |
| **MessageInput.tsx** | MEDIUM | TextInput with character counter (160 SMS limit), Send button |
| **ThreadHeader.tsx** | LOW | Contact name + back button |
| **ComposeView.tsx** | MEDIUM | New SMS — phone number input + contact picker |
| **ContactsModal.tsx** | MEDIUM | Contact picker modal with search |
| **ContactEditModal.tsx** | LOW | Edit contact from messages |
| **NewConversationInput.tsx** | LOW | Phone number entry for new conversation |

### Email Components (`src/app/components/crm/email-inbox/`)

| Component | Notes |
|---|---|
| **EmailInbox.tsx** | Email list — simpler version for mobile |
| **EmailListItem.tsx** | Email row item |
| **EmailDetail.tsx** | Full email view |
| **EmailFolderNav.tsx** | Folder tabs (Inbox, Sent, etc.) |
| **EmailToolbar.tsx** | Search + filter bar |
| **EmailAttachments.tsx** | Attachment display |

### Email Compose (`src/app/components/crm/compose-panel/`)

| Component | Notes |
|---|---|
| **ComposePanelRefactored.tsx** | Email compose — simplify for mobile |
| **RecipientFields.tsx** | To/CC/BCC with autocomplete |
| **RichTextToolbar.tsx** | Basic formatting — consider plain text on mobile |
| **TemplateSelector.tsx** | Template picker |
| **AttachmentList.tsx** | File attachments |
| **AIModal.tsx** | AI email generation |

### Push Notification Components

| Component | Notes |
|---|---|
| **PushNotificationPrompt.tsx** | Replace with Firebase permission request |
| **ServiceWorkerRegistration.tsx** | Remove entirely — use Firebase messaging |

---

## Streaming AI Chat (Most Complex Feature)

### Current Architecture (Web)

1. Client sends POST to `/api/chat-v2` with messages + context
2. Server uses Groq SDK with tool support
3. Response streamed via SSE (Server-Sent Events)
4. Stream events: `token`, `tool_call`, `tool_result`, `error`, `done`
5. Client renders tokens progressively + tool results as components

### React Native Implementation

SSE works differently in RN. Use `EventSource` polyfill or manual fetch streaming:

```typescript
// Option 1: Manual fetch with ReadableStream
const response = await fetch(`${API_URL}/api/chat-v2`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify(chatRequest),
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value);
  const lines = chunk.split('\n').filter(l => l.startsWith('data: '));

  for (const line of lines) {
    const data = JSON.parse(line.slice(6));
    switch (data.type) {
      case 'token':
        appendToken(data.content);
        break;
      case 'tool_call':
        showToolCallIndicator(data.tool);
        break;
      case 'tool_result':
        renderToolResult(data.result);
        break;
      case 'done':
        finalizeMessage();
        break;
    }
  }
}
```

**Note:** `ReadableStream` may need polyfill on older Android. Use `react-native-fetch-api` or `react-native-polyfill-globals` if needed.

### Tool Result Rendering

The chat displays rich components based on tool results. Map each to RN:

| Tool Result | Web Component | RN Component |
|---|---|---|
| Listing search | ListingCarousel / ListingListView | Horizontal FlatList with listing cards |
| Appreciation data | AppreciationContainer | Card with metrics |
| Market stats | MarketStatsCard | Card with key stats |
| CMA analysis | CMADisplay | Scrollable card with CMA metrics |
| Map view | ChatMapView | react-native-maps mini-map |
| Comparison | SubdivisionComparisonChart | Chart (react-native-chart-kit) |
| Articles | ArticleCard | Pressable card with title + preview |
| Sources | SourceBubble | Small chip/tag |

---

## SMS Real-Time Messaging

### Socket.io (Works in RN)

Socket.io client works out of the box in React Native:

```typescript
import io from 'socket.io-client';

const socket = io(API_URL, {
  transports: ['websocket', 'polling'],
  auth: { token: userToken },
});

// Join user room
socket.emit('join:user', userId);

// Listen for new messages
socket.on('message:new', (message: SMSMessage) => {
  // Update conversation list + current thread
});

// Listen for status updates
socket.on('message:status', ({ messageId, status }) => {
  // Update message delivery status
});

// Typing indicators
socket.on('typing:start', ({ conversationId }) => { ... });
socket.on('typing:stop', ({ conversationId }) => { ... });
```

### Port useSocket Hook

`src/hooks/useSocket.ts` — This hook works as-is in RN. Key changes:
- URL comes from config instead of `window.location`
- Auto-reconnect logic (5 attempts, exponential backoff) — already implemented
- Connection state tracking — already implemented

### Port SMS Hooks

| Hook | File | Changes Needed |
|---|---|---|
| **useMessages** | `agent/messages/hooks/useMessages.ts` | None — pure fetch + state |
| **useConversations** | `agent/messages/hooks/useConversations.ts` | None — pure fetch + filter |
| **useContacts** | `agent/messages/hooks/useContacts.ts` | None — pure fetch |

### Notification Sound

Web uses Web Audio API oscillator for notification sound. Replace:

```typescript
import Sound from 'react-native-sound';

const notificationSound = new Sound('notification.mp3', Sound.MAIN_BUNDLE);

function playNotificationSound() {
  notificationSound.play();
}
```

Bundle a notification sound file in the app assets.

### Browser Notifications → Push Notifications

Web uses `new Notification(title, options)`. Replace with:
- Local notification via `react-native-push-notification` for foreground
- Firebase FCM for background/quit state
- Already handled by Agent 1 Firebase setup

---

## Email (Simplified for Mobile)

Email on mobile should be simpler than web. Focus on:

### Must Have
- View inbox (list of emails)
- Read email (full content)
- Compose simple email (to, subject, body)
- Reply to email
- Use templates

### Simplify/Skip
- Rich text toolbar → plain text or very basic formatting
- Bulk actions → single email actions only
- Complex folder management → Inbox + Sent tabs only
- Drag-and-drop attachments → file picker button

### Email Compose

```typescript
// Simplified compose screen
<ScrollView>
  <RecipientInput contacts={contacts} />
  <TextInput placeholder="Subject" />
  <TextInput multiline placeholder="Message..." style={{ minHeight: 200 }} />
  <AttachmentButton onSelect={handleAttachment} />
  <TemplateButton onSelect={applyTemplate} />
  <AIGenerateButton onGenerate={generateWithAI} />
</ScrollView>
```

---

## Push Notifications

### Replace Web Push with Firebase

Web: `web-push` library + VAPID keys + service worker
Mobile: Firebase Cloud Messaging (FCM)

### Device Token Registration

```typescript
// On app start
const fcmToken = await messaging().getToken();
await fetch(`${API_URL}/api/push/subscribe`, {
  method: 'POST',
  body: JSON.stringify({
    type: 'fcm',  // NEW: distinguish from web push
    token: fcmToken,
    platform: Platform.OS, // 'ios' or 'android'
    deviceId: getUniqueId(),
  }),
});
```

### Backend Change Required

Update `/api/push/subscribe` to handle FCM tokens alongside web push subscriptions.
Update `pushNotificationService.ts` to send via Firebase Admin SDK for FCM tokens.

### Notification Handling

```typescript
// Foreground — show in-app notification
messaging().onMessage(async remoteMessage => {
  // Show local notification or in-app banner
  showInAppNotification({
    title: remoteMessage.notification?.title,
    body: remoteMessage.notification?.body,
    data: remoteMessage.data,
  });
});

// Background — handled by OS notification tray
messaging().setBackgroundMessageHandler(async remoteMessage => {
  // Silent processing if needed
});

// Notification tap — navigate to relevant screen
messaging().onNotificationOpenedApp(remoteMessage => {
  const { type, id } = remoteMessage.data;
  if (type === 'sms') navigateToConversation(id);
  if (type === 'listing') navigateToListing(id);
  if (type === 'campaign') navigateToCampaign(id);
});
```

---

## Voice/Audio Features

### ElevenLabs TTS

The API handles TTS generation server-side. Mobile just plays the result:

```typescript
import Sound from 'react-native-sound';

// Fetch generated audio from API
const response = await fetch(`/api/voicemail/generate-audio`, { ... });
const { audioBase64 } = await response.json();

// Save to temp file and play
const path = `${RNFS.CachesDirectoryPath}/preview.mp3`;
await RNFS.writeFile(path, audioBase64, 'base64');
const sound = new Sound(path, '', (error) => {
  if (!error) sound.play();
});
```

### Voice Recording

Web uses `MediaRecorder` API. Replace with `react-native-audio-recorder-player`:

```typescript
import AudioRecorderPlayer from 'react-native-audio-recorder-player';

const recorder = new AudioRecorderPlayer();

// Record
await recorder.startRecorder();
recorder.addRecordBackListener((e) => {
  setDuration(e.currentPosition);
});

// Stop and get file path
const result = await recorder.stopRecorder();
// result = file path to recorded audio
```

---

## Navigation Structure

```
MessagesStack (in AgentTabs)
├── ConversationList
├── SMSThread (params: { phoneNumber, contactId })
├── ComposeMessage
├── EmailInbox
├── EmailDetail (params: { emailId })
└── ComposeEmail

ChatStack (in ConsumerTabs)
├── ChatList (saved conversations)
├── ChatConversation (params: { conversationId? })
└── ListingDetail (from chat results, deep link)
```

---

## API Endpoints Used

### Chat
| Endpoint | Method | Purpose |
|---|---|---|
| `/api/chat-v2` | POST | AI chat (SSE stream) |
| `/api/chat/save` | POST | Save conversation |
| `/api/chat/log` | POST | Log message |
| `/api/chat/generate-title` | POST | Auto-title |
| `/api/chat/goals` | POST | Extract user goals |

### SMS
| Endpoint | Method | Purpose |
|---|---|---|
| `/api/crm/sms/send` | POST | Send SMS |
| `/api/crm/sms/messages` | GET | Message history |
| `/api/crm/sms/conversations` | GET | Conversation list |
| `/api/crm/sms/sync` | POST | Sync from Twilio |

### Email
| Endpoint | Method | Purpose |
|---|---|---|
| `/api/resend/inbox` | GET | List emails |
| `/api/resend/email/[id]` | GET | Email detail |
| `/api/resend/send` | POST | Send email |
| `/api/crm/send-email` | POST | Send to contact |
| `/api/emails/generate` | POST | AI email generation |
| `/api/email-metadata` | POST | Read/favorite status |

### Push
| Endpoint | Method | Purpose |
|---|---|---|
| `/api/push/subscribe` | POST | Register device |
| `/api/push/unsubscribe` | POST | Unregister |

### Voice
| Endpoint | Method | Purpose |
|---|---|---|
| `/api/voicemail/generate-audio` | POST | TTS via ElevenLabs |

---

## External Dependencies

| Library | Purpose | Replaces |
|---|---|---|
| `socket.io-client` | Real-time messaging | Same (already works in RN) |
| `react-native-sound` | Audio playback | Web Audio API |
| `react-native-audio-recorder-player` | Voice recording | MediaRecorder API |
| `react-native-push-notification` | Local notifications | Notification API |
| `@react-native-firebase/messaging` | FCM push | web-push |
| `react-native-toast-message` | In-app notifications | react-toastify |
| `react-native-fs` | File system (audio files) | N/A |
| `react-native-image-picker` | Attachment picker | File input |
| `react-native-chart-kit` | Chat charts | Recharts |

---

## Deliverables Checklist

- [ ] AI chat screen with streaming SSE response rendering
- [ ] Tool result components (listings, maps, stats, CMA, articles)
- [ ] Chat history list with saved conversations
- [ ] Typing animation
- [ ] SMS conversation list with search + unread counts
- [ ] SMS message thread with auto-scroll
- [ ] SMS compose with contact picker
- [ ] SMS character counter (160 limit)
- [ ] Real-time message updates via Socket.io
- [ ] Notification sound on new message
- [ ] Email inbox (list + detail)
- [ ] Email compose with templates + AI generation
- [ ] Push notification registration (FCM)
- [ ] Foreground notification handling
- [ ] Notification tap → navigate to relevant screen
- [ ] Audio playback for voicemail previews
- [ ] Voice recording capability
- [ ] ChatProvider context ported

---

## Dependencies

| From | What We Need |
|---|---|
| Agent 1 | Navigation, base components, theme, Firebase setup |
| Agent 2 | Chat types, SMS types, email types |
| Agent 3 | Pre-converted component files |
| Agent 5 | react-native-maps pattern for ChatMapView |
