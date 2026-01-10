# Contact Import Chat Integration - Systems Integration Report

**Date:** January 8, 2026
**Purpose:** Full context for ChatGPT to wire contact-import backend into existing chat system
**Status:** Backend Complete | Frontend Integration Pending

---

## SECTION 1: EXISTING CHAT ARCHITECTURE OVERVIEW

### What the Chat System Is Used For Today

The chat system is **the primary user interface** for the real estate application. It serves as a conversational AI assistant that helps users:

1. **Search for Properties** - "Show me homes in Palm Desert under $600k"
2. **View Market Appreciation** - "What's the appreciation like in La Quinta?"
3. **Read Educational Articles** - "What is a short sale?"
4. **Explore Listings via Map** - Integrated swipe queue with neighborhood search
5. **General Real Estate Guidance** - First-time buyer help, etc.

### Where Chat Lives in the App

**Primary Location:**
- **Route:** `/` (root - chat is the homepage)
- **Component:** `ChatWidget.tsx` (946 lines, recently refactored from 1,469)

**Integration Points:**
- **CHAP Mode:** `/chap` route (Chat + Map split view - desktop)
- **Mobile:** Chat is full-screen with map toggle
- **Embedded:** Can be embedded in other pages (not currently used)

### Global vs Feature-Scoped

**GLOBAL** - The chat is:
- A single unified interface
- **NOT** feature-scoped
- **NOT** modal-based for different features
- One continuous conversation stream

**However:**
- Chat recognizes different "intents" (property search, appreciation, articles)
- Different components render based on AI responses (carousels, charts, articles)
- The SAME chat instance handles ALL features

### Conversation Creation and Persistence

**Current State (V1):**
- ❌ **NO conversation persistence** to database
- ❌ **NO conversation IDs**
- Messages exist only in React state (`ChatProvider`)
- On page refresh, chat history is lost
- **NOTE:** This is a known limitation being addressed in V2

**State Storage:**
```typescript
// ChatProvider.tsx
const [messages, setMessages] = useState<Message[]>([]);
const [chatHistory, setChatHistory] = useState<Message[]>([]);
```

**Messages Are:**
- Stored in-memory only
- Not sent to backend (backend is stateless)
- Frontend manages entire conversation history
- Each API call receives full history from frontend

### Multi-Turn Memory

**YES** - Chat supports multi-turn memory via:

**Frontend State Management:**
```typescript
// ChatProvider sends full history on every request
const response = await fetch('/api/chat/stream', {
  method: 'POST',
  body: JSON.stringify({
    messages: chatHistory, // Full conversation sent each time
    isNewChat: false
  })
});
```

**Backend Receives:**
```typescript
// Backend gets full conversation context every time
const { messages } = await req.json();
// Backend is STATELESS - doesn't store anything
```

**Memory Mechanism:**
- Frontend = source of truth
- Backend = stateless processor
- Every request includes full conversation history
- AI has access to entire conversation via `messages` array

### System vs User Messages

**Message Types:**
```typescript
interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
  component?: 'LISTING_CAROUSEL' | 'APPRECIATION' | 'ARTICLE_RESULTS' | 'CMA_REPORT';
  metadata?: any;
}
```

**How System Messages Work:**

1. **System Prompt (Backend Only)**
```typescript
// Backend adds system message on every request
const fullMessages = [
  { role: 'system', content: SYSTEM_PROMPT }, // Added by backend
  ...messages // From frontend
];
```

2. **User Messages**
```typescript
// User input creates user message
{
  role: 'user',
  content: 'Show me homes in Palm Desert'
}
```

