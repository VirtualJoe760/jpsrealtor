// packages/mcp-server/src/http.ts
//
// Thin HTTP client used by every tool. Wraps fetch with:
//  - bearer auth header
//  - JSON body / Content-Type handling
//  - structured error normalization
//
// Tools never call fetch directly — they go through `request()` so error
// shape and auth handling stay consistent.

import type { ServerConfig } from "./config.js";

export class HttpError extends Error {
  status: number;
  code: string;
  body: unknown;
  constructor(status: number, code: string, message: string, body: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.body = body;
  }
}

export type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

export type RequestOptions = {
  method?: HttpMethod;
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
};

export async function request<T = unknown>(
  config: ServerConfig,
  path: string,
  opts: RequestOptions = {}
): Promise<T> {
  const url = new URL(path.startsWith("http") ? path : `${config.apiBase}${path}`);
  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) {
      if (v === undefined || v === null) continue;
      url.searchParams.set(k, String(v));
    }
  }

  const method = opts.method || "GET";
  const headers: Record<string, string> = {
    Authorization: `Bearer ${config.apiToken}`,
    Accept: "application/json",
  };
  let body: string | undefined;
  if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }

  let res: Response;
  const doFetch = config.fetchImpl || fetch;
  try {
    res = await doFetch(url, { method, headers, body });
  } catch (err: any) {
    throw new HttpError(0, "network", `Network error reaching ChatRealty: ${err?.message || err}`, null);
  }

  const contentType = res.headers.get("content-type") || "";
  let payload: unknown = null;
  if (contentType.includes("application/json")) {
    try {
      payload = await res.json();
    } catch {
      payload = null;
    }
  } else {
    try {
      payload = await res.text();
    } catch {
      payload = null;
    }
  }

  if (!res.ok) {
    const code = pickErrorCode(payload, res.status);
    const message = pickErrorMessage(payload, res.status);
    throw new HttpError(res.status, code, message, payload);
  }
  return payload as T;
}

function pickErrorCode(payload: unknown, status: number): string {
  if (payload && typeof payload === "object" && "error" in payload) {
    const e = (payload as any).error;
    if (typeof e === "string") return e;
  }
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (status === 429) return "rate_limited";
  if (status >= 500) return "upstream_error";
  return "unknown";
}

function pickErrorMessage(payload: unknown, status: number): string {
  if (payload && typeof payload === "object") {
    const p = payload as any;
    if (typeof p.message === "string") return p.message;
    if (typeof p.error === "string") return p.error;
  }
  if (typeof payload === "string" && payload.length < 500) return payload;
  return `HTTP ${status}`;
}
