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
    0: 'https://res.cloudinary.com/duqgao9h8/image/upload/f_auto,q_auto/jpsrealtor/images/toast/edited/hi.png',
    1: 'https://res.cloudinary.com/duqgao9h8/image/upload/f_auto,q_auto/jpsrealtor/images/toast/edited/what.pngs-up',
    2: 'https://res.cloudinary.com/duqgao9h8/image/upload/f_auto,q_auto/jpsrealtor/images/toast/edited/good-girl.png',
    3: 'https://res.cloudinary.com/duqgao9h8/image/upload/f_auto,q_auto/jpsrealtor/images/toast/edited/huh.png',
    4: 'https://res.cloudinary.com/duqgao9h8/image/upload/f_auto,q_auto/jpsrealtor/images/toast/edited/huh.png',
    5: 'https://res.cloudinary.com/duqgao9h8/image/upload/f_auto,q_auto/jpsrealtor/images/toast/edited/what.png',
    6: 'https://res.cloudinary.com/duqgao9h8/image/upload/f_auto,q_auto/jpsrealtor/images/toast/edited/good-girl.png',
    7: 'https://res.cloudinary.com/duqgao9h8/image/upload/f_auto,q_auto/jpsrealtor/images/toast/edited/good-girl.png',
    8: 'https://res.cloudinary.com/duqgao9h8/image/upload/f_auto,q_auto/jpsrealtor/images/toast/edited/what.png',
    9: 'https://res.cloudinary.com/duqgao9h8/image/upload/f_auto,q_auto/jpsrealtor/images/toast/edited/what.pngs-up',
    10: 'https://res.cloudinary.com/duqgao9h8/image/upload/f_auto,q_auto/jpsrealtor/images/toast/edited/huh.png',
    11: 'https://res.cloudinary.com/duqgao9h8/image/upload/f_auto,q_auto/jpsrealtor/images/toast/edited/what.png',
    12: 'https://res.cloudinary.com/duqgao9h8/image/upload/f_auto,q_auto/jpsrealtor/images/toast/edited/what.pngs-up',
    13: 'https://res.cloudinary.com/duqgao9h8/image/upload/f_auto,q_auto/jpsrealtor/images/toast/edited/huh.png',
    14: 'https://res.cloudinary.com/duqgao9h8/image/upload/f_auto,q_auto/jpsrealtor/images/toast/edited/love-you.jpg',
  },

  defaultPosition: 'right',
  mirrorOnFlip: false,
};
