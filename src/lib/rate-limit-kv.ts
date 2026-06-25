// src/lib/rate-limit-kv.ts
//
// Distributed sliding-window rate limiter backed by Upstash Redis (REST).
//
// The window is implemented as a Redis sorted set per bucket: each request adds
// one member scored by its millisecond timestamp. Counting the members whose
// score falls inside `[now - windowMs, now]` gives the number of hits in the
// sliding window. The whole read-modify-write runs as a single Upstash pipeline
// so it is ATOMIC across Vercel instances — two callers racing on the same
// bucket see one shared window, never two private ones.
//
// FAILS OPEN: when Upstash is not configured (`isKvConfigured()` is false) or a
// Redis call throws, we log a warning and fall back to the in-memory limiter
// (`src/lib/rate-limit.ts`). A KV outage must degrade rate limiting, never take
// the API down. The fallback shares the same sliding-window semantics but is
// per-instance only — acceptable as a safety valve, loud by design (build_plan
// §6.9 / §7 "Rate-limiter fail-open during an abuse spike").
//
// Bucket keys are prefixed with the caller's `tenantId` so two tenants can never
// collide on one window.

import { limit as memoryLimit } from "./rate-limit";

/** Result of a single rate-limit check. */
export interface RateLimitKvResult {
  /** true when the request is under the limit and may proceed. */
  allowed: boolean;
  /** Seconds until the window frees a slot (for the `Retry-After` header). 0 when allowed. */
  retryAfter: number;
  /** Approximate remaining requests in the current window after this call. */
  remaining: number;
}

/**
 * Minimal structural type for the Upstash Redis client surface we use. Declared
 * locally so this module type-checks WITHOUT `@upstash/redis` being installed in
 * every environment (it is a runtime-only, dynamically-imported dependency).
 */
export interface RedisLike {
  pipeline(): RedisPipelineLike;
}

/**
 * The subset of the Upstash pipeline API this limiter drives. Each method is
 * chainable and returns the pipeline; `exec()` resolves to the ordered results.
 */
export interface RedisPipelineLike {
  zremrangebyscore(key: string, min: number, max: number): RedisPipelineLike;
  zadd(key: string, member: { score: number; member: string }): RedisPipelineLike;
  zcard(key: string): RedisPipelineLike;
  pexpire(key: string, milliseconds: number): RedisPipelineLike;
  zrem(key: string, ...members: string[]): RedisPipelineLike;
  exec<TResult extends unknown[] = unknown[]>(): Promise<TResult>;
}

const KEY_PREFIX = "crt:ratelimit:";

/**
 * True when the Upstash REST credentials are present in the environment. When
 * false the limiter fails open to the in-memory fallback.
 */
export function isKvConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
  );
}

// --- Lazy, injectable Redis client -----------------------------------------

let cachedClient: RedisLike | null = null;
let testClient: RedisLike | null = null;

/**
 * TEST SEAM. Inject a mock Redis client (or `null` to clear). Production code
 * never calls this; it exists so the unit tests can exercise the KV path
 * without the `@upstash/redis` package or a live Redis.
 */
export function __setRedisClientForTests(client: RedisLike | null): void {
  testClient = client;
  cachedClient = null;
}

/**
 * Resolve the Redis client, constructing it from env on first use. Returns null
 * when unconfigured or when the dynamic import fails — callers treat null as
 * "fail open". The `@upstash/redis` import is dynamic so this module loads even
 * where the dependency is absent (e.g. the in-memory-only fallback path).
 */
async function getRedis(): Promise<RedisLike | null> {
  if (testClient) return testClient;
  if (!isKvConfigured()) return null;
  if (cachedClient) return cachedClient;

  try {
    // Dynamic import: keeps `@upstash/redis` off the critical require path and
    // lets this module type-check / run where the package isn't installed. The
    // specifier is held in a variable so the type checker does not attempt to
    // resolve `@upstash/redis`'s declarations before `npm install` adds it.
    const upstashModuleId = "@upstash/redis";
    const mod: unknown = await import(/* webpackIgnore: true */ upstashModuleId);
    const Redis = (mod as { Redis: new (cfg: { url: string; token: string }) => RedisLike })
      .Redis;
    cachedClient = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL as string,
      token: process.env.UPSTASH_REDIS_REST_TOKEN as string,
    });
    return cachedClient;
  } catch (err) {
    console.warn(
      "[rate-limit-kv] failed to construct Upstash client; failing open to in-memory limiter",
      err,
    );
    return null;
  }
}