3. **Assistant Messages**
```typescript
// AI response with optional component marker
{
  role: 'assistant',
  content: 'Here are homes in Palm Desert...',
  component: 'LISTING_CAROUSEL', // Triggers ListingCarousel render
  metadata: { listings: [...], stats: {...} }
}
```

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      USER INTERFACE                          │
│                    ChatWidget.tsx (root)                     │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    CHAT PROVIDER                             │
│                  (In-Memory State)                           │
│  - messages: Message[]                                       │
│  - chatHistory: Message[]                                    │
│  - NO DATABASE PERSISTENCE                                   │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  │ POST with full history
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                BACKEND API ENDPOINT                          │
│            /api/chat/stream (V1) or                          │
│            /api/chat-v2 (V2 - in progress)                   │
│                                                              │
│  Receives: { messages: Message[] }                          │
│  Returns: Server-Sent Events stream                         │
│  Storage: STATELESS (no persistence)                        │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                      GROQ AI                                 │
│            llama-3.3-70b-versatile                           │
│                                                              │
│  Tools Available (V2):                                       │
│  - searchHomes                                               │
│  - getAppreciation                                           │
│  - searchArticles                                            │
│  (+ future: preview_contacts, import_contacts)               │
└─────────────────────────────────────────────────────────────┘
```

---

## SECTION 2: CHAT FRONTEND COMPONENT INVENTORY

### Primary Components

#### 1. `ChatWidget.tsx`
**Path:** `src/app/components/chat/ChatWidget.tsx`
**Lines:** 946 (refactored from 1,469)
**Purpose:** Main chat orchestrator - handles message flow, rendering, and component selection

**Responsibilities:**
- Message display and streaming
- Component marker detection ([LISTING_CAROUSEL], [APPRECIATION], etc.)
- Chat input orchestration
- Scroll management
- Mini map integration
- "Open in Map View" button rendering

**Key Props:** None (top-level component)

**Supports:**
- ✅ Markdown rendering (via ReactMarkdown)
- ✅ Tables (markdown tables in messages)
- ✅ System messages (implicit via SYSTEM_PROMPT)
- ✅ Streaming (Server-Sent Events)
- ✅ Component markers (custom extension)
- ❌ Typing indicators (not implemented)
- ❌ Disabled input states (not implemented)

**State:**
```typescript
const {
  messages,
  chatHistory,
  isStreaming,
  setIsStreaming,
  addMessage,
  clearMessages
} = useChat();
```

---

#### 2. `ChatProvider.tsx`
**Path:** `src/app/components/chat/ChatProvider.tsx`
**Purpose:** Global chat state management via React Context

**Provides:**
```typescript
interface ChatContextType {
  messages: Message[];
  chatHistory: Message[];
  isStreaming: boolean;
  selectedListings: any[];
  addMessage: (message: Message) => void;
  setMessages: (messages: Message[]) => void;
  setChatHistory: (history: Message[]) => void;
  setIsStreaming: (streaming: boolean) => void;
  clearMessages: () => void;
}
```

**Critical Notes:**
- **Single source of truth** for all chat state
- **NO persistence** - state lives in React only
- **NO conversation IDs** - all state is ephemeral
- Provides hooks: `useChat()`

---

#### 3. `ChatInput.tsx`
**Path:** `src/app/components/chat/ChatInput.tsx`
**Purpose:** Unified input component with 3 variants

**Variants:**
1. **Standard** - Regular chat input
2. **Autocomplete** - With dropdown suggestions
3. **Modal** - For new chat confirmation

**Props:**
```typescript
interface ChatInputProps {
  variant?: 'standard' | 'autocomplete' | 'modal';
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  isLight: boolean;
  disabled?: boolean; // ✅ Supports disabled state
  autoFocus?: boolean;
}
```

**Supports:**
- ✅ Disabled state
- ✅ Auto-focus
- ✅ Autocomplete dropdown
- ✅ Enter to submit
- ✅ Multi-line input (textarea)

---

#### 4. `ChatResultsContainer.tsx`
**Path:** `src/app/components/chat/ChatResultsContainer.tsx`
**Purpose:** Renders different result types based on component markers

**Handles:**
- `[LISTING_CAROUSEL]` → ListingCarousel
- `[APPRECIATION]` → AppreciationContainer
- `[ARTICLE_RESULTS]` → ArticleCard grid
- `[CMA_REPORT]` → CMADisplay

**Props:**
```typescript
interface ChatResultsContainerProps {
  message: Message;
  isLight: boolean;
  onOpenListingPanel: (listing: any) => void;
}
```

**Critical:** This is where new component markers should be detected

---

#### 5. `ListingCarousel.tsx`
**Path:** `src/app/components/chat/ListingCarousel.tsx`
**Purpose:** Horizontal scrolling property carousel

**Props:**
```typescript
interface ListingCarouselProps {
  listings: any[];
  totalCount?: number;
  isLight: boolean;
  onViewDetails: (listing: any) => void;
}
```

---

#### 6. `AutocompleteDropdown.tsx`
**Path:** `src/app/components/chat/AutocompleteDropdown.tsx`
**Purpose:** Reusable autocomplete suggestions dropdown

**Props:**
```typescript
interface AutocompleteDropdownProps {
  suggestions: AutocompleteSuggestion[];
  isLoading: boolean;
  onSelect: (suggestion: AutocompleteSuggestion) => void;
  isLight: boolean;
}
```

---

#### 7. `NewChatModal.tsx`
**Path:** `src/app/components/chat/NewChatModal.tsx`
**Purpose:** Confirmation modal for starting new chat (clears history)

**Props:**
```typescript
interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLight: boolean;
}
```

---

### Supporting Components

| Component | Path | Purpose | Markdown | Tables | Disabled State |
|-----------|------|---------|----------|--------|----------------|
| ChatHeader.tsx | chat/ | Header with theme toggle, new chat | N/A | N/A | N/A |
| ChatMapView.tsx | chat/ | Mini map preview | No | No | No |
| AppreciationContainer.tsx | chat/ | Market data display | Yes | Yes | No |
| ArticleCard.tsx | chat/ | Educational article cards | Yes | No | No |
| MarketStatsCard.tsx | chat/ | Statistics display | No | Yes | No |
| SubdivisionComparisonChart.tsx | chat/ | Comparison charts | No | No | No |
| SourceBubble.tsx | chat/ | Citation bubbles | No | No | No |
| CMADisplay.tsx | chat/ | CMA report display | Yes | Yes | No |
| EndOfQueueModal.tsx | chat/ | End of swipe queue modal | No | No | No |
| TypingAnimation.tsx | chat/ | Animated typing dots | N/A | N/A | N/A |

---

## SECTION 3: CHAT STATE MANAGEMENT

### Where Conversation State Lives

**React Context (Frontend):**
```typescript
// src/app/components/chat/ChatProvider.tsx
const ChatContext = createContext<ChatContextType | undefined>(undefined);

