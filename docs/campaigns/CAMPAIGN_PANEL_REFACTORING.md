# Campaign Detail Panel Refactoring Plan

## Problem Statement

**Current State:**
- `CampaignDetailPanel.tsx` is **1,324 lines** - way too bloated
- All "Quick Actions" are visible at once, making the panel grow vertically
- No clear workflow/pipeline visualization
- Poor UX - user doesn't know what step comes next

**Desired State:**
- **Pipeline/Wizard UI** - show only the current step
- **< 300 lines** per component (max 400 for complex ones)
- **Clear workflow**: Contacts → Scripts → Audio → Send/Schedule
- Progressive disclosure - only show actions that make sense for current state

## Current Bloat Analysis

**Breakdown of 1,324 lines:**
- Quick Actions section: ~200 lines (6 different actions)
- Script generation modal: ~300 lines
- Voice recorder inline UI: ~150 lines
- Profile completion modal: ~100 lines
- Tab content (Overview/Contacts/Strategies/Analytics): ~400 lines
- State management & handlers: ~174 lines

## Refactored Architecture

### Component Hierarchy

```
CampaignDetailPanel (150 lines)
├── CampaignHeader (~50 lines)
├── CampaignTabs (~30 lines)
└── Tab Content:
    ├── OverviewTab (~150 lines)
    │   └── Campaign Pipeline Wizard (new)
    ├── ContactsTab (existing - CampaignContactsManager)
    ├── StrategiesTab (~100 lines)
    └── AnalyticsTab (~100 lines)

Campaign Pipeline Wizard (new, ~250 lines)
├── PipelineStep (enum: contacts, scripts, audio, send)
├── StepIndicator (~30 lines)
└── Step Components:
    ├── ContactsStep (~50 lines) - CampaignContactsManager
    ├── ScriptsStep (~80 lines) - Generate + List
    ├── AudioStep (~80 lines) - AI or Record choice
    └── SendStep (~60 lines) - Delivery options
```

### Pipeline State Machine

```typescript
type PipelineStep =
  | 'contacts'    // Add contacts to campaign
  | 'scripts'     // Generate personalized scripts
  | 'audio'       // Choose: AI voiceover OR record own voice
  | 'send';       // Send or schedule delivery

interface PipelineState {
  currentStep: PipelineStep;
  completedSteps: PipelineStep[];
  canProceed: boolean;
  data: {
    contactCount: number;
    scriptCount: number;
    audioCount: number;
    scheduledAt?: Date;
  };
}
```

## New UI Flow

### Step 1: Contacts
```
┌─────────────────────────────────────┐
│ 📊 Campaign Pipeline                │
│                                     │
│ ● Contacts → ○ Scripts → ○ Audio → ○ Send
│                                     │
│ ┌─────────────────────────────────┐│
│ │  Add Contacts to Campaign       ││
│ │                                 ││
│ │  Total Contacts: 47             ││
│ │                                 ││
│ │  [Import from CSV]              ││
│ │  [Add from CRM]                 ││
│ │  [Manual Entry]                 ││
│ │                                 ││
│ │         [Continue →]            ││
│ └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

### Step 2: Scripts
```
┌─────────────────────────────────────┐
│ 📊 Campaign Pipeline                │
│                                     │
│ ✓ Contacts → ● Scripts → ○ Audio → ○ Send
│                                     │
│ ┌─────────────────────────────────┐│
│ │  Generate Personalized Scripts  ││
│ │                                 ││
│ │  47 contacts ready              ││
│ │  0 scripts generated            ││
│ │                                 ││
│ │  Template: [Expired Listings ▼] ││
│ │                                 ││
│ │  [Generate Scripts for All]     ││
│ │  [← Back]    [Continue →]       ││
│ └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

### Step 3: Audio (CHOICE)
```
┌─────────────────────────────────────┐
│ 📊 Campaign Pipeline                │
│                                     │
│ ✓ Contacts → ✓ Scripts → ● Audio → ○ Send
│                                     │
│ ┌─────────────────────────────────┐│
│ │  Add Voice to Your Scripts      ││
│ │                                 ││
│ │  47 scripts ready               ││
│ │  1 with audio, 46 pending       ││
│ │                                 ││
│ │  Choose one:                    ││
│ │  ┌────────────┐  ┌────────────┐││
│ │  │ 🤖 AI Voice│  │ 🎤 Record  │││
│ │  │ ElevenLabs │  │ Your Voice │││
│ │  │            │  │            │││
│ │  │  [Select]  │  │  [Select]  │││
│ │  └────────────┘  └────────────┘││
│ │                                 ││
│ │  [← Back]    [Continue →]       ││
│ └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

### Step 4: Send
```
┌─────────────────────────────────────┐
│ 📊 Campaign Pipeline                │
│                                     │
│ ✓ Contacts → ✓ Scripts → ✓ Audio → ● Send
│                                     │
│ ┌─────────────────────────────────┐│
│ │  Launch Your Campaign           ││
│ │                                 ││
│ │  ✓ 47 contacts                  ││
│ │  ✓ 47 scripts                   ││
│ │  ✓ 47 voicemails ready          ││
│ │                                 ││
│ │  ┌──────────────────────────┐  ││
│ │  │ Send Now                 │  ││
│ │  │ Send immediately to all  │  ││
│ │  │ contacts                 │  ││
│ │  │        [Send Now]        │  ││
│ │  └──────────────────────────┘  ││
│ │                                 ││
│ │  ┌──────────────────────────┐  ││
│ │  │ Schedule                 │  ││
│ │  │ Pick date & time         │  ││
│ │  │      [Schedule →]        │  ││
│ │  └──────────────────────────┘  ││
│ │                                 ││
│ │  [← Back]                       ││
│ └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

