# 🧠 Project Memory Reload Guide

**Purpose**: Quick reference for Claude to reload project context in new sessions

**Last Updated**: November 23, 2025

---

## 🚀 Quick Start - New Session Protocol

When starting a new Claude session, follow this protocol:

### STEP 1: Read Core Memory Files

```
1. Read SYSTEM_ARCHITECTURE.md (complete system overview)
2. Read SWIPE_REVIEW_MODE_IMPLEMENTATION_PLAN.md (swipe feature details)
3. Read theme-change-notes.md (theme system documentation)
4. Read this file (RELOAD_PROJECT_MEMORY.md)
```

### STEP 2: Confirm Context

After reading, confirm understanding of:
- ✅ Project tech stack (Next.js 16, React 19, TypeScript 5.7.2)
- ✅ Theme system (lightgradient / blackspace with `useTheme()`)
- ✅ Core subsystems (Chat, Map, CMA, Auth, Tutorial, Swipe Mode)
- ✅ Current feature status

### STEP 3: Check Git Status

```bash
git status
git log -5 --oneline
```

### STEP 4: Review Recent Changes

Check these locations for recent work:
- `local-logs/claude-logs/` - Session memory files
- Root directory `.md` files - Implementation plans and notes
- `git diff` - Uncommitted changes

---

## 📁 Critical File Locations

### Core Configuration
```
├── next.config.mjs           # Next.js 16 config (Turbopack)
├── tsconfig.json             # TypeScript 5.7.2 config
├── tailwind.config.ts        # Tailwind + theme colors
├── package.json              # Dependencies (React 19, etc)
└── .env.local                # Environment variables
```

### Type Definitions
```
src/types/
├── types.ts                  # Core types (MapListing, IListing, etc)
├── swipe.ts                  # Swipe mode types (NEW - Nov 2025)
├── chat.ts                   # Chat system types
└── next-auth.d.ts            # NextAuth type extensions
```

### Main Application
```
src/app/
├── page.tsx                  # Homepage with IntegratedChatWidget
├── layout.tsx                # Root layout with ThemeContext
├── globals.css               # Global styles + theme variables
└── contexts/
    └── ThemeContext.tsx      # Theme provider (lightgradient/blackspace)
```

### Chat System
```
src/app/components/chatwidget/
├── IntegratedChatWidget.tsx  # Main chat orchestrator ⭐ SWIPE MODE STATE
├── AnimatedChatInput.tsx     # Chat input field
├── MessageBubble.tsx         # Message rendering
└── chat/
    ├── ChatMapView.tsx       # Mini-map for results ⭐ SWIPE MODE TRIGGER
    ├── ListingCarousel.tsx   # Results carousel ⭐ SWIPE MODE TRIGGER
    ├── MLSChatResponse.tsx   # Response formatter ⭐ SUBDIVISION METADATA
    └── ChatProvider.tsx      # Session state management
```

### Swipe Mode System (NEW - Nov 2025)
```
src/app/components/
├── modals/
│   └── SwipeCompletionModal.tsx  # Session completion modal ⭐
└── mls/map/
    └── ListingBottomPanel.tsx     # Swipe UI with progress ⭐
```

### Map System
```
src/app/components/mls/map/
├── MapView.tsx               # Full-page map
├── MapPageClient.tsx         # Map page wrapper
├── MapGlobeLoader.tsx        # Loading animation
└── ListingBottomPanel.tsx    # Listing details panel ⭐ SWIPE MODE
```

### AI/LLM System
```
src/lib/
├── groq.ts                   # Groq SDK wrapper (Llama 4)
├── groq-functions.ts         # Function calling schemas
├── function-executor.ts      # Function dispatcher
├── ai-functions.ts           # MLS search functions
└── location-matcher.ts       # Location resolution
```

### API Routes
```
src/app/api/
├── chat/
│   ├── stream/route.ts       # Main chat endpoint
│   ├── match-location/route.ts
│   └── history/route.ts
├── subdivisions/
│   └── [slug]/listings/route.ts
├── mls-listings/route.ts
└── auth/[...nextauth]/route.ts
```

### Database Models
```
src/models/
├── listings.ts               # IListing interface + schema
├── user.ts / User.ts         # User model (both exist - Windows case issue)
└── subdivisions.ts           # Subdivision model
```

---

## 🎨 Theme System Reference

### Using Themes in Components

```typescript
import { useTheme } from "@/app/contexts/ThemeContext";

function MyComponent() {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  return (
    <div className={isLight
      ? "bg-gradient-to-br from-white/95 to-blue-50/90"
      : "bg-gradient-to-br from-neutral-900/95 to-black/90"
    }>
      {/* Component content */}
    </div>
  );
}
```

### Theme Color Palettes

**Light Mode (lightgradient)**:
- Primary: `blue-600` → `indigo-600`
- Backgrounds: `white/80`, `gray-100`, `blue-50`
- Text: `gray-900`, `gray-700`, `gray-600`
- Borders: `gray-300`, `blue-300`

**Dark Mode (blackspace)**:
- Primary: `emerald-600` → `teal-600`
- Backgrounds: `neutral-900/95`, `neutral-800`, `black/90`
- Text: `white`, `neutral-300`, `neutral-400`
- Borders: `neutral-700`, `emerald-700`

---

## 🔧 Development Workflow

### Starting Dev Server

```bash
npm run dev
# Runs on http://localhost:3000
# Uses Turbopack (Next.js 16)
```

### Common Issues & Solutions

**1. Hot Reload File Conflicts**
- **Issue**: "File has been unexpectedly modified" when using Edit tool
- **Solution**: Use Node.js scripts for atomic file operations:
  ```bash
  cat > /tmp/patch.js << 'JSSCRIPT'
  const fs = require('fs');
  let content = fs.readFileSync('path/to/file', 'utf-8');
  // Make changes
  fs.writeFileSync('path/to/file', content, 'utf-8');
  JSSCRIPT
  node /tmp/patch.js
  ```