// State stored in provider
const [messages, setMessages] = useState<Message[]>([]);
const [chatHistory, setChatHistory] = useState<Message[]>([]);
const [isStreaming, setIsStreaming] = useState(false);
const [selectedListings, setSelectedListings] = useState<any[]>([]);
```

**NO Server State** - Backend is completely stateless

### Message Structure

**Core Message Type:**
```typescript
interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
  component?: ComponentMarker;
  metadata?: any;
  timestamp?: number;
}

type ComponentMarker =
  | 'LISTING_CAROUSEL'
  | 'APPRECIATION'
  | 'ARTICLE_RESULTS'
  | 'CMA_REPORT'
  | 'CONTACT_IMPORT_PREVIEW'  // ← NEW (for contact import)
  | 'CONTACT_IMPORT_CONFIRM'  // ← NEW (for confirmation UI)
  | 'CONTACT_IMPORT_RESULT';  // ← NEW (for import results)
```

### How Messages Are Appended

**User Message:**
```typescript
// User types and hits enter
const handleSendMessage = async (userInput: string) => {
  // 1. Add user message to state
  const userMessage: Message = {
    role: 'user',
    content: userInput,
    timestamp: Date.now()
  };
  addMessage(userMessage);

  // 2. Send to backend with full history
  const response = await fetch('/api/chat/stream', {
    method: 'POST',
    body: JSON.stringify({
      messages: [...chatHistory, userMessage],
      isNewChat: false
    })
  });

  // 3. Stream assistant response
  const reader = response.body.getReader();
  let assistantMessage = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    assistantMessage += decode(value);
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: assistantMessage
    }]);
  }
};
```

**Assistant Message:**
```typescript
// Streamed incrementally, then finalized
{
  role: 'assistant',
  content: 'Here are your contacts...',
  component: 'CONTACT_IMPORT_PREVIEW', // Parsed from content
  metadata: {
    cleanedData: [...],
    statistics: {...}
  }
}
```

### Tool Calls Representation

**Current V1 System:**
- ❌ Tool calls are NOT exposed to frontend
- ❌ Frontend only sees final AI response
- Tool execution happens entirely on backend

**V2 System (In Progress):**
- Tool calls visible in developer mode
- Frontend receives tool call notifications
- But still processed server-side

**For Contact Import:**
```typescript
// Backend calls preview_contacts tool
// Frontend receives:
{
  role: 'assistant',
  content: '[CONTACT_IMPORT_PREVIEW]\n\nHere\'s a preview of your contacts...',
  metadata: {
    toolUsed: 'preview_contacts',
    cleanedData: [...],
    statistics: {...}
  }
}
```

### Conversation Context Persistence

**Current:**
- ❌ NO database persistence
- ❌ NO session storage
- ❌ localStorage not used
- State lost on refresh

**Workaround for Contact Import:**
```typescript
// We can store import state temporarily in ChatProvider
interface ChatContextType {
  // ... existing fields

