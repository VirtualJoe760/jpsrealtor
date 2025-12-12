/**
 * Calculations - Derived Metrics Layer
 *
 * Calculate insights and derived metrics from raw data.
 * Pure functions that don't touch the database.
 *
 * @module queries/calculations
 */

export * from './price-per-sqft';
export * from './comparison';
export * from './dom-stats';
export * from './appreciation';

/**
 * Available Calculations:
 *
 * - price-per-sqft: Calculate $/sqft for listings
 * - comparison: Compare two locations side-by-side
 * - dom-stats: Days on market analysis and trends
 * - appreciation: Historical appreciation from closed sales (Phase 3)
 *
 * All calculations are pure functions that work on in-memory data.
 */
