"use strict";
// packages/mcp-server/src/http.ts
//
// Thin HTTP client used by every tool. Wraps fetch with:
//  - bearer auth header
//  - JSON body / Content-Type handling
//  - structured error normalization
//
// Tools never call fetch directly — they go through `request()` so error
// shape and auth handling stay consistent.
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpError = void 0;
exports.request = request;
class HttpError extends Error {
    status;
    code;
    body;
    constructor(status, code, message, body) {
        super(message);
        this.status = status;
        this.code = code;
        this.body = body;
    }
}
exports.HttpError = HttpError;
async function request(config, path, opts = {}) {
    const url = new URL(path.startsWith("http") ? path : `${config.apiBase}${path}`);
    if (opts.query) {
        for (const [k, v] of Object.entries(opts.query)) {
            if (v === undefined || v === null)
                continue;
            url.searchParams.set(k, String(v));
        }
    }
    const method = opts.method || "GET";
    const headers = {
        Authorization: `Bearer ${config.apiToken}`,
        Accept: "application/json",
    };
    let body;
    if (opts.body !== undefined) {
        headers["Content-Type"] = "application/json";
        body = JSON.stringify(opts.body);
    }
    let res;
    try {
        res = await fetch(url, { method, headers, body });
    }
    catch (err) {
        throw new HttpError(0, "network", `Network error reaching ChatRealty: ${err?.message || err}`, null);
    }
    const contentType = res.headers.get("content-type") || "";
    let payload = null;
    if (contentType.includes("application/json")) {
        try {
            payload = await res.json();
        }
        catch {
            payload = null;
        }
    }
    else {
        try {
            payload = await res.text();
        }
        catch {
            payload = null;
        }
    }
    if (!res.ok) {
        const code = pickErrorCode(payload, res.status);
        const message = pickErrorMessage(payload, res.status);
        throw new HttpError(res.status, code, message, payload);
    }
    return payload;
}
function pickErrorCode(payload, status) {
    if (payload && typeof payload === "object" && "error" in payload) {
        const e = payload.error;
        if (typeof e === "string")
            return e;
    }
    if (status === 401)
        return "unauthorized";
    if (status === 403)
        return "forbidden";
    if (status === 404)
        return "not_found";
    if (status === 429)
        return "rate_limited";
    if (status >= 500)
        return "upstream_error";
    return "unknown";
}
function pickErrorMessage(payload, status) {
    if (payload && typeof payload === "object") {
        const p = payload;
        if (typeof p.message === "string")
            return p.message;
        if (typeof p.error === "string")
            return p.error;
    }
    if (typeof payload === "string" && payload.length < 500)
        return payload;
    return `HTTP ${status}`;
}
