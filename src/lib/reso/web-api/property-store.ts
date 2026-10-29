// src/lib/reso/web-api/property-store.ts
//
// Reads RESO Property (and its embedded Media) from Mongo `unified_listings`.
//
// Raw collection on purpose, not the UnifiedListing model: the model declares
// timestamps as `Date`, but they are stored as ISO strings, so Mongoose would
// cast a string bound to a Date and match nothing.
//
// DOGFOOD ONLY. The route refuses tenant tokens before reaching here; a tenant
// reads its own Postgres (reso-compliance-plan.md phase 3), never this
// collection (ship-strategy: no shared listing pool).

import mongoose from "mongoose";
import type { Document, Filter, Sort } from "mongodb";

import dbConnect from "@/lib/mongoose";

import { notFound } from "./errors";
import { filterToMongo } from "./filter-to-mongo";
import { PROPERTY_FIELDS, fieldMap, type ResoWebField } from "./fields";
import type { ExpandMedia, ResoQuery } from "./query";

export const PROPERTY_FIELD_MAP = fieldMap(PROPERTY_FIELDS);
const KEY_SOURCE = "listingKey";

async function collection() {
  await dbConnect();
  return mongoose.connection.db!.collection("unified_listings");
}

function fieldValue(f: ResoWebField, doc: Document): unknown {
  const v = doc[f.source];
  if (v === undefined || v === null) return null;
  if (f.stored === "isoDatePrefix") return typeof v === "string" ? v.slice(0, 10) : null;
  return v;
}

function mapMedia(doc: Document, opts: ExpandMedia): Record<string, unknown>[] {
  const raw: Document[] = Array.isArray(doc.media) ? doc.media : [];
  const listingKey = doc[KEY_SOURCE];
  let rows = raw.map((m, i) => ({
    // Spark's photo shape (`id`, `name`, `uriLarge`) with RESO-shaped rows as fallback.
    MediaKey: String(m.id ?? m.MediaKey ?? `${listingKey}-${i}`),
    ResourceRecordKey: listingKey ?? null,
    ResourceName: "Property",
    MediaCategory: "Photo",
    MediaURL: m.uriLarge ?? m.MediaURL ?? m.uri1600 ?? m.uri1024 ?? null,
    Order: typeof m.Order === "number" ? m.Order : i,
    ShortDescription: m.name ?? m.ShortDescription ?? null,
  }));
  if (opts.top !== null) rows = rows.slice(0, opts.top);
  if (opts.select) {
    const keep = opts.select;
    rows = rows.map((r) => Object.fromEntries(Object.entries(r).filter(([k]) => keep.includes(k)))) as typeof rows;
  }
  return rows;
}

export function mapProperty(doc: Document, q: Pick<ResoQuery, "select" | "expandMedia">): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of PROPERTY_FIELDS) {
    if (q.select && !q.select.includes(f.name)) continue;
    out[f.name] = fieldValue(f, doc);
  }
  if (q.expandMedia) out.Media = mapMedia(doc, q.expandMedia);
  return out;
}

function projection(q: Pick<ResoQuery, "select" | "expandMedia">): Document {
  const fields = q.select ? PROPERTY_FIELDS.filter((f) => q.select!.includes(f.name)) : PROPERTY_FIELDS;
  const p: Document = { _id: 0, [KEY_SOURCE]: 1 };
  for (const f of fields) p[f.source] = 1;
  if (q.expandMedia) p.media = 1;
  return p;
}

export interface PropertyPage {
  rows: Record<string, unknown>[];
  hasMore: boolean;
  count?: number;
}

export async function findProperties(q: ResoQuery, take: number): Promise<PropertyPage> {
  const query: Filter<Document> = q.filter ? filterToMongo(q.filter, PROPERTY_FIELD_MAP) : {};
  // Always end on the unique key so paging by $skip is stable across pages.
  const sort: Sort = {};
  for (const o of q.orderby) (sort as Record<string, 1 | -1>)[o.field.source] = o.desc ? -1 : 1;
  if (!(KEY_SOURCE in sort)) (sort as Record<string, 1 | -1>)[KEY_SOURCE] = 1;

  const col = await collection();
  const [docs, count] = await Promise.all([
    take === 0
      ? Promise.resolve([] as Document[])
      : col.find(query, { projection: projection(q) }).sort(sort).skip(q.skip).limit(take + 1).toArray(),
    q.count
      ? Object.keys(query).length === 0
        ? col.estimatedDocumentCount()
        : col.countDocuments(query)
      : Promise.resolve(undefined),
  ]);
  return {
    rows: docs.slice(0, take).map((d) => mapProperty(d, q)),
    hasMore: docs.length > take,
    ...(count !== undefined ? { count } : {}),
  };
}

export async function getProperty(key: string, q: Pick<ResoQuery, "select" | "expandMedia">) {
  const col = await collection();
  const doc = await col.findOne({ [KEY_SOURCE]: key }, { projection: projection(q) });
  if (!doc) throw notFound(`Property('${key}') not found`);
  return mapProperty(doc, q);
}

export async function getPropertyMedia(key: string): Promise<Record<string, unknown>[]> {
  const col = await collection();
  const doc = await col.findOne({ [KEY_SOURCE]: key }, { projection: { _id: 0, [KEY_SOURCE]: 1, media: 1 } });
  if (!doc) throw notFound(`Property('${key}') not found`);
  return mapMedia(doc, { select: null, top: null });
}

/** Distinct stored values of one field — feeds the Lookup resource. */
export async function distinctPropertyValues(source: string): Promise<string[]> {
  const col = await collection();
  const vals = await col.distinct(source);
  return vals.filter((v): v is string => typeof v === "string" && v.trim() !== "");
}
