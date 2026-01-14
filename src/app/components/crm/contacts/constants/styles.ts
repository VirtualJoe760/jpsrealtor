// Shared style constants for contacts module

import { UserX, Phone, Star, Heart, UserCheck, Archive } from 'lucide-react';
import { ContactStatus } from '../types/enums';

/**
 * Card styling configuration for light and dark themes
 */
export const CARD_STYLES = {
  light: {
    base: 'bg-white border-2 border-gray-100',
    shadow: 'shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_10px_15px_-3px_rgba(0,0,0,0.1),0_20px_25px_-5px_rgba(0,0,0,0.1)]',
    hoverShadow: 'hover:shadow-[0_10px_20px_-5px_rgba(0,0,0,0.15),0_20px_30px_-10px_rgba(0,0,0,0.15)]',
    hoverTransform: 'hover:-translate-y-1',
  },
  dark: {
    base: 'bg-neutral-900/30',
    shadow: '',
    hoverShadow: '',
    hoverTransform: '',
  }
} as const;

/**
 * Generate complete card className string based on theme
 */
export const getCardClassName = (isLight: boolean): string => {
  const theme = isLight ? CARD_STYLES.light : CARD_STYLES.dark;
  return `p-6 rounded-xl transition-all text-left ${theme.base} ${theme.shadow} ${theme.hoverShadow} ${theme.hoverTransform}`.trim();
};

/**
 * Status-specific icon and color configuration
 */
export const STATUS_CONFIG = {
  [ContactStatus.UNCONTACTED]: {
    icon: UserX,
    lightColor: 'text-slate-600',
    darkColor: 'text-gray-400',
    label: 'Uncontacted',
    description: 'Not yet reached out'
  },
  [ContactStatus.CONTACTED]: {
    icon: Phone,
    lightColor: 'text-yellow-600',
    darkColor: 'text-yellow-400',
    label: 'Contacted',
    description: 'Initial contact made'
  },
  [ContactStatus.QUALIFIED]: {
    icon: Star,
    lightColor: 'text-blue-600',
    darkColor: 'text-blue-400',
    label: 'Qualified',
    description: 'Potential opportunities'
  },
  [ContactStatus.NURTURING]: {
    icon: Heart,
    lightColor: 'text-purple-600',
    darkColor: 'text-purple-400',
    label: 'Nurturing',
    description: 'Building relationships'
  },
  [ContactStatus.CLIENT]: {
    icon: UserCheck,
    lightColor: 'text-green-600',
    darkColor: 'text-green-400',
    label: 'Client',
    description: 'Active clients'
  },
  [ContactStatus.INACTIVE]: {
    icon: Archive,
    lightColor: 'text-red-600',
    darkColor: 'text-red-400',
    label: 'Inactive',
    description: 'No longer active'
  }
} as const;

/**
 * Get status configuration for a given status
 */
export const getStatusConfig = (status: ContactStatus) => {
  return STATUS_CONFIG[status];
};

/**
 * Get icon color based on theme
 */
export const getStatusColor = (status: ContactStatus, isLight: boolean): string => {
  const config = STATUS_CONFIG[status];
  return isLight ? config.lightColor : config.darkColor;
};