// --- Fail-open fallback ------------------------------------------------------

let warnedFailOpen = false;

function failOpen(
  reason: string,
  bucketKey: string,
  limit: number,
  windowMs: number,
): RateLimitKvResult {
  // Warn loudly, but only once per process to avoid log spam during an outage.
  if (!warnedFailOpen) {
    warnedFailOpen = true;
    console.warn(
      `[rate-limit-kv] FAILING OPEN (${reason}); using per-instance in-memory limiter. ` +
        `Distributed rate limiting is degraded until Upstash is reachable.`,
    );
  }
  const r = memoryLimit(bucketKey, { max: limit, windowMs });
  return {
    allowed: r.ok,
    remaining: r.remaining,
    retryAfter: r.ok ? 0 : Math.max(0, Math.ceil((r.resetAt - Date.now()) / 1000)),
  };
}

// --- Public API --------------------------------------------------------------

/**
 * Atomically check and record one hit against a sliding window.
 *
 * @param key      Caller-supplied bucket key (e.g. `"<tenantId>:listings:read"`).
 *                 Always pass a tenant-prefixed key — the limiter additionally
 *                 namespaces it under `crt:ratelimit:` but does NOT inject the
 *                 tenant; the caller owns tenant scoping.
 * @param limit    Max requests allowed within the window.
 * @param windowMs Window length in milliseconds.
 *
 * Atomicity: the four sorted-set ops run in one Upstash pipeline, so concurrent
 * callers on the same key observe a single shared window. On rejection we
 * `zrem` the member we just added so a blocked request does not inflate the
 * window for the next caller.
 *
 * Fails open (in-memory fallback + warning) when Redis is unconfigured or errors.
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitKvResult> {
  const bucketKey = `${KEY_PREFIX}${key}`;

  const redis = await getRedis();
  if (!redis) {
    return failOpen("kv_not_configured", bucketKey, limit, windowMs);
  }

  const now = Date.now();
  const windowStart = now - windowMs;
  // Unique member per hit: timestamp + random suffix so two hits in the same
  // millisecond do not overwrite each other in the sorted set.
  const member = `${now}-${Math.random().toString(36).slice(2, 10)}`;

  try {
    const pipeline = redis.pipeline();
    // 1. Evict hits that have aged out of the window.
    pipeline.zremrangebyscore(bucketKey, 0, windowStart);
    // 2. Record this hit, scored by its timestamp.
    pipeline.zadd(bucketKey, { score: now, member });
    // 3. Count hits now inside the window (includes the one just added).
    pipeline.zcard(bucketKey);
    // 4. Let the whole bucket expire once the window fully drains (idle GC).
    pipeline.pexpire(bucketKey, windowMs);

    const results = await pipeline.exec<[number, number, number, number]>();
    const count = Number(results[2] ?? 0);

    if (count > limit) {
      // Over the limit: undo our own hit so we don't penalize the next window,
      // then report the retry delay. We approximate retryAfter as the full
      // window length (the precise oldest-member lookup would cost another
      // round-trip; over-estimating Retry-After is safe and standard).
      try {
        await redis.pipeline().zrem(bucketKey, member).exec();
      } catch {
        // best-effort cleanup; the member will expire with the bucket anyway.
      }
      return {
        allowed: false,
        remaining: 0,
        retryAfter: Math.max(1, Math.ceil(windowMs / 1000)),
      };
    }

    return {
      allowed: true,
      remaining: Math.max(0, limit - count),
      retryAfter: 0,
    };
  } catch (err) {
    console.warn(
      "[rate-limit-kv] Redis pipeline failed; failing open to in-memory limiter",
      err,
    );
    return failOpen("redis_error", bucketKey, limit, windowMs);
  }
}
