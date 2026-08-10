/** A single raw RESO Property record (PascalCase keys straight off the wire). */
export type ResoRecord = Record<string, unknown>;
/** Credentials + endpoints for one MLS RESO Web API feed. */
export interface ResoFetchConfig {
    /** RESO Web API base, e.g. `https://api.bridgedataoutput.com/api/v2/OData`. */
    readonly baseUrl: string;
    /**
     * Static bearer/access token (e.g. a Spark API access token). When set, the
     * OAuth2 client-credentials fields below are ignored — requests send this
     * token directly.
     */
    readonly bearerToken?: string;
    /** OAuth2 token endpoint (client-credentials grant). */
    readonly tokenUrl: string;
    readonly clientId: string;
    readonly clientSecret: string;
    /** Optional OAuth2 scope string. */
    readonly scope?: string;
    /** Resource name on the feed. Defaults to "Property". */
    readonly resource?: string;
    /** Page size for the OData pull. Defaults to 200. */
    readonly pageSize?: number;
    /** Optional explicit `$select`. Omit to pull all fields (recommended for BYOD). */
    readonly select?: readonly string[];
    /**
     * Pull each listing's photos inline via `$expand=Media`. Default TRUE.
     *
     * Without it the Property resource carries `PhotosCount` but no URLs, so a
     * perfectly-seeded tenant renders "No photo available" on every card, every
     * detail page and every map popup — which is what three judged sessions saw.
     * A real-estate site with no photos is not a working site.
     *
     * Auto-negotiated: a feed that rejects the expand (HTTP 400) gets one retry
     * without it and the run continues photo-less rather than dying. Set
     * RESO_EXPAND_MEDIA=off to skip the attempt entirely.
     */
    readonly expandMedia?: boolean;
    /**
     * Restrict the pull to specific MLS networks/associations.
     *
     * One data key often grants access to SEVERAL associations sharing a data
     * network (Joseph's grants 8). Seeding all of them can mean 85k+ listings
     * and ~26 minutes; most agents only serve one or two. When set, the pull
     * adds an OData filter on the network field so only those are synced.
     */
    readonly networks?: readonly string[];
    /**
     * Field that identifies the source association. RESO standard is
     * OriginatingSystemName; Spark-flavored feeds often use MlsId.
     * Defaults to "OriginatingSystemName".
     */
    readonly networkField?: string;
    /**
     * Restrict the pull to specific listing statuses (RESO `StandardStatus`).
     *
     * WHY THIS EXISTS (CRBR 6a7a33bc / 6a7a3405, 2026-08-10): the seed had no
     * status filter at all, so it walked the ENTIRE archive oldest-record-first.
     * On Greater Palm Springs that is 223,935 records projecting ~4,374 MB — for
     * a site whose browse displays ACTIVE FOR-SALE inventory and nothing else.
     * The same feed's active set is ~4,500 rows, roughly 90 MB: about 2% of the
     * pull, comfortably inside even the free allowance. A tenant with working
     * credentials and a correctly-narrowed single association still could not
     * seed one listing, because the ceiling was being spent on closed history the
     * tenant database cannot currently serve (tenant reads 501 on comps).
     *
     * Empty/undefined means NO status filter — the full archive, which is the
     * right choice when comps matter and the plan has room for them.
     */
    readonly statuses?: readonly string[];
    /**
     * Restrict the pull to specific RESO `PropertyType` values. Empty/undefined
     * means every type the feed carries — which on most associations drags in
     * leases, land and commercial alongside the homes a residential site shows.
     */
    readonly propertyTypes?: readonly string[];
    /** Injectable fetch — defaults to global fetch. Tests pass a mock. */
    readonly fetchImpl?: typeof fetch;
}
/**
 * The for-sale set: what a site's browse actually displays. Deliberately NOT
 * just "Active" — a home under contract or pending is still shown (usually
 * badged) right up to close, and dropping them makes listings vanish mid-deal.
 */
export declare const FOR_SALE_STATUSES: readonly ["Active", "Active Under Contract", "Pending"];
/** RESO StandardStatus enum — probed one by one; absent values simply count 0. */
export declare const KNOWN_STATUSES: readonly ["Active", "Active Under Contract", "Pending", "Closed", "Expired", "Canceled", "Withdrawn", "Hold", "Coming Soon", "Incomplete", "Delete"];
/** RESO PropertyType enum — the axis that decides residential vs land vs lease. */
export declare const KNOWN_PROPERTY_TYPES: readonly ["Residential", "Residential Lease", "Residential Income", "Land", "Commercial Sale", "Commercial Lease", "Business Opportunity", "Manufactured In Park", "Farm"];
/** OData clause for an `eq`-set on one field, or null when unfiltered. */
export declare function eqSetClause(field: string, values: readonly string[] | undefined): string | null;
/** OData clause for a status set, or null when unfiltered. */
export declare function statusFilterClause(statuses: readonly string[] | undefined): string | null;
/**
 * The feed throttled us and kept throttling. Distinct from a generic fetch
 * failure because the response is different: wait and resume, don't debug.
 */
