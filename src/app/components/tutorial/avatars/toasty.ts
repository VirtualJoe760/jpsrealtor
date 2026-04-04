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
    0: 'https://res.cloudinary.com/duqgao9h8/image/upload/f_auto,q_auto/jpsrealtor/images/toast/edited/hi',          // Welcome - waving
    1: 'https://res.cloudinary.com/duqgao9h8/image/upload/f_auto,q_auto/jpsrealtor/images/toast/edited/whats-up',    // Search input - excited
    2: 'https://res.cloudinary.com/duqgao9h8/image/upload/f_auto,q_auto/jpsrealtor/images/toast/edited/good-girl',   // Scroll step - proud
    3: 'https://res.cloudinary.com/duqgao9h8/image/upload/f_auto,q_auto/jpsrealtor/images/toast/edited/huh',         // Results toggle - curious
    4: 'https://res.cloudinary.com/duqgao9h8/image/upload/f_auto,q_auto/jpsrealtor/images/toast/edited/huh',         // List view button - curious
    5: 'https://res.cloudinary.com/duqgao9h8/image/upload/f_auto,q_auto/jpsrealtor/images/toast/edited/what',        // Sort dropdown - pointing
    6: 'https://res.cloudinary.com/duqgao9h8/image/upload/f_auto,q_auto/jpsrealtor/images/toast/edited/good-girl',   // View listing - happy (FIXED: was 'what.png')
    7: 'https://res.cloudinary.com/duqgao9h8/image/upload/f_auto,q_auto/jpsrealtor/images/toast/edited/good-girl',   // Swipe right - love
    8: 'https://res.cloudinary.com/duqgao9h8/image/upload/f_auto,q_auto/jpsrealtor/images/toast/edited/what',        // Swipe left - pointing
    9: 'https://res.cloudinary.com/duqgao9h8/image/upload/f_auto,q_auto/jpsrealtor/images/toast/edited/whats-up',    // Map mode - excited
    10: 'https://res.cloudinary.com/duqgao9h8/image/upload/f_auto,q_auto/jpsrealtor/images/toast/edited/huh',        // Map search - curious
    11: 'https://res.cloudinary.com/duqgao9h8/image/upload/f_auto,q_auto/jpsrealtor/images/toast/edited/what',       // Map filters - pointing
    12: 'https://res.cloudinary.com/duqgao9h8/image/upload/f_auto,q_auto/jpsrealtor/images/toast/edited/whats-up',   // Back to chat - excited
    13: 'https://res.cloudinary.com/duqgao9h8/image/upload/f_auto,q_auto/jpsrealtor/images/toast/edited/huh',        // New chat - curious
    14: 'https://res.cloudinary.com/duqgao9h8/image/upload/f_auto,q_auto/jpsrealtor/images/toast/edited/love-you',   // Completion - love
  },

  defaultPosition: 'left',
  mirrorOnFlip: true,

  owner: {
    userId: 'josephsardella@gmail.com', // Joe's account
    agentName: 'Joseph Sardella',
  },
};
