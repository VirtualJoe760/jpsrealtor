// src/types/swipe.ts
// Swipe Mode Type Definitions

import { Listing } from "@/app/components/chat/ListingCarousel";

/**
 * Represents a single swipe session (batch of listings from one source)
 */
export interface SwipeSession {
  batchId: string;              // UUID for this swipe session
  subdivision: string;          // Subdivision name (e.g., "Palm Desert Country Club")
  subdivisionSlug?: string;     // URL slug for subdivision page
  cityId?: string;              // City identifier for navigation
  visibleListings: Listing[];   // All listings in this session queue
  currentIndex: number;         // Current position in queue (0-based)
  startedAt: Date;              // When session began
  completedAt?: Date;           // When user finished swiping all (optional)
}

/**
 * Global swipe mode configuration state
 */
export interface SwipeModeConfig {
  enabled: boolean;             // Is swipe mode currently active?
  session: SwipeSession | null; // Current session data (null when disabled)
  source: 'chat' | 'map' | 'subdivision' | 'search'; // Where swipe was initiated
}

/**
 * Props for the SwipeCompletionModal component
 */
export interface SwipeCompletionModalProps {
  isOpen: boolean;                // Modal visibility state
  subdivision: string;            // Subdivision name to display
  subdivisionSlug?: string;       // URL slug for "View All" link
  cityId?: string;                // City identifier for navigation
  favoritesCount: number;         // How many they favorited in this session
  totalCount: number;             // Total listings in session
  onViewFavorites: () => void;    // Navigate to Dashboard callback
  onKeepBrowsing: () => void;     // Close modal and continue callback
  onClose: () => void;            // Close modal without action callback
}
