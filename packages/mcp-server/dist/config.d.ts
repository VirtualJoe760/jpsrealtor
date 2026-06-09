export type ServerConfig = {
    apiBase: string;
    apiToken: string;
    /**
     * Optional fetch override. The hosted (in-app) MCP injects an implementation
     * that dispatches /api/skill/* calls to the route handlers IN-PROCESS —
     * avoiding a second serverless function + cold start + network hop. Falls
     * back to the global fetch for the stdio server (which has no in-process
     * routes to call) and for any path the override doesn't recognize.
     */
    fetchImpl?: typeof fetch;
};
export declare function loadConfig(): ServerConfig;
