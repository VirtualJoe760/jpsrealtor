# IntegratedChatWidget Refactoring Plan

**Current**: 2,011 lines
**Target**: ~500 lines (75% reduction)
**Status**: Ready to execute

---

## 📊 Executive Summary

Based on comprehensive analysis:
- **Working Code**: 82% (1,650 lines)
- **Dead Code**: 7.5% (150 lines) → DELETE
- **Extractable Code**: 60% (1,200 lines) → MOVE
- **Core Logic**: 20% (400 lines) → KEEP

**Total Reduction**: 1,511 lines (75%)

---

## 🎯 Phase 1: Delete Dead Code (CRITICAL)

**Time**: 30 minutes | **Risk**: Low | **Impact**: -111 lines

### Actions:

1. **Remove WebLLM Code** (Lines 422-448)
   ```typescript
   // DELETE: WebLLM streaming (never executed - useAPIFallback always true)
   if (useAPIFallback) {
     // Groq API... ✅ KEEP
   } else {
     // WebLLM code... ❌ DELETE THIS ENTIRE BLOCK
   }
   ```

2. **Remove Unused Imports**
   ```typescript
   // DELETE these imports:
   import { streamChatCompletion } from "@/lib/webllm"; // ❌
   import { detectFunctionCall } from "@/lib/detectFunction"; // ❌ (deprecated)
   import type { InitProgressReport } from "@webllm/web-llm"; // ❌
   ```

3. **Remove Redundant State**
   ```typescript
   // DELETE:
   const [loadingPercent, setLoadingPercent] = useState<number>(0); // ❌
   const [retryCount, setRetryCount] = useState(0); // ❌ (never used)
   ```

4. **Move Debug Commands to Dev Utility**
   ```typescript
   // Lines 457-542: Debug commands (**config-log, **config-route, etc.)
   // MOVE to: src/app/utils/dev/chatDebug.ts
   ```

**Validation**: Run `npm run dev` and test basic chat functionality

---

## 🎯 Phase 2: Extract Utility Functions

**Time**: 1 hour | **Risk**: Low | **Impact**: -210 lines

### 2.1 Create `src/app/utils/chat/parseMarkdown.ts`

```typescript
/**
 * Parses markdown text and renders it with syntax highlighting
 * EXTRACT FROM: Lines 43-112
 */
import React from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus, vs } from "react-syntax-highlighter/dist/esm/styles/prism";

export function parseMarkdown(text: string, isLight: boolean): React.ReactNode {
  return (
    <ReactMarkdown
      components={{
        code({ inline, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || "");
          return !inline && match ? (
            <SyntaxHighlighter
              style={isLight ? vs : vscDarkPlus}
              language={match[1]}
              PreTag="div"
              {...props}
            >
              {String(children).replace(/\n$/, "")}
            </SyntaxHighlighter>
          ) : (
            <code
              className={`${className || ""} ${
                isLight
                  ? "bg-gray-100 text-gray-800"
                  : "bg-gray-800 text-gray-100"
              } px-1.5 py-0.5 rounded text-sm font-mono`}
              {...props}
            >
              {children}
            </code>
          );
        },
      }}
    >
      {text}
    </ReactMarkdown>
  );
}
```

### 2.2 Create `src/app/utils/chat/chatLogger.ts`

```typescript
/**
 * Async chat message logger
 * EXTRACT FROM: Lines 115-131
 */
export async function logChatMessageAsync(
  role: string,
  content: string,
  userId: string,
  metadata?: any
): Promise<void> {
  try {
    await fetch("/api/chat/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, content, userId, metadata }),
    });
  } catch (error) {
    console.error("Failed to log chat message:", error);
  }
}
```

### 2.3 Create `src/app/utils/chat/mapUtils.ts`

```typescript
/**
 * Calculate map bounds from listings
 * EXTRACT FROM: Lines 1396-1428
 */
import type { Listing } from "@/types/mls";

export interface BoundsType {
  north: number;
  south: number;
  east: number;
  west: number;
}

export function calculateListingsBounds(
  listings: Listing[]
): BoundsType | null {
  if (!listings || listings.length === 0) return null;

  const validListings = listings.filter(
    (listing) =>
      listing.latitude &&
      listing.longitude &&
      !isNaN(parseFloat(listing.latitude)) &&
      !isNaN(parseFloat(listing.longitude))
  );

  if (validListings.length === 0) return null;

  const lats = validListings.map((l) => parseFloat(l.latitude));
  const lngs = validListings.map((l) => parseFloat(l.longitude));

  return {
    north: Math.max(...lats),
    south: Math.min(...lats),
    east: Math.max(...lngs),
    west: Math.min(...lngs),
  };
}
```

