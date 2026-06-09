import type { ServerConfig } from "./config.js";
export declare class HttpError extends Error {
    status: number;
    code: string;
    body: unknown;
    constructor(status: number, code: string, message: string, body: unknown);
}
export type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";
export type RequestOptions = {
    method?: HttpMethod;
    query?: Record<string, string | number | boolean | undefined>;
    body?: unknown;
};
export declare function request<T = unknown>(config: ServerConfig, path: string, opts?: RequestOptions): Promise<T>;
