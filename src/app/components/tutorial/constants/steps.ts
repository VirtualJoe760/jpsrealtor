/**
 * Tutorial Steps Configuration
 * Defines all 15 tutorial steps for desktop and mobile
 */

import { TutorialStep } from '../types';
import { desktopAvatarPositions, mobileAvatarPositions } from './positioning';

/**
 * Desktop Tutorial Steps (15 total: 0-14)
 */
export const desktopTutorialSteps: TutorialStep[] = [
  {
    id: 0,
    fromAvatar: true,
    content: {
      title: "Hi! I'm Toasty! 🐕",
      message: "I'm Joe's dog, and I'm here to help you learn how to find your dream home! This will only take 1 minute. Let's go!",
    },
    avatarPosition: desktopAvatarPositions[0],
  },
  {
    id: 1,
    target: '[data-tour="chat-input"]',
    fromAvatar: false,
    placement: 'top',
    showAutoFill: true,
    blockNext: true,
    content: {
      title: "Let's try a search together!",
      message: 'Type this in the box below: "show me homes in Indian Wells Country Club"',
    },
    avatarPosition: desktopAvatarPositions[1],
  },
  {
    id: 2,
    fromAvatar: true,
    waitForScroll: true,
    hideOverlay: true,
    content: {
      title: "Great! The AI is responding! 🤖",
      message: "Scroll down to read the full response, then click Continue when you're ready!",
    },
    avatarPosition: desktopAvatarPositions[2],
  },
  {
    id: 3,
    target: '[data-tour="results-view-toggle"]',
    fromAvatar: false,
    placement: 'left',
    content: {
      title: "Good job! You found homes! 🏡",
      message: "You can control how you view the results:",
      bullets: [
        "List View - See all properties at once",
        "Carousel View - Swipe through them one by one",
        "Use the sort options to organize by price, size, or date"
      ],
    },
    avatarPosition: desktopAvatarPositions[3],
  },
  {
    id: 4,
    target: '[data-tour="list-view-button"]',
    fromAvatar: false,
    placement: 'left',
    blockNext: true,
    content: {
      title: "Switch to List View! 📋",
      message: "Click the 'List' button to see all properties in a vertical list format!",
    },
    avatarPosition: desktopAvatarPositions[4],
  },
  {
    id: 5,
    target: '[data-tour="sort-dropdown"]',
    fromAvatar: false,
    placement: 'left',
    content: {
      title: "Sort your results! 🔢",
      message: "You can organize listings by price, size, or other features using this dropdown!",
    },
    avatarPosition: desktopAvatarPositions[5],
  },
  {
    id: 6,
    target: '[data-tour="view-listing-button"]',
    fromAvatar: false,
    placement: 'left', // Changed from 'top' to 'left' - arrow points right to View button
    blockNext: true, // Block until user clicks View button
    content: {
      title: "Let's explore a listing! 🏠",
      message: "Click 'View Details' on any property to see more information and photos!",
    },
    avatarPosition: desktopAvatarPositions[6],
  },
  {
    id: 7,
    target: '[data-tour="swipe-right-button"]',
    fromAvatar: false,
    placement: 'top',
    content: {
      title: "Love it? Save it! ❤️",
      message: "Swipe right or click this heart to add listings to your favorites!",
    },
    avatarPosition: desktopAvatarPositions[7],
  },
  {
    id: 8,
    target: '[data-tour="swipe-left-button"]',
    fromAvatar: false,
    placement: 'top',
    content: {
      title: "Not interested? Skip it! 👎",
      message: "Swipe left or click X to remove listings from your queue.",
    },
    avatarPosition: desktopAvatarPositions[8],
  },
  {
    id: 9,
    target: '[data-tour="close-listing-panel"]',
    fromAvatar: false,
    placement: 'left', // Arrow points right to X button
    blockNext: true, // Block until user closes panel
    content: {
      title: "Close the details panel ✖️",
      message: "Click the X button to close this listing and return to your results!",
    },
    avatarPosition: desktopAvatarPositions[9],
  },
  {
    id: 10,
    target: '[data-tour="top-map-toggle-desktop"]',
    fromAvatar: false,
    placement: 'bottom', // Arrow points UP to top toggle
    blockNext: true, // Block until user clicks map toggle
    content: {
      title: "See everything on a map! 🗺️",
      message: "Click here to view all listings on an interactive map!",
    },
    avatarPosition: desktopAvatarPositions[10],
  },
  {
    id: 11,
    target: '[data-tour="map-filters-button"]',
    fromAvatar: false,
    placement: 'bottom',
    content: {
      title: "Filter your results! 🎛️",
      message: "Click the gear icon to refine listings by price, beds, baths, and more!",
    },
    avatarPosition: desktopAvatarPositions[11],
  },
  {
    id: 12,
    target: '[data-tour="map-search-button"]',
    fromAvatar: false,
    placement: 'bottom',
    showAutoFill: true, // Auto-fill "palm springs"
    content: {
      title: "Search on the map! 🔍",
      message: "Use this search to find specific addresses or areas while in map mode!",
    },
    avatarPosition: desktopAvatarPositions[12],
  },
  {
    id: 13,
    target: '[data-tour="top-map-toggle-desktop"]',
    fromAvatar: false,
    placement: 'bottom', // Arrow points UP to top toggle
    content: {
      title: "Back to chat view! 💬",
      message: "Click the chat button at the top to return to your conversation with the AI!",
    },
    avatarPosition: desktopAvatarPositions[13],
  },
  {
    id: 14,
    target: '[data-tour="new-chat-button"]',
    fromAvatar: false,
    placement: 'left',
    content: {
      title: "Start fresh anytime! ✨",
      message: "Click 'New Chat' to begin a completely new conversation and search!",
    },
    avatarPosition: desktopAvatarPositions[14],
  },
  {
    id: 15,
    fromAvatar: true,
    content: {
      title: "You're a pro now! I'm so proud! 💜",
      message: "You now know how to:",
      bullets: [
        "Search for homes with AI",
        "View and sort results",
        "Save favorite listings",
        "Use the interactive map",
        "Apply filters and start new searches",
      ],
    },
    avatarPosition: desktopAvatarPositions[15],
  },
];

