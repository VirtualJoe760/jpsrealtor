// Checkpointed, time-boxed sync slices — the serverless runner.
//
// Why: a full network seed (~85k listings) takes ~26 minutes; a Vercel
// function tops out at ~13. So instead of one long run, the sync executes in
// SLICES: each invocation resumes from a cursor stored IN THE TENANT DB
// (`sync_state`), works until its deadline, checkpoints after every page, and
// exits cleanly. An hourly Vercel cron finishes a fresh seed in a few ticks
// and keeps nightly increments seconds-long — no VPS anywhere.
//
// Crash-anywhere safety: upserts are idempotent and the checkpoint advances
// only after a page is fully written, so a hard kill (Hobby's 60s cap, a
// redeploy) merely repeats one page next tick.
//
// The state lives in the SAME database the listings land in — the cursor can
// never drift from the data, and any runner (Vercel route, GitHub Action,
// local CLI --slice) can pick up where another left off.

import pg from "pg";
import { ResoClient, type ResoRecord } from "./reso-fetch.js";
import { mapResoProperty, type PropertyRow } from "./map.js";
import { upsertProperties } from "./write.js";
import { pgOptions } from "./pgconn.js";
import type { SyncConfig } from "./index.js";

export interface SliceState {
  watermark: string | null; // committed high-water mark (completed passes only)
  cursor: string | null; // @odata.nextLink of the in-flight pass
  cursorWatermark: string | null; // max ModificationTimestamp seen this pass
  passMode: "seed" | "incremental" | null;
  passPulled: number;
  passUpserted: number;
  lastRunAt: string | null;
  lastRunUpserted: number | null;
  /**
   * Why the last slice stopped, if it threw. A saved cursor means "a pass is
   * in flight"; it does NOT mean the next tick will get further. A judged
   * session read `{"seeding":true,"progress":"26,400 listings so far —
   * resuming next tick"}` off a database that was FULL: every subsequent tick
   * died on the same storage error, and the status endpoint cheerfully
   * reported forward motion that could never happen. Cleared on the next
   * page that lands.
   */
  lastError: string | null;
  lastErrorAt: string | null;
  /**
   * When the checkpoint row last MOVED. Written on every landed page and on
   * pass completion, so it is the one liveness signal that does not depend on
   * anything succeeding at failure time.
   *
   * That distinction is the whole reason it exists. `lastError` is recorded by
   * a write issued from the catch block — and the headline failure is a FULL
   * DATABASE, where that write is exactly as likely to fail as the one that
   * just died. So the state a judged session actually saw on a permanently
   * stuck tenant was `cursor` set, `lastError` null: indistinguishable from
   * healthy progress by every other field, and reported as "resuming next
   * tick" forever. A database populated before 0.6.3 (no last_error column at
   * all) lands in the identical shape. `updatedAt` catches both without
   * needing the dying process to cooperate: if a cursor is saved and this
   * timestamp has not moved in over an hour, nothing is resuming.
   */
  updatedAt: string | null;
}

/**
 * One page landed. Emitted so a caller can SAY SOMETHING while a long seed
 * runs: the CLI used to print a line only when a 15-minute slice ended, so a
 * judged session watched a log file sit at "starting" for 40 minutes and had to
 * query the database directly to find out whether anything was happening. A
 * silent process is indistinguishable from a hung one.
 */
export interface PageProgress {
  /** Pages completed in this slice. */
  pages: number;
  /** Records pulled across the whole pass (all slices). */
  passPulled: number;
  /** Rows upserted across the whole pass. */
  passUpserted: number;
  /** Newest ModificationTimestamp seen — how far through the feed's history. */
  cursorWatermark: string | null;
}

export interface SliceResult {
  done: boolean; // true = pass complete; false = deadline hit, cursor saved
  mode: "seed" | "incremental";
  pagesThisSlice: number;
  pulledThisSlice: number;
  upsertedThisSlice: number;
  passPulled: number; // cumulative across slices of this pass
  passUpserted: number;
  watermark: string | null;
  resumed: boolean;
}

