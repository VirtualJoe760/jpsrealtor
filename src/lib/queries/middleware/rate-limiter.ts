/**
 * Rate Limiter for Query API
 *
 * Prevents abuse by limiting the number of queries per IP/user.
 * Uses sliding window algorithm with in-memory storage.
 *
 * NOTE: For production, use Cloudflare rate limiting which is more robust
 * and works across multiple server instances.
 *
 * @module queries/middleware/rate-limiter
 */

// In-memory storage for rate limit tracking
// Key: identifier (IP or user ID)
// Value: array of timestamps
const rateLimitStore = new Map<string, number[]>();

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  identifier: string; // IP address or user ID
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfter?: number; // Seconds until next request allowed
}

/**
 * Check rate limit for a request
 */
export async function checkRateLimit(config: RateLimitConfig): Promise<RateLimitResult> {
  const key = config.identifier;
  const now = Date.now();
  const windowStart = now - config.windowMs;

  // Get existing requests for this identifier
  let requests = rateLimitStore.get(key) || [];

  // Remove requests outside the time window
  requests = requests.filter((timestamp) => timestamp > windowStart);

  // Check if limit exceeded
  if (requests.length >= config.maxRequests) {
    const oldestRequest = requests[0] || now;
    const resetAt = new Date(oldestRequest + config.windowMs);
    const retryAfter = Math.ceil((resetAt.getTime() - now) / 1000);

    return {
      allowed: false,
      remaining: 0,
      resetAt,
      retryAfter,
    };
  }

  // Add current request
  requests.push(now);
  rateLimitStore.set(key, requests);

  const remaining = config.maxRequests - requests.length;
  const resetAt = new Date(now + config.windowMs);

  return {
    allowed: true,
    remaining,
    resetAt,
  };
}

/**
 * Standard rate limit configurations
 */
export const RATE_LIMITS = {
  // Anonymous users: 30 requests per minute
  ANONYMOUS: {
    windowMs: 60 * 1000,
    maxRequests: 30,
  },

  // Authenticated users: 100 requests per minute
  AUTHENTICATED: {
    windowMs: 60 * 1000,
    maxRequests: 100,
  },

  // Premium users: 300 requests per minute
  PREMIUM: {
    windowMs: 60 * 1000,
    maxRequests: 300,
  },

  // API keys: 1000 requests per minute
  API_KEY: {
    windowMs: 60 * 1000,
    maxRequests: 1000,
  },
};

/**
 * Get rate limit config for a request
 */
export function getRateLimitConfig(
  ip: string,
  userId?: string,
  userTier?: 'anonymous' | 'authenticated' | 'premium' | 'api_key'
): RateLimitConfig {
  const identifier = userId || ip;
  const tier = userTier || 'anonymous';

  const limits = RATE_LIMITS[tier.toUpperCase() as keyof typeof RATE_LIMITS];

  return {
    ...limits,
    identifier,
  };
}

/**
 * Reset rate limit for an identifier (admin only)
 */
export async function resetRateLimit(identifier: string): Promise<void> {
  rateLimitStore.delete(identifier);
}

/**
 * Clean up old entries periodically
 * Should be called by a cron job or similar
 */
export function cleanupRateLimits(): void {
  const now = Date.now();
  const maxWindowMs = 60 * 60 * 1000; // 1 hour

  for (const [key, requests] of rateLimitStore.entries()) {
    const validRequests = requests.filter((timestamp) => timestamp > now - maxWindowMs);
    if (validRequests.length === 0) {
      rateLimitStore.delete(key);
    } else {
      rateLimitStore.set(key, validRequests);
    }
  }
}

// Run cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupRateLimits, 5 * 60 * 1000);
}
