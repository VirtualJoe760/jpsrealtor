# Messages Page Refactor Plan

## Current State
- **Total Lines**: 1,087 lines
- **Current Structure**: Monolithic component with all logic, UI, and state management in one file

## Target Goal
- **Target Lines**: ~300-400 lines in main page component
- **Reduction**: 60-70% code reduction through component extraction and code organization

---

## 🎯 Refactor Strategy

### Phase 1: Extract UI Components (Save ~400 lines)

#### 1.1 Conversation List Components
**Create**: `src/app/agent/messages/components/ConversationList.tsx` (~150 lines)
- Extract conversation list rendering
- Include search bar
- Include new conversation button + autocomplete dropdown
- Props: `conversations`, `selectedConversation`, `onSelectConversation`, `contacts`, `searchQuery`, `onSearchChange`

**Create**: `src/app/agent/messages/components/ConversationItem.tsx` (~80 lines)
- Extract individual conversation item
- Props: `conversation`, `isSelected`, `onClick`, `formatTime`

**Create**: `src/app/agent/messages/components/NewConversationInput.tsx` (~100 lines)
- Extract new conversation input with autocomplete
- Props: `contacts`, `query`, `onQueryChange`, `onSelectContact`, `isOpen`, `onToggle`

#### 1.2 Message Thread Components
**Create**: `src/app/agent/messages/components/MessageThread.tsx` (~200 lines)
- Extract entire message thread view
- Include header, messages area, and input
- Props: `conversation`, `messages`, `loading`, `sending`, `onSendMessage`, `onBack`, `onSendOptIn`

**Create**: `src/app/agent/messages/components/MessageBubble.tsx` (~60 lines)
- Extract individual message bubble
- Props: `message`, `isOutbound`, `isLight`

**Create**: `src/app/agent/messages/components/MessageInput.tsx` (~80 lines)
- Extract message input form
- Props: `value`, `onChange`, `onSubmit`, `sending`, `disabled`

**Create**: `src/app/agent/messages/components/ThreadHeader.tsx` (~100 lines)
- Extract conversation header with contact info
- Props: `conversation`, `onBack`, `onSendOptIn`, `sending`

### Phase 2: Extract Business Logic (Save ~200 lines)

#### 2.1 Custom Hooks
**Create**: `src/app/agent/messages/hooks/useConversations.ts` (~100 lines)
```typescript
export function useConversations() {
  // State management for conversations
  // fetchConversations logic
  // applyFilters logic
  // Return: { conversations, filteredConversations, searchQuery, setSearchQuery, fetchConversations }
}
```

**Create**: `src/app/agent/messages/hooks/useMessages.ts` (~100 lines)
```typescript
export function useMessages(conversation) {
  // State management for messages
  // fetchMessages logic
  // syncTwilioMessages logic
  // sendMessage logic
  // Return: { messages, loading, syncing, sending, sendMessage, fetchMessages }
}
```

**Create**: `src/app/agent/messages/hooks/useContacts.ts` (~50 lines)
```typescript
export function useContacts() {
  // State management for contacts
  // fetchContacts logic
  // filtering logic
  // Return: { contacts, filteredContacts, contactSearch, setContactSearch }
}
```

#### 2.2 Utility Functions
**Create**: `src/app/agent/messages/utils/messageUtils.ts` (~80 lines)
- `formatTime(dateString): string`
- `playNotificationSound(): void`
- `showBrowserNotification(message): void`
- Opt-in template constant

**Create**: `src/app/agent/messages/utils/conversationUtils.ts` (~40 lines)
- `createNewConversation(contact): Conversation`
- `findExistingConversation(phoneNumber, conversations): Conversation | null`

### Phase 3: Extract Type Definitions (Save ~50 lines)

**Create**: `src/app/agent/messages/types/index.ts` (~80 lines)
```typescript
export interface SMSMessage { ... }
export interface Conversation { ... }
export interface Contact { ... }
```

### Phase 4: Extract Modal Components (Save ~150 lines)

**Create**: `src/app/agent/messages/components/ContactsModal.tsx` (~150 lines)
- Extract entire contacts modal
- Props: `isOpen`, `onClose`, `contacts`, `searchQuery`, `onSearchChange`, `onSelectContact`

---

## 📁 Proposed File Structure