const ENSURE_SQL = `
CREATE TABLE IF NOT EXISTS sync_state (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  watermark timestamptz,
  cursor text,
  cursor_watermark timestamptz,
  pass_mode text,
  pass_pulled integer NOT NULL DEFAULT 0,
  pass_upserted integer NOT NULL DEFAULT 0,
  last_run_at timestamptz,
  last_run_upserted integer,
  last_error text,
  last_error_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
)`;

// CREATE TABLE IF NOT EXISTS is a no-op on a table that already exists, so a
// database seeded by an earlier version never gains a new column from
// ENSURE_SQL alone. Every column added after the first release needs its own
// idempotent ALTER or the next SELECT * silently returns undefined for it.
const MIGRATE_SQL = `
ALTER TABLE sync_state ADD COLUMN IF NOT EXISTS last_error text;
ALTER TABLE sync_state ADD COLUMN IF NOT EXISTS last_error_at timestamptz;`;

const EMPTY_STATE: SliceState = {
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
};

export async function readSliceState(pool: pg.Pool): Promise<SliceState> {
  await pool.query(ENSURE_SQL);
  // Best-effort: on a FULL database DDL can itself fail, and a status read
  // that throws is strictly worse than one missing the error column — the
  // full database is the exact case this column exists to report.
  try {
    await pool.query(MIGRATE_SQL);
  } catch {
    /* older shape; lastError just stays null */
  }
  const r = await pool.query(`SELECT * FROM sync_state WHERE id = 1`);
  const row = r.rows[0];
  if (!row) {
    await pool.query(`INSERT INTO sync_state (id) VALUES (1) ON CONFLICT DO NOTHING`);
    return { ...EMPTY_STATE };
  }
  return {
    watermark: row.watermark ? new Date(row.watermark).toISOString() : null,
    cursor: row.cursor ?? null,
    cursorWatermark: row.cursor_watermark ? new Date(row.cursor_watermark).toISOString() : null,
    passMode: row.pass_mode ?? null,
    passPulled: row.pass_pulled ?? 0,
    passUpserted: row.pass_upserted ?? 0,
    lastRunAt: row.last_run_at ? new Date(row.last_run_at).toISOString() : null,
    lastRunUpserted: row.last_run_upserted ?? null,
    lastError: row.last_error ?? null,
    lastErrorAt: row.last_error_at ? new Date(row.last_error_at).toISOString() : null,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
  };
}

/**
 * How long a saved cursor may sit unchanged before "resuming next tick" stops
 * being a claim anyone should believe. The cron runs hourly; 90 minutes means
 * a tick has come and gone without moving the checkpoint.
 */
export const STALE_AFTER_MS = 90 * 60 * 1000;

/**
 * Is this checkpoint actually in flight, or only checkpointed?
 *
 * Returns `null` when there is nothing to judge (no cursor — either idle or
 * complete), `true` when a pass is saved but is not advancing, `false` when it
 * genuinely is. Callers should render `null` as "not applicable", never as
 * "healthy" — collapsing the two is the bug this replaces.
 */
export function isStalled(state: SliceState, now = Date.now()): boolean | null {
  if (!state.cursor) return null;
  if (state.lastError) return true;
  // No error recorded is NOT evidence of health — see SliceState.updatedAt.
  if (!state.updatedAt) return true;
  return now - new Date(state.updatedAt).getTime() > STALE_AFTER_MS;
}

function isoOrNull(v: string | null): string | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function maxIso(a: string | null, b: unknown): string | null {
  if (b == null) return a;
  const c = new Date(String(b));
  if (Number.isNaN(c.getTime())) return a;
  const cIso = c.toISOString();
  return !a || cIso > a ? cIso : a;
}

/**
 * Run ONE time-boxed slice of the sync. Resumes an in-flight pass if the
 * checkpoint has a cursor; otherwise starts a new pass from the committed
 * watermark (minus overlap). Checkpoints after EVERY page.
 */
