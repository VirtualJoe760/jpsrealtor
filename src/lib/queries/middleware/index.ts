/**
 * Middleware Layer - Export Module
 *
 * Provides middleware utilities for the query system.
 *
 * @module queries/middleware
 */

export * from './rate-limiter';

/**
 * Available Middleware:
 *
 * - rate-limiter: Request rate limiting with Redis
 *
 * Usage:
 * ```typescript
 * import { checkRateLimit, getRateLimitConfig } from '@/lib/queries/middleware';
 *
 * // Check rate limit
 * const config = getRateLimitConfig(ip, userId, 'authenticated');
 * const result = await checkRateLimit(config);
 *
 * if (!result.allowed) {
 *   return Response.json(
 *     { error: 'Rate limit exceeded' },
 *     {
 *       status: 429,
 *       headers: {
 *         'Retry-After': result.retryAfter.toString(),
 *         'X-RateLimit-Remaining': '0',
 *       }
 *     }
 *   );
 * }
 * ```
 */