## Component Extraction Plan

### Phase 1: Create New Components
1. **`CampaignPipelineWizard.tsx`** (~250 lines)
   - Manages pipeline state
   - Renders step indicator
   - Swaps between step components
   - Handles next/back navigation

2. **`PipelineContactsStep.tsx`** (~50 lines)
   - Uses existing `CampaignContactsManager`
   - Shows contact count
   - Continue button

3. **`PipelineScriptsStep.tsx`** (~80 lines)
   - Template selection
   - Generate button
   - Preview scripts list
   - Progress tracking

4. **`PipelineAudioStep.tsx`** (~80 lines)
   - Choice: AI vs Record
   - Shows current audio status
   - Renders either AI generation UI or VoiceRecorder

5. **`PipelineSendStep.tsx`** (~60 lines)
   - Summary card
   - Send now or schedule choice
   - Launch confirmation

6. **`PipelineStepIndicator.tsx`** (~30 lines)
   - Visual progress dots
   - Step labels
   - Completed checkmarks

### Phase 2: Refactor Main Panel
1. Extract header → **`CampaignHeader.tsx`** (~50 lines)
2. Simplify tabs → Use pipeline wizard in Overview tab
3. Remove inline modals → Use separate components
4. Reduce to < 200 lines

### Phase 3: Clean Up
1. Move handlers to custom hooks
2. Extract constants
3. Type definitions in separate file
4. Remove unused code

## File Structure After Refactoring

```
src/app/components/campaigns/
├── CampaignDetailPanel.tsx          (150 lines)  ✅ Main panel shell
├── CampaignHeader.tsx               (50 lines)   ✅ Header component
├── CampaignTabs.tsx                 (30 lines)   ✅ Tab navigation
│
├── pipeline/
│   ├── CampaignPipelineWizard.tsx   (250 lines)  ✅ Pipeline orchestrator
│   ├── PipelineStepIndicator.tsx    (30 lines)   ✅ Progress indicator
│   ├── PipelineContactsStep.tsx     (50 lines)   ✅ Contacts step
│   ├── PipelineScriptsStep.tsx      (80 lines)   ✅ Scripts step
│   ├── PipelineAudioStep.tsx        (80 lines)   ✅ Audio step
│   └── PipelineSendStep.tsx         (60 lines)   ✅ Send step
│
├── tabs/
│   ├── OverviewTab.tsx              (100 lines)  ✅ Overview with pipeline
│   ├── StrategiesTab.tsx            (100 lines)  ✅ Strategies config
│   └── AnalyticsTab.tsx             (100 lines)  ✅ Analytics dashboard
│
└── existing files...
    ├── CampaignContactsManager.tsx  (existing)
    ├── CampaignScriptsList.tsx      (existing)
    ├── VoiceRecorder.tsx            (existing)
    └── ...
```

## Benefits

### Code Quality
- **Modularity**: Each component has single responsibility
- **Reusability**: Pipeline components can be used elsewhere
- **Testability**: Smaller components easier to test
- **Maintainability**: Easier to find and fix bugs

### User Experience
- **Clarity**: Clear step-by-step process
- **Guidance**: Users know exactly what to do next
- **Progressive Disclosure**: Only show relevant actions
- **Less Overwhelming**: No huge grid of buttons

### Performance
- **Lazy Loading**: Load step components on demand
- **Reduced Re-renders**: Isolated state changes
- **Smaller Bundles**: Code splitting per step

## Migration Strategy

1. **Create new components** (don't break existing)
2. **Feature flag** - toggle between old and new UI
3. **Test thoroughly** with real campaigns
4. **Gradual rollout** - enable for subset of users
5. **Deprecate old code** once stable

## Acceptance Criteria

- [ ] Main panel < 200 lines
- [ ] No component > 300 lines
- [ ] Pipeline wizard functional
- [ ] All existing features work
- [ ] No performance regression
- [ ] Responsive design maintained
- [ ] Accessibility (keyboard nav, ARIA)
- [ ] Unit tests for new components

## Timeline Estimate

- **Phase 1** (Create components): 4-6 hours
- **Phase 2** (Refactor main panel): 2-3 hours
- **Phase 3** (Clean up): 1-2 hours
- **Testing & Polish**: 2-3 hours

**Total**: ~10-14 hours

## Notes

- Keep existing components (`CampaignContactsManager`, `VoiceRecorder`, etc.)
- Don't break existing campaigns
- Add TypeScript strict mode
- Document each new component
- Add Storybook stories for visual testing
