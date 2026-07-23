import { type PropertyRow } from "./map.js";
/** Minimal pg-client surface the writer needs (Client or Pool both satisfy). */
export interface Queryable {
    query(text: string, values?: unknown[]): Promise<{
        rowCount: number | null;
    }>;
}
/**
 * Default batch size. With ~58 property columns, 400 rows ≈ 23k bound params —
 * comfortably under the 65,535 limit. Tunable for throughput.
 */
export declare const DEFAULT_BATCH_SIZE = 400;
export interface UpsertResult {
    /** Rows sent to the DB (mapper already dropped keyless records). */
    readonly attempted: number;
    /** Rows inserted or updated (sum of per-batch rowCount). */
    readonly upserted: number;
    /** Number of batches issued. */
    readonly batches: number;
}
/**
 * Upsert a set of mapped property rows. Idempotent, batched, never deletes.
 *
 * @param client  a pg Client or Pool (caller owns connect/end).
 * @param rows    rows from `mapResoProperty` (already snake_case, keyless ones
 *                dropped by the mapper).
 */
export declare function upsertProperties(client: Queryable, rows: readonly PropertyRow[], opts?: {
    batchSize?: number;
}): Promise<UpsertResult>;
/**
 * Build the parameterized multi-row upsert for one chunk.
 * Exported for unit-testing the SQL/parameter shape without a DB.
 */
export declare function buildUpsertSql(chunk: readonly PropertyRow[]): {
    text: string;
    values: unknown[];
};
/** The property columns the writer targets (for diagnostics / doctor). */
export declare function targetColumns(): readonly string[];
