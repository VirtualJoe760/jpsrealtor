/**
 * Tutorial System - Public API
 * Clean exports for the refactored avatar-agnostic tutorial system
 */

// Types
export type {
  AvatarConfig,
  TutorialStep,
  TutorialState,
  TutorialControls,
  UseTutorial,
  AvatarPosition,
  AvatarRegistryEntry,
  TutorialSteps,
} from './types';

// Components
export { AvatarMascot } from './components/AvatarMascot';
export { SpeechBubble } from './components/SpeechBubble';
export { TutorialOverlay } from './components/TutorialOverlay';
export { TutorialManager } from './components/TutorialManager';
export { AvatarSelector } from './components/AvatarSelector';

// Hooks
export { useChatTutorial } from './hooks/useChatTutorial';

// Avatar Registry
export {
  avatarRegistry,
  getAvatarConfig,
  getAvailableAvatars,
  isAvatarAvailableToUser,
} from './avatars/registry';

// Avatar Configurations
export { toastyAvatar } from './avatars/toasty';
export { defaultAvatar } from './avatars/default';

// Constants
export {
  desktopAvatarPositions,
  mobileAvatarPositions,
  getAvatarPosition,
  getAvatarSize,
  shouldMirrorAvatar,
} from './constants/positioning';

export {
  desktopTutorialSteps,
  mobileTutorialSteps,
  getTutorialSteps,
} from './constants/steps';
