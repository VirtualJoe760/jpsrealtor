---
title: ChatRealty API — Rate Limiting (KV sliding window)
status: current
last_verified: 2026-06-25
related: [./build_plan.md, ./architecture.md]
---

# Rate Limiting

> **TL;DR.** Per-tenant request limiting for `/api/skill/*` moves off the
> single-instance in-memory limiter onto an Upstash-Redis **sliding window** that
> is atomic across Vercel instances. It **fails open** (warn + in-memory fallback)
> when Redis is unconfigured or unreachable, so a KV outage degrades limiting but
> never takes the API down (architecture §216 "rate limiting must move off
> in-memory to KV-backed before free signups").

## Files

| File | Role |
|---|---|
| `src/lib/rate-limit-kv.ts` | Distributed limiter. `checkRateLimit(key, limit, windowMs)`, `isKvConfigured()`. Single owner: build_plan Agent 06. |
| `src/lib/rate-limit.ts` | In-memory sliding window. Canonical **fallback** shape + still used for single-instance limits (auth/forgot-password). |
| `src/lib/__tests__/rate-limit-kv.test.ts` | Unit tests (mock Redis): fail-open when unconfigured; two concurrent callers share one window. |

The `skill-auth.ts` integration (`skillRateLimit` → async, `tenantId`-keyed) is
landed by Agent 11, which consumes `checkRateLimit` from here. Agent 06 does not
edit `skill-auth.ts`.

## How it works

A bucket is a Redis **sorted set** keyed `crt:ratelimit:<key>`; each request adds
one member scored by its millisecond timestamp. One Upstash **pipeline** runs the
whole read-modify-write atomically:

1. `zremrangebyscore(key, 0, now - windowMs)` — evict aged-out hits.
2. `zadd(key, { score: now, member })` — record this hit (member = `now-<rand>`,
   unique so same-ms hits don't collide).
3. `zcard(key)` — count hits now inside the window.
4. `pexpire(key, windowMs)` — let an idle bucket self-GC.

On rejection the just-added member is removed with `zrem` so a blocked request
doesn't inflate the next window. Returns `{ allowed, retryAfter, remaining }`.

## Gotchas

- **Caller owns tenant scoping.** Always pass a `tenantId`-prefixed `key`
  (e.g. `"<tenantId>:listings:read"`). The limiter namespaces under
  `crt:ratelimit:` but does **not** inject the tenant — collision-free keys are
  the caller's responsibility.
- **Fails OPEN, not closed.** No Upstash env (`UPSTASH_REDIS_REST_URL` +
  `UPSTASH_REDIS_REST_TOKEN`) or a Redis error → one loud `console.warn` + the
  in-memory fallback (per-instance, degraded). Never a thrown error, never a
  closed gate (build_plan §7 risk row "Rate-limiter fail-open during an abuse
  spike").
- **`@upstash/redis` is a runtime, dynamic import.** The module type-checks and
  loads even before `npm install` adds the dependency; the client is constructed
  lazily on first configured use and cached per process.
- **Test seam.** `__setRedisClientForTests(client | null)` injects a mock client
  so tests exercise the KV path with no live Redis and no installed package.
- **`retryAfter` is the full window length** (seconds), an intentional safe
  over-estimate that avoids a second round-trip to find the oldest member.

## Env

```
UPSTASH_REDIS_REST_URL=https://<db>.upstash.io
UPSTASH_REDIS_REST_TOKEN=<rest-token>
```

Absent both → fail-open to in-memory. Dependency: `@upstash/redis` (added to root
`package.json` by Agent 06 for this wave).