### 2.4 Create `src/app/utils/chat/messageFormatters.ts`

```typescript
/**
 * Message formatting utilities
 * EXTRACT FROM: Lines 1263-1284, 827-843
 */

// System prompt leakage patterns to remove
const INSTRUCTION_MARKERS = [
  "Function call:",
  "For searching in",
  "You are an AI assistant",
  "Your task is to",
  "Please respond with",
  "I will provide you with",
];

export function cleanSystemPromptLeakage(response: string): string {
  let cleaned = response;

  // Remove instruction markers
  for (const marker of INSTRUCTION_MARKERS) {
    if (cleaned.toLowerCase().includes(marker.toLowerCase())) {
      const index = cleaned.toLowerCase().indexOf(marker.toLowerCase());
      cleaned = cleaned.substring(0, index).trim();
    }
  }

  return cleaned.trim();
}

export function buildDisambiguationMessage(
  options: any[],
  baseMessage?: string
): string {
  const intro =
    baseMessage ||
    "I found multiple locations that match your search. Which one did you mean?";

  const optionsList = options
    .map((opt, idx) => `${idx + 1}. ${opt.name} (${opt.type})`)
    .join("\n");

  return `${intro}\n\n${optionsList}`;
}
```

### 2.5 Create `src/types/chat.ts`

```typescript
/**
 * Chat type definitions
 * EXTRACT FROM: Lines 185-193
 */
import type { Listing } from "./mls";
import type { CMAReport } from "./cma";

export interface DisplayMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  isLoading?: boolean;
  listings?: Listing[];
  cmaReport?: CMAReport;
  disambiguationOptions?: any[];
  locationMetadata?: {
    type: string;
    name: string;
    city?: string;
    slug?: string;
    cityId?: string;
  };
}

export interface ChatMetadata {
  functionCalls?: any[];
  processingTime?: number;
  model?: string;
}
```

### 2.6 Create `src/app/constants/chat.ts`

```typescript
/**
 * Chat constants
 * EXTRACT FROM: Various locations
 */

export const SEARCH_KEYWORDS = [
  "let me search",
  "i'll search",
  "searching for",
  "looking for homes",
  "show me homes",
];

export const QUICK_ACTIONS = [
  { label: "Articles", href: "/insights" },
  { label: "Map", href: "/map" },
  { label: "Neighborhoods", href: "/neighborhoods" },
  { label: "My Dashboard", href: "/dashboard" },
];

export const MAX_RETRIES = 3;
export const SCROLL_THRESHOLD = 100;
```

**Validation**: Import and use these utilities in IntegratedChatWidget.tsx

---

## 🎯 Phase 3: Extract UI Components

**Time**: 2 hours | **Risk**: Medium | **Impact**: -460 lines

### 3.1 Create `src/app/components/chatwidget/MessageBubble.tsx`

