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
 * The for-sale set: what a site's browse actually displays. Deliberately NOT
 * just "Active" — a home under contract or pending is still shown (usually
 * badged) right up to close, and dropping them makes listings vanish mid-deal.
 */
export const FOR_SALE_STATUSES = [
    "Active",
    "Active Under Contract",
    "Pending",
];
/** RESO StandardStatus enum — probed one by one; absent values simply count 0. */
export const KNOWN_STATUSES = [
    "Active",
    "Active Under Contract",
    "Pending",
    "Closed",
    "Expired",
    "Canceled",
    "Withdrawn",
    "Hold",
    "Coming Soon",
    "Incomplete",
    "Delete",
];
/** RESO PropertyType enum — the axis that decides residential vs land vs lease. */
export const KNOWN_PROPERTY_TYPES = [
    "Residential",
    "Residential Lease",
    "Residential Income",
    "Land",
    "Commercial Sale",
    "Commercial Lease",
    "Business Opportunity",
    "Manufactured In Park",
    "Farm",
];
/** OData clause for an `eq`-set on one field, or null when unfiltered. */
export function eqSetClause(field, values) {
    if (!values || values.length === 0)
        return null;
    const ors = values
        .map((v) => `${field} eq '${String(v).replace(/'/g, "''")}'`)
        .join(" or ");
    return values.length > 1 ? `(${ors})` : ors;
}
/** OData clause for a status set, or null when unfiltered. */
export function statusFilterClause(statuses) {
    return eqSetClause("StandardStatus", statuses);
}
/**
 * The feed throttled us and kept throttling. Distinct from a generic fetch
 * failure because the response is different: wait and resume, don't debug.
 */
