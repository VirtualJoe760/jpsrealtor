// constants/index.ts - Campaign Card Constants

import {
  PhoneIcon,
  EnvelopeIcon,
  ChatBubbleLeftIcon,
  PlayIcon,
  PauseIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentTextIcon,
  MicrophoneIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import { CampaignType, type StatusConfigsMap } from '../types/index';

/**
 * Campaign Type Labels
 */
export const CAMPAIGN_TYPE_LABELS: Record<string, string> = {
  [CampaignType.SPHERE_OF_INFLUENCE]: 'Sphere of Influence',
  [CampaignType.PAST_CLIENTS]: 'Past Clients',
  [CampaignType.NEIGHBORHOOD_EXPIREDS]: 'Expired Listings',
  [CampaignType.HIGH_EQUITY]: 'High Equity',
  [CampaignType.CUSTOM]: 'Custom',
};

/**
 * Get Status Configurations for Light Theme
 */
export const getStatusConfigsLight = (): StatusConfigsMap => ({
  draft: {
    label: 'Draft',
    color: 'bg-gray-100 text-gray-700',
    icon: ClockIcon,
  },
  generating_scripts: {
    label: 'Generating Scripts',
    color: 'bg-purple-100 text-purple-700',
    icon: DocumentTextIcon,
  },
  generating_audio: {
    label: 'Generating Audio',
    color: 'bg-indigo-100 text-indigo-700',
    icon: MicrophoneIcon,
  },
  review: {
    label: 'Review',
    color: 'bg-orange-100 text-orange-700',
    icon: EyeIcon,
  },
  active: {
    label: 'Active',
    color: 'bg-green-100 text-green-700',
    icon: PlayIcon,
  },
  paused: {
    label: 'Paused',
    color: 'bg-yellow-100 text-yellow-700',
    icon: PauseIcon,
  },
  completed: {
    label: 'Completed',
    color: 'bg-blue-100 text-blue-700',
    icon: CheckCircleIcon,
  },
});

/**
 * Get Status Configurations for Dark Theme
 */
export const getStatusConfigsDark = (): StatusConfigsMap => ({
  draft: {
    label: 'Draft',
    color: 'bg-gray-800 text-gray-300',
    icon: ClockIcon,
  },
  generating_scripts: {
    label: 'Generating Scripts',
    color: 'bg-purple-900/30 text-purple-400',
    icon: DocumentTextIcon,
  },
  generating_audio: {
    label: 'Generating Audio',
    color: 'bg-indigo-900/30 text-indigo-400',
    icon: MicrophoneIcon,
  },
  review: {
    label: 'Review',
    color: 'bg-orange-900/30 text-orange-400',
    icon: EyeIcon,
  },
  active: {
    label: 'Active',
    color: 'bg-green-900/30 text-green-400',
    icon: PlayIcon,
  },
  paused: {
    label: 'Paused',
    color: 'bg-yellow-900/30 text-yellow-400',
    icon: PauseIcon,
  },
  completed: {
    label: 'Completed',
    color: 'bg-blue-900/30 text-blue-400',
    icon: CheckCircleIcon,
  },
});

/**
 * Strategy Icons Map
 */
export const STRATEGY_ICONS = {
  voicemail: PhoneIcon,
  email: EnvelopeIcon,
  text: ChatBubbleLeftIcon,
} as const;

/**
 * Strategy Colors (Light Theme)
 */
export const STRATEGY_COLORS_LIGHT = {
  voicemail: {
    bg: 'bg-purple-100',
    text: 'text-purple-600',
  },
  email: {
    bg: 'bg-blue-100',
    text: 'text-blue-600',
  },
  text: {
    bg: 'bg-green-100',
    text: 'text-green-600',
  },
} as const;

/**
 * Strategy Colors (Dark Theme)
 */
export const STRATEGY_COLORS_DARK = {
  voicemail: {
    bg: 'bg-purple-900/30',
    text: 'text-purple-400',
  },
  email: {
    bg: 'bg-blue-900/30',
    text: 'text-blue-400',
  },
  text: {
    bg: 'bg-green-900/30',
    text: 'text-green-400',
  },
} as const;

/**
 * Engagement Bar Gradients
 */
export const ENGAGEMENT_GRADIENTS = {
  voicemail: 'from-purple-500 to-pink-500',
  email: 'from-blue-500 to-cyan-500',
  text: 'from-green-500 to-emerald-500',
} as const;