  // NEW: Contact import state
  contactImportState?: {
    state: 'FILE_UPLOADED' | 'PREVIEW_SHOWN' | 'AWAITING_CONFIRMATION' | 'IMPORTING' | 'COMPLETED';
    filePath?: string;
    cleanedData?: any[];
    statistics?: any;
    listId?: string;
  };
  setContactImportState: (state: any) => void;
}
```

---

## SECTION 4: CHAT BACKEND CONTRACT

### API Endpoints

**Current V1 (Active):**
```
POST /api/chat/stream
```

**V2 (In Development):**
```
POST /api/chat-v2
```

**For Contact Import (NEW):**
```
POST /api/contact-cleaning/assistant
```

### Request/Response Schema

**Standard Chat Request:**
```typescript
POST /api/chat/stream
{
  messages: Message[], // Full conversation history
  isNewChat: boolean    // If true, clears context
}
```

**Standard Chat Response:**
```
Content-Type: text/event-stream

data: {"content": "Here are homes..."}
data: {"content": "[LISTING_CAROUSEL]"}
data: {"metadata": {...}}
data: [DONE]
```

**Contact Import Request (NEW):**
```typescript
POST /api/contact-cleaning/assistant
{
  message: string,                  // User's message
  conversationHistory: Message[]    // Previous messages (optional)
}
```

**Contact Import Response:**
```json
{
  "success": true,
  "response": "Markdown-formatted response with preview/confirmation/results"
}
```

### Conversation ID Handling

**Current:**
- ❌ NO conversation IDs exist
- ❌ Backend is completely stateless
- ❌ No session tracking

**For Contact Import:**
- We can use frontend state to track import session
- No backend session needed
- Conversation context passed on every request

### Backend Stateless vs Stateful

**STATELESS** - Backend:
- Receives full message history on every request
- Does NOT store any conversation data
- Does NOT maintain sessions
- Every request is independent

**Contact Import Backend:**
- Also STATELESS
- Relies on frontend to pass:
  - File path (from upload)
  - Cleaned data (from preview tool result)
  - List selection (from user confirmation)
- Backend executes tools and returns results
- Frontend manages state between calls

### System Prompt Selection

**Current:**
```typescript
// Backend has ONE system prompt for all conversations
const SYSTEM_PROMPT = `You are a real estate AI assistant...`;