export class RateLimitedError extends Error {
    status = 429;
    constructor(message) {
        super(message);
        this.name = "RateLimitedError";
    }
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
/** `Retry-After` is either delta-seconds or an HTTP-date. Cap at 60s. */
function retryAfterMs(header) {
    if (!header)
        return null;
    const secs = Number(header);
    if (Number.isFinite(secs))
        return Math.min(60_000, Math.max(0, secs * 1000));
    const when = new Date(header).getTime();
    if (Number.isNaN(when))
        return null;
    return Math.min(60_000, Math.max(0, when - Date.now()));
}
/** 2s, 4s, 8s, 16s, 32s — capped. */
function backoffMs(attempt) {
    return Math.min(32_000, 2 ** attempt * 1000);
}
// The photo expansion, with a nested $select so a page carries URLs and not the
// feed's entire media catalog (LongDescription/MediaHTML are dead weight here).
// Verified against Spark's RESO endpoint: `@odata.nextLink` echoes the expand,
// so the cursor keeps pulling photos page after page without extra bookkeeping.
export const MEDIA_EXPAND = "Media($select=MediaURL,Order,MediaCategory,PreferredPhotoYN,MediaKey)";
/** Drop `$expand` from a URL — used when a feed rejects the photo expansion. */
function withoutExpand(url) {
    try {
        const u = new URL(url);
        u.searchParams.delete("$expand");
        return u.toString();
    }
    catch {
        return url;
    }
}
/** Does this error body look like the feed refusing `$expand`? */
function isExpandRejection(status, body) {
    return status === 400 && /expand/i.test(body);
}
/** Read an error body without letting a stream failure mask the real error. */
async function peekBody(res) {
    try {
        return (await res.text()).slice(0, 500);
    }
    catch {
        return "";
    }
}
/**
 * A RESO Web API client. Construct once per feed; `pullProperties()` yields each
 * record across all pages so the caller can stream-map-upsert without buffering
 * the entire feed in memory.
 */
export class ResoClient {
    cfg;
    doFetch;
    cached = null;
    /** Flipped off for the rest of the run the first time a feed rejects the expand. */
    mediaExpand;
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
            statuses: cfg.statuses,
            propertyTypes: cfg.propertyTypes,
            expandMedia: cfg.expandMedia ?? true,
            fetchImpl: cfg.fetchImpl ?? fetch,
        };
        this.mediaExpand = this.cfg.expandMedia;
        this.doFetch = this.cfg.fetchImpl;
    }
    /** True while this run is still asking the feed for photos. */
    get mediaExpandEnabled() {
        return this.mediaExpand;
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
        // Photos ride along with the listing they belong to — one pull, no second
        // Media pass to keep in step with the checkpoint.
        if (this.mediaExpand)
            params.set("$expand", MEDIA_EXPAND);
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
        const statusClause = statusFilterClause(this.cfg.statuses);
        if (statusClause)
            clauses.push(statusClause);
        const typeClause = eqSetClause("PropertyType", this.cfg.propertyTypes);
        if (typeClause)
            clauses.push(typeClause);
        if (clauses.length > 0)
            params.set("$filter", clauses.join(" and "));
        return `${this.cfg.baseUrl}/${this.cfg.resource}?${params.toString()}`;
    }
    /**
     * Exact count of what THIS configuration will pull — same network filter as
     * the seed, no watermark, no sampling. `$top=0&$count=true` costs one
     * request. Returns null when the vendor rejects $count (some do) so the
     * preflight can degrade honestly instead of guessing.
     */
    async countScope() {
        const params = new URLSearchParams();
        params.set("$top", "0");
        params.set("$count", "true");
        const clauses = [];
        const networks = this.cfg.networks;
        if (networks && networks.length > 0) {
            const field = this.cfg.networkField || "OriginatingSystemName";
            const ors = networks
                .map((n) => `${field} eq '${String(n).replace(/'/g, "''")}'`)
                .join(" or ");
            clauses.push(networks.length > 1 ? `(${ors})` : ors);
        }
        // The projection must count what the SEED will pull, status filter and all
        // — a count taken without it is the number that sent a tenant to a 4,374 MB
        // verdict for a ~90 MB seed.
        const statusClause = statusFilterClause(this.cfg.statuses);
        if (statusClause)
            clauses.push(statusClause);
        const typeClause = eqSetClause("PropertyType", this.cfg.propertyTypes);
        if (typeClause)
            clauses.push(typeClause);
        if (clauses.length > 0)
            params.set("$filter", clauses.join(" and "));
        const url = `${this.cfg.baseUrl}/${this.cfg.resource}?${params.toString()}`;
        try {
            const token = await this.getAccessToken();
            // this.doFetch, not the global — countScope used the global, so an injected
            // fetch was silently bypassed and every projection test hit the network.
            const res = await this.doFetch(url, {
                headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
                signal: AbortSignal.timeout(20_000),
            });
            if (!res.ok)
                return null;
            const body = (await res.json());
            const n = body["@odata.count"];
            return typeof n === "number" ? n : null;
        }
        catch {
            return null;
        }
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
    /**
     * Exact count of records matching one OData clause, IGNORING the configured
     * network/status scope. This is the discovery primitive: it answers "what can
     * this key reach", not "what will this run pull". One request, $top=0.
     */
    async countWhere(clause) {
        const params = new URLSearchParams();
        params.set("$top", "0");
        params.set("$count", "true");
        if (clause)
            params.set("$filter", clause);
        const url = `${this.cfg.baseUrl}/${this.cfg.resource}?${params.toString()}`;
        try {
            const token = await this.getAccessToken();
            // this.doFetch, not the global — countScope used the global, so an injected
            // fetch was silently bypassed and every projection test hit the network.
            const res = await this.doFetch(url, {
                headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
                signal: AbortSignal.timeout(20_000),
            });
            if (!res.ok)
                return null;
            const body = (await res.json());
            const n = body["@odata.count"];
            return typeof n === "number" ? n : null;
        }
        catch {
            return null;
        }
    }
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
    async describeAccess() {
        const field = this.cfg.networkField || "OriginatingSystemName";
        const q = (f, v) => `${f} eq '${String(v).replace(/'/g, "''")}'`;
        const total = await this.countWhere(null);
        // Association NAMES still have to be discovered by sampling — OData has no
        // DISTINCT — but every name found is then counted EXACTLY.
        const sampled = await this.discoverNetworks(3);
        const networks = [];
        for (const n of sampled.networks) {
            if (n.name === "(unspecified)")
                continue;
            const c = await this.countWhere(q(field, n.name));
            if (c && c > 0)
                networks.push({ name: n.name, count: c });
        }
        const statuses = [];
        for (const s of KNOWN_STATUSES) {
            const c = await this.countWhere(q("StandardStatus", s));
            if (c && c > 0)
                statuses.push({ name: s, count: c });
        }
        const propertyTypes = [];
        for (const p of KNOWN_PROPERTY_TYPES) {
            const c = await this.countWhere(q("PropertyType", p));
            if (c && c > 0)
                propertyTypes.push({ name: p, count: c });
        }
        const bySize = (a, b) => b.count - a.count;
        return {
            field,
            total,
            networks: networks.sort(bySize),
            statuses: statuses.sort(bySize),
            propertyTypes: propertyTypes.sort(bySize),
        };
    }
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
    async fetchPage(url) {
        let attempt = 0;
        // 6 attempts ≈ up to ~2 minutes of backoff — long enough to ride out a
        // short throttle, short enough that a real outage still fails the run.
        const maxAttempts = 6;
        for (;;) {
            // A feed that already refused the photo expansion must not see it again —
            // nextLink cursors echo the original query, so strip it every time.
            const requestUrl = this.mediaExpand ? url : withoutExpand(url);
            const token = await this.getAccessToken();
            const res = await this.doFetch(requestUrl, {
                headers: { authorization: `Bearer ${token}`, accept: "application/json" },
            });
            if (res.ok) {
                const page = (await res.json());
                const records = Array.isArray(page.value) ? page.value : [];
                const nextLink = page["@odata.nextLink"] ?? null;
                return { records, nextLink };
            }
            // PHOTOS ARE OPTIONAL, THE SEED IS NOT. `$expand=Media` is a RESO
            // navigation property every vendor is supposed to serve, and Spark does —
            // but "supposed to" is not "does". A feed that rejects it gets the same
            // page again without photos and the run carries on; the alternative is a
            // seed that dies on page one over a picture.
            if (this.mediaExpand && isExpandRejection(res.status, await peekBody(res))) {
                this.mediaExpand = false;
                console.warn("[chatrealty-sync] this feed rejected $expand=Media — continuing WITHOUT photos.\n" +
                    "[chatrealty-sync] Listings will seed normally but cards will have no images.");
                continue;
            }
            const retryable = res.status === 429 || res.status >= 500;
            if (!retryable || ++attempt >= maxAttempts) {
                if (res.status === 429) {
                    throw new RateLimitedError(`your MLS feed is rate-limiting this API key (HTTP 429) and did not let up after ` +
                        `${attempt} retries. The limit is on the KEY, so it can carry over from an earlier ` +
                        `run. Nothing is lost — the checkpoint is saved; re-run later and it resumes.`);
                }
                throw new Error(`RESO page fetch failed: ${res.status} ${res.statusText}`);
            }
            const waitMs = retryAfterMs(res.headers?.get?.("retry-after")) ?? backoffMs(attempt);
            console.warn(`[chatrealty-sync] feed returned ${res.status}; retrying in ${Math.round(waitMs / 1000)}s ` +
                `(attempt ${attempt}/${maxAttempts - 1})`);
            await sleep(waitMs);
        }
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
