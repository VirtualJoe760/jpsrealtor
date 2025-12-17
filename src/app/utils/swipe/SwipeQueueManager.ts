// src/app/utils/swipe/SwipeQueueManager.ts
// Queue manager using strategy pattern for map vs AI chat queues

import type { QueueStrategy, QueueContext, QueueItem, QueueResult } from './types';

/**
 * SwipeQueueManager - Manages swipe queues using different strategies
 *
 * Supports:
 * - Map-based queues (proximity scoring)
 * - AI chat queues (query-based results)
 */
export class SwipeQueueManager {
  private strategy: QueueStrategy | null = null;
  private queue: QueueItem[] = [];
  private excludeKeys: Set<string> = new Set();
  private isReady: boolean = false;
  private isExhausted: boolean = false;

  /**
   * Set the strategy to use for queue generation
   */
  setStrategy(strategy: QueueStrategy): void {
    this.strategy = strategy;
  }

  /**
   * Initialize the queue using the current strategy
   */
  async initializeQueue(context: QueueContext): Promise<void> {
    if (!this.strategy) {
      throw new Error('No strategy set. Call setStrategy() first.');
    }

    console.log(`\n🎬 Initializing queue with ${this.strategy.getName()} strategy`);
    console.log(`   Source: ${context.source}`);
    console.log(`   Reference: ${context.referenceListing.unparsedAddress || context.referenceListing.address}`);
    if (context.query) {
      console.log(`   Query: ${context.query}`);
    }

    try {
      // Use strategy to generate queue
      this.queue = await this.strategy.initializeQueue(context);
      this.isReady = true;
      this.isExhausted = this.queue.length === 0;

      console.log(`✅ Queue initialized: ${this.queue.length} listings`);
    } catch (error) {
      console.error('❌ Error initializing queue:', error);
      this.queue = [];
      this.isReady = false;
      this.isExhausted = true;
      throw error;
    }
  }

  /**
   * Get the next listing from the queue
   */
  getNext(): QueueResult {
    console.log(`📊 getNext called - Queue: ${this.queue.length}, Excluded: ${this.excludeKeys.size}`);

    // Filter out excluded items
    const validQueue = this.queue.filter(item => !this.excludeKeys.has(item.listingKey));

    if (validQueue.length === 0) {
      console.log('⚠️ Queue exhausted');
      this.isExhausted = true;
      return { listing: null };
    }

    const next = validQueue[0];

    // Determine tier/reason
    let reason = "";
    if (next.score < 100) reason = "Exact Match";
    else if (next.score < 200) reason = "Same Subdivision";
    else if (next.score < 300) reason = "Within 2mi";
    else if (next.score < 400) reason = "Within 5mi";
    else reason = "Extended";

    console.log(`\n➡️  NEXT LISTING`);
    console.log(`   Key: ${next.listingKey}`);
    console.log(`   Address: ${next.slug}`);
    console.log(`   Tier: ${reason}`);
    console.log(`   Score: ${next.score.toFixed(2)}`);
    console.log(`   Remaining: ${validQueue.length - 1}\n`);

    // Remove from queue
    this.queue = validQueue.slice(1);

    return { listing: next, reason };
  }

  /**
   * Peek at the next N listings without removing them
   */
  peekNext(count: number = 3): QueueItem[] {
    const validQueue = this.queue.filter(item => !this.excludeKeys.has(item.listingKey));
    return validQueue.slice(0, count);
  }

  /**
   * Mark a listing as swiped (excluded from future results)
   */
  markAsExcluded(listingKey: string): void {
    console.log(`📝 Marking ${listingKey} as excluded`);
    this.excludeKeys.add(listingKey);
  }

  /**
   * Check if a listing is excluded
   */
  isExcluded(listingKey: string): boolean {
    return this.excludeKeys.has(listingKey);
  }

  /**
   * Reset the manager
   */
  reset(): void {
    console.log('🔄 Resetting queue manager');
    this.queue = [];
    this.isReady = false;
    this.isExhausted = false;
    // Note: excludeKeys persist across sessions to prevent re-showing swiped listings
  }

  /**
   * Get current state
   */
  getState() {
    return {
      isReady: this.isReady,
      isExhausted: this.isExhausted,
      queueLength: this.queue.length,
      excludedCount: this.excludeKeys.size,
    };
  }

  /**
   * Get the current strategy name (for debugging)
   */
  getStrategyName(): string {
    return this.strategy?.getName() || 'None';
  }
}