export declare class RateLimitedError extends Error {
    readonly status = 429;
    constructor(message: string);
}
export declare const MEDIA_EXPAND = "Media($select=MediaURL,Order,MediaCategory,PreferredPhotoYN,MediaKey)";
/**
 * A RESO Web API client. Construct once per feed; `pullProperties()` yields each
 * record across all pages so the caller can stream-map-upsert without buffering
 * the entire feed in memory.
 */
export declare class ResoClient {
    private readonly cfg;
    private readonly doFetch;
    private cached;
    /** Flipped off for the rest of the run the first time a feed rejects the expand. */
    private mediaExpand;
    constructor(cfg: ResoFetchConfig);
    /** True while this run is still asking the feed for photos. */
    get mediaExpandEnabled(): boolean;
    /**
     * OAuth2 client-credentials bearer token, cached until ~60s before expiry.
     * The token string is never logged.
     */
    getAccessToken(): Promise<string>;
    /**
     * Build the first-page URL for an incremental (or full-seed) pull.
     *
     * @param since  ISO-8601 ModificationTimestamp watermark; omit for a full seed.
     */
    buildInitialUrl(since?: string | null): string;
    /**
     * Exact count of what THIS configuration will pull — same network filter as
     * the seed, no watermark, no sampling. `$top=0&$count=true` costs one
     * request. Returns null when the vendor rejects $count (some do) so the
     * preflight can degrade honestly instead of guessing.
     */
    countScope(): Promise<number | null>;
    /**
     * Discover which MLS networks/associations this data key can see, with a
     * rough per-network count — so the operator can choose to sync ONE instead
     * of blindly seeding all of them (Joseph's key reaches 8 associations,
     * ~85k listings, ~26 minutes for a full seed).
     *
     * Deliberately samples rather than aggregating: `$apply=groupby` is
     * inconsistently supported across RESO/Spark vendors, and a sample is
     * enough to name the networks and show relative share. `sampleSize` pages
     * are pulled (default 5 × pageSize records).
     */
    /**
     * Exact count of records matching one OData clause, IGNORING the configured
     * network/status scope. This is the discovery primitive: it answers "what can
     * this key reach", not "what will this run pull". One request, $top=0.
     */
    countWhere(clause: string | null): Promise<number | null>;
    /**
     * EVERYTHING this key can reach, across all three axes the operator chooses
     * on: associations, property types, statuses — each with an EXACT count.
     *
     * WHY EXACT AND NOT SAMPLED (CRBR 6a7a33bc, 2026-08-10): `discoverNetworks`
     * samples the first N pages, and the feed walks oldest-record-first, so its
     * shares describe the oldest corner of the archive rather than the key. A
     * session read "100.0% Greater Palm Springs" from it and concluded the key
     * reached exactly one association. Sampling is fine for a rough share; it is
     * not fine for a choice that decides whether a seed fits.
     *
     * Deliberately ignores the configured scope — this reports ACCESS, so a key
     * already narrowed to one association still shows every association it could
     * use. Values the feed does not carry come back 0 and are dropped.
     */
    describeAccess(): Promise<{
        field: string;
        total: number | null;
        networks: {
            name: string;
            count: number;
        }[];
        statuses: {
            name: string;
            count: number;
        }[];
        propertyTypes: {
            name: string;
            count: number;
        }[];
    }>;
    discoverNetworks(sampleSize?: number): Promise<{
        field: string;
        networks: {
            name: string;
            sampled: number;
        }[];
        sampled: number;
    }>;
    /**
     * Fetch one OData page, returning its records + the next-page cursor.
     *
     * RETRIES 429 AND 5xx. MLS feeds rate-limit per API KEY, not per run, so the
     * quota a previous session spent is still spent — a fresh seed can hit 429 on
     * its very first page. Before this, that threw instantly and killed the whole
     * run; three consecutive judged sessions reported "sync failed: RESO page
     * fetch failed: 429" as a hard stop. `Retry-After` is honored when the feed
     * sends it (Spark does), else exponential backoff. Exhausting the retries
     * throws `RateLimitedError` so the caller can checkpoint and say something
     * useful instead of a bare status line.
     */
    fetchPage(url: string): Promise<{
        records: ResoRecord[];
        nextLink: string | null;
    }>;
    /**
     * Async-generate every Property record at or after `since`, walking
     * `@odata.nextLink` to the end of the feed.
     *
     * `maxRecords` caps the pull (used by `--once`/smoke runs and tests).
     */
    pullProperties(opts?: {
        since?: string | null;
        maxRecords?: number;
    }): AsyncGenerator<ResoRecord, void, void>;
}
/** Convenience: drain the generator into an array (small/test pulls only). */
export declare function fetchAllProperties(cfg: ResoFetchConfig, opts?: {
    since?: string | null;
    maxRecords?: number;
}): Promise<ResoRecord[]>;
