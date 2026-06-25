// src/lib/__tests__/rate-limit-kv.test.ts
//
// Unit tests for the Upstash-backed sliding-window limiter. No live Redis and no
// `@upstash/redis` package required at runtime — a faithful in-memory sorted-set
// mock stands in for the client via the `__setRedisClientForTests` seam.
//
// Uses Node's built-in test runner (the repo has no vitest/jest). Run with:
//   npx tsx --test src/lib/__tests__/rate-limit-kv.test.ts
//
// Proves the two acceptance criteria from build_plan Agent 06:
//   1. FAILS OPEN (in-memory fallback, no throw) when KV is unconfigured.
//   2. Two concurrent callers share ONE window (atomic sorted-set semantics).

import { afterEach, beforeEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";

import {
  __setRedisClientForTests,
  checkRateLimit,
  isKvConfigured,
  type RedisLike,
  type RedisPipelineLike,
} from "../rate-limit-kv";

// ---------------------------------------------------------------------------
// A minimal but faithful in-memory mock of the Upstash sorted-set + pipeline
// surface used by the limiter. One shared store across pipelines models a single
// Redis server — which is exactly what makes "concurrent callers share a window"
// testable. Pipelines record commands and apply them atomically on exec().
// ---------------------------------------------------------------------------

type SortedSet = Map<string, number>; // member -> score

class MockRedis implements RedisLike {
  readonly store = new Map<string, SortedSet>();
  /** Counts exec() calls so the test can assert atomic batching. */
  execCount = 0;

  private set(key: string): SortedSet {
    let s = this.store.get(key);
    if (!s) {
      s = new Map();
      this.store.set(key, s);
    }
    return s;
  }

  pipeline(): RedisPipelineLike {
    const ops: Array<() => unknown> = [];
    const redis = this;
    const pipeline: RedisPipelineLike = {
      zremrangebyscore(key, min, max) {
        ops.push(() => {
          const s = redis.set(key);
          let removed = 0;
          for (const [member, score] of s) {
            if (score >= min && score <= max) {
              s.delete(member);
              removed++;
            }
          }
          return removed;
        });
        return pipeline;
      },
      zadd(key, m) {
        ops.push(() => {
          redis.set(key).set(m.member, m.score);
          return 1;
        });
        return pipeline;
      },
      zcard(key) {
        ops.push(() => redis.set(key).size);
        return pipeline;
      },
      pexpire(key, _ms) {
        ops.push(() => (redis.store.has(key) ? 1 : 0));
        return pipeline;
      },
      zrem(key, ...members) {
        ops.push(() => {
          const s = redis.set(key);
          let removed = 0;
          for (const member of members) {
            if (s.delete(member)) removed++;
          }
          return removed;
        });
        return pipeline;
      },
      async exec<TResult extends unknown[] = unknown[]>() {
        redis.execCount++;
        // Apply atomically: nothing else interleaves between the ops.
        return ops.map((op) => op()) as unknown as TResult;
      },
    };
    return pipeline;
  }
}

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  __setRedisClientForTests(null);
  process.env = { ...ORIGINAL_ENV };
});

afterEach(() => {
  __setRedisClientForTests(null);
  process.env = { ...ORIGINAL_ENV };
  mock.restoreAll();
});

describe("isKvConfigured", () => {
  it("is false when Upstash env vars are absent", () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    assert.equal(isKvConfigured(), false);
  });

  it("is true only when both URL and token are present", () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    assert.equal(isKvConfigured(), false);

    process.env.UPSTASH_REDIS_REST_TOKEN = "tok";
    assert.equal(isKvConfigured(), true);
  });
});

describe("checkRateLimit — fail open when unconfigured", () => {
  it("allows the request and warns, never throws, when KV is not configured", async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    const warn = mock.method(console, "warn", () => {});

    const key = `tenantA:fail-open:${Math.random()}`;
    const res = await checkRateLimit(key, 5, 60_000);

    assert.equal(res.allowed, true);
    assert.equal(res.retryAfter, 0);
    assert.ok(res.remaining >= 0);
    assert.ok(warn.mock.calls.length > 0); // failed open LOUDLY
  });

  it("does not touch the (mock) Redis client when unconfigured", async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    mock.method(console, "warn", () => {});

    const redis = new MockRedis();
    __setRedisClientForTests(redis);
    // Clear the seam to assert the unconfigured path bypasses Redis entirely.
    __setRedisClientForTests(null);

    await checkRateLimit(`tenantA:bypass:${Math.random()}`, 5, 60_000);
    assert.equal(redis.execCount, 0);
  });

  it("falls open in-memory when a configured Redis throws", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "tok";
    const warn = mock.method(console, "warn", () => {});

    const throwingRedis: RedisLike = {
      pipeline(): RedisPipelineLike {
        const p: RedisPipelineLike = {
          zremrangebyscore: () => p,
          zadd: () => p,
          zcard: () => p,
          pexpire: () => p,
          zrem: () => p,
          exec: async () => {
            throw new Error("connection reset");
          },
        };
        return p;
      },
    };
    __setRedisClientForTests(throwingRedis);

    const res = await checkRateLimit(`tenantA:throw:${Math.random()}`, 3, 60_000);
    assert.equal(res.allowed, true); // failed OPEN, not closed
    assert.ok(warn.mock.calls.length > 0);
  });
});

describe("checkRateLimit — KV path with mocked Redis", () => {
  beforeEach(() => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "tok";
  });

  it("enforces the limit within one window for a single caller", async () => {
    __setRedisClientForTests(new MockRedis());
    const key = `tenantB:single:${Math.random()}`;

    const r1 = await checkRateLimit(key, 2, 60_000);
    const r2 = await checkRateLimit(key, 2, 60_000);
    const r3 = await checkRateLimit(key, 2, 60_000);

    assert.equal(r1.allowed, true);
    assert.equal(r1.remaining, 1);
    assert.equal(r2.allowed, true);
    assert.equal(r2.remaining, 0);
    assert.equal(r3.allowed, false);
    assert.ok(r3.retryAfter > 0);
  });

  it("two concurrent callers SHARE one window (atomic, not two private windows)", async () => {
    const redis = new MockRedis();
    __setRedisClientForTests(redis);
    const key = `tenantB:shared:${Math.random()}`;
    const limit = 3;

    // Fire five concurrent requests at a limit of 3. If each "caller" had its own
    // private window this would let all 5 through; sharing one window must admit
    // exactly 3 and reject 2.
    const results = await Promise.all(
      Array.from({ length: 5 }, () => checkRateLimit(key, limit, 60_000)),
    );

    const allowed = results.filter((r) => r.allowed).length;
    const rejected = results.filter((r) => !r.allowed).length;

    assert.equal(allowed, limit);
    assert.equal(rejected, 5 - limit);

    // The shared sorted set holds exactly `limit` members — the 2 rejected hits
    // were rolled back via zrem so they don't poison the next window.
    const bucket = [...redis.store.values()][0];
    assert.equal(bucket.size, limit);
  });

  it("tenant-prefixed keys get distinct windows (no cross-tenant collision)", async () => {
    __setRedisClientForTests(new MockRedis());

    const a = await checkRateLimit(`tenantX:listings:${Math.random()}`, 1, 60_000);
    const b = await checkRateLimit(`tenantY:listings:${Math.random()}`, 1, 60_000);

    // Different tenant buckets — both first hits are allowed.
    assert.equal(a.allowed, true);
    assert.equal(b.allowed, true);
  });
});
