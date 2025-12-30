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
    0: '/images/toast/edited/hi.png',          // Welcome - waving
    1: '/images/toast/edited/whats-up.png',    // Search input - excited
    2: '/images/toast/edited/good-girl.png',   // Scroll step - proud
    3: '/images/toast/edited/huh.png',         // Results toggle - curious
    4: '/images/toast/edited/huh.png',         // List view button - curious
    5: '/images/toast/edited/what.png',        // Sort dropdown - pointing
    6: '/images/toast/edited/good-girl.png',   // View listing - happy (FIXED: was 'what.png')
    7: '/images/toast/edited/good-girl.png',   // Swipe right - love
    8: '/images/toast/edited/what.png',        // Swipe left - pointing
    9: '/images/toast/edited/whats-up.png',    // Map mode - excited
    10: '/images/toast/edited/huh.png',        // Map search - curious
    11: '/images/toast/edited/what.png',       // Map filters - pointing
    12: '/images/toast/edited/whats-up.png',   // Back to chat - excited
    13: '/images/toast/edited/huh.png',        // New chat - curious
    14: '/images/toast/edited/love-you.png',   // Completion - love
  },

  defaultPosition: 'left',
  mirrorOnFlip: true,

  owner: {
    userId: 'josephsardella@gmail.com', // Joe's account
    agentName: 'Joseph Sardella',
  },
};
