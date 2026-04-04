/**
 * Toasty Avatar Configuration
 * Joe's dog - the original and default tutorial guide
 */

import { AvatarConfig } from '../types';

export const toastyAvatar: AvatarConfig = {
  id: 'toasty',
  name: 'Toasty',
  description: "Joe's friendly dog who loves helping people find homes!",
  personalityTone: 'friendly',

  // Image mapping for each tutorial step (0-14)
  images: {
    0: 'https://res.cloudinary.com/duqgao9h8/image/upload/f_auto,q_auto/jpsrealtor/images/toast/edited/hi.png',          // Welcome - waving
    1: 'https://res.cloudinary.com/duqgao9h8/image/upload/f_auto,q_auto/jpsrealtor/images/toast/edited/what.pngs-up',    // Search input - excited
    2: 'https://res.cloudinary.com/duqgao9h8/image/upload/f_auto,q_auto/jpsrealtor/images/toast/edited/good-girl.png',   // Scroll step - proud
    3: 'https://res.cloudinary.com/duqgao9h8/image/upload/f_auto,q_auto/jpsrealtor/images/toast/edited/huh.png',         // Results toggle - curious
    4: 'https://res.cloudinary.com/duqgao9h8/image/upload/f_auto,q_auto/jpsrealtor/images/toast/edited/huh.png',         // List view button - curious
    5: 'https://res.cloudinary.com/duqgao9h8/image/upload/f_auto,q_auto/jpsrealtor/images/toast/edited/what.png',        // Sort dropdown - pointing
    6: 'https://res.cloudinary.com/duqgao9h8/image/upload/f_auto,q_auto/jpsrealtor/images/toast/edited/good-girl.png',   // View listing - happy (FIXED: was 'what.png')
    7: 'https://res.cloudinary.com/duqgao9h8/image/upload/f_auto,q_auto/jpsrealtor/images/toast/edited/good-girl.png',   // Swipe right - love
    8: 'https://res.cloudinary.com/duqgao9h8/image/upload/f_auto,q_auto/jpsrealtor/images/toast/edited/what.png',        // Swipe left - pointing
    9: 'https://res.cloudinary.com/duqgao9h8/image/upload/f_auto,q_auto/jpsrealtor/images/toast/edited/what.pngs-up',    // Map mode - excited
    10: 'https://res.cloudinary.com/duqgao9h8/image/upload/f_auto,q_auto/jpsrealtor/images/toast/edited/huh.png',        // Map search - curious
    11: 'https://res.cloudinary.com/duqgao9h8/image/upload/f_auto,q_auto/jpsrealtor/images/toast/edited/what.png',       // Map filters - pointing
    12: 'https://res.cloudinary.com/duqgao9h8/image/upload/f_auto,q_auto/jpsrealtor/images/toast/edited/what.pngs-up',   // Back to chat - excited
    13: 'https://res.cloudinary.com/duqgao9h8/image/upload/f_auto,q_auto/jpsrealtor/images/toast/edited/huh.png',        // New chat - curious
    14: 'https://res.cloudinary.com/duqgao9h8/image/upload/f_auto,q_auto/jpsrealtor/images/toast/edited/love-you.jpg',   // Completion - love
  },

  defaultPosition: 'left',
  mirrorOnFlip: true,

  owner: {
    userId: 'josephsardella@gmail.com', // Joe's account
    agentName: 'Joseph Sardella',
  },
};
