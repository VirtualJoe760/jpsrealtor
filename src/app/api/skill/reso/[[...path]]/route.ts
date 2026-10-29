// src/app/api/skill/reso/[[...path]]/route.ts
//
// RESO Web API (OData 4.01) — the certifiable surface. Separate from the rest
// of /api/skill/* on purpose: those routes serve camelCase DTOs that the MCP
// server, the site scaffolder and agent sites depend on; this one serves RESO
// Data Dictionary names. Plan + scope: docs/chatrealty-api/reso-compliance-plan.md
//
//   GET /api/skill/reso                     service document
//   GET /api/skill/reso/$metadata           CSDL/EDMX
//   GET /api/skill/reso/Property            collection ($filter $select $orderby $top $skip $count $expand)
//   GET /api/skill/reso/Property('KEY')     one listing
//   GET /api/skill/reso/Property('KEY')/Media
//   GET /api/skill/reso/Lookup              string-enumeration catalog
//
// Lives under /api/skill so the middleware gate (src/proxy.ts) already passes
// it to its own bearer check — no change to the request path every live page
// takes. Auth is the normal crt_live token + `listings:read`.
//
// DATA: dogfood (admin) tokens read Mongo `unified_listings`. Tenant tokens get
// 501 until the Postgres reader exists (plan phase 3) — never the shared
// collection. Tokens with no data source are refused by requireScope.

import { NextRequest, NextResponse } from "next/server";

import { authenticateSkillRequest, requireScope, skillRateLimit } from "@/lib/skill-auth";
import { tenantNotReadyResponse } from "@/lib/skill/tenant-read";
import { buildEdmx } from "@/lib/reso/web-api/edmx";
import { ResoError, errorBody, notFound, badRequest } from "@/lib/reso/web-api/errors";
import { MEDIA_FIELDS, PROPERTY_NAV_MEDIA, fieldMap } from "@/lib/reso/web-api/fields";
import { LOOKUP_FIELD_MAP, lookupRows } from "@/lib/reso/web-api/lookup";
import {
  PROPERTY_FIELD_MAP,
  findProperties,
  getProperty,
  getPropertyMedia,
} from "@/lib/reso/web-api/property-store";
import { parseResoQuery, preferredPageSize, type ResoQuery } from "@/lib/reso/web-api/query";

export const dynamic = "force-dynamic";
// The Lookup catalog's first build per instance scans the listings for
// distinct StateOrProvince (no index on it: ~16s). Vercel's default 15s
// killed it with a 504 on 2026-10-29; after the first build it is cached 1h.
export const maxDuration = 60;

const BASE_PATH = "/api/skill/reso";
const DEFAULT_PAGE = 100;
const MAX_PAGE = 500;
const MEDIA_FIELD_MAP = fieldMap(MEDIA_FIELDS);

const ODATA_HEADERS = {
  "OData-Version": "4.01",
  "Cache-Control": "no-store",
};

function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return NextResponse.json(body, {
    status,
    headers: { ...ODATA_HEADERS, "Content-Type": "application/json;odata.metadata=minimal", ...extra },
  });
}

function fail(err: unknown) {
  if (err instanceof ResoError) return json(errorBody(err), err.status);
  console.error("[reso] unhandled", err);
  return json(errorBody(new ResoError(500, "InternalError", "Internal server error")), 500);
}

/** `Property('a''b')` → { resource: "Property", key: "a'b" } */
function parseSegment(seg: string): { resource: string; key: string | null } {
  const m = /^([A-Za-z]+)\('((?:[^']|'')*)'\)$/.exec(seg);
  if (m) return { resource: m[1], key: m[2].replace(/''/g, "'") };
  if (/^[A-Za-z]+\(.*\)$/.test(seg)) throw badRequest(`Malformed key segment '${seg}'`);
  return { resource: seg, key: null };
}

/** Page size the server applies, then the nextLink for the remainder. */
function pageWindow(q: ResoQuery, prefer: number | null) {
  const cap = Math.min(prefer ?? DEFAULT_PAGE, MAX_PAGE);
  const take = q.top === null ? cap : Math.min(q.top, cap);
  return { take, preferApplied: prefer !== null ? `odata.maxpagesize=${cap}` : null };
}

function nextLink(req: NextRequest, q: ResoQuery, take: number): string {
  const url = new URL(req.url);
  url.searchParams.set("$skip", String(q.skip + take));
  if (q.top !== null) url.searchParams.set("$top", String(q.top - take));
  return url.toString();
}

