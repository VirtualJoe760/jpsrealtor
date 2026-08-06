import pg from "pg";
import type { SyncConfig } from "./index.js";
export interface SliceState {
    watermark: string | null;
    cursor: string | null;
    cursorWatermark: string | null;
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
    done: boolean;
    mode: "seed" | "incremental";
    pagesThisSlice: number;
    pulledThisSlice: number;
    upsertedThisSlice: number;
    passPulled: number;
    passUpserted: number;
    watermark: string | null;
    resumed: boolean;
}
export declare function readSliceState(pool: pg.Pool): Promise<SliceState>;
/**
 * How long a saved cursor may sit unchanged before "resuming next tick" stops
 * being a claim anyone should believe. The cron runs hourly; 90 minutes means
 * a tick has come and gone without moving the checkpoint.
 */
export declare const STALE_AFTER_MS: number;
/**
 * Is this checkpoint actually in flight, or only checkpointed?
 *
 * Returns `null` when there is nothing to judge (no cursor — either idle or
 * complete), `true` when a pass is saved but is not advancing, `false` when it
 * genuinely is. Callers should render `null` as "not applicable", never as
 * "healthy" — collapsing the two is the bug this replaces.
 */
export declare function isStalled(state: SliceState, now?: number): boolean | null;
/**
 * Run ONE time-boxed slice of the sync. Resumes an in-flight pass if the
 * checkpoint has a cursor; otherwise starts a new pass from the committed
 * watermark (minus overlap). Checkpoints after EVERY page.
 */
export declare function runSyncSlice(config: SyncConfig, opts?: {
    budgetMs?: number;
    onPage?: (p: PageProgress) => void;
}): Promise<SliceResult>;
/**
 * Read sync progress by connection string — for status endpoints that don't
 * want to manage a pg pool (e.g. the template's /api/sync/cron?status=1).
 */
export declare function readSyncStatus(connString: string): Promise<SliceState>;
