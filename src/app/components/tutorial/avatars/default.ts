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
    0: 'https://res.cloudinary.com/duqgao9h8/image/upload/f_auto,q_auto/jpsrealtor/images/toast/edited/hi',
    1: 'https://res.cloudinary.com/duqgao9h8/image/upload/f_auto,q_auto/jpsrealtor/images/toast/edited/whats-up',
    2: 'https://res.cloudinary.com/duqgao9h8/image/upload/f_auto,q_auto/jpsrealtor/images/toast/edited/good-girl',
    3: 'https://res.cloudinary.com/duqgao9h8/image/upload/f_auto,q_auto/jpsrealtor/images/toast/edited/huh',
    4: 'https://res.cloudinary.com/duqgao9h8/image/upload/f_auto,q_auto/jpsrealtor/images/toast/edited/huh',
    5: 'https://res.cloudinary.com/duqgao9h8/image/upload/f_auto,q_auto/jpsrealtor/images/toast/edited/what',
    6: 'https://res.cloudinary.com/duqgao9h8/image/upload/f_auto,q_auto/jpsrealtor/images/toast/edited/good-girl',
    7: 'https://res.cloudinary.com/duqgao9h8/image/upload/f_auto,q_auto/jpsrealtor/images/toast/edited/good-girl',
    8: 'https://res.cloudinary.com/duqgao9h8/image/upload/f_auto,q_auto/jpsrealtor/images/toast/edited/what',
    9: 'https://res.cloudinary.com/duqgao9h8/image/upload/f_auto,q_auto/jpsrealtor/images/toast/edited/whats-up',
    10: 'https://res.cloudinary.com/duqgao9h8/image/upload/f_auto,q_auto/jpsrealtor/images/toast/edited/huh',
    11: 'https://res.cloudinary.com/duqgao9h8/image/upload/f_auto,q_auto/jpsrealtor/images/toast/edited/what',
    12: 'https://res.cloudinary.com/duqgao9h8/image/upload/f_auto,q_auto/jpsrealtor/images/toast/edited/whats-up',
    13: 'https://res.cloudinary.com/duqgao9h8/image/upload/f_auto,q_auto/jpsrealtor/images/toast/edited/huh',
    14: 'https://res.cloudinary.com/duqgao9h8/image/upload/f_auto,q_auto/jpsrealtor/images/toast/edited/love-you',
  },

  defaultPosition: 'right',
  mirrorOnFlip: false,
};