```typescript
/**
 * Individual message bubble component
 * EXTRACT FROM: Lines 1698-1890
 */
"use client";

import React from "react";
import { motion } from "framer-motion";
import { MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";

import type { DisplayMessage } from "@/types/chat";
import type { Listing } from "@/types/mls";
import { parseMarkdown } from "@/app/utils/chat/parseMarkdown";
import ListingCarousel from "@/app/components/mls/ListingCarousel";
import ChatMapView from "@/app/components/mls/map/ChatMapView";
import CMAMessage from "@/app/components/cma/CMAMessage";

export interface MessageBubbleProps {
  message: DisplayMessage;
  index: number;
  isLight: boolean;
  onViewOnMap?: (listings: Listing[]) => void;
}

export default function MessageBubble({
  message,
  index,
  isLight,
  onViewOnMap,
}: MessageBubbleProps) {
  const router = useRouter();
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"} mb-4`}
    >
      {/* Avatar */}
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden">
          <Image
            src="/images/brand/obsidian-logo-black.png"
            alt="AI"
            width={32}
            height={32}
            className="object-cover"
          />
        </div>
      )}

      {/* Message Content */}
      <div
        className={`max-w-[75%] ${
          isUser
            ? isLight
              ? "bg-blue-500 text-white"
              : "bg-purple-600 text-white"
            : isLight
            ? "bg-white/90 text-gray-900"
            : "bg-gray-800/90 text-white"
        } rounded-2xl px-4 py-3 shadow-lg`}
      >
        {parseMarkdown(message.content, isLight)}

        {/* Listing Map View */}
        {message.listings && message.listings.length > 0 && (
          <div className="mt-4">
            <ChatMapView listings={message.listings} />

            {/* View on Map Button */}
            {onViewOnMap && (
              <button
                onClick={() => onViewOnMap(message.listings!)}
                className="mt-2 flex items-center gap-2 text-sm hover:underline"
              >
                <MapPin className="w-4 h-4" />
                View on full map
              </button>
            )}

            {/* Listing Carousel */}
            <div className="mt-4">
              <ListingCarousel listings={message.listings} compact />
            </div>
          </div>
        )}

        {/* CMA Report */}
        {message.cmaReport && (
          <div className="mt-4">
            <CMAMessage report={message.cmaReport} />
          </div>
        )}
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600" />
      )}
    </motion.div>
  );
}
```

### 3.2 Create `src/app/components/chatwidget/ChatLandingPage.tsx`

```typescript
/**
 * Chat landing page with animated logo and quick actions
 * EXTRACT FROM: Lines 1468-1657
 */
"use client";

import React from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

import AnimatedChatInput from "./AnimatedChatInput";
import { QUICK_ACTIONS } from "@/app/constants/chat";

export interface ChatLandingPageProps {
  isLight: boolean;
  onSend: (message: string) => void;
  onMicClick: () => void;
  onMinimizedClick: () => void;
  isStreaming: boolean;
  streamingMessage: string;
}

export default function ChatLandingPage({
  isLight,
  onSend,
  onMicClick,
  onMinimizedClick,
  isStreaming,
  streamingMessage,
}: ChatLandingPageProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full flex flex-col items-center justify-center p-8"
    >
      {/* Logo */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <Image
          src={
            isLight
              ? "/images/brand/obsidian-logo-black.png"
              : "/images/brand/obsidian-logo-white.png"
          }
          alt="Logo"
          width={120}
          height={120}
          className="drop-shadow-2xl"
        />
      </motion.div>

      {/* Title */}
      <motion.h1
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className={`text-4xl font-bold mb-4 ${
          isLight ? "text-gray-900" : "text-white"
        }`}
      >
        How can I help you today?
      </motion.h1>

      {/* Chat Input */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="w-full max-w-2xl mb-8"
      >
        <AnimatedChatInput
          mode="landing"
          onSend={onSend}
          onMicClick={onMicClick}
          onMinimizedClick={onMinimizedClick}
          isStreaming={isStreaming}
          streamingText={streamingMessage}
        />
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        className="flex flex-wrap gap-3 justify-center"
      >
        {QUICK_ACTIONS.map((action) => (
          <Link key={action.label} href={action.href}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`px-6 py-2 rounded-full ${
                isLight
                  ? "bg-white/90 text-gray-900 hover:bg-white"
                  : "bg-gray-800/90 text-white hover:bg-gray-700"
              } shadow-lg transition-colors`}
            >
              {action.label}
            </motion.button>
          </Link>
        ))}
      </motion.div>
    </motion.div>
  );
}
```

### 3.3 Create `src/app/components/chatwidget/LoadingIndicator.tsx`

```typescript
/**
 * Loading indicator with progress
 * EXTRACT FROM: Lines 1911-1935
 */
"use client";

import React from "react";
import { motion } from "framer-motion";

export interface LoadingIndicatorProps {
  loadingProgress?: string;
  isLight: boolean;
}

