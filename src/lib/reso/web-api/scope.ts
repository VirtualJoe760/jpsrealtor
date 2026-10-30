// src/lib/reso/web-api/scope.ts
//
// Which listings a RESO service root serves.
//
//   live  /api/skill/reso       every listing in `unified_listings`
//   cert  /api/skill/reso-cert  listings inserted before CERT_CUTOFF — the
//                               fixed data set RESO certifies against
//
// Why a frozen set: reso-cert reads the Lookup catalog once, then spends 1–2 h
// replicating every Property. A listing synced mid-run with a new City
// ("Grizzly Flats", 2026-10-30 06:01) is a value the catalog never
// advertised, and DD 2.1 strict fails the whole run on it. Freezing on insert
// time keeps the Property set and the catalog built from it in agreement.
// RESO allows technology providers to certify on their own data set.
//
// Insert time = the ObjectId timestamp. The sync updates listings in place
// (84,807 of 86,139 had `_id` before the cutoff on 2026-10-30), so the set
// only shrinks as listings leave the feed. Bump CERT_CUTOFF before a
// re-certification if the set has thinned out.

import { ObjectId } from "mongodb";
import type { Document, Filter } from "mongodb";

export interface ResoScope {
  /** Cache key for per-scope state (the Lookup catalog). */
  readonly id: "live" | "cert";
  /** Service root, used in @odata.context. */
  readonly basePath: string;
  /** Mongo filter every read is ANDed with. `{}` = everything. */
  readonly base: Filter<Document>;
}

export const CERT_CUTOFF = "2026-10-30T00:00:00Z";

export const LIVE_SCOPE: ResoScope = { id: "live", basePath: "/api/skill/reso", base: {} };

export const CERT_SCOPE: ResoScope = {
  id: "cert",
  basePath: "/api/skill/reso-cert",
  base: { _id: { $lte: ObjectId.createFromTime(Math.floor(Date.parse(CERT_CUTOFF) / 1000)) } },
};

/** `query` restricted to the scope. */
export function scoped(scope: ResoScope, query: Filter<Document>): Filter<Document> {
  if (Object.keys(scope.base).length === 0) return query;
  if (Object.keys(query).length === 0) return scope.base;
  return { $and: [scope.base, query] };
}
