// packages/chatrealty-sync/src/index.ts
//
// Spec 8 — the daily cron entry point + watermark state for the customer-side
// sync. This is the orchestration layer that wires the three pure modules:
//
//   reso-fetch.ts  (pull) → map.ts (transform) → write.ts (upsert)
//
// Behavior:
//   • FULL SEED on first run (no stored watermark): pull the whole Property feed.
//   • INCREMENTAL after: `$filter=ModificationTimestamp gt <watermark>` using the
//     last successfully-synced ModificationTimestamp, with a safety overlap so a
//     boundary record on a clock skew is never missed (build_plan §6.8 — the
//     "≥26h overlap window" rule, applied here as a configurable lookback).
//   • The watermark advances to the MAX ModificationTimestamp actually written,
//     persisted to a small JSON state file (path from env, default ./.sync-state).
//   • NEVER deletes / never purges.
//
// Config + secrets come from the environment (loaded from .env.local by the CLI),
// never from a checked-in file, never logged.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import pg from "pg";

import { ResoClient, type ResoFetchConfig, type ResoRecord } from "./reso-fetch";
import { mapResoProperty, type PropertyRow } from "./map";
import { upsertProperties, DEFAULT_BATCH_SIZE } from "./write";

export { ResoClient } from "./reso-fetch";
export { mapResoProperty } from "./map";
export { upsertProperties, buildUpsertSql } from "./write";

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

const EMPTY_STATE: SyncState = {
  watermark: null,
  lastRunAt: null,
  lastRunUpserted: null,
};

/** Read the watermark state file; returns empty state if it doesn't exist. */
export async function loadState(statePath: string): Promise<SyncState> {
  try {
    const buf = await readFile(statePath, "utf8");
    const parsed = JSON.parse(buf) as Partial<SyncState>;
    return { ...EMPTY_STATE, ...parsed };
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return { ...EMPTY_STATE };
    throw err;
  }
}

/** Persist the watermark state file (creates parent dir if needed). */
export async function saveState(statePath: string, state: SyncState): Promise<void> {
  await mkdir(dirname(statePath), { recursive: true }).catch(() => {});
  await writeFile(statePath, JSON.stringify(state, null, 2) + "\n", "utf8");
}

/**
 * Compute the incremental watermark to filter on, applying the overlap lookback.
 * Returns null for a full seed (no prior watermark).
 */
export function computeSince(
  state: SyncState,
  overlapHours: number,
): string | null {
  if (!state.watermark) return null;
  const wm = new Date(state.watermark);
  if (Number.isNaN(wm.getTime())) return null;
  const adjusted = new Date(wm.getTime() - overlapHours * 3600_000);
  return adjusted.toISOString();
}

/** Track the max ModificationTimestamp seen across a run. */
function maxTimestamp(a: string | null, candidate: unknown): string | null {
  if (candidate == null) return a;
  const c = new Date(String(candidate));
  if (Number.isNaN(c.getTime())) return a;
  const cIso = c.toISOString();
  if (!a) return cIso;
  return cIso > a ? cIso : a;
}

/**
 * Run one sync. Pulls from the RESO feed, maps, batched-upserts into the
 * customer's ChatRealty database, advances the watermark. Idempotent and
 * delete-free.
 *
 * The pg pool is created and closed inside this function so the CLI exits
 * cleanly; callers needing finer control can use the pure modules directly.
 */
export async function runSync(config: SyncConfig): Promise<SyncRunResult> {
  const state = await loadState(config.statePath);
  const since = computeSince(state, config.overlapHours);
  const mode: "seed" | "incremental" = since ? "incremental" : "seed";

  const client = new ResoClient(config.reso);

  const pool = config.dryRun
    ? null
    : new pg.Pool({
        connectionString: config.connString,
        ssl: { rejectUnauthorized: false },
        max: 4,
      });

  let pulled = 0;
  let skippedKeyless = 0;
  let upserted = 0;
  let newWatermark = state.watermark;
  const buffer: PropertyRow[] = [];

  const flush = async () => {
    if (buffer.length === 0) return;
    if (pool) {
      const res = await upsertProperties(pool, buffer, { batchSize: config.batchSize });
      upserted += res.upserted;
    }
    buffer.length = 0;
  };

  try {
    for await (const rec of client.pullProperties({
      since,
      maxRecords: config.maxRecords,
    })) {
      pulled += 1;
      newWatermark = maxTimestamp(newWatermark, (rec as ResoRecord).ModificationTimestamp);
      const row = mapResoProperty(rec as Record<string, unknown>);
      if (!row) {
        skippedKeyless += 1;
        continue;
      }
      buffer.push(row);
      if (buffer.length >= config.batchSize) await flush();
    }
    await flush();
  } finally {
    if (pool) await pool.end();
  }

  const mapped = pulled - skippedKeyless;

  // Persist the advanced watermark only when we actually wrote (or dry-running we
  // never advance, so a real run later still backfills).
  if (!config.dryRun) {
    await saveState(config.statePath, {
      watermark: newWatermark,
      lastRunAt: new Date().toISOString(),
      lastRunUpserted: upserted,
    });
  }

  return {
    mode,
    pulled,
    mapped,
    upserted,
    skippedKeyless,
    newWatermark,
    dryRun: config.dryRun,
  };
}

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
export function configFromEnv(
  env: NodeJS.ProcessEnv = process.env,
  overrides: { dryRun?: boolean; maxRecords?: number } = {},
): SyncConfig {
  const connString =
    env.CHATREALTY_DB_URL ?? env.NEON_POOLED_CONN_URI ?? "";
  if (!connString) {
    throw new Error(
      "Missing database connection: set CHATREALTY_DB_URL (provided by ChatRealty when your database is provisioned).",
    );
  }
  const missing = ["RESO_BASE_URL", "RESO_TOKEN_URL", "RESO_CLIENT_ID", "RESO_CLIENT_SECRET"].filter(
    (k) => !env[k],
  );
  if (missing.length > 0 && !overrides.dryRun) {
    throw new Error(`Missing RESO credentials/env: ${missing.join(", ")}`);
  }

  return {
    connString,
    statePath: env.SYNC_STATE_PATH ?? "./.sync-state",
    overlapHours: env.SYNC_OVERLAP_HOURS ? Number(env.SYNC_OVERLAP_HOURS) : 26,
    batchSize: env.SYNC_BATCH_SIZE ? Number(env.SYNC_BATCH_SIZE) : DEFAULT_BATCH_SIZE,
    maxRecords: overrides.maxRecords,
    dryRun: overrides.dryRun ?? false,
    reso: {
      baseUrl: env.RESO_BASE_URL ?? "",
      tokenUrl: env.RESO_TOKEN_URL ?? "",
      clientId: env.RESO_CLIENT_ID ?? "",
      clientSecret: env.RESO_CLIENT_SECRET ?? "",
      scope: env.RESO_SCOPE,
      resource: env.RESO_RESOURCE ?? "Property",
      pageSize: env.RESO_PAGE_SIZE ? Number(env.RESO_PAGE_SIZE) : 200,
    },
  };
}