**2. Windows Case-Sensitivity**
- **Issue**: `user.ts` vs `User.ts` both exist
- **Solution**: Use lowercase consistently: `import User from "@/models/user"`

**3. Module Resolution Errors**
- **Issue**: `Can't resolve 'fs'` in client components
- **Note**: Pre-existing issue in `searchInsights.ts`, not critical (doesn't break build)

### TypeScript Checking

```bash
npx tsc --noEmit
# Check for type errors without emitting files
```

---

## 🎯 Current Project Status (Nov 23, 2025)

### ✅ Completed Features

1. **Chat System** - Groq AI with function calling (Llama 4)
2. **Map System** - MapLibre GL with clustering
3. **CMA Engine** - Market analysis + PDF generation
4. **Preference Engine** - User preference learning
5. **Auth System** - NextAuth with Google/Facebook OAuth
6. **Tutorial System** - Interactive onboarding
7. **Swipe Review Mode** - Tinder-style property review ⭐ NEW

### ⏳ In Progress / Deferred

1. **Favorites Persistence** - Waiting for Payload CMS migration
2. **WebLLM Removal** - Deferred (~4-6 hrs work)
3. **TypeScript Errors** - 173 remaining (mostly CMA type usage)

### 🎯 Immediate Next Steps

1. QA test swipe mode end-to-end
2. Add keyboard shortcuts for swipe navigation
3. Implement favorites API endpoints
4. Add swipe analytics tracking
5. Fix remaining TypeScript errors

---

## 🧪 Testing Checklist

### Swipe Mode Testing

**Activation Tests**:
- [ ] Click "Swipe Through All" in chat carousel
- [ ] Click map marker with subdivision data
- [ ] Click individual listing card

**Navigation Tests**:
- [ ] Swipe left advances to next listing
- [ ] Swipe right advances to next listing
- [ ] Progress indicator updates correctly
- [ ] Last listing triggers completion modal

**UI Tests**:
- [ ] Light mode theme displays correctly
- [ ] Dark mode theme displays correctly
- [ ] Modal appears on completion
- [ ] Close button exits swipe mode
- [ ] Panel animations smooth

**Edge Cases**:
- [ ] Single listing batch works
- [ ] Empty listing batch handled gracefully
- [ ] Rapid swiping doesn't break state
- [ ] Browser back button doesn't break state

### Chat System Testing

**Basic Flow**:
- [ ] "show me homes in palm desert" works
- [ ] Location matching resolves subdivisions
- [ ] Results display in carousel
- [ ] Map shows markers correctly

**Function Calling**:
- [ ] `matchLocation()` called for location queries
- [ ] `getSubdivisionListings()` called for subdivision queries
- [ ] `searchListings()` called for general searches

---

## 📝 Code Patterns & Best Practices

### Component Structure

```typescript
"use client"; // Add if client-side hooks used

import React, { useState, useCallback } from "react";
import { useTheme } from "@/app/contexts/ThemeContext";

interface Props {
  // Props definition
}

export default function MyComponent({ prop1, prop2 }: Props) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  // State
  const [state, setState] = useState<Type>(initialValue);

  // Callbacks
  const handleAction = useCallback(() => {
    // Handler logic
  }, [dependencies]);

  // Render
  return (
    <div className={isLight ? "light-styles" : "dark-styles"}>
      {/* JSX */}
    </div>
  );
}
```

### API Route Structure

```typescript
// src/app/api/example/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // Logic
    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Error message" },
      { status: 500 }
    );
  }
}
```

### Type Safety

```typescript
// Always define interfaces for data structures
interface Listing {
  id: string;
  address: string;
  price: number;
  // ... other fields
}

// Use type assertions carefully
const listing = data as Listing;

// Prefer type narrowing
if ('price' in listing && typeof listing.price === 'number') {
  // TypeScript knows listing.price is a number here
}
```

---

## 🔗 Key Dependencies

### Core Framework
- **Next.js**: 16.0.3 (App Router + Turbopack)
- **React**: 19.0.0
- **TypeScript**: 5.7.2

### UI Libraries
- **Tailwind CSS**: 3.4.17
- **Framer Motion**: 11.15.0 (animations)
- **Lucide React**: 0.468.0 (icons)

### Mapping
- **@vis.gl/react-maplibre**: 1.4.5
- **maplibre-gl**: 4.7.1

### AI/LLM
- **groq-sdk**: 0.8.0 (Llama 4)

### Authentication
- **next-auth**: 4.24.11
- **bcryptjs**: 2.4.3

### Database
- **mongoose**: 8.9.3
- **mongodb**: 6.12.0

---

## 🆘 Emergency Debugging Commands

### Check Build Status
```bash
npm run build
```

### Clear Next.js Cache
```bash
rm -rf .next
npm run dev
```

### Check Running Processes
```bash
netstat -ano | findstr :3000  # Windows
lsof -ti:3000                 # Mac/Linux
```

### Git Debugging
```bash
git status --short
git diff --name-only
git log --oneline -10
```

---

## 📚 Additional Documentation Files

- `SYSTEM_ARCHITECTURE.md` - Complete system overview
- `SWIPE_REVIEW_MODE_IMPLEMENTATION_PLAN.md` - Swipe feature spec
- `theme-change-notes.md` - Theme system guide
- `AI_*.md` - Various AI feature documentation
- `CHAT_*.md` - Chat system documentation
- `MAP_*.md` - Map system documentation

---

**End of Memory Reload Guide**

Use this file to quickly get up to speed on the project in new Claude sessions.