// Added to every request
const fullMessages = [
  { role: 'system', content: SYSTEM_PROMPT },
  ...messages
];
```

**For Contact Import:**
- **Option 1:** Use separate endpoint `/api/contact-cleaning/assistant` with its own system prompt
- **Option 2:** Add "mode" parameter to main chat endpoint
- **RECOMMENDED:** Option 1 (already implemented)

---

## SECTION 5: EXTENSION POINTS

### How New Features Are Added

**Current Pattern:**

1. **Backend:** Add new tool to tool registry
```typescript
// src/lib/chat-v2/tools.ts
export const ALL_TOOLS = [
  { type: "function", function: { name: "searchHomes", ... } },
  { type: "function", function: { name: "getAppreciation", ... } },
  { type: "function", function: { name: "preview_contacts", ... } } // NEW
];
```

2. **Backend:** Add tool executor
```typescript
// src/lib/chat-v2/tool-executors.ts
case "preview_contacts":
  return await executePreviewContacts(args);
```

3. **Frontend:** Add component marker detection
```typescript
// src/app/components/chat/ChatResultsContainer.tsx
if (content.includes('[CONTACT_IMPORT_PREVIEW]')) {
  return <ContactImportPreview metadata={message.metadata} />;
}
```

4. **Frontend:** Create display component
```typescript
// src/app/components/chat/ContactImportPreview.tsx
export function ContactImportPreview({ metadata }) {
  // Render preview table + statistics
}
```

### Chat "Modes" or "Tools"

**Current:**
- ❌ NO formal "mode" system
- ❌ NO feature flags in chat
- All features share the same chat instance

**Tool Support:**
- ✅ Backend has tool calling (Groq function calling)
- ✅ Multiple tools can be used in one conversation
- ❌ Frontend doesn't explicitly know which tool was used (except via component markers)

### System Prompt Variation

**Current:**
- ❌ ONE system prompt for all features
- ❌ Cannot vary system prompt per feature
- System prompt is backend-only

**For Contact Import:**
- **SOLUTION:** Use separate API endpoint (`/api/contact-cleaning/assistant`)
- This endpoint has its own system prompt
- Allows contact-import-specific instructions
- **Already implemented** ✅

### Feature-Specific State Storage

**Current:**
- ❌ NO built-in mechanism for feature-specific state
- ChatProvider stores global chat state only

**Solution for Contact Import:**
```typescript
// Extend ChatProvider with feature state
const ChatContext = createContext<ChatContextType>({
  // ... existing fields

  // Feature-specific state
  featureState: {
    contactImport?: {
      state: ChatState;
      filePath?: string;
      cleanedData?: any[];
      statistics?: any;
    };
  };
});
```

---

## SECTION 6: HOW CONTACT IMPORT SHOULD PLUG IN

### Integration Strategy

**RECOMMENDED APPROACH:** Hybrid Integration

**Why Hybrid:**
1. **Reuse existing chat UI** for conversation
2. **Separate backend endpoint** for contact-import-specific logic
3. **Extend ChatProvider** for import state
4. **New component markers** for import UI

### Integration Architecture

```
┌─────────────────────────────────────────────────────────┐
│            EXISTING CHAT (Reuse)                        │
│  - ChatWidget.tsx (message display)                     │
│  - ChatInput.tsx (user input)                           │
│  - ChatProvider.tsx (state management)                  │
└─────────────┬───────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────┐
│        FILE UPLOAD INTEGRATION (NEW)                    │
│  - File upload component in chat                        │
│  - On upload success:                                   │
│    1. Store filePath in ContactImportState              │
│    2. Auto-send message: "I uploaded contacts.csv"      │
│    3. Trigger chat flow                                 │
└─────────────┬───────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────┐
│     BACKEND ROUTING (Based on message content)          │
│                                                          │
│  IF message contains file upload context:               │
│    → POST /api/contact-cleaning/assistant               │
│  ELSE:                                                   │
│    → POST /api/chat/stream                              │
└─────────────┬───────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────┐
│         CONTACT IMPORT BACKEND (NEW)                    │
│  - Groq with preview_contacts, import_contacts tools    │
│  - System prompt with safety constraints                │
│  - State machine logic                                  │
└─────────────┬───────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────┐
│        COMPONENT MARKERS (NEW)                          │
│  - [CONTACT_IMPORT_PREVIEW]                             │
│  - [CONTACT_IMPORT_CONFIRM]                             │
│  - [CONTACT_IMPORT_RESULT]                              │
└─────────────┬───────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────┐
│        DISPLAY COMPONENTS (NEW)                         │
│  - ContactImportPreview.tsx (table + stats)             │
│  - ContactImportConfirm.tsx (confirmation UI)           │
│  - ContactImportResult.tsx (success/error display)      │
└─────────────────────────────────────────────────────────┘
```

### State Mapping to Existing System

**FILE_UPLOADED:**
```typescript
// User uploads file
onFileUpload(filePath) {
  // 1. Store in ChatProvider
  setContactImportState({
    state: 'FILE_UPLOADED',
    filePath: filePath
  });

  // 2. Auto-send message to chat
  const message = `I uploaded a contact file at ${filePath}`;
  handleSendMessage(message, {
    endpoint: '/api/contact-cleaning/assistant'
  });
}
```

**PREVIEW_SHOWN:**
```typescript
// Backend response with preview
{
  role: 'assistant',
  content: '[CONTACT_IMPORT_PREVIEW]\n\nHere's a preview...\n\n[markdown table]',
  metadata: {
    cleanedData: [...],
    statistics: {...}
  }
}

