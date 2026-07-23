/** Minimal pg-client surface the builder needs (Client or Pool both satisfy). */
export interface Queryable {
    query(text: string, values?: unknown[]): Promise<{
        rows: Array<Record<string, unknown>>;
        rowCount: number | null;
    }>;
}
export interface BuildNeighborhoodsResult {
    /** City rows upserted into `cities`. */
    readonly cities: number;
    /** Subdivision rows upserted into `subdivisions`. */
    readonly subdivisions: number;
    /** `cma_stats` rows upserted (1:1 with the subdivisions built). */
    readonly cmaStats: number;
    /** `location_index` rows refreshed (city + subdivision tiers). */
    readonly locationIndex: number;
    /**
     * True when no row carried a subdivision_name, so only the city tier was
     * built. Informational — never an error condition (§8.2).
     */
    readonly subdivisionTierSkipped: boolean;
}
/**
 * Region for a (county, city). Coachella Valley / Joshua Tree are the curated
 * sub-regions; otherwise fall back to the broad region map, then to the county
 * name itself so the NOT NULL `region` column is always satisfied (§8.2 —
 * degrade gracefully, never error).
 */
export declare function deriveRegion(county: string, city: string): string;
/** Kebab-case slug from a free-text name (matches the sync mapper's slug rule). */
export declare function slugify(name: string): string;
/**
 * Recompute the neighborhood hierarchy from the tenant's `property` table.
 * Idempotent: re-running after each sync converges (UPSERTs keyed on the live
 * unique constraints — cities(slug), subdivisions(slug, city)).
 *
 * @param client a pg Client or Pool (caller owns connect/end).
 */
export declare function buildNeighborhoods(client: Queryable): Promise<BuildNeighborhoodsResult>;
