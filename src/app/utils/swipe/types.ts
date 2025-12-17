// src/app/utils/swipe/types.ts
// Shared types for swipe queue system

import type { MapListing } from "@/types/types";

/**
 * Queue item - minimal data needed for swipe queue
 */
export type QueueItem = {
  listingKey: string;
  slug: string;
  slugAddress?: string;
  latitude: number;
  longitude: number;
  city: string;
  subdivisionName: string | null;
  propertyType: string | null;
  propertySubType: string | null;
  score: number; // Lower is better (higher priority)
  _id?: string;
};

/**
 * Swipe action type
 */
export type SwipeAction = {
  listingKey: string;
  action: "like" | "dislike";
  listingData?: any;
  timestamp: number;

  // Optional: Source context tracking
  sourceContext?: {
    type: 'map' | 'ai_chat';
    query?: string;
    queueId?: string;
    userIntent?: string;
  };

  // Optional: Engagement tracking
  viewDuration?: number;
  detailsViewed?: boolean;
  photosViewed?: number;
};

/**
 * Queue initialization context
 */
export type QueueContext = {
  // Reference listing that triggered queue
  referenceListing: MapListing;

  // Source of the queue
  source: 'map' | 'ai_chat';

  // Optional: AI query context
  query?: string;
  userIntent?: string;
  queueId?: string;
};

/**
 * Queue strategy interface
 * Allows different strategies for map vs AI chat queues
 */
export interface QueueStrategy {
  /**
   * Initialize the queue with a reference listing
   * @param context Queue context including reference listing and source
   * @returns Array of queue items, sorted by priority
   */
  initializeQueue(context: QueueContext): Promise<QueueItem[]>;

  /**
   * Get the name of this strategy
   */
  getName(): string;
}

/**
 * Queue manager result
 */
export type QueueResult = {
  listing: QueueItem | null;
  reason?: string;
};

/**
 * Swipe queue hook interface
 */
export interface SwipeQueueHook {
  initializeQueue: (clickedListing: MapListing, source?: 'map' | 'ai_chat', query?: string) => Promise<void>;
  getNext: () => QueueResult;
  peekNext: (count?: number) => QueueItem[];
  markAsLiked: (listingKey: string, listingData?: any, sourceContext?: SwipeAction['sourceContext']) => void;
  markAsDisliked: (listingKey: string, listingData?: any) => void;
  reset: () => void;
  flushSwipes: () => Promise<void>;
  isReady: boolean;
  isExhausted: boolean;
  queueLength: number;
  isExcluded: (listingKey: string) => boolean;
}
