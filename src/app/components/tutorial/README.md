# Tutorial System Architecture

**Scalable, Avatar-Agnostic Tutorial System**

## Directory Structure

```
/tutorial/
  /types/
    - index.ts               # TypeScript interfaces and types

  /avatars/
    - registry.ts            # AvatarRegistry with all available avatars
    - toasty.ts              # Toasty avatar configuration
    - default.ts             # Default/fallback avatar

  /steps/
    - Step00_Welcome.tsx     # Step 0: Welcome message
    - Step01_SearchInput.tsx # Step 1: Interactive search
    - Step02_ScrollToRead.tsx # Step 2: Scroll detection
    ... (Steps 3-14)

  /components/
    - AvatarMascot.tsx       # Avatar display component (avatar-agnostic)
    - SpeechBubble.tsx       # Speech bubble component
    - TutorialOverlay.tsx    # Dark backdrop + spotlight
    - TutorialManager.tsx    # Orchestrates all steps

  /hooks/
    - useChatTutorial.tsx    # Tutorial state management hook

  /constants/
    - positioning.ts         # Avatar positioning logic by step

  - index.ts                 # Clean exports
  - README.md                # This file
```

## Design Philosophy

### 1. **Avatar-Agnostic Design**
- Any agent can configure their own tutorial avatar
- Avatars are stored in the registry and referenced by ID
- User model stores `tutorialAvatarId` preference

### 2. **Component-Based Steps**
- Each tutorial step is its own component
- Easier to debug, test, and maintain
- Clear separation of concerns

### 3. **Centralized Configuration**
- Avatar configs in `/avatars/`
- Positioning logic in `/constants/`
- Types in `/types/`

### 4. **Scalability**
- Add new avatars by creating new config files
- Add new steps by creating new step components
- Modify positioning without touching component logic

## How It Works

### 1. **User Starts Tutorial**
- User types "get started" in chat
- `useChatTutorial` hook initializes
- Loads user's `tutorialAvatarId` from session/DB
- Fetches avatar config from registry

### 2. **Tutorial Manager Orchestrates**
- `TutorialManager` renders current step component
- Passes avatar config to `AvatarMascot`
- Manages state (stepIndex, waiting flags, etc.)

### 3. **Avatar Display**
- `AvatarMascot` receives avatar config + current step
- Looks up image for current step from avatar config
- Positions itself using positioning constants
- Handles mirroring/flipping logic

### 4. **Step Rendering**
- Each step component knows its own content
- Interactive steps (1, 4) block Next button
- Auto-advance step (2) progresses on scroll

## Adding a New Avatar

1. Create avatar config file in `/avatars/`:
```typescript
// avatars/luna.ts
import { AvatarConfig } from '../types';

export const lunaAvatar: AvatarConfig = {
  id: 'luna',
  name: 'Luna',
  description: 'A friendly cat guide',
  personalityTone: 'playful',
  images: {
    0: '/images/avatars/luna/welcome.png',
    1: '/images/avatars/luna/excited.png',
    // ... map all 15 steps
  },
  defaultPosition: 'right',
  mirrorOnFlip: true,
};
```

2. Register in `registry.ts`:
```typescript
import { lunaAvatar } from './luna';

export const avatarRegistry: Record<string, AvatarRegistryEntry> = {
  toasty: { config: toastyAvatar, isAvailable: true },
  luna: { config: lunaAvatar, isAvailable: true },
};
```

3. Users can now select Luna in their settings!

## Adding a New Step

1. Create step component:
```typescript
// steps/Step15_MapTutorial.tsx
import { TutorialStep } from '../types';

export const step15Config: TutorialStep = {
  id: 15,
  target: '[data-tour="map-controls"]',
  fromAvatar: false,
  placement: 'right',
  content: {
    title: "Master the map! 🗺️",
    message: "Here's how to use advanced map controls",
  },
};
```

2. Add to tutorial steps array in constants

3. Add image mapping to avatar configs

## Key Principles

- **Don't hardcode avatar names** - use avatar config
- **Don't mix positioning with rendering** - use constants
- **Don't repeat step logic** - use shared components
- **Do test with multiple avatars** - ensures system works