export default function LoadingIndicator({
  loadingProgress,
  isLight,
}: LoadingIndicatorProps) {
  if (!loadingProgress) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`flex gap-3 justify-start mb-4 ${
        isLight ? "text-gray-700" : "text-gray-300"
      }`}
    >
      <div className="flex-shrink-0 w-8 h-8" />
      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{ scale: [1, 1.5, 1] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.2 }}
              className={`w-2 h-2 rounded-full ${
                isLight ? "bg-blue-500" : "bg-purple-500"
              }`}
            />
          ))}
        </div>
        <span className="text-sm">{loadingProgress}</span>
      </div>
    </motion.div>
  );
}
```

### 3.4 Create Additional Small Components

Similar pattern for:
- `ErrorMessage.tsx` (Lines 1938-1956)
- `ScrollToTopButton.tsx` (Lines 1964-1996)

**Validation**: Import components and verify UI renders correctly

---

## 🎯 Phase 4: Extract Custom Hooks

**Time**: 3 hours | **Risk**: High | **Impact**: -726 lines

### 4.1 Create `src/app/hooks/useScrollPosition.ts`

```typescript
/**
 * Track scroll position and user scrolling state
 * EXTRACT FROM: Lines 239-268
 */
import { useState, useEffect, RefObject } from "react";
import { SCROLL_THRESHOLD } from "@/app/constants/chat";

export function useScrollPosition(containerRef: RefObject<HTMLDivElement>) {
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let scrollTimeout: NodeJS.Timeout;

    const handleScroll = () => {
      setIsUserScrolling(true);

      const { scrollTop, scrollHeight, clientHeight } = container;
      const bottom = scrollHeight - scrollTop - clientHeight;
      setIsAtBottom(bottom < SCROLL_THRESHOLD);

      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        setIsUserScrolling(false);
      }, 1000);
    };

    container.addEventListener("scroll", handleScroll);
    return () => {
      container.removeEventListener("scroll", handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [containerRef]);

  return { isUserScrolling, isAtBottom };
}
```

### 4.2 Create `src/app/hooks/useAutoScroll.ts`

### 4.3 Create `src/app/hooks/useUserData.ts`

### 4.4 Create `src/app/hooks/useConversationPersistence.ts`

### 4.5 Create `src/app/hooks/useChatMessages.ts` (MAJOR)

**This is the biggest extraction** - contains all message handling logic (900+ lines).

**Validation**: Test all chat functionality thoroughly after this extraction

---

## 🎯 Phase 5: Final Integration & Testing

**Time**: 1 hour | **Risk**: Medium | **Impact**: Final cleanup

### Actions:

1. **Update IntegratedChatWidget.tsx** to import all extracted pieces
2. **Remove all extracted code** from the main file
3. **Add performance logging** (from previous tasks)
4. **Run comprehensive tests**

### Final File Structure:

```
src/app/
├── components/chatwidget/
│   ├── IntegratedChatWidget.tsx (~500 lines) ✨ REFACTORED
│   ├── MessageBubble.tsx
│   ├── ChatLandingPage.tsx
│   ├── LoadingIndicator.tsx
│   ├── ErrorMessage.tsx
│   └── ScrollToTopButton.tsx
├── hooks/
│   ├── useChatMessages.ts
│   ├── useScrollPosition.ts
│   ├── useAutoScroll.ts
│   ├── useUserData.ts
│   └── useConversationPersistence.ts
├── utils/chat/
│   ├── parseMarkdown.ts
│   ├── chatLogger.ts
│   ├── mapUtils.ts
│   └── messageFormatters.ts
├── constants/
│   └── chat.ts
└── types/
    └── chat.ts
```

---

## ✅ Success Criteria

- [ ] All chat functionality works (send, receive, function calls)
- [ ] UI renders correctly (landing page, messages, loading states)
- [ ] No console errors
- [ ] File reduced from 2,011 to ~500 lines
- [ ] All extracted files have proper TypeScript types
- [ ] Performance is maintained or improved
- [ ] Tests pass (run comprehensive chat test suite)

---

## 🚨 Rollback Plan

If issues arise:
1. Git commit after each phase
2. Keep original file as `IntegratedChatWidget.tsx.backup`
3. Can revert individual phases if needed

---

## 📝 Execution Order

1. ✅ **Phase 1**: Delete dead code (30 min)
2. ✅ **Phase 2**: Extract utilities (1 hour)
3. ✅ **Phase 3**: Extract components (2 hours)
4. ✅ **Phase 4**: Extract hooks (3 hours)
5. ✅ **Phase 5**: Test & validate (1 hour)

**Total Estimated Time**: 7.5 hours

---

Ready to proceed with Phase 1?
