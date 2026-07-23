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
    /** Injectable fetch — defaults to global fetch. Tests pass a mock. */
    readonly fetchImpl?: typeof fetch;
}
/**
 * A RESO Web API client. Construct once per feed; `pullProperties()` yields each
 * record across all pages so the caller can stream-map-upsert without buffering
 * the entire feed in memory.
 */
export declare class ResoClient {
    private readonly cfg;
    private readonly doFetch;
    private cached;
    constructor(cfg: ResoFetchConfig);
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
    /** Fetch one OData page, returning its records + the next-page cursor. */
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
