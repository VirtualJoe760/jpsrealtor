// packages/chatrealty-sync/src/write.ts
//
// Spec 8 — upsertProperties: batched INSERT ... ON CONFLICT (listing_key) DO
// UPDATE into the tenant's ChatRealty-database `property` table.
//
// • Idempotent: re-running with the same records updates in place (keyed on the
//   primary key `listing_key`), never duplicates. NEVER deletes — the sync has
//   no purge path (build_plan §6.8, the April-6-2026 `--purge` incident).
// • Batched: rows are chunked so a single multi-row INSERT stays under Postgres'
//   ~65k bound-parameter limit and keeps round-trips low.
// • geom: the mapper emits a GeoJSON Point STRING in the `geom` slot; the writer
//   wraps that placeholder with `ST_SetSRID(ST_GeomFromGeoJSON($n),4326)` so the
//   PostGIS geometry(Point,4326) column is populated correctly. Every other
//   column binds as a plain parameter.
// • jsonb columns (extras, raw, cma_stats, cashflow_stats) are JSON-stringified
//   before binding so node-pg sends them as text the column casts to jsonb.
//
// Takes a pg `Client` or `Pool` (anything with `.query`) — the caller (index.ts)
// owns the connection lifecycle. No conn string is read or logged here.
import { mappedPropertyColumns } from "./map.js";
const TABLE = "property";
const CONFLICT_KEY = "listing_key";
/** Columns the mapper produces, in a stable order. Computed once. */
const COLUMNS = mappedPropertyColumns();
/** Columns whose value is GeoJSON text needing an ST_GeomFromGeoJSON wrap. */
const GEOM_COLUMNS = new Set(["geom"]);
/** Columns that must be bound as JSON text (jsonb destinations). */
const JSON_COLUMNS = new Set(["extras", "raw", "cma_stats", "cashflow_stats"]);
/**
 * Default batch size. With ~58 property columns, 400 rows ≈ 23k bound params —
 * comfortably under the 65,535 limit. Tunable for throughput.
 */
export const DEFAULT_BATCH_SIZE = 400;
/** The non-key columns that DO UPDATE refreshes (everything except the PK). */
const UPDATE_COLUMNS = COLUMNS.filter((c) => c !== CONFLICT_KEY);
/**
 * Upsert a set of mapped property rows. Idempotent, batched, never deletes.
 *
 * @param client  a pg Client or Pool (caller owns connect/end).
 * @param rows    rows from `mapResoProperty` (already snake_case, keyless ones
 *                dropped by the mapper).
 */
export async function upsertProperties(client, rows, opts = {}) {
    const batchSize = opts.batchSize ?? DEFAULT_BATCH_SIZE;
    let upserted = 0;
    let batches = 0;
    for (let i = 0; i < rows.length; i += batchSize) {
        const chunk = rows.slice(i, i + batchSize);
        if (chunk.length === 0)
            continue;
        const { text, values } = buildUpsertSql(chunk);
        const res = await client.query(text, values);
        upserted += res.rowCount ?? 0;
        batches += 1;
    }
    return { attempted: rows.length, upserted, batches };
}
/**
 * Build the parameterized multi-row upsert for one chunk.
 * Exported for unit-testing the SQL/parameter shape without a DB.
 */
export function buildUpsertSql(chunk) {
    const values = [];
    const rowClauses = [];
    let p = 0;
    for (const row of chunk) {
        const placeholders = [];
        for (const col of COLUMNS) {
            const raw = row[col];
            if (GEOM_COLUMNS.has(col)) {
                if (raw == null) {
                    placeholders.push("NULL");
                }
                else {
                    p += 1;
                    placeholders.push(`ST_SetSRID(ST_GeomFromGeoJSON($${p}),4326)`);
                    values.push(typeof raw === "string" ? raw : JSON.stringify(raw));
                }
            }
            else if (JSON_COLUMNS.has(col)) {
                p += 1;
                placeholders.push(`$${p}`);
                values.push(raw == null ? null : JSON.stringify(raw));
            }
            else {
                p += 1;
                placeholders.push(`$${p}`);
                values.push(raw ?? null);
            }
        }
        rowClauses.push(`(${placeholders.join(", ")})`);
    }
    const colList = COLUMNS.join(", ");
    const setList = UPDATE_COLUMNS.map((c) => `${c} = EXCLUDED.${c}`).join(", ");
    const text = `INSERT INTO ${TABLE} (${colList}) VALUES ${rowClauses.join(", ")} ` +
        `ON CONFLICT (${CONFLICT_KEY}) DO UPDATE SET ${setList}`;
    return { text, values };
}
/** The property columns the writer targets (for diagnostics / doctor). */
export function targetColumns() {
    return COLUMNS;
}
