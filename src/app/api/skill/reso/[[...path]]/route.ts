// src/app/api/skill/reso/[[...path]]/route.ts
//
// RESO Web API (OData 4.01) over LIVE listings. Separate from the rest of
// /api/skill/* on purpose: those routes serve camelCase DTOs that the MCP
// server, the site scaffolder and agent sites depend on; this one serves RESO
// Data Dictionary names. Logic: src/lib/reso/web-api/handler.ts.
// Plan + scope: docs/chatrealty-api/reso-compliance-plan.md
//
// Lives under /api/skill so the middleware gate (src/proxy.ts) already passes
// it to its own bearer check — no change to the request path every live page
// takes.

import { resoGet } from "@/lib/reso/web-api/handler";
import { LIVE_SCOPE } from "@/lib/reso/web-api/scope";

export const dynamic = "force-dynamic";
// The Lookup catalog's first build per instance scans the listings for
// distinct StateOrProvince (no index on it: ~16s). Vercel's default 15s
// killed it with a 504 on 2026-10-29; after the first build it is cached 1h.
export const maxDuration = 60;

export const GET = resoGet(LIVE_SCOPE);