// Frontend detects marker and renders
<ChatResultsContainer message={message}>
  {/* Detects [CONTACT_IMPORT_PREVIEW] */}
  <ContactImportPreview
    data={message.metadata.cleanedData}
    stats={message.metadata.statistics}
  />
</ChatResultsContainer>

// Update state
setContactImportState(prev => ({
  ...prev,
  state: 'PREVIEW_SHOWN',
  cleanedData: message.metadata.cleanedData,
  statistics: message.metadata.statistics
}));
```

**AWAITING_CONFIRMATION:**
```typescript
// AI asks: "Does this look correct?"
// User responds: "Yes" or "No"

handleSendMessage(userResponse, {
  endpoint: '/api/contact-cleaning/assistant',
  conversationHistory: messages // Include all previous messages
});

// State remains PREVIEW_SHOWN until confirmation
```

**IMPORTING:**
```typescript
// Backend response after confirmation
{
  role: 'assistant',
  content: '[CONTACT_IMPORT_CONFIRM]\n\nGreat! Which list should I assign...'
}

// User selects list
handleSendMessage("Create list: January 2026", {
  endpoint: '/api/contact-cleaning/assistant',
  conversationHistory: messages
});

// Update state
setContactImportState(prev => ({
  ...prev,
  state: 'IMPORTING'
}));
```

**COMPLETED:**
```typescript
// Backend response after import
{
  role: 'assistant',
  content: '[CONTACT_IMPORT_RESULT]\n\n✅ Import Complete!\n\nImported: 245...',
  metadata: {
    importResult: {
      imported: 245,
      skipped: 0,
      duplicates: 0
    }
  }
}

// Frontend renders result
<ContactImportResult result={message.metadata.importResult} />

