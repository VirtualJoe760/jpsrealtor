// src/lib/rate-limit.ts
// In-memory sliding-window rate limiter. Single-instance only.
//
// For multi-instance (Vercel) deployments prefer the distributed, Upstash-backed
// limiter in `./rate-limit-kv.ts` (`checkRateLimit(key, limit, windowMs)`), which
// is atomic across instances and FAILS OPEN to *this* module when KV is not
// configured. The functions here remain the canonical in-memory fallback shape
// and stay in use for purely single-instance limits (auth/forgot-password).

interface Bucket {
  hits: number[]; // timestamps in ms
}

const buckets = new Map<string, Bucket>();

// Periodic eviction to prevent the map from growing unbounded.
const EVICTION_INTERVAL_MS = 60_000;
let lastEviction = Date.now();

function maybeEvict() {
  const now = Date.now();
  if (now - lastEviction < EVICTION_INTERVAL_MS) return;
  lastEviction = now;
  const cutoff = now - 60 * 60 * 1000; // anything older than 1h is junk
  for (const [key, bucket] of buckets) {
    bucket.hits = bucket.hits.filter((t) => t >= cutoff);
    if (bucket.hits.length === 0) buckets.delete(key);
  }
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Sliding-window rate limit. Returns ok:false when the caller is over the
 * limit for the given key. Does NOT block — the caller decides how to respond.
 *
 *   limit("forgot-password:ip:1.2.3.4", { max: 10, windowMs: 3600_000 })
 */
export function limit(
  key: string,
  opts: { max: number; windowMs: number }
): RateLimitResult {
  maybeEvict();
  const now = Date.now();
  const windowStart = now - opts.windowMs;

  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { hits: [] };
    buckets.set(key, bucket);
  }

  // Drop expired hits
  bucket.hits = bucket.hits.filter((t) => t >= windowStart);

  if (bucket.hits.length >= opts.max) {
    const oldest = bucket.hits[0];
    return {
      ok: false,
      remaining: 0,
      resetAt: oldest + opts.windowMs,
    };
  }

  bucket.hits.push(now);
  return {
    ok: true,
    remaining: opts.max - bucket.hits.length,
    resetAt: now + opts.windowMs,
  };
}

export interface RateLimitCheck {
  /** true when the request is under the limit and should proceed. */
  ok: boolean;
  /** Suggested HTTP status when blocked (always 429). */
  status: number;
  /** Suggested error message when blocked. */
  error: string;
  /** Seconds until the window resets (for Retry-After header). */
  retryAfter: number;
}

/** Convenience: check + apply limit, return a 429-formatted result. */
export function checkRateLimit(
  key: string,
  opts: { max: number; windowMs: number }
): RateLimitCheck {
  const r = limit(key, opts);
  if (r.ok) {
    return { ok: true, status: 200, error: "", retryAfter: 0 };
  }
  return {
    ok: false,
    status: 429,
    error: "Too many requests. Please try again later.",
    retryAfter: Math.ceil((r.resetAt - Date.now()) / 1000),
  };
}
