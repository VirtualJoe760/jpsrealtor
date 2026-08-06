// packages/chatrealty-sync/src/__tests__/reso-fetch.test.ts
//
// Rate-limit handling + the capped-run checkpoint rule. Both exist because a
// tenant seeded for three sessions and still had zero for-sale inventory:
//   • a single 429 killed the whole run (MLS feeds throttle per API KEY, so the
//     quota an earlier session spent is still spent on the next one), and
//   • a capped `--once` smoke run committed a watermark mid-feed, which tells
//     the next run "everything up to here is synced" and skips the rest forever.
//
// No network, no DB — the fetch is injected.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { ResoClient, RateLimitedError } from "../reso-fetch";
import { runSync } from "../index";

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => body,
    headers: { get: () => null },
  } as unknown as Response;
}

function errorResponse(status: number, retryAfter?: string): Response {
  return {
    ok: false,
    status,
    statusText: status === 429 ? "Too Many Requests" : "Error",
    json: async () => ({}),
    headers: { get: (k: string) => (k.toLowerCase() === "retry-after" ? retryAfter ?? null : null) },
  } as unknown as Response;
}

function client(fetchImpl: typeof fetch) {
  return new ResoClient({
    baseUrl: "https://feed.example/OData",
    bearerToken: "test-token",
    tokenUrl: "",
    clientId: "",
    clientSecret: "",
    fetchImpl,
  });
}

test("429 is retried, not fatal — a transient throttle still returns the page", async () => {
  let calls = 0;
  // Retry-After: 0 keeps the test instant while exercising the header path.
  const fetchImpl = (async () => {
    calls += 1;
    return calls === 1 ? errorResponse(429, "0") : jsonResponse({ value: [{ ListingKey: "A" }] });
  }) as unknown as typeof fetch;

  const { records } = await client(fetchImpl).fetchPage("https://feed.example/OData/Property");
  assert.equal(calls, 2, "should have retried exactly once");
  assert.equal(records.length, 1);
});

test("a throttle that never lets up throws RateLimitedError, not a bare status line", async () => {
  let calls = 0;
  const fetchImpl = (async () => {
    calls += 1;
    return errorResponse(429, "0");
  }) as unknown as typeof fetch;

  await assert.rejects(
    () => client(fetchImpl).fetchPage("https://feed.example/OData/Property"),
    (err: Error) => {
      assert.equal(err.name, "RateLimitedError");
      assert.ok(err instanceof RateLimitedError);
      // The message must tell an agent that nothing is lost — the old one just
      // said "RESO page fetch failed: 429 Too Many Requests".
      assert.match(err.message, /resumes|checkpoint/i);
      return true;
    },
  );
  assert.ok(calls > 1, "should have retried before giving up");
});

test("a non-retryable status fails immediately — no backoff on bad credentials", async () => {
  let calls = 0;
  const fetchImpl = (async () => {
    calls += 1;
    return errorResponse(401);
  }) as unknown as typeof fetch;

  await assert.rejects(() => client(fetchImpl).fetchPage("https://feed.example/OData/Property"));
  assert.equal(calls, 1);
});

test("a CAPPED run never commits a watermark", async () => {
  const statePath = join(tmpdir(), `chatrealty-sync-test-${process.pid}.state`);
  await rm(statePath, { force: true });

  // Empty feed: nothing to upsert, so no DB round-trip is attempted. What is
  // under test is purely whether the state file gets written.
  const fetchImpl = (async () => jsonResponse({ value: [] })) as unknown as typeof fetch;

  await runSync({
    connString: "postgres://unused",
    statePath,
    overlapHours: 26,
    batchSize: 100,
    maxRecords: 25, // the `--once` / `--max` smoke-test shape
    dryRun: false,
    reso: {
      baseUrl: "https://feed.example/OData",
      bearerToken: "test-token",
      tokenUrl: "",
      clientId: "",
      clientSecret: "",
      fetchImpl,
    },
  });

  await assert.rejects(
    () => readFile(statePath, "utf8"),
    (err: NodeJS.ErrnoException) => err.code === "ENOENT",
    "a capped run must leave the checkpoint exactly as it found it",
  );
});
