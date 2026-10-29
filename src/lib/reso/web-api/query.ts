// src/lib/reso/web-api/query.ts
//
// OData system query options for /api/skill/reso, validated against the
// DECLARED fields of the resource. Anything malformed or naming an undeclared
// field is a 400 — `reso-cert core` asserts that status for bad syntax.
//
// $filter is NOT parsed here (each store translates it); this only checks it
// is a string.

import { parseExpand } from "@reso-standards/odata-expression-parser";

import { badRequest } from "./errors";
import type { ResoWebField } from "./fields";

export interface OrderBy {
  field: ResoWebField;
  desc: boolean;
}

export interface ExpandMedia {
  select: string[] | null;
  top: number | null;
}

export interface ResoQuery {
  filter: string | null;
  select: string[] | null;
  orderby: OrderBy[];
  top: number | null;
  skip: number;
  count: boolean;
  expandMedia: ExpandMedia | null;
}

function nonNegInt(raw: string | null, name: string): number | null {
  if (raw === null) return null;
  if (!/^\d+$/.test(raw.trim())) throw badRequest(`${name} must be a non-negative integer`, name);
  return Number(raw);
}

function parseSelect(raw: string, fields: Map<string, ResoWebField>, extra: string[] = []): string[] {
  const names = raw.split(",").map((s) => s.trim()).filter(Boolean);
  if (names.length === 0) throw badRequest("$select is empty", "$select");
  for (const n of names) {
    if (n === "*") continue;
    if (!fields.has(n) && !extra.includes(n)) throw badRequest(`Unknown field '${n}' in $select`, "$select");
  }
  return names.includes("*") ? Array.from(fields.keys()) : names;
}

export function parseOrderBy(raw: string, fields: Map<string, ResoWebField>): OrderBy[] {
  return raw.split(",").map((part) => {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)(?:\s+(asc|desc))?\s*$/i.exec(part);
    if (!m) throw badRequest(`Invalid $orderby clause '${part.trim()}'`, "$orderby");
    const f = fields.get(m[1]);
    if (!f) throw badRequest(`Unknown field '${m[1]}' in $orderby`, "$orderby");
    return { field: f, desc: (m[2] ?? "asc").toLowerCase() === "desc" };
  });
}

export function parseResoQuery(
  params: URLSearchParams,
  fields: Map<string, ResoWebField>,
  opts: { mediaFields?: Map<string, ResoWebField>; navNames?: string[] } = {},
): ResoQuery {
  const filter = params.get("$filter");
  const selectRaw = params.get("$select");
  const orderRaw = params.get("$orderby");
  const countRaw = params.get("$count");
  const expandRaw = params.get("$expand");

  if (countRaw !== null && countRaw !== "true" && countRaw !== "false") {
    throw badRequest("$count must be true or false", "$count");
  }

  let expandMedia: ExpandMedia | null = null;
  if (expandRaw !== null) {
    let parsed;
    try {
      parsed = parseExpand(expandRaw);
    } catch (e) {
      throw badRequest(`Invalid $expand: ${(e as Error).message}`, "$expand");
    }
    for (const item of parsed) {
      if (!opts.navNames?.includes(item.property) || !opts.mediaFields) {
        throw badRequest(`Unknown navigation property '${item.property}'`, "$expand");
      }
      expandMedia = {
        select: item.options.$select ? parseSelect(item.options.$select, opts.mediaFields) : null,
        top: typeof item.options.$top === "number" ? item.options.$top : null,
      };
    }
  }

  return {
    filter: filter !== null && filter.trim() !== "" ? filter : null,
    select: selectRaw !== null ? parseSelect(selectRaw, fields, opts.navNames) : null,
    orderby: orderRaw ? parseOrderBy(orderRaw, fields) : [],
    top: nonNegInt(params.get("$top"), "$top"),
    skip: nonNegInt(params.get("$skip"), "$skip") ?? 0,
    count: countRaw === "true",
    expandMedia,
  };
}

/** `Prefer: odata.maxpagesize=N` (OData 4.01 §8.2.8.3), or null. */
export function preferredPageSize(prefer: string | null): number | null {
  const m = prefer ? /odata\.maxpagesize\s*=\s*(\d+)/i.exec(prefer) : null;
  return m ? Math.max(1, Number(m[1])) : null;
}
