# Chat Tutorial System with Toasty 🐕
**Interactive First-Time User Onboarding with Mascot Guide**
**Last Updated:** December 28, 2025

---

## 📋 OVERVIEW

An engaging, interactive tutorial system featuring **Toasty** (Joe's dog) as a friendly mascot guide. Toasty appears in the bottom-left corner and uses speech bubbles to teach users how to search for homes using AI.

### Design Philosophy
- **Warm & Personal**: Toasty makes technology approachable
- **Memorable**: Users will remember "Toasty taught me!"
- **Interactive**: Users actually perform searches during the tutorial
- **Visual**: Large character with expressive poses for each step

---

## 🎨 TOASTY DESIGN CONCEPT

### Visual Layout (Hybrid Approach)
```
┌─────────────────────────────────────────────┐
│                         ┌─────────────────┐ │
│                         │ Toasty says:    │ │ (Joyride tooltip
│                         │ Click this map  │ │  styled as speech
│                         │ button!         │ │  bubble)
│                         └────────┬────────┘ │
│                                ↓           │ │ (Arrow pointing)
│                           [Map Button]     │ │ (Highlighted)
│                              (spotlight)    │ │
│                                             │
│                                             │
│   [Toasty Image]                           │ │ (192px in corner,
│   (Changes per step)                       │ │  changes expression)
└─────────────────────────────────────────────┘
```

### Hybrid Tutorial System
**Combines Two Elements:**

1. **Toasty Mascot** (Bottom-Left Corner)
   - Fixed position character
   - Changes expression/pose per step
   - Provides personality and warmth
   - Always visible during tutorial

2. **Joyride Tooltips** (Near UI Elements)
   - Points to specific elements (arrows)
   - Highlights target with spotlight
   - Styled as speech bubbles from Toasty
   - Contains Toasty's instructions

### Toasty Poses (by Step)
Located in: `F:\web-clients\joseph-sardella\jpsrealtor\public\images\toast\edited\`

1. **hi.png** - Waving welcome (Step 0: Introduction)
2. **whats-up.png** - Excited/ready (Step 1: Search instruction)
3. **good-girl.png** - Proud/happy (Step 2: Results received)
4. **huh.png** - Curious (Step 3: Map view explanation)
5. **what.png** - Pointing (Step 4: Additional map button)
6. **love-you.png** - Heart/love (Step 5: Completion)

### Speech Bubble Style
- **Shape**: Rounded rectangles (20px border radius)
- **Shadow**: Soft depth (`0 10px 40px rgba(0,0,0,0.2)`)
- **Color**: White (light mode) / Gray-800 (dark mode)
- **Button**: Emerald green "Next Step" button
- **Max Width**: 420px desktop, 320px mobile
- **Placement**: Positioned near Toasty (bottom-left to right)

---

## ✅ IMPLEMENTATION STATUS

**Status:** 🚧 **In Progress - Redesigning**

### Completed:
- ✅ React Joyride installed and configured
- ✅ Toasty images prepared and stored
- ✅ Tutorial trigger ("get started to meet Toasty! 🐕")
- ✅ LocalStorage persistence
- ✅ Mobile/desktop detection
- ✅ Interactive flow logic (waits for AI response)
- ✅ Tour targets marked with `data-tour` attributes

### To Rebuild:
- ⏳ Toasty mascot component in bottom-left corner
- ⏳ Speech bubble tooltips pointing from Toasty
- ⏳ Image transitions between steps
- ⏳ Proper placement for each tutorial step
- ⏳ Complete step content with Toasty's voice

---

## 🎯 USER FLOW

### First-Time User Experience

1. **User visits homepage** → Sees placeholder: *"Type 'get started' to meet Toasty! 🐕"*
2. **User types "get started"** → Toasty appears in bottom-left corner
3. **Tutorial steps:**
   - **Step 0:** Toasty waves (hi.png) - "Hi! I'm Toasty! I'm Joe's dog..."
   - **Step 1:** Toasty excited (whats-up.png) - "Let's try a search together!"
   - *User types/auto-fills query and sends*
   - *AI responds with results*
   - **Step 2:** Toasty proud (good-girl.png) - "Good job! You found homes!"
   - **Step 3:** Toasty curious (huh.png) - "Want to see them on a map?"
   - **Step 4:** Toasty pointing (what.png) - "Psst! There's another map button!"
   - **Step 5:** Toasty love (love-you.png) - "You did it! I'm so proud!"
4. **After tutorial** → Marked complete, Toasty disappears
5. **Future visits** → Normal placeholder

---

## 📁 FILE STRUCTURE

```
src/app/components/chat/
├── useChatTutorial.tsx       # Tutorial hook, Joyride config, Toasty component
├── ChatWidget.tsx             # Main chat component
└── ChatResultsContainer.tsx   # Results view toggle

public/images/toast/edited/
├── hi.png                     # Welcome pose
├── whats-up.png              # Excited pose
├── good-girl.png             # Proud pose
├── huh.png                   # Curious pose
├── what.png                  # Pointing pose
└── love-you.png              # Love pose

docs/features/
├── CHAT_TUTORIAL_SYSTEM.md   # This file
└── TOASTY_TUTORIAL_TODO.md   # Implementation checklist
```

---

## 🔧 TECHNICAL REQUIREMENTS

### Components Needed

**1. ToastyMascot Component**
```tsx
// Fixed position in bottom-left corner
// Shows appropriate image based on stepIndex
// Animates between poses (optional fade transition)
// Size: 192px desktop, 128px mobile
// Z-index: 9999 (below tooltips at 10000)
```

**2. Speech Bubble Target**
```tsx
// Invisible div positioned near Toasty
// Serves as anchor point for Joyride tooltips
// Located just to the right of Toasty
// data-tour="toasty-speech"
```

**3. Tutorial Steps Configuration**
```tsx
// All steps target elements near their relevant UI
// Step 0 targets "toasty-speech" (placement: 'right')
// Step 1 targets chat input
// Step 2 targets results toggle (auto-advances after AI)
// Steps 3-4 target map buttons
// Step 5 targets "toasty-speech" again for farewell
```

---

## 🎨 DESIGN SPECIFICATIONS

### Toasty Mascot
- **Position**: `fixed bottom-8 left-8` (desktop), `bottom-20 left-4` (mobile)
- **Size**: 192x192px (desktop), 128x128px (mobile)
- **Effect**: `drop-shadow-2xl` for depth
- **Animation**: Optional fade/scale between image changes
- **Pointer Events**: None (non-interactive)

### Speech Bubbles (Joyride Tooltips)
- **Background**: White (#ffffff) light, Gray-800 (#1f2937) dark
- **Border Radius**: 20px
- **Padding**: 24px
- **Shadow**: `0 10px 40px rgba(0,0,0,0.2), 0 4px 12px rgba(0,0,0,0.15)`
- **Max Width**: 420px desktop, 320px mobile
- **Font**: Sans-serif, responsive sizing
- **Button Color**: Emerald (#10b981)
- **Button Style**: Rounded (12px), padded (12px 24px), shadowed

### Tutorial Content Voice
All text should sound like Toasty is talking:
- Friendly, encouraging, warm
- First person ("I'm Toasty", "Let's try")
- Enthusiastic but not overwhelming
- Short sentences, clear instructions
- Positive reinforcement ("Good job!", "You did it!")

---

## 📊 TUTORIAL STEPS (Desktop) - 15 Steps Total

### Step 0: Welcome
**fromToasty**: `true`
**Toasty Pose**: hi.png
**Content**: Hi! I'm Toasty! I'm Joe's dog, and I'm here to help you learn how to find your dream home!

### Step 1: Search Input (INTERACTIVE)
**Target**: `[data-tour="chat-input"]`
**Placement**: `top`
**Toasty Pose**: whats-up.png
**Content**: Let's try a search together! Type: "show me homes in Indian Wells Country Club" or click "Auto-fill"
**Action**: ⚠️ **BLOCKS NEXT** - User must type and send query

### Step 2: Scroll to Read (AUTO-ADVANCE)
**fromToasty**: `true`
**Toasty Pose**: good-girl.png
**Content**: Great! The AI is responding! Scroll down to read the full response
**Action**: Auto-advances after user scrolls to bottom

### Step 3: Results View Toggle
**Target**: `[data-tour="results-view-toggle"]`
**Placement**: `left`
**Toasty Pose**: huh.png
**Content**: Good job! You can control how you view results (List vs Panels)

### Step 4: List View Button (INTERACTIVE)
**Target**: `[data-tour="list-view-button"]`
**Placement**: `left`
**Toasty Pose**: huh.png
**Content**: Switch to List View! Click the 'List' button to see properties in a vertical list
**Action**: ⚠️ **BLOCKS NEXT** - User must click "List" button to continue

### Step 5: Sort Dropdown
**Target**: `[data-tour="sort-dropdown"]`
**Placement**: `left`
**Toasty Pose**: what.png
**Content**: Sort your results! You can organize listings by price, size, or other features

### Step 6: View Listing
**Target**: `[data-tour="view-listing-button"]`
**Placement**: `top`
**Toasty Pose**: what.png
**Content**: Let's explore a listing! Click 'View Details' on any property

### Step 7: Swipe Right
**Target**: `[data-tour="swipe-right-button"]`
**Placement**: `top`
**Toasty Pose**: good-girl.png
**Content**: Love it? Save it! ❤️ Swipe right or click this heart to add to favorites

### Step 8: Swipe Left
**Target**: `[data-tour="swipe-left-button"]`
**Placement**: `top`
**Toasty Pose**: what.png
**Content**: Not interested? Skip it! Swipe left or click X to remove from queue

### Step 9: Map Mode
**Target**: `[data-tour="map-mode-button"]`
**Placement**: `right`
**Toasty Pose**: whats-up.png
**Content**: See everything on a map! Click here to view all listings on an interactive map

### Step 10: Map Search
**Target**: `[data-tour="map-search-button"]`
**Placement**: `bottom`
**Toasty Pose**: huh.png
**Content**: Search on the map! Use this to find specific addresses or areas

### Step 11: Map Filters
**Target**: `[data-tour="map-filters-button"]`
**Placement**: `bottom`
**Toasty Pose**: what.png
**Content**: Filter your results! Click here to refine by price, beds, baths, and more

### Step 12: Back to Chat
**Target**: `[data-tour="map-mode-button"]`
**Placement**: `right`
**Toasty Pose**: whats-up.png
**Content**: Back to chat view! Click the chat button to return to your conversation

### Step 13: New Chat
**Target**: `[data-tour="new-chat-button"]`
**Placement**: `left`
**Toasty Pose**: huh.png
**Content**: Start fresh anytime! Click 'New Chat' to begin a new conversation and search

### Step 14: Completion
**fromToasty**: `true`
**Toasty Pose**: love-you.png
**Content**: You're a pro now! I'm so proud! 💜 You now know how to search, sort, save, and explore homes!

---

## 📱 MOBILE TUTORIAL DIFFERENCES

### Positioning
- Toasty: `bottom-20 left-4` (above mobile nav)
- Smaller size: 128x128px
- Slightly smaller text (text-sm instead of base)

### Map Button Targets
- Step 3: `[data-tour="mobile-map-button"]` (bottom nav)
- Step 4: `[data-tour="mobile-menu-map"]` (sidebar menu)

### Content
Same friendly Toasty voice, just slightly more concise for smaller screens.

---

## 🧪 TESTING CHECKLIST

### Visual Tests
- [ ] Toasty appears in correct corner
- [ ] Toasty changes images with each step
- [ ] Speech bubbles point appropriately
- [ ] Speech bubbles readable on light/dark modes
- [ ] Mobile layout works correctly
- [ ] No overlapping elements
- [ ] Smooth transitions between steps

### Functional Tests
- [ ] Trigger works: "get started to meet Toasty!"
- [ ] Tutorial blocks Next on Step 1 until search sent
- [ ] Auto-fill button works and populates text
- [ ] Tutorial auto-advances after AI response
- [ ] All map buttons are found and highlighted
- [ ] localStorage prevents repeat shows
- [ ] Skip button works
- [ ] Back button works
- [ ] Tutorial completes successfully

### Cross-Browser
- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari (if applicable)
- [ ] Mobile Chrome
- [ ] Mobile Safari

---

## 💡 IMPLEMENTATION NOTES

### Key Technologies
- **React Joyride**: v2.9.3 (installed with --legacy-peer-deps)
- **Next.js Image**: For optimized Toasty images
- **Framer Motion**: Optional for Toasty transitions
- **localStorage**: For persistence

### Performance
- Use `priority` prop on Toasty images for faster load
- Preload all 6 Toasty images on tutorial start
- Keep tooltip content minimal for fast render

### Accessibility
- Ensure speech bubbles have sufficient contrast
- Use semantic HTML in tooltip content
- Support keyboard navigation (built into Joyride)
- Provide skip option for users who don't want tutorial

---

## 🚀 FUTURE ENHANCEMENTS

- [ ] Animated Toasty transitions (fade between poses)
- [ ] Sound effects (optional dog bark on completion)
- [ ] More Toasty poses for additional tutorials
- [ ] Agent dashboard tutorial with Toasty
- [ ] "Ask Toasty" help button (tutorial replay)
- [ ] Toasty mascot in other areas of site
- [ ] Animated tail wag or ear wiggle
- [ ] Multiple language support

---

## 📚 RELATED DOCUMENTATION

- [TOASTY_TUTORIAL_TODO.md](./TOASTY_TUTORIAL_TODO.md) - Implementation checklist
- [React Joyride Docs](https://docs.react-joyride.com/)
- [Next.js Image Optimization](https://nextjs.org/docs/app/api-reference/components/image)

---

**Status:** ✅ **Functional - Testing in Progress**
**Last Updated:** December 27, 2025
**Maintained By:** Development Team

**Tutorial Steps:** 15 total (0-14)
**Interactive Steps:** 2 (Step 1: Search, Step 4: List View)
**Auto-Advance Steps:** 1 (Step 2: Scroll)