// Update state
setContactImportState({
  state: 'COMPLETED',
  importResult: message.metadata.importResult
});
```

---

## SECTION 7: GAPS & REQUIRED CHANGES

### REQUIRED Changes (Must Implement)

1. **File Upload Component**
   - **Location:** Add to `ChatWidget.tsx` or create `FileUploadButton.tsx`
   - **Purpose:** Allow users to upload contact files
   - **Integration:** On upload, auto-trigger chat message

2. **Component Marker Detection**
   - **File:** `ChatResultsContainer.tsx`
   - **Add:**
     ```typescript
     if (content.includes('[CONTACT_IMPORT_PREVIEW]')) {
       return <ContactImportPreview ... />;
     }
     if (content.includes('[CONTACT_IMPORT_CONFIRM]')) {
       return <ContactImportConfirm ... />;
     }
     if (content.includes('[CONTACT_IMPORT_RESULT]')) {
       return <ContactImportResult ... />;
     }
     ```

3. **Extend ChatProvider**
   - **File:** `ChatProvider.tsx`
   - **Add:**
     ```typescript
     const [contactImportState, setContactImportState] = useState<ContactImportState | null>(null);
     ```

4. **New Display Components**
   - Create `ContactImportPreview.tsx`
   - Create `ContactImportConfirm.tsx`
   - Create `ContactImportResult.tsx`

5. **Backend Endpoint Routing**
   - **File:** `ChatWidget.tsx`
   - **Modify:** `handleSendMessage` to support custom endpoint
     ```typescript
     const handleSendMessage = async (message: string, options?: { endpoint?: string }) => {
       const endpoint = options?.endpoint || '/api/chat/stream';
       // ... fetch logic
     };
     ```

### OPTIONAL Changes (Nice to Have)

1. **Input Disable During Import**
   - ChatInput already supports `disabled` prop
   - Just need to pass `disabled={contactImportState?.state === 'IMPORTING'}`

2. **Visual Progress Indicator**
   - Show spinner during import
   - Reuse existing `TypingAnimation.tsx`

3. **Conversation History Persistence**
   - Not required for MVP
   - Can add localStorage later

### NOT REQUIRED (Existing System Handles)

- ✅ Markdown rendering (already supported)
- ✅ Table rendering (already supported)
- ✅ Streaming (already supported)
- ✅ Multi-turn conversation (already supported)
- ✅ Theme support (already supported)

---

## SECTION 8: RECOMMENDATIONS FOR CHATGPT

### What to Reuse As-Is

**MUST REUSE (Do NOT duplicate):**

1. **ChatWidget.tsx** - Main chat container
   - Only add file upload button
   - Only modify message sending to support custom endpoint
   - DO NOT rewrite message display logic

2. **ChatProvider.tsx** - State management
   - Extend with `contactImportState`
   - DO NOT create new context

3. **ChatInput.tsx** - Input component
   - Reuse as-is
   - Already supports disabled state

4. **ChatResultsContainer.tsx** - Component rendering
   - Add new marker detection
   - DO NOT rewrite existing logic

5. **ReactMarkdown** - Markdown rendering
   - Already integrated in ChatWidget
   - DO NOT add new markdown renderer

6. **Theme System** - Light/dark themes
   - Use existing `useTheme()` hook
   - Check `isLight` prop pattern

### What to Avoid Duplicating

**AVOID:**

1. **Creating New Chat Component**
   - DO NOT create `ContactImportChat.tsx`
   - Use existing ChatWidget

2. **Creating New State Management**
   - DO NOT create new Context
   - Extend ChatProvider

3. **Creating New Message Type**
   - DO NOT create `ContactImportMessage` type
   - Use existing `Message` interface with component markers

4. **Creating New API Streaming Logic**
   - DO NOT rewrite SSE streaming
   - Reuse existing `handleSendMessage` pattern

5. **Creating Separate Chat UI**
   - DO NOT build parallel chat system
   - Everything goes through ONE chat interface

### Fragile Parts (Handle with Care)

**CRITICAL - DO NOT BREAK:**

1. **Message Streaming Logic** (`ChatWidget.tsx` lines 400-500)
   - Complex SSE handling
   - Component marker parsing
   - Metadata extraction
   - **ONLY ADD** new marker detection, don't modify existing

2. **ChatProvider State Updates**
   - Messages are append-only
   - Avoid setState inside loops
   - Use functional updates: `setMessages(prev => [...])`

3. **Component Marker System**
   - Markers are detected via string matching in `content`
   - Must follow exact format: `[MARKER_NAME]`
   - Metadata passed via separate `metadata` field

4. **Conversation History Management**
   - Every API call must include full history
   - Order matters (system → user → assistant)
   - Don't filter or modify history

**MODERATE RISK:**

1. **File Upload Integration**
   - Needs to trigger chat message
   - Must not interfere with normal chat flow
   - Test: Can user still chat normally after upload?

2. **Backend Endpoint Routing**
   - Contact import uses different endpoint
   - Must detect when to route where
   - Fallback to main chat endpoint

**LOW RISK:**

1. **New Display Components**
   - Self-contained
   - Receive props, render UI
   - Similar to existing ListingCarousel, AppreciationContainer

2. **Theme Integration**
   - Just use `isLight` prop
   - Follow existing patterns

---

## FINAL IMPLEMENTATION CHECKLIST

### Phase 1: Extend ChatProvider
- [ ] Add `contactImportState` to context
- [ ] Add `setContactImportState` function
- [ ] Export via `useChat()` hook

### Phase 2: Add File Upload
- [ ] Create `FileUploadButton.tsx` component
- [ ] Integrate into ChatWidget header
- [ ] On upload: store path in state + send chat message

### Phase 3: Backend Endpoint Routing
- [ ] Modify `handleSendMessage` to accept custom endpoint
- [ ] Add logic to route contact import messages to `/api/contact-cleaning/assistant`
- [ ] Pass conversation history on every request

### Phase 4: Component Markers
- [ ] Add detection in `ChatResultsContainer.tsx`:
  - `[CONTACT_IMPORT_PREVIEW]`
  - `[CONTACT_IMPORT_CONFIRM]`
  - `[CONTACT_IMPORT_RESULT]`

### Phase 5: Display Components
- [ ] Create `ContactImportPreview.tsx` (markdown table + stats)
- [ ] Create `ContactImportConfirm.tsx` (list selection UI)
- [ ] Create `ContactImportResult.tsx` (success/error display)

### Phase 6: State Management
- [ ] Update state on preview
- [ ] Update state on confirmation
- [ ] Update state on import complete
- [ ] Clear state on new chat

### Phase 7: Testing
- [ ] Upload CSV file → Preview shown
- [ ] Confirm → List selection shown
- [ ] Select list → Import executes
- [ ] Import complete → Results shown
- [ ] Can still use normal chat after import

---

## CRITICAL REFERENCES

**Chat V2 Documentation:**
- `docs/chat/CHAT_V2_REWRITE_PLAN.md` - V2 architecture
- `docs/architecture/CHAT_ARCHITECTURE.md` - CHAP integration
- `docs/chat-v2/CHAT_SWIPE_QUEUE.md` - Swipe queue pattern

**Existing Patterns to Follow:**
- **Component Markers:** See `ListingCarousel` integration
- **Metadata Passing:** See `AppreciationContainer` integration
- **File Uploads:** See CMA report upload pattern (if exists)

**Contact Import Backend:**
- `docs/contact-cleaning/CHAT_IMPORT_ARCHITECTURE.md`
- `docs/contact-cleaning/CHAT_IMPORT_GUIDE.md`
- `docs/contact-cleaning/CHAT_IMPORT_IMPLEMENTATION.md`

---

**STATUS:** Ready for Frontend Integration
**NEXT STEP:** ChatGPT implements Phase 1-7 above

