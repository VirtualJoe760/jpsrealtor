/**
 * Monitoring Layer - Export Module
 *
 * Provides performance monitoring utilities for the query system.
 *
 * @module queries/monitoring
 */

export * from './performance-monitor';

/**
 * Available Monitoring Utilities:
 *
 * - performance-monitor: Track and analyze query performance
 *
 * Usage:
 * ```typescript
 * import { logQueryPerformance, getPerformanceStats } from '@/lib/queries/monitoring';
 *
 * // Log query performance
 * const result = await executeQuery(options);
 * logQueryPerformance(options, result);
 *
 * // Get performance statistics
 * const stats = getPerformanceStats();
 * console.log(`Avg execution time: ${stats.avgExecutionTime}ms`);
 * console.log(`Cache hit rate: ${stats.cacheHitRate}%`);
 * ```
 */
