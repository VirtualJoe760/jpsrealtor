// src/app/.well-known/oauth-protected-resource/[[...slug]]/route.ts
//
// RFC 9728 Protected Resource Metadata for the hosted MCP server.
// Optional catch-all so we answer BOTH the bare well-known path and the
// spec-derived path variant (.../oauth-protected-resource/api/mcp/mcp) that
// newer MCP clients construct from the resource URL.

import { generateProtectedResourceMetadata } from "mcp-handler";
import { getIssuer, getResourceUrl } from "@/lib/mcp-oauth";

export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Cache-Control": "no-store",
};

export async function GET(req: Request) {
  const metadata = generateProtectedResourceMetadata({
    authServerUrls: [getIssuer(req)],
    resourceUrl: getResourceUrl(req),
    additionalMetadata: {
      resource_name: "ChatRealty MCP",
      bearer_methods_supported: ["header"],
    },
  });
  return Response.json(metadata, { headers: CORS });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}
