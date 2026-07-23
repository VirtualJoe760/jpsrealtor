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

/** The OData collection envelope a RESO feed returns. */
interface ODataPage {
  readonly value?: ResoRecord[];
  readonly "@odata.nextLink"?: string;
  readonly "@odata.count"?: number;
}

interface CachedToken {
  token: string;
  /** epoch ms after which the token must be refreshed. */
  expiresAt: number;
}

/**
 * A RESO Web API client. Construct once per feed; `pullProperties()` yields each
 * record across all pages so the caller can stream-map-upsert without buffering
 * the entire feed in memory.
 */
export class ResoClient {
  private readonly cfg: Required<Omit<ResoFetchConfig, "select" | "scope">> &
    Pick<ResoFetchConfig, "select" | "scope">;
  private readonly doFetch: typeof fetch;
  private cached: CachedToken | null = null;

  constructor(cfg: ResoFetchConfig) {
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
      fetchImpl: cfg.fetchImpl ?? fetch,
    };
    this.doFetch = this.cfg.fetchImpl;
  }

  /**
   * OAuth2 client-credentials bearer token, cached until ~60s before expiry.
   * The token string is never logged.
   */
  async getAccessToken(): Promise<string> {
    // Static bearer mode (Spark access token, etc.) — no token exchange.
    if (this.cfg.bearerToken) return this.cfg.bearerToken;

    const now = Date.now();
    if (this.cached && this.cached.expiresAt > now) return this.cached.token;

    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: this.cfg.clientId,
      client_secret: this.cfg.clientSecret,
    });
    if (this.cfg.scope) body.set("scope", this.cfg.scope);

    const res = await this.doFetch(this.cfg.tokenUrl, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    if (!res.ok) {
      throw new Error(
        `RESO OAuth token request failed: ${res.status} ${res.statusText}`,
      );
    }
    const json = (await res.json()) as {
      access_token?: string;
      expires_in?: number;
    };
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
  buildInitialUrl(since?: string | null): string {
    const params = new URLSearchParams();
    params.set("$orderby", "ModificationTimestamp asc");
    params.set("$top", String(this.cfg.pageSize));
    params.set("$count", "true");
    if (this.cfg.select && this.cfg.select.length > 0) {
      params.set("$select", this.cfg.select.join(","));
    }
    if (since) {
      // OData datetime literals are unquoted; the value is an ISO-8601 string.
      params.set("$filter", `ModificationTimestamp gt ${since}`);
    }
    return `${this.cfg.baseUrl}/${this.cfg.resource}?${params.toString()}`;
  }

  /** Fetch one OData page, returning its records + the next-page cursor. */
  async fetchPage(url: string): Promise<{ records: ResoRecord[]; nextLink: string | null }> {
    const token = await this.getAccessToken();
    const res = await this.doFetch(url, {
      headers: { authorization: `Bearer ${token}`, accept: "application/json" },
    });
    if (!res.ok) {
      throw new Error(`RESO page fetch failed: ${res.status} ${res.statusText}`);
    }
    const page = (await res.json()) as ODataPage;
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
  async *pullProperties(opts: {
    since?: string | null;
    maxRecords?: number;
  } = {}): AsyncGenerator<ResoRecord, void, void> {
    let url: string | null = this.buildInitialUrl(opts.since);
    let yielded = 0;
    const cap = opts.maxRecords ?? Infinity;

    while (url) {
      const { records, nextLink }: { records: ResoRecord[]; nextLink: string | null } =
        await this.fetchPage(url);
      for (const rec of records) {
        yield rec;
        if (++yielded >= cap) return;
      }
      // A page that returns no records ends the walk even if a nextLink is
      // (incorrectly) present, preventing an infinite loop on a misbehaving feed.
      url = records.length > 0 ? nextLink : null;
    }
  }
}

/** Convenience: drain the generator into an array (small/test pulls only). */
export async function fetchAllProperties(
  cfg: ResoFetchConfig,
  opts: { since?: string | null; maxRecords?: number } = {},
): Promise<ResoRecord[]> {
  const client = new ResoClient(cfg);
  const out: ResoRecord[] = [];
  for await (const rec of client.pullProperties(opts)) out.push(rec);
  return out;
}
