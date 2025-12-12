/**
 * Real Estate Analytics Library - Modular & Scalable
 *
 * Plug-and-play architecture for real estate analytics.
 * Add new data sources, metrics, or MLSs without changing core logic.
 *
 * @module analytics
 * @version 1.0.0
 * @updated December 9, 2025
 */

// ============================================================================
// CALCULATIONS - Pure calculation functions (no database calls)
// ============================================================================
// Register new calculations by adding to calculations/index.ts
export * from './calculations';

// ============================================================================
// AGGREGATORS - Data collection and grouping from MongoDB
// ============================================================================
// Register new data sources by adding to aggregators/index.ts
export * from './aggregators';

// ============================================================================
// COMPARATORS - Multi-location comparison and ranking
// ============================================================================
// Register new comparison types by adding to comparators/index.ts
// TODO: Implement comparators
// export * from './comparators';

// ============================================================================
// UTILITIES - Helper functions and validators
// ============================================================================
// TODO: Implement utilities
// export * from './utils';

/**
 * 🔌 PLUG-AND-PLAY ARCHITECTURE
 *
 * To add new functionality:
 *
 * 1. NEW METRIC (e.g., ROI, Cash Flow):
 *    - Add calculation function to calculations/{metric}.ts
 *    - Export from calculations/index.ts
 *    - Create API route in api/analytics/{metric}/route.ts
 *
 * 2. NEW DATA SOURCE (e.g., new MLS):
 *    - Update MLS_IDS in closed/fetch.py
 *    - Run fetch.py -y (auto-includes new MLS)
 *    - No code changes needed!
 *
 * 3. NEW AGGREGATOR (e.g., commercial properties):
 *    - Add aggregator to aggregators/{type}.ts
 *    - Export from aggregators/index.ts
 *    - Use in any API endpoint
 *
 * 4. NEW COMPARATOR (e.g., schools):
 *    - Add comparator to comparators/{type}.ts
 *    - Export from comparators/index.ts
 *    - Reusable across endpoints
 *
 * Directory Structure:
 * src/lib/analytics/
 * ├── index.ts              ← Central registry (you are here)
 * ├── calculations/
 * │   ├── index.ts          ← Register calculations here
 * │   ├── appreciation.ts   ← Appreciation metrics
 * │   ├── cashflow.ts       ← Cash flow analysis (TODO)
 * │   ├── roi.ts            ← ROI calculations (TODO)
 * │   └── cma.ts            ← CMA metrics (TODO)
 * ├── aggregators/
 * │   ├── index.ts          ← Register aggregators here
 * │   ├── closed-sales.ts   ← Fetch closed sales from MongoDB
 * │   └── active-listings.ts ← Fetch active listings (TODO)
 * ├── comparators/
 * │   ├── index.ts          ← Register comparators here
 * │   └── locations.ts      ← Compare multiple locations
 * └── utils/
 *     ├── index.ts          ← Register utilities here
 *     ├── validators.ts     ← Input validation
 *     └── formatters.ts     ← Output formatting
 */
