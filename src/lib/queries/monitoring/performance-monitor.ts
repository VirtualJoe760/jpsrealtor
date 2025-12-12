/**
 * Performance Monitoring for Query System
 *
 * Tracks query performance metrics and provides insights.
 *
 * @module queries/monitoring/performance-monitor
 */

import type { QueryOptions, QueryResult } from '../builder';

export interface QueryPerformanceMetrics {
  queryId: string;
  timestamp: Date;
  options: QueryOptions;
  executionTime: number;
  cached: boolean;
  totalListings: number;
  totalClosedSales?: number;
  location?: string;
  filtersApplied: number;
  includesStats: boolean;
  includesClosedData: boolean;
}

// In-memory store for recent queries (last 100)
const recentQueries: QueryPerformanceMetrics[] = [];
const MAX_RECENT_QUERIES = 100;

/**
 * Log query performance
 */
export function logQueryPerformance(
  options: QueryOptions,
  result: QueryResult
): QueryPerformanceMetrics {
  const metrics: QueryPerformanceMetrics = {
    queryId: generateQueryId(),
    timestamp: new Date(),
    options,
    executionTime: result.meta.executionTime,
    cached: result.meta.cached || false,
    totalListings: result.meta.totalListings,
    totalClosedSales: result.meta.totalClosedSales,
    location: options.city || options.subdivision || options.zip || options.county,
    filtersApplied: countFiltersApplied(options),
    includesStats: options.includeStats || false,
    includesClosedData: options.includeClosedListings || options.includeAppreciation || false,
  };

  // Add to recent queries
  recentQueries.push(metrics);

  // Keep only last 100
  if (recentQueries.length > MAX_RECENT_QUERIES) {
    recentQueries.shift();
  }

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log('📊 Query Performance:', {
      location: metrics.location,
      executionTime: `${metrics.executionTime}ms`,
      cached: metrics.cached,
      listings: metrics.totalListings,
      filters: metrics.filtersApplied,
    });
  }

  return metrics;
}

/**
 * Get performance statistics
 */
export function getPerformanceStats(): {
  totalQueries: number;
  avgExecutionTime: number;
  cacheHitRate: number;
  slowQueries: QueryPerformanceMetrics[];
  recentQueries: QueryPerformanceMetrics[];
  performanceByLocation: Record<string, { count: number; avgTime: number }>;
} {
  if (recentQueries.length === 0) {
    return {
      totalQueries: 0,
      avgExecutionTime: 0,
      cacheHitRate: 0,
      slowQueries: [],
      recentQueries: [],
      performanceByLocation: {},
    };
  }

  const cachedQueries = recentQueries.filter((q) => q.cached);
  const uncachedQueries = recentQueries.filter((q) => !q.cached);

  const avgExecutionTime =
    uncachedQueries.reduce((sum, q) => sum + q.executionTime, 0) / uncachedQueries.length || 0;

  const cacheHitRate = (cachedQueries.length / recentQueries.length) * 100;

  // Identify slow queries (> 1000ms)
  const slowQueries = uncachedQueries
    .filter((q) => q.executionTime > 1000)
    .sort((a, b) => b.executionTime - a.executionTime)
    .slice(0, 10);

  // Performance by location
  const performanceByLocation: Record<string, { count: number; avgTime: number }> = {};

  recentQueries.forEach((q) => {
    const location = q.location || 'unknown';
    if (!performanceByLocation[location]) {
      performanceByLocation[location] = { count: 0, avgTime: 0 };
    }
    performanceByLocation[location].count++;
    performanceByLocation[location].avgTime += q.executionTime;
  });

  // Calculate averages
  Object.keys(performanceByLocation).forEach((location) => {
    const stats = performanceByLocation[location];
    stats.avgTime = Math.round(stats.avgTime / stats.count);
  });

  return {
    totalQueries: recentQueries.length,
    avgExecutionTime: Math.round(avgExecutionTime),
    cacheHitRate: Math.round(cacheHitRate * 100) / 100,
    slowQueries,
    recentQueries: recentQueries.slice(-10).reverse(),
    performanceByLocation,
  };
}

/**
 * Generate unique query ID
 */
function generateQueryId(): string {
  return `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Count number of filters applied
 */
function countFiltersApplied(options: QueryOptions): number {
  let count = 0;

  // Location filters
  if (options.city) count++;
  if (options.subdivision) count++;
  if (options.zip) count++;
  if (options.county) count++;

  // Property filters
  if (!options.filters) return count;

  const filters = options.filters;
  if (filters.minBeds !== undefined) count++;
  if (filters.maxBeds !== undefined) count++;
  if (filters.minBaths !== undefined) count++;
  if (filters.maxBaths !== undefined) count++;
  if (filters.minPrice !== undefined) count++;
  if (filters.maxPrice !== undefined) count++;
  if (filters.minSqft !== undefined) count++;
  if (filters.maxSqft !== undefined) count++;
  if (filters.minYear !== undefined) count++;
  if (filters.maxYear !== undefined) count++;
  if (filters.propertyType) count++;
  if (filters.propertySubType) count++;
  if (filters.pool) count++;
  if (filters.spa) count++;
  if (filters.view) count++;
  if (filters.gated) count++;
  if (filters.senior) count++;
  if (filters.minGarages !== undefined) count++;
  if (filters.maxDaysOnMarket !== undefined) count++;
  if (filters.listedAfter) count++;

  return count;
}

/**
 * Clear performance metrics
 */
export function clearPerformanceMetrics(): void {
  recentQueries.length = 0;
}
