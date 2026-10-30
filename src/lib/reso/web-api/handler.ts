// src/lib/reso/web-api/handler.ts
//
// The RESO Web API request handler, shared by every service root:
//   /api/skill/reso       live listings          (src/app/api/skill/reso)
//   /api/skill/reso-cert  frozen certification set (src/app/api/skill/reso-cert)
// The scope (scope.ts) decides which listings a root serves; everything else
// — auth, OData parsing, paging, errors — is identical, so passing RESO's
// tests on one root is evidence for the other.
//
//   GET {root}                     service document
//   GET {root}/$metadata           CSDL/EDMX
//   GET {root}/Property            collection ($filter $select $orderby $top $skip $count $expand)
//   GET {root}/Property('KEY')     one listing
//   GET {root}/Property('KEY')/Media
//   GET {root}/Lookup              string-enumeration catalog
//
// Auth is the normal crt_live token + `listings:read`. DATA: dogfood (admin)
// tokens read Mongo `unified_listings`. Tenant tokens get 501 until the
// Postgres reader exists (plan phase 3) — never the shared collection.

import { NextRequest, NextResponse } from "next/server";

import { authenticateSkillRequest, requireScope, skillRateLimit } from "@/lib/skill-auth";
import { tenantNotReadyResponse } from "@/lib/skill/tenant-read";

import { buildEdmx } from "./edmx";
import { ResoError, errorBody, notFound, badRequest } from "./errors";
import { MEDIA_FIELDS, PROPERTY_NAV_MEDIA, fieldMap } from "./fields";
import { LOOKUP_FIELD_MAP, lookupRows } from "./lookup";
import { PROPERTY_FIELD_MAP, findProperties, getProperty, getPropertyMedia } from "./property-store";
import { parseResoQuery, preferredPageSize, type ResoQuery } from "./query";
import type { ResoScope } from "./scope";

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

function contextUrl(scope: ResoScope, origin: string, resource: string, select: string[] | null, entity = false) {
  const sel = select ? `(${select.join(",")})` : "";
  return `${origin}${scope.basePath}/$metadata#${resource}${sel}${entity ? "/$entity" : ""}`;
}

async function handle(req: NextRequest, segments: string[], scope: ResoScope): Promise<NextResponse> {
  const origin = new URL(req.url).origin;
  const params = req.nextUrl.searchParams;
  const prefer = preferredPageSize(req.headers.get("prefer"));

  // Service document.
  if (segments.length === 0) {
    return json({
      "@odata.context": `${origin}${scope.basePath}/$metadata`,
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
      const media = await getPropertyMedia(key, scope);
      return json({ "@odata.context": contextUrl(scope, origin, "Media", null), value: media });
    }
    if (segments.length > 1) throw notFound(`No such path '${segments.join("/")}'`);

    const q = parseResoQuery(params, PROPERTY_FIELD_MAP, navOpts);
    if (key !== null) {
      const row = await getProperty(key, q, scope);
      return json({ "@odata.context": contextUrl(scope, origin, "Property", q.select, true), ...row });
    }

    const { take, preferApplied } = pageWindow(q, prefer);
    const page = await findProperties(q, take, scope);
    const more = page.hasMore && (q.top === null || q.top > take);
    return json(
      {
        "@odata.context": contextUrl(scope, origin, "Property", q.select),
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
    let rows = await lookupRows(q.filter, scope);
    if (key !== null) {
      const row = rows.find((r) => r.LookupKey === key);
      if (!row) throw notFound(`Lookup('${key}') not found`);
      return json({ "@odata.context": contextUrl(scope, origin, "Lookup", null, true), ...row });
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
        "@odata.context": contextUrl(scope, origin, "Lookup", q.select),
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

/** GET handler for one RESO service root. */
export function resoGet(scope: ResoScope) {
  return async function GET(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
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
      return await handle(req, segments, scope);
    } catch (err) {
      return fail(err);
    }
  };
}