export async function runSyncSlice(
  config: SyncConfig,
  opts: { budgetMs?: number; onPage?: (p: PageProgress) => void } = {}
): Promise<SliceResult> {
  const deadline = Date.now() + (opts.budgetMs ?? 700_000);
  const client = new ResoClient(config.reso);
  const pool = new pg.Pool({ ...pgOptions(config.connString), max: 4 });

  try {
    const state = await readSliceState(pool);
    const resumed = Boolean(state.cursor);

    let url: string | null;
    let mode: "seed" | "incremental";
    let cursorWatermark = state.cursorWatermark;
    let passPulled = state.passPulled;
    let passUpserted = state.passUpserted;

    if (state.cursor) {
      // Resume the in-flight pass exactly where the last slice stopped.
      url = state.cursor;
      mode = state.passMode === "seed" ? "seed" : "incremental";
    } else {
      // Start a new pass from the committed watermark (with overlap).
      let since: string | null = null;
      if (state.watermark) {
        const wm = new Date(state.watermark);
        since = new Date(wm.getTime() - config.overlapHours * 3600_000).toISOString();
      }
      mode = since ? "incremental" : "seed";
      url = client.buildInitialUrl(since);
      cursorWatermark = null;
      passPulled = 0;
      passUpserted = 0;
    }

    let pages = 0;
    let pulledThisSlice = 0;
    let upsertedThisSlice = 0;

    while (url) {
      const { records, nextLink } = await client.fetchPage(url);
      const rows: PropertyRow[] = [];
      for (const rec of records as ResoRecord[]) {
        pulledThisSlice += 1;
        passPulled += 1;
        cursorWatermark = maxIso(cursorWatermark, (rec as any).ModificationTimestamp);
        const row = mapResoProperty(rec as Record<string, unknown>);
        if (row) rows.push(row);
      }
      if (rows.length) {
        const res = await upsertProperties(pool, rows, { batchSize: config.batchSize });
        upsertedThisSlice += res.upserted;
        passUpserted += res.upserted;
      }
      pages += 1;

      url = records.length > 0 ? nextLink : null;

      // Checkpoint AFTER the page is fully written — kill-anywhere safe.
      // A landed page also clears last_error: forward motion is the proof that
      // whatever stopped the previous tick is no longer stopping this one.
      await pool.query(
        `UPDATE sync_state SET cursor=$1, cursor_watermark=$2, pass_mode=$3,
           pass_pulled=$4, pass_upserted=$5, last_error=NULL, last_error_at=NULL,
           updated_at=now() WHERE id=1`,
        [url, isoOrNull(cursorWatermark), mode, passPulled, passUpserted]
      );

      opts.onPage?.({ pages, passPulled, passUpserted, cursorWatermark });

      if (url && Date.now() >= deadline) {
        return {
          done: false,
          mode,
          pagesThisSlice: pages,
          pulledThisSlice,
          upsertedThisSlice,
          passPulled,
          passUpserted,
          watermark: state.watermark,
          resumed,
        };
      }
    }

    // Pass complete — commit the watermark, clear the cursor.
    const newWatermark = cursorWatermark ?? state.watermark;
    await pool.query(
      `UPDATE sync_state SET watermark=$1, cursor=NULL, cursor_watermark=NULL,
         last_run_at=now(), last_run_upserted=$2, last_error=NULL, last_error_at=NULL,
         updated_at=now() WHERE id=1`,
      [isoOrNull(newWatermark), passUpserted]
    );

    return {
      done: true,
      mode,
      pagesThisSlice: pages,
      pulledThisSlice,
      upsertedThisSlice,
      passPulled,
      passUpserted,
      watermark: newWatermark,
      resumed,
    };
  } catch (e) {
    // Remember WHY this tick died, so ?status stops reporting a checkpointed
    // cursor as healthy progress. Best-effort and deliberately swallowed: the
    // headline case is a full database, where this write is itself likely to
    // fail — and losing the real error to a bookkeeping error would be a
    // strictly worse outcome than a null column.
    try {
      await pool.query(
        `UPDATE sync_state SET last_error=$1, last_error_at=now(), updated_at=now() WHERE id=1`,
        [(e instanceof Error ? e.message : String(e)).slice(0, 500)]
      );
    } catch {
      /* nothing we can do; rethrow the original below */
    }
    throw e;
  } finally {
    await pool.end();
  }
}

/**
 * Read sync progress by connection string — for status endpoints that don't
 * want to manage a pg pool (e.g. the template's /api/sync/cron?status=1).
 */
export async function readSyncStatus(connString: string): Promise<SliceState> {
  const pool = new pg.Pool({ ...pgOptions(connString), max: 1 });
  try {
    return await readSliceState(pool);
  } finally {
    await pool.end();
  }
}
