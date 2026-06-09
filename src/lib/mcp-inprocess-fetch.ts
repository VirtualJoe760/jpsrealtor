// src/lib/mcp-inprocess-fetch.ts
//
// A fetch() drop-in for the HOSTED MCP server. The MCP tools call
// `${apiBase}/api/skill/*` to fetch data; on Vercel that's an HTTPS hop to a
// SECOND serverless function, which pays its own cold start + Mongo connect on
// top of the MCP function's. That doubled cold-start was the main latency you
// felt (~5s first search).
//
// This dispatches the read endpoints to their Next route handlers IN-PROCESS —
// same warm function, same pooled Mongo connection, no network, no second cold
// start. Anything not in the table (writes, images, instagram, or an unmatched
// path) falls back to the real network fetch, so correctness can't regress.
//
// Auth is unchanged: the in-process NextRequest still carries the crt_live
// bearer token, so each route's authenticateSkillRequest() runs exactly as it
// would over HTTP.

import { NextRequest } from "next/server";

import { GET as me } from "@/app/api/skill/me/route";
import { GET as meProfile } from "@/app/api/skill/me/profile/route";
import { GET as meStats } from "@/app/api/skill/me/stats/route";
import { GET as listingsSearch } from "@/app/api/skill/listings/search/route";
import { GET as closedSearch } from "@/app/api/skill/listings/closed/search/route";
import { GET as listingDetail } from "@/app/api/skill/listings/[listingKey]/route";
import { GET as listingPhotos } from "@/app/api/skill/listings/[listingKey]/photos/route";
import { GET as listingComps } from "@/app/api/skill/listings/[listingKey]/comparables/route";
import { GET as marketStats } from "@/app/api/skill/market/stats/route";
import { GET as mortgageRates } from "@/app/api/skill/market/mortgage-rates/route";
import { GET as neighborhood } from "@/app/api/skill/market/neighborhoods/[slug]/route";
import { GET as subdivision } from "@/app/api/skill/market/subdivisions/[slug]/route";
import { GET as contactsSearch } from "@/app/api/skill/contacts/search/route";
import { GET as recentLeads } from "@/app/api/skill/contacts/recent-leads/route";
import { GET as contactDetail } from "@/app/api/skill/contacts/[id]/route";
import { GET as articlesList } from "@/app/api/skill/articles/route";
import { GET as articleDetail } from "@/app/api/skill/articles/[slugId]/route";
import { GET as lpList } from "@/app/api/skill/landing-pages/route";
import { GET as lpDetail } from "@/app/api/skill/landing-pages/[slugId]/route";

type RouteHandler = (
  req: NextRequest,
  ctx: { params: Promise<Record<string, string>> }
) => Promise<Response>;

type Entry = { re: RegExp; handler: RouteHandler; keys: string[] };

// GET-only — the latency-sensitive read path. ORDER MATTERS: specific paths
// must precede the single-segment catch-alls (e.g. /listings/search before
// /listings/[listingKey]). Writes (POST/PATCH) intentionally fall back to net.
const ROUTES: Entry[] = [
  { re: /^\/api\/skill\/me$/, handler: me as RouteHandler, keys: [] },
  { re: /^\/api\/skill\/me\/profile$/, handler: meProfile as RouteHandler, keys: [] },
  { re: /^\/api\/skill\/me\/stats$/, handler: meStats as RouteHandler, keys: [] },
  { re: /^\/api\/skill\/listings\/search$/, handler: listingsSearch as RouteHandler, keys: [] },
  { re: /^\/api\/skill\/listings\/closed\/search$/, handler: closedSearch as RouteHandler, keys: [] },
  { re: /^\/api\/skill\/listings\/([^/]+)\/photos$/, handler: listingPhotos as RouteHandler, keys: ["listingKey"] },
  { re: /^\/api\/skill\/listings\/([^/]+)\/comparables$/, handler: listingComps as RouteHandler, keys: ["listingKey"] },
  { re: /^\/api\/skill\/listings\/([^/]+)$/, handler: listingDetail as RouteHandler, keys: ["listingKey"] },
  { re: /^\/api\/skill\/market\/stats$/, handler: marketStats as RouteHandler, keys: [] },
  { re: /^\/api\/skill\/market\/mortgage-rates$/, handler: mortgageRates as RouteHandler, keys: [] },
  { re: /^\/api\/skill\/market\/neighborhoods\/([^/]+)$/, handler: neighborhood as RouteHandler, keys: ["slug"] },
  { re: /^\/api\/skill\/market\/subdivisions\/([^/]+)$/, handler: subdivision as RouteHandler, keys: ["slug"] },
  { re: /^\/api\/skill\/contacts\/search$/, handler: contactsSearch as RouteHandler, keys: [] },
  { re: /^\/api\/skill\/contacts\/recent-leads$/, handler: recentLeads as RouteHandler, keys: [] },
  { re: /^\/api\/skill\/contacts\/([^/]+)$/, handler: contactDetail as RouteHandler, keys: ["id"] },
  { re: /^\/api\/skill\/articles$/, handler: articlesList as RouteHandler, keys: [] },
  { re: /^\/api\/skill\/articles\/([^/]+)$/, handler: articleDetail as RouteHandler, keys: ["slugId"] },
  { re: /^\/api\/skill\/landing-pages$/, handler: lpList as RouteHandler, keys: [] },
  { re: /^\/api\/skill\/landing-pages\/([^/]+)$/, handler: lpDetail as RouteHandler, keys: ["slugId"] },
];

const realFetch: typeof fetch = globalThis.fetch.bind(globalThis);

export const inProcessSkillFetch: typeof fetch = async (input: any, init?: any) => {
  try {
    const urlStr =
      typeof input === "string"
        ? input
        : input instanceof URL
        ? input.toString()
        : input?.url || String(input);
    const method = String(
      init?.method || (typeof input === "object" && input?.method) || "GET"
    ).toUpperCase();

    if (method === "GET") {
      const u = new URL(urlStr);
      for (const entry of ROUTES) {
        const m = entry.re.exec(u.pathname);
        if (!m) continue;
        const params: Record<string, string> = {};
        entry.keys.forEach((k, i) => {
          params[k] = decodeURIComponent(m[i + 1]);
        });
        const headers = new Headers(
          init?.headers || (typeof input === "object" ? input.headers : undefined)
        );
        const req = new NextRequest(u.toString(), { method: "GET", headers });
        return await entry.handler(req, { params: Promise.resolve(params) });
      }
    }
  } catch {
    // Any failure in the in-process path → fall back to the network so a routing
    // bug never breaks a tool call.
  }
  return realFetch(input as any, init);
};
