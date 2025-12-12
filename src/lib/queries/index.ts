/**
 * Queries Module - Modular Database Query System
 *
 * A flexible, reusable query system for the AI chat and database operations.
 * Follows the modular pattern from our analytics architecture.
 *
 * @module queries
 *
 * @example
 * ```typescript
 * import { executeQuery } from '@/lib/queries';
 *
 * // Execute comprehensive query
 * const result = await executeQuery({
 *   city: "Palm Desert",
 *   filters: { minBeds: 3, maxPrice: 800000, pool: true },
 *   includeStats: true,
 *   includeDOMStats: true
 * });
 *
 * console.log(result.listings);      // Array of listings
 * console.log(result.stats);         // Market statistics
 * console.log(result.domStats);      // Days on market analysis
 * console.log(result.meta);          // Query metadata
 * ```
 */

// ============================================================================
// MAIN QUERY BUILDER
// ============================================================================
export * from './builder';

// ============================================================================
// AGGREGATORS (Data Fetchers)
// ============================================================================
export * from './aggregators';

// ============================================================================
// FILTERS (Query Builders)
// ============================================================================
export * from './filters';

// ============================================================================
// CALCULATIONS (Derived Metrics)
// ============================================================================
export * from './calculations';

// ============================================================================
// PHASE 4: PERFORMANCE & OPTIMIZATION
// ============================================================================
export * from './monitoring';
export * from './middleware';

/**
 * 📚 ARCHITECTURE OVERVIEW
 *
 * This module is organized into 4 layers:
 *
 * 1. **Filters** (filters/)
 *    - Build MongoDB query objects
 *    - Modular filter builders for location, property, price, amenities, time
 *    - Pure functions: filters → MongoDB query
 *
 * 2. **Aggregators** (aggregators/)
 *    - Execute database queries
 *    - Fetch and aggregate data from MongoDB
 *    - Functions: filters → database → raw data
 *
 * 3. **Calculations** (calculations/)
 *    - Calculate derived metrics
 *    - Pure functions that work on in-memory data
 *    - Functions: raw data → insights
 *
 * 4. **Builder** (builder.ts)
 *    - Main query interface
 *    - Orchestrates aggregators, filters, and calculations
 *    - Functions: high-level query → comprehensive results
 *
 * ---
 *
 * 🎯 USAGE PATTERNS
 *
 * **Pattern 1: Simple Query**
 * ```typescript
 * import { executeSimpleQuery } from '@/lib/queries';
 *
 * const listings = await executeSimpleQuery("Orange", { minBeds: 3 });
 * ```
 *
 * **Pattern 2: Query with Stats**
 * ```typescript
 * import { executeQuery } from '@/lib/queries';
 *
 * const result = await executeQuery({
 *   city: "Palm Desert",
 *   filters: { pool: true, maxPrice: 1000000 },
 *   includeStats: true
 * });
 * ```
 *
 * **Pattern 3: Location Comparison**
 * ```typescript
 * import { executeQuery } from '@/lib/queries';
 *
 * const result = await executeQuery({
 *   city: "La Quinta",
 *   includeStats: true,
 *   includeComparison: {
 *     compareWith: "Palm Desert",
 *     isCity: true
 *   }
 * });
 * ```
 *
 * **Pattern 4: Direct Aggregator Use**
 * ```typescript
 * import { getActiveListingsByCity, getMarketStats } from '@/lib/queries';
 *
 * const listings = await getActiveListingsByCity("Orange", { minBeds: 3 });
 * const stats = await getMarketStats({ city: "Orange" });
 * ```
 *
 * **Pattern 5: Custom Filter Combinations**
 * ```typescript
 * import { combineFilters, getActiveListings } from '@/lib/queries';
 *
 * const filters = combineFilters({
 *   city: "Indian Wells",
 *   minBeds: 3,
 *   pool: true,
 *   spa: true,
 *   maxPrice: 2000000
 * });
 *
 * const listings = await getActiveListings(filters);
 * ```
 *
 * ---
 *
 * 🔧 EXTENDING THE SYSTEM
 *
 * **Add a New Filter**
 * 1. Create `filters/new-filter.ts`
 * 2. Implement `buildNewFilter(filter: NewFilter): any`
 * 3. Export in `filters/index.ts`
 * 4. Update `CombinedFilters` interface
 *
 * **Add a New Aggregator**
 * 1. Create `aggregators/new-aggregator.ts`
 * 2. Implement aggregator function(s)
 * 3. Export in `aggregators/index.ts`
 *
 * **Add a New Calculation**
 * 1. Create `calculations/new-calculation.ts`
 * 2. Implement pure calculation function(s)
 * 3. Export in `calculations/index.ts`
 *
 * ---
 *
 * ✅ BENEFITS
 *
 * - **Modular**: Each component is independent and reusable
 * - **Testable**: Pure functions are easy to test
 * - **Extensible**: Add new filters/aggregators without changing existing code
 * - **Type-safe**: Full TypeScript support
 * - **Performant**: MongoDB aggregation at the database level
 * - **DRY**: No code duplication across endpoints
 *
 * ---
 *
 * 📖 RELATED DOCUMENTATION
 *
 * - Architecture: /docs/CHAT_QUERY_ARCHITECTURE.md
 * - Analytics Pattern: /docs/ANALYTICS_SYSTEM_STATUS.md
 * - Unified MLS: /docs/UNIFIED_MLS_ARCHITECTURE.md
 */