function contextUrl(origin: string, resource: string, select: string[] | null, entity = false) {
  const sel = select ? `(${select.join(",")})` : "";
  return `${origin}${BASE_PATH}/$metadata#${resource}${sel}${entity ? "/$entity" : ""}`;
}

async function handle(req: NextRequest, segments: string[]): Promise<NextResponse> {
  const origin = new URL(req.url).origin;
  const params = req.nextUrl.searchParams;
  const prefer = preferredPageSize(req.headers.get("prefer"));

  // Service document.
  if (segments.length === 0) {
    return json({
      "@odata.context": `${origin}${BASE_PATH}/$metadata`,
      value: [
        { name: "Property", kind: "EntitySet", url: "Property" },
        { name: "Lookup", kind: "EntitySet", url: "Lookup" },
      ],
    });
  }

  if (segments.length === 1 && segments[0] === "$metadata") {
    const format = params.get("$format");
    if (format && !/xml/i.test(format)) throw badRequest("$metadata is served as application/xml only", "$format");
    return new NextResponse(buildEdmx(), {
      status: 200,
      headers: { ...ODATA_HEADERS, "Content-Type": "application/xml" },
    });
  }

  const { resource, key } = parseSegment(segments[0]);

  if (resource === "Property") {
    const navOpts = { mediaFields: MEDIA_FIELD_MAP, navNames: [PROPERTY_NAV_MEDIA] };

    if (key !== null && segments.length === 2 && segments[1] === PROPERTY_NAV_MEDIA) {
      const media = await getPropertyMedia(key);
      return json({ "@odata.context": contextUrl(origin, "Media", null), value: media });
    }
    if (segments.length > 1) throw notFound(`No such path '${segments.join("/")}'`);

    const q = parseResoQuery(params, PROPERTY_FIELD_MAP, navOpts);
    if (key !== null) {
      const row = await getProperty(key, q);
      return json({ "@odata.context": contextUrl(origin, "Property", q.select, true), ...row });
    }

    const { take, preferApplied } = pageWindow(q, prefer);
    const page = await findProperties(q, take);
    const more = page.hasMore && (q.top === null || q.top > take);
    return json(
      {
        "@odata.context": contextUrl(origin, "Property", q.select),
        ...(page.count !== undefined ? { "@odata.count": page.count } : {}),
        value: page.rows,
        ...(more ? { "@odata.nextLink": nextLink(req, q, take) } : {}),
      },
      200,
      preferApplied ? { "Preference-Applied": preferApplied } : {},
    );
  }

  if (resource === "Lookup") {
    if (segments.length > 1) throw notFound(`No such path '${segments.join("/")}'`);
    const q = parseResoQuery(params, LOOKUP_FIELD_MAP);
    let rows = await lookupRows(q.filter);
    if (key !== null) {
      const row = rows.find((r) => r.LookupKey === key);
      if (!row) throw notFound(`Lookup('${key}') not found`);
      return json({ "@odata.context": contextUrl(origin, "Lookup", null, true), ...row });
    }
    for (const o of [...q.orderby].reverse()) {
      rows = [...rows].sort((a, b) => {
        const c = String(a[o.field.name] ?? "").localeCompare(String(b[o.field.name] ?? ""));
        return o.desc ? -c : c;
      });
    }
    const total = rows.length;
    const { take, preferApplied } = pageWindow(q, prefer);
    const pageRows = rows.slice(q.skip, q.skip + take).map((r) =>
      q.select ? Object.fromEntries(Object.entries(r).filter(([k]) => q.select!.includes(k))) : r,
    );
    const more = q.skip + take < total && (q.top === null || q.top > take);
    return json(
      {
        "@odata.context": contextUrl(origin, "Lookup", q.select),
        ...(q.count ? { "@odata.count": total } : {}),
        value: pageRows,
        ...(more ? { "@odata.nextLink": nextLink(req, q, take) } : {}),
      },
      200,
      preferApplied ? { "Preference-Applied": preferApplied } : {},
    );
  }

  throw notFound(`Resource '${resource}' does not exist`);
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  const auth = await authenticateSkillRequest(req);
  const denied = requireScope(auth, "listings:read");
  if (denied) return denied;
  if (auth.ok === false) return json(errorBody(new ResoError(401, "Unauthorized", "Unauthorized")), 401);
  const rl = skillRateLimit(auth, "reso");
  if (rl) return rl;
  if (auth.tenantId) return tenantNotReadyResponse("The RESO Web API");

  try {
    const { path = [] } = await ctx.params;
    const segments = path.map((s) => {
      try {
        return decodeURIComponent(s);
      } catch {
        return s;
      }
    });
    return await handle(req, segments);
  } catch (err) {
    return fail(err);
  }
}
