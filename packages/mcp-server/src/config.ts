// packages/mcp-server/src/config.ts
//
// Resolves the API base URL and bearer token from env. Read once at startup;
// the MCP server holds these in memory for the life of the process.
//
// Env vars:
//   CHATREALTY_API_TOKEN   — required. crt_live_... bearer token minted in
//                            Settings → Integrations on the agent's ChatRealty site.
//   CHATREALTY_API_BASE    — optional. Defaults to https://jpsrealtor.com.
//                            Override for staging or a self-hosted ChatRealty.

const DEFAULT_API_BASE = "https://jpsrealtor.com";

export type ServerConfig = {
  apiBase: string;
  apiToken: string;
};

export function loadConfig(): ServerConfig {
  const apiToken = process.env.CHATREALTY_API_TOKEN?.trim();
  if (!apiToken) {
    throw new Error(
      "CHATREALTY_API_TOKEN is not set. Mint a token at " +
        "https://jpsrealtor.com/agent/settings → Integrations and run again with " +
        "CHATREALTY_API_TOKEN=crt_live_... in the env."
    );
  }
  if (!apiToken.startsWith("crt_live_")) {
    throw new Error(
      "CHATREALTY_API_TOKEN does not look like a ChatRealty token (expected crt_live_...). " +
        "Mint a fresh token in Settings → Integrations."
    );
  }
  const apiBase = (process.env.CHATREALTY_API_BASE || DEFAULT_API_BASE).replace(/\/+$/, "");
  return { apiBase, apiToken };
}