/**
 * Mobile Tutorial Steps (15 total: 0-14)
 * More concise messaging for smaller screens
 */
export const mobileTutorialSteps: TutorialStep[] = [
  {
    id: 0,
    fromAvatar: true,
    content: {
      title: "Hi! I'm Toasty! 🐕",
      message: "I'm Joe's dog, and I'll help you find your dream home! This will only take 1 minute!",
    },
    avatarPosition: mobileAvatarPositions[0],
  },
  {
    id: 1,
    target: '[data-tour="chat-input"]',
    fromAvatar: false,
    placement: 'top',
    showAutoFill: true,
    blockNext: true,
    content: {
      title: "Let's try a search!",
      message: 'Type: "show me homes in Indian Wells Country Club"',
    },
    avatarPosition: mobileAvatarPositions[1],
  },
  {
    id: 2,
    fromAvatar: true,
    waitForScroll: true,
    hideOverlay: true,
    content: {
      title: "AI is responding! 🤖",
      message: "Scroll down to read the response, then click Continue!",
    },
    avatarPosition: mobileAvatarPositions[2],
  },
  {
    id: 3,
    target: '[data-tour="results-view-toggle"]',
    fromAvatar: false,
    placement: 'left',
    content: {
      title: "You found homes! 🏡",
      message: "Control your view:",
      bullets: [
        "List - All properties",
        "Carousel - Swipe through",
        "Sort by price, size, or date"
      ],
    },
    avatarPosition: mobileAvatarPositions[3],
  },
  {
    id: 4,
    target: '[data-tour="list-view-button"]',
    fromAvatar: false,
    placement: 'left',
    blockNext: true,
    content: {
      title: "Switch to List View! 📋",
      message: "Tap 'List' to see all properties in a list!",
    },
    avatarPosition: mobileAvatarPositions[4],
  },
  {
    id: 5,
    target: '[data-tour="sort-dropdown"]',
    fromAvatar: false,
    placement: 'left',
    content: {
      title: "Sort results! 🔢",
      message: "Organize listings by price, size, or features!",
    },
    avatarPosition: mobileAvatarPositions[5],
  },
  {
    id: 6,
    target: '[data-tour="view-listing-button"]',
    fromAvatar: false,
    placement: 'top',
    content: {
      title: "Explore a listing! 🏠",
      message: "Tap 'View Details' to see more info and photos!",
    },
    avatarPosition: mobileAvatarPositions[6],
  },
  {
    id: 7,
    target: '[data-tour="swipe-right-button"]',
    fromAvatar: false,
    placement: 'top',
    content: {
      title: "Love it? Save it! ❤️",
      message: "Tap the heart to add to favorites!",
    },
    avatarPosition: mobileAvatarPositions[7],
  },
  {
    id: 8,
    target: '[data-tour="swipe-left-button"]',
    fromAvatar: false,
    placement: 'top',
    content: {
      title: "Not interested? Skip it! 👎",
      message: "Tap X to remove from your queue.",
    },
    avatarPosition: mobileAvatarPositions[8],
  },
  {
    id: 9,
    target: '[data-tour="mobile-map-button"]',
    fromAvatar: false,
    placement: 'top',
    content: {
      title: "View on map! 🗺️",
      message: "Tap here to see listings on a map!",
    },
    avatarPosition: mobileAvatarPositions[9],
  },
  {
    id: 10,
    target: '[data-tour="map-filters-button"]',
    fromAvatar: false,
    placement: 'bottom',
    content: {
      title: "Filter results! 🎛️",
      message: "Tap the gear icon to refine by price, beds, baths, and more!",
    },
    avatarPosition: mobileAvatarPositions[10],
  },
  {
    id: 11,
    target: '[data-tour="map-search-button"]',
    fromAvatar: false,
    placement: 'bottom',
    showAutoFill: true, // Auto-fill "palm springs"
    content: {
      title: "Search the map! 🔍",
      message: "Find specific addresses or areas!",
    },
    avatarPosition: mobileAvatarPositions[11],
  },
  {
    id: 12,
    target: '[data-tour="mobile-map-button"]',
    fromAvatar: false,
    placement: 'top',
    content: {
      title: "Back to chat! 💬",
      message: "Tap chat to return to your AI conversation!",
    },
    avatarPosition: mobileAvatarPositions[12],
  },
  {
    id: 13,
    target: '[data-tour="new-chat-button"]',
    fromAvatar: false,
    placement: 'left',
    content: {
      title: "Start fresh! ✨",
      message: "Tap 'New Chat' to begin a new search!",
    },
    avatarPosition: mobileAvatarPositions[13],
  },
  {
    id: 14,
    fromAvatar: true,
    content: {
      title: "You're a pro! 💜",
      message: "You now know how to:",
      bullets: ["Search with AI", "Sort & view results", "Save favorites", "Use maps & filters"],
    },
    avatarPosition: mobileAvatarPositions[14],
  },
];

/**
 * Get tutorial steps based on device type
 */
export function getTutorialSteps(isMobile: boolean): TutorialStep[] {
  return isMobile ? mobileTutorialSteps : desktopTutorialSteps;
}
