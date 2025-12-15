# ChatWidget Refactoring Plan

**Current Size**: 1461 lines
**Target**: < 400 lines main file + modular components
**Date**: December 13, 2025

---

## Problem

ChatWidget.tsx is massive (1461 lines) with multiple responsibilities:
- Message display and rendering
- Input handling (3 different input modes)
- Autocomplete logic
- Map integration
- Listing panel control
- AI streaming
- Theme management
- Mobile/desktop variants

---

## Extraction Plan

### 1. **ChatInput Component** (~150 lines)
Extract the input bar with:
- Text input
- New chat button
- Send button
- Key handling
- Auto-resize logic

**Files to create**:
- `src/app/components/chat/ChatInput.tsx`

**Props**:
```typescript
{
  message: string;
  setMessage: (msg: string) => void;
  onSend: () => void;
  onNewChat: () => void;
  isLoading: boolean;
  isMapMode: boolean;
  placeholder: string;
  showNewChatButton: boolean;
}
```

---

### 2. **AutocompleteDropdown Component** (~200 lines)
Extract the autocomplete suggestions dropdown with:
- Suggestion rendering
- Icon/photo display
- Keyboard navigation
- Click handling

**Files to create**:
- `src/app/components/chat/AutocompleteDropdown.tsx`

**Props**:
```typescript
{
  suggestions: Suggestion[];
  showSuggestions: boolean;
  selectedIndex: number;
  onSelect: (suggestion: Suggestion) => void;
  suggestionsRef: RefObject<HTMLDivElement>;
}
```

---

### 3. **ChatMessage Component** (Already exists, might need updates)
Current `ChatMessage.tsx` exists but check if it needs refactoring.

---

### 4. **useAutocomplete Hook** (~100 lines)
Extract autocomplete logic:
- Debounced fetch
- Suggestion state management
- Keyboard navigation logic

**Files to create**:
- `src/app/components/chat/hooks/useAutocomplete.ts`

**Returns**:
```typescript
{
  suggestions: Suggestion[];
  showSuggestions: boolean;
  selectedIndex: number;
  setSelectedIndex: (index: number) => void;
  handleSelectSuggestion: (suggestion: Suggestion) => void;
  getSuggestionDisplay: (suggestion: Suggestion) => DisplayData;
}
```

---

### 5. **useChatScroll Hook** (~50 lines)
Extract scroll-to-bottom logic:
- Auto-scroll on new messages
- Ref management

**Files to create**:
- `src/app/components/chat/hooks/useChatScroll.ts`

---

### 6. **ChatContainer Component** (~300 lines)
Extract the main layout container:
- Desktop layout
- Mobile layout
- Theme/background styling
- Animation wrappers

**Files to create**:
- `src/app/components/chat/ChatContainer.tsx`

---

### 7. **MessageList Component** (~150 lines)
Extract message list rendering:
- Message mapping
- Loading state
- Scroll container

**Files to create**:
- `src/app/components/chat/MessageList.tsx`

---

## Refactored Structure

```
src/app/components/chat/
├── ChatWidget.tsx                 # Main orchestrator (~400 lines)
├── ChatInput.tsx                  # Input bar component
├── AutocompleteDropdown.tsx       # Autocomplete UI
├── ChatContainer.tsx              # Layout container
├── MessageList.tsx                # Message rendering
├── ChatMessage.tsx                # Individual message (exists)
├── ChatHeader.tsx                 # Header component (exists)
├── hooks/
│   ├── useAutocomplete.ts         # Autocomplete logic
│   ├── useChatScroll.ts           # Scroll management
│   └── useChatInput.ts            # Input handling (optional)
└── [other existing components]
```

---

## Priority Order

1. **useAutocomplete Hook** - Cleanest extraction, no JSX
2. **useChatScroll Hook** - Simple, self-contained
3. **ChatInput Component** - Clear boundaries, reusable
4. **AutocompleteDropdown Component** - Well-defined UI piece
5. **MessageList Component** - Simplifies main file
6. **ChatContainer Component** - Layout wrapper
7. **Refactor Main ChatWidget** - Use all extracted pieces

---

## Benefits

- **Maintainability**: Each component < 200 lines
- **Testability**: Each piece independently testable
- **Reusability**: Input and autocomplete can be reused
- **Readability**: Clear separation of concerns
- **Performance**: Can memoize components independently

---

## Testing Strategy

After each extraction:
1. Run `npm run build`
2. Test chat functionality
3. Test map mode
4. Test autocomplete
5. Test mobile view

---

## Rollback Plan

```bash
# Revert to original
git checkout HEAD~N src/app/components/chat/ChatWidget.tsx

# Remove new files
rm -rf src/app/components/chat/hooks
rm src/app/components/chat/ChatInput.tsx
rm src/app/components/chat/AutocompleteDropdown.tsx
# etc.
```

---

## Next Steps

Start with hooks (cleanest extraction), then components, then refactor main file.
