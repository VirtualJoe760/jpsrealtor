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