```
src/app/agent/messages/
├── page.tsx                          (~300 lines) ⬇️ Main component - orchestration only
├── components/
│   ├── ConversationList.tsx          (~150 lines) ⬆️ Left panel
│   ├── ConversationItem.tsx          (~80 lines)  ⬆️ Individual conversation
│   ├── NewConversationInput.tsx      (~100 lines) ⬆️ Search with autocomplete
│   ├── MessageThread.tsx             (~200 lines) ⬆️ Right panel
│   ├── MessageBubble.tsx             (~60 lines)  ⬆️ Individual message
│   ├── MessageInput.tsx              (~80 lines)  ⬆️ Send message form
│   ├── ThreadHeader.tsx              (~100 lines) ⬆️ Contact info header
│   └── ContactsModal.tsx             (~150 lines) ⬆️ Full contacts modal
├── hooks/
│   ├── useConversations.ts           (~100 lines) ⬆️ Conversations state
│   ├── useMessages.ts                (~100 lines) ⬆️ Messages state
│   └── useContacts.ts                (~50 lines)  ⬆️ Contacts state
├── utils/
│   ├── messageUtils.ts               (~80 lines)  ⬆️ Message helpers
│   └── conversationUtils.ts          (~40 lines)  ⬆️ Conversation helpers
└── types/
    └── index.ts                      (~80 lines)  ⬆️ TypeScript interfaces
```

---

## 🚀 Implementation Order

### Step 1: Extract Types (Low Risk)
1. Create `types/index.ts`
2. Move all interfaces
3. Update imports in main file

### Step 2: Extract Utilities (Low Risk)
1. Create `utils/messageUtils.ts`
2. Move `formatTime`, notification functions
3. Create `utils/conversationUtils.ts`
4. Move conversation helper functions

### Step 3: Extract Custom Hooks (Medium Risk)
1. Create `hooks/useConversations.ts`
2. Move conversations state + fetch logic
3. Create `hooks/useMessages.ts`
4. Move messages state + send/fetch logic
5. Create `hooks/useContacts.ts`
6. Move contacts state + fetch logic

### Step 4: Extract Small Components (Low Risk)
1. Create `MessageBubble.tsx` - individual message
2. Create `ConversationItem.tsx` - individual conversation
3. Create `MessageInput.tsx` - input form

### Step 5: Extract Medium Components (Medium Risk)
1. Create `NewConversationInput.tsx`
2. Create `ThreadHeader.tsx`
3. Create `ContactsModal.tsx`

### Step 6: Extract Large Components (High Risk)
1. Create `ConversationList.tsx` - full left panel
2. Create `MessageThread.tsx` - full right panel

### Step 7: Final Cleanup
1. Main `page.tsx` should only:
   - Import hooks
   - Import components
   - Handle WebSocket integration
   - Render layout structure
2. Remove unused imports
3. Test all functionality

---

## ✅ Benefits

1. **Maintainability**: Each component has single responsibility
2. **Reusability**: Components can be used elsewhere (e.g., email messages)
3. **Testability**: Smaller components are easier to unit test
4. **Performance**: Can optimize individual components with React.memo
5. **Developer Experience**: Easier to find and modify specific features
6. **Code Review**: Smaller files are easier to review

---

## 🎯 Success Metrics

- ✅ Main page.tsx reduced to ~300-400 lines (from 1,087)
- ✅ All components under 200 lines each
- ✅ No duplicate code
- ✅ Clear separation of concerns
- ✅ All existing functionality preserved
- ✅ No TypeScript errors
- ✅ All tests passing

---

## ⚠️ Testing Checklist

After each phase:
- [ ] TypeScript builds without errors
- [ ] All conversations load correctly
- [ ] Search functionality works
- [ ] New conversation input with autocomplete works
- [ ] Messages load and display correctly
- [ ] Send message works
- [ ] Opt-in requests work
- [ ] WebSocket real-time updates work
- [ ] Notification sounds work
- [ ] Browser notifications work
- [ ] Mobile view works correctly
- [ ] Desktop view works correctly
- [ ] Contacts modal works

---

## 📝 Notes

- **Backward Compatibility**: All existing API routes remain unchanged
- **No Breaking Changes**: Refactor is purely structural
- **Incremental Approach**: Can be done in phases over multiple PRs
- **Type Safety**: Maintain strict TypeScript throughout
- **Performance**: No performance degradation expected

---

## 🔄 Optional Future Enhancements

After refactor is complete, consider:
1. Add React Query for data fetching/caching
2. Add virtualization for long conversation lists
3. Add message search functionality
4. Add attachment support
5. Add typing indicators
6. Add read receipts
7. Add message reactions
