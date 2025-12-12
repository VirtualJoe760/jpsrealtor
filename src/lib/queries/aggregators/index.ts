/**
 * Aggregators - Data Collection Layer
 *
 * Aggregators fetch and group data from MongoDB.
 * They are modular and can be reused across different query types.
 *
 * @module queries/aggregators
 */

// ============================================================================
// ACTIVE LISTINGS AGGREGATORS
// ============================================================================
export * from './active-listings';

// ============================================================================
// MARKET STATS AGGREGATORS
// ============================================================================
export * from './market-stats';

// ============================================================================
// CLOSED LISTINGS AGGREGATORS (Phase 3)
// ============================================================================
export * from './closed-listings';
export * from './closed-market-stats';

/**
 * 🔌 HOW TO ADD A NEW AGGREGATOR
 *
 * Example: Adding rental property aggregator
 *
 * 1. Create file: aggregators/rental-listings.ts
 *
 * 2. Write aggregator function:
 *    ```typescript
 *    export async function getRentalListings(filters: RentalFilters) {
 *      const query = combineFilters({ propertyType: 'B', ...filters });
 *      return await UnifiedListing.find(query).lean();
 *    }
 *    ```
 *
 * 3. Export here:
 *    ```typescript
 *    export * from './rental-listings';
 *    ```
 *
 * 4. Use anywhere:
 *    ```typescript
 *    import { getRentalListings } from '@/lib/queries/aggregators';
 *    const rentals = await getRentalListings({ city: 'Palm Desert' });
 *    ```
 *
 * That's it! No changes to existing code needed.
 */
