// isStalled — the liveness rule the status endpoint and the CLI both read.
//
// Every case here is a state a judged session actually reported. The one that
// matters most is "cursor saved, no error recorded, checkpoint cold": that is
// what a FULL database looks like (the error write dies with everything else)
// and what a pre-0.6.3 tenant looks like (no last_error column at all), and it
// used to be indistinguishable from healthy progress.

import { test } from "node:test";
import assert from "node:assert/strict";
import { isStalled, STALE_AFTER_MS, type SliceState } from "../slice.js";

const NOW = Date.parse("2026-08-06T12:00:00.000Z");
const ago = (ms: number) => new Date(NOW - ms).toISOString();

function state(over: Partial<SliceState> = {}): SliceState {
  return {
    watermark: null,
    cursor: null,
    cursorWatermark: null,
    passMode: null,
    passPulled: 0,
    passUpserted: 0,
    lastRunAt: null,
    lastRunUpserted: null,
    lastError: null,
    lastErrorAt: null,
    updatedAt: null,
    ...over,
  };
}

test("no cursor is not a stall — there is nothing in flight to judge", () => {
  assert.equal(isStalled(state(), NOW), null);
  assert.equal(isStalled(state({ watermark: ago(3600_000) }), NOW), null);
});

test("a recorded error stalls immediately, however fresh the checkpoint", () => {
  const s = state({ cursor: "next", updatedAt: ago(1000), lastError: "project size limit exceeded" });
  assert.equal(isStalled(s, NOW), true);
});

test("a cursor moving inside the window is running, not stalled", () => {
  const s = state({ cursor: "next", passPulled: 26_400, updatedAt: ago(STALE_AFTER_MS - 60_000) });
  assert.equal(isStalled(s, NOW), false);
});

test("a cold checkpoint stalls even with NO error recorded — the full-database case", () => {
  const s = state({ cursor: "next", passPulled: 26_400, updatedAt: ago(STALE_AFTER_MS + 60_000) });
  assert.equal(isStalled(s, NOW), true);
});

test("a pre-0.6.3 checkpoint — cursor, no error column, no timestamp — is not reported healthy", () => {
  // The exact shape of the judged report: seeding true, watermark null,
  // lastRunAt null, lastError null, 26,400 listings, permanently stuck.
  const s = state({ cursor: "next", passPulled: 26_400, updatedAt: null });
  assert.equal(isStalled(s, NOW), true);
});
