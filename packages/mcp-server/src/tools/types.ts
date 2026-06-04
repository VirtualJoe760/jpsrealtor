// packages/mcp-server/src/tools/types.ts
//
// The shape every tool file conforms to. Keeping this tiny so adding a new
// tool is a one-file change: drop a ToolDef into src/tools/, register it in
// src/tools/index.ts, done.

import type { ServerConfig } from "../config.js";

export type ToolDef = {
  /** Tool name as Claude will see it. snake_case. See docs/mcp/tools.md for naming. */
  name: string;
  /** One-paragraph description Claude reads at tool-pick time. */
  description: string;
  /**
   * JSON Schema for tool input. Keep it tight — Claude reads this to know
   * what to pass. Use `additionalProperties: false` unless you really want
   * to accept undocumented fields.
   */
  inputSchema: Record<string, unknown>;
  /**
   * Runs the tool. Receives the parsed input (already validated against the
   * schema by the MCP SDK) and the server config (apiBase + token).
   * Throw an HttpError or any Error to surface a tool failure to Claude.
   * Return any JSON-serializable value; it gets wrapped as text content.
   */
  handler: (input: Record<string, unknown>, config: ServerConfig) => Promise<unknown>;
};
