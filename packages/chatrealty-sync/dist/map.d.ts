/** A mapped property row: snake_case column → value, ready for upsert. */
export type PropertyRow = Record<string, unknown>;
/** Optional Claude-derived subdivision, stamped with provenance. */
export interface DerivedSubdivision {
    readonly subdivisionName: string;
    /** "mls" = authoritative; "derived" = Claude-inferred (§8.2). */
    readonly source: "mls" | "derived";
}
export interface MapOptions {
    /** Optional opt-in Claude-derived subdivision (§8.2). */
    readonly derivedSubdivision?: DerivedSubdivision;
    /** Retain the raw record in the `raw` jsonb column. Default true. */
    readonly keepRaw?: boolean;
}
/**
 * Map one RESO Property record to the snake_case `property` row shape.
 *
 * Returns `null` when the record has no `ListingKey` — a keyless record cannot
 * be upserted (it has no primary key) and is dropped, matching the Python
 * pipeline's `flatten.py` (null-on-no-ListingKey) behavior.
 */
export declare function mapResoProperty(record: Record<string, unknown>, opts?: MapOptions): PropertyRow | null;
/** The ordered list of property columns this mapper writes (used by the writer). */
export declare function mappedPropertyColumns(): string[];
