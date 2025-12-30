/**
 * Tutorial System Types
 * Scalable, avatar-agnostic tutorial system for onboarding
 */

/**
 * Avatar Configuration
 * Defines a tutorial guide character (e.g., Toasty, other mascots)
 */
export interface AvatarConfig {
  /** Unique identifier for the avatar */
  id: string;

  /** Display name (e.g., "Toasty", "Max", "Luna") */
  name: string;

  /** Brief description for avatar selection UI */
  description: string;

  /** Personality tone for speech bubble text */
  personalityTone: 'friendly' | 'professional' | 'playful' | 'enthusiastic';

  /** Image paths keyed by step index */
  images: Record<number, string>;

  /** Default positioning preference */
  defaultPosition: 'left' | 'right';

  /** Mirror (flip) image when on opposite side? */
  mirrorOnFlip: boolean;

  /** Avatar creator/owner info (for multi-agent system) */
  owner?: {
    userId: string;
    agentName: string;
  };
}

/**
 * Tutorial Step Configuration
 * Each step defines what the user learns and how
 */
export interface TutorialStep {
  /** Step index (0-based) */
  id: number;

  /** CSS selector for element to highlight (optional) */
  target?: string;

  /** Is this speech bubble from the avatar? */
  fromAvatar: boolean;

  /** Speech bubble content */
  content: {
    title: string;
    message: string;
    bullets?: string[];
  };

  /** Show auto-fill button for search input */
  showAutoFill?: boolean;

  /** Block Next button until action completed */
  blockNext?: boolean;

  /** Wait for user to scroll to bottom */
  waitForScroll?: boolean;

  /** Don't show dark backdrop overlay */
  hideOverlay?: boolean;

  /** Where to position speech bubble relative to target */
  placement?: 'top' | 'bottom' | 'left' | 'right';

  /** Custom positioning logic for avatar on this step */
  avatarPosition?: AvatarPosition;
}

/**
 * Avatar Position
 * Defines where avatar appears on screen for a specific step
 */
export interface AvatarPosition {
  /** Vertical position */
  vertical: 'top' | 'bottom' | 'middle';

  /** Horizontal position */
  horizontal: 'left' | 'right' | 'center';

  /** Tailwind classes for precise positioning */
  classes: string;

  /** Whether to mirror the image on this position */
  mirror?: boolean;
}

/**
 * Tutorial State
 * Runtime state of the tutorial system
 */
export interface TutorialState {
  /** Is tutorial currently running? */
  run: boolean;

  /** Current step index (0-based) */
  stepIndex: number;

  /** Has user completed tutorial? */
  hasSeenTutorial: boolean;

  /** Is device mobile? */
  isMobile: boolean;

  /** Waiting for user to send query (step 1) */
  waitingForQuery: boolean;

  /** Waiting for AI to finish responding */
  waitingForResults: boolean;

  /** Waiting for list view selection (step 4) */
  waitingForListView: boolean;

  /** Waiting for view listing click (step 6) */
  waitingForViewListing: boolean;

  /** Waiting for panel close (step 7) */
  waitingForPanelClose: boolean;

  /** Waiting for map toggle click (step 10) */
  waitingForMapToggle: boolean;

  /** Has user scrolled to bottom? */
  hasScrolledToBottom: boolean;

  /** Is user currently scrolling? */
  isScrolling: boolean;

  /** Current avatar configuration */
  avatar: AvatarConfig;
}

/**
 * Tutorial Controls
 * Functions to control tutorial flow
 */
export interface TutorialControls {
  /** Start the tutorial */
  startTutorial: () => void;

  /** Stop/cancel the tutorial */
  stopTutorial: () => void;

  /** Complete and mark as seen */
  completeTutorial: () => void;

  /** Reset tutorial (for testing) */
  resetTutorial: () => void;

  /** Advance to next step */
  nextStep: () => void;

  /** Go back to previous step */
  prevStep: () => void;

  /** Callback when query sent (step 1) */
  onQuerySent: () => void;

  /** Callback when AI results received */
  onResultsReceived: () => void;

  /** Callback when list view selected (step 4) */
  onListViewSelected: () => void;

  /** Callback when view listing clicked (step 6) */
  onViewListingClicked: () => void;

  /** Callback when listing panel closed (step 9) */
  onPanelClosed: () => void;

  /** Callback when map toggle clicked (step 10) */
  onMapToggleClicked: () => void;

  /** Callback when swipe right clicked (step 7) */
  onSwipeRightClicked: () => void;

  /** Callback when swipe left clicked (step 8) */
  onSwipeLeftClicked: () => void;

  /** Callback when map filters clicked (step 11) */
  onFiltersClicked: () => void;

  /** Callback when map search clicked (step 12) */
  onMapSearchClicked: () => void;
}

/**
 * Complete Tutorial Hook Return Value
 */
export type UseTutorial = TutorialState & TutorialControls;

/**
 * Tutorial Steps Collection
 * Organized by device type
 */
export interface TutorialSteps {
  desktop: TutorialStep[];
  mobile: TutorialStep[];
}

/**
 * Avatar Registry Entry
 * Used for avatar selection UI
 */
export interface AvatarRegistryEntry {
  config: AvatarConfig;
  isAvailable: boolean;
  requiredRole?: 'admin' | 'agent' | 'teamLeader';
}
