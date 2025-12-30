/**
 * Default Avatar Configuration
 * Fallback avatar when user hasn't selected one or avatar not found
 */

import { AvatarConfig } from '../types';

export const defaultAvatar: AvatarConfig = {
  id: 'default',
  name: 'Guide',
  description: 'A friendly assistant to help you get started',
  personalityTone: 'professional',

  // For now, use Toasty's images as fallback
  // In production, you'd want generic assistant icons
  images: {
    0: '/images/toast/edited/hi.png',
    1: '/images/toast/edited/whats-up.png',
    2: '/images/toast/edited/good-girl.png',
    3: '/images/toast/edited/huh.png',
    4: '/images/toast/edited/huh.png',
    5: '/images/toast/edited/what.png',
    6: '/images/toast/edited/good-girl.png',
    7: '/images/toast/edited/good-girl.png',
    8: '/images/toast/edited/what.png',
    9: '/images/toast/edited/whats-up.png',
    10: '/images/toast/edited/huh.png',
    11: '/images/toast/edited/what.png',
    12: '/images/toast/edited/whats-up.png',
    13: '/images/toast/edited/huh.png',
    14: '/images/toast/edited/love-you.png',
  },

  defaultPosition: 'right',
  mirrorOnFlip: false,
};
