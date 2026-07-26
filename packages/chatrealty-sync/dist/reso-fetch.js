// packages/chatrealty-sync/src/reso-fetch.ts
//
// Spec 8 — the RESO Web API client for the customer-side sync.
//
// A thin OData pull of the RESO `Property` resource:
//   • OAuth2 client-credentials → bearer token (cached until ~expiry).
//   • Incremental by ModificationTimestamp (`$filter=ModificationTimestamp gt …`).
//   • Server-driven paging via `@odata.nextLink` (the canonical RESO/OData cursor),
//     with a `$top`/`$skip` fallback for feeds that omit nextLink.
//
// Pure-ish: uses the built-in `fetch` (Node ≥18 — declared in package.json
// engines). No DB, no Postgres imports here — this module only speaks HTTP. The
// mapper (`map.ts`) and writer (`write.ts`) are separate so each is unit-testable
// in isolation and the fetch can be MOCKED in the live write test.
//
// Secrets (client id/secret) are passed in by the caller from env (`index.ts`),
// never read from a config file and never logged.
/**
 * A RESO Web API client. Construct once per feed; `pullProperties()` yields each
 * record across all pages so the caller can stream-map-upsert without buffering
 * the entire feed in memory.
 */
export class ResoClient {
    cfg;
    doFetch;
    cached = null;
    constructor(cfg) {
        this.cfg = {
            baseUrl: cfg.baseUrl.replace(/\/+$/, ""),
            bearerToken: cfg.bearerToken ?? "",
            tokenUrl: cfg.tokenUrl,
            clientId: cfg.clientId,
            clientSecret: cfg.clientSecret,
            scope: cfg.scope,
            resource: cfg.resource ?? "Property",
            pageSize: cfg.pageSize ?? 200,
            select: cfg.select,
            networks: cfg.networks,
            networkField: cfg.networkField,
            fetchImpl: cfg.fetchImpl ?? fetch,
        };
        this.doFetch = this.cfg.fetchImpl;
    }
    /**
     * OAuth2 client-credentials bearer token, cached until ~60s before expiry.
     * The token string is never logged.
     */
    async getAccessToken() {
        // Static bearer mode (Spark access token, etc.) — no token exchange.
        if (this.cfg.bearerToken)
            return this.cfg.bearerToken;
        const now = Date.now();
        if (this.cached && this.cached.expiresAt > now)
            return this.cached.token;
        const body = new URLSearchParams({
            grant_type: "client_credentials",
            client_id: this.cfg.clientId,
            client_secret: this.cfg.clientSecret,
        });
        if (this.cfg.scope)
            body.set("scope", this.cfg.scope);
        const res = await this.doFetch(this.cfg.tokenUrl, {
            method: "POST",
            headers: { "content-type": "application/x-www-form-urlencoded" },
            body: body.toString(),
        });
        if (!res.ok) {
            throw new Error(`RESO OAuth token request failed: ${res.status} ${res.statusText}`);
        }
        const json = (await res.json());
        if (!json.access_token) {
            throw new Error("RESO OAuth response missing access_token");
        }
        const ttlMs = (json.expires_in ?? 3600) * 1000;
        this.cached = {
            token: json.access_token,
            expiresAt: now + Math.max(0, ttlMs - 60_000),
        };
        return this.cached.token;
    }
    /**
     * Build the first-page URL for an incremental (or full-seed) pull.
     *
     * @param since  ISO-8601 ModificationTimestamp watermark; omit for a full seed.
     */
    buildInitialUrl(since) {
        const params = new URLSearchParams();
        params.set("$orderby", "ModificationTimestamp asc");
        params.set("$top", String(this.cfg.pageSize));
        params.set("$count", "true");
        if (this.cfg.select && this.cfg.select.length > 0) {
            params.set("$select", this.cfg.select.join(","));
        }
        // Compose the incremental watermark filter with an optional network
        // restriction, so "only sync these 2 associations" works on both a fresh
        // seed and every incremental pull afterward.
        const clauses = [];
        if (since) {
            // OData datetime literals are unquoted; the value is an ISO-8601 string.
            clauses.push(`ModificationTimestamp gt ${since}`);
        }
        const networks = this.cfg.networks;
        if (networks && networks.length > 0) {
            const field = this.cfg.networkField || "OriginatingSystemName";
            const ors = networks
                .map((n) => `${field} eq '${String(n).replace(/'/g, "''")}'`)
                .join(" or ");
            clauses.push(networks.length > 1 ? `(${ors})` : ors);
        }
        if (clauses.length > 0)
            params.set("$filter", clauses.join(" and "));
        return `${this.cfg.baseUrl}/${this.cfg.resource}?${params.toString()}`;
    }
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
    async discoverNetworks(sampleSize = 5) {
        const field = this.cfg.networkField || "OriginatingSystemName";
        const counts = new Map();
        let sampled = 0;
        let url = this.buildInitialUrl(null);
        for (let page = 0; page < sampleSize && url; page++) {
            const { records, nextLink } = await this.fetchPage(url);
            for (const rec of records) {
                sampled += 1;
                const raw = rec[field];
                const name = raw == null || raw === "" ? "(unspecified)" : String(raw);
                counts.set(name, (counts.get(name) ?? 0) + 1);
            }
            url = records.length > 0 ? nextLink : null;
        }
        const networks = [...counts.entries()]
            .map(([name, n]) => ({ name, sampled: n }))
            .sort((a, b) => b.sampled - a.sampled);
        return { field, networks, sampled };
    }
    /** Fetch one OData page, returning its records + the next-page cursor. */
    async fetchPage(url) {
        const token = await this.getAccessToken();
        const res = await this.doFetch(url, {
            headers: { authorization: `Bearer ${token}`, accept: "application/json" },
        });
        if (!res.ok) {
            throw new Error(`RESO page fetch failed: ${res.status} ${res.statusText}`);
        }
        const page = (await res.json());
        const records = Array.isArray(page.value) ? page.value : [];
        const nextLink = page["@odata.nextLink"] ?? null;
        return { records, nextLink };
    }
    /**
     * Async-generate every Property record at or after `since`, walking
     * `@odata.nextLink` to the end of the feed.
     *
     * `maxRecords` caps the pull (used by `--once`/smoke runs and tests).
     */
    async *pullProperties(opts = {}) {
        let url = this.buildInitialUrl(opts.since);
        let yielded = 0;
        const cap = opts.maxRecords ?? Infinity;
        while (url) {
            const { records, nextLink } = await this.fetchPage(url);
            for (const rec of records) {
                yield rec;
                if (++yielded >= cap)
                    return;
            }
            // A page that returns no records ends the walk even if a nextLink is
            // (incorrectly) present, preventing an infinite loop on a misbehaving feed.
            url = records.length > 0 ? nextLink : null;
        }
    }
}
/** Convenience: drain the generator into an array (small/test pulls only). */
export async function fetchAllProperties(cfg, opts = {}) {
    const client = new ResoClient(cfg);
    const out = [];
    for await (const rec of client.pullProperties(opts))
        out.push(rec);
    return out;
}
