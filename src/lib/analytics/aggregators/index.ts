/**
 * Aggregators - Data Collection Layer
 *
 * Aggregators fetch and group data from MongoDB.
 * They are data-source agnostic and can be reused across different analytics.
 *
 * @module analytics/aggregators
 */

// ============================================================================
// CLOSED SALES AGGREGATORS
// ============================================================================
export * from './closed-sales';

// ============================================================================
// ACTIVE LISTINGS AGGREGATORS (Future)
// ============================================================================
// export * from './active-listings';

/**
 * 🔌 HOW TO ADD A NEW AGGREGATOR
 *
 * Example: Adding commercial property sales
 *
 * 1. Create file: aggregators/commercial-sales.ts
 *
 * 2. Write aggregator function:
 *    ```typescript
 *    export async function getCommercialSales(filters: CommercialFilters) {
 *      const db = await connectToDatabase();
 *      return await db.collection('commercial_closed_listings').find(filters).toArray();
 *    }
 *    ```
 *
 * 3. Export here:
 *    ```typescript
 *    export * from './commercial-sales';
 *    ```
 *
 * 4. Use anywhere:
 *    ```typescript
 *    import { getCommercialSales } from '@/lib/analytics';
 *    const sales = await getCommercialSales({ city: 'Palm Desert' });
 *    ```
 *
 * That's it! No changes to existing code needed.
 */
