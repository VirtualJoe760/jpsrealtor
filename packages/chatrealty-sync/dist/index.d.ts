import { type ResoFetchConfig } from "./reso-fetch.js";
export { ResoClient } from "./reso-fetch.js";
export { mapResoProperty } from "./map.js";
export { upsertProperties, buildUpsertSql } from "./write.js";
/** Resolved configuration for one sync run. */
export interface SyncConfig {
    /** ChatRealty database URL (the customer's own DB, provided at provisioning). */
    readonly connString: string;
    readonly reso: ResoFetchConfig;
    /** Where the watermark JSON lives. Default: "./.sync-state". */
    readonly statePath: string;
    /** Hours of overlap subtracted from the watermark on incremental pulls. */
    readonly overlapHours: number;
    /** Upsert batch size. */
    readonly batchSize: number;
    /** Cap records pulled (used by --once smoke runs). */
    readonly maxRecords?: number;
    /** When true, map but DO NOT write (no DB mutation). */
    readonly dryRun: boolean;
}
interface SyncState {
    /** Last successfully-synced MAX ModificationTimestamp (ISO-8601). */
    watermark: string | null;
    lastRunAt: string | null;
    lastRunUpserted: number | null;
}
export interface SyncRunResult {
    readonly mode: "seed" | "incremental";
    readonly pulled: number;
    readonly mapped: number;
    readonly upserted: number;
    readonly skippedKeyless: number;
    readonly newWatermark: string | null;
    readonly dryRun: boolean;
}
/** Read the watermark state file; returns empty state if it doesn't exist. */
export declare function loadState(statePath: string): Promise<SyncState>;
/** Persist the watermark state file (creates parent dir if needed). */
export declare function saveState(statePath: string, state: SyncState): Promise<void>;
/**
 * Compute the incremental watermark to filter on, applying the overlap lookback.
 * Returns null for a full seed (no prior watermark).
 */
export declare function computeSince(state: SyncState, overlapHours: number): string | null;
/**
 * Run one sync. Pulls from the RESO feed, maps, batched-upserts into the
 * customer's ChatRealty database, advances the watermark. Idempotent and
 * delete-free.
 *
 * The pg pool is created and closed inside this function so the CLI exits
 * cleanly; callers needing finer control can use the pure modules directly.
 */
export declare function runSync(config: SyncConfig): Promise<SyncRunResult>;
/**
 * Build a SyncConfig from environment variables. The CLI loads .env.local first.
 *
 * Required env:
 *   CHATREALTY_DB_URL  (or NEON_POOLED_CONN_URI as an internal dogfood fallback)
 *   RESO_BASE_URL, RESO_TOKEN_URL, RESO_CLIENT_ID, RESO_CLIENT_SECRET
 * Optional:
 *   RESO_SCOPE, RESO_RESOURCE, RESO_PAGE_SIZE
 *   SYNC_STATE_PATH (default ./.sync-state)
 *   SYNC_OVERLAP_HOURS (default 26), SYNC_BATCH_SIZE (default 400)
 */
export declare function configFromEnv(env?: NodeJS.ProcessEnv, overrides?: {
    dryRun?: boolean;
    maxRecords?: number;
}): SyncConfig;
