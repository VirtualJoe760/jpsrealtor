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
}): Promise<SliceResult>;
/**
 * Read sync progress by connection string — for status endpoints that don't
 * want to manage a pg pool (e.g. the template's /api/sync/cron?status=1).
 */
export declare function readSyncStatus(connString: string): Promise<SliceState>;
