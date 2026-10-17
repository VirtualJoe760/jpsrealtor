// src/lib/mls-scope.ts
//
// WHAT an agent's database holds: which associations, which property types,
// and how much closed history. One module so the size estimate and the seed
// build the SAME OData filter — an estimate taken with a different filter than
// the pull is how a ~90 MB seed once got a 4,374 MB verdict (data-tiers.md).
//
// Pure: no I/O. Shared by the estimate route, the seed runner and the card.

import { NETWORK_FIELD } from "@/lib/mls-feed-constants";

/** RESO StandardStatus values that make up "for sale" — what a site's browse shows. */
export const FOR_SALE_STATUSES = ["Active", "Active Under Contract", "Pending"] as const;

/**
 * RESO PropertyType values, in the order the card lists them, with the words an
 * agent uses. Mirrors KNOWN_PROPERTY_TYPES in @chatrealty/sync's reso-fetch.ts.
 */
export const PROPERTY_TYPE_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "Residential", label: "Residential for sale" },
  { value: "Residential Lease", label: "Residential lease (rentals)" },
  { value: "Residential Income", label: "Multi-family / income" },
  { value: "Land", label: "Land & lots" },
  { value: "Manufactured In Park", label: "Manufactured / mobile in park" },
  { value: "Commercial Sale", label: "Commercial for sale" },
  { value: "Commercial Lease", label: "Commercial lease" },
  { value: "Business Opportunity", label: "Business opportunity" },
  { value: "Farm", label: "Farm & ranch" },
];

export const DEFAULT_PROPERTY_TYPES = ["Residential"];

/** Closed-history lookback. "none" = for-sale only (the default). */
export const CLOSED_LOOKBACKS = ["none", "1y", "2y", "5y", "all"] as const;
export type ClosedLookback = (typeof CLOSED_LOOKBACKS)[number];

export const CLOSED_LOOKBACK_LABELS: Record<ClosedLookback, string> = {
  none: "No closed listings",
  "1y": "Last 1 year",
  "2y": "Last 2 years",
  "5y": "Last 5 years",
  all: "All closed history",
};

export type MlsScope = {
  networks: string[]; // empty = everything the key reaches (RESO_NETWORKS semantics)
  propertyTypes: string[]; // at least one
  closedLookback: ClosedLookback;
};

const lit = (v: string) => `'${v.replace(/'/g, "''")}'`;
const eqSet = (field: string, values: readonly string[]) =>
  values.length === 1 ? `${field} eq ${lit(values[0])}` : `(${values.map((v) => `${field} eq ${lit(v)}`).join(" or ")})`;

/** YYYY-MM-DD for the earliest CloseDate a lookback keeps, or null for none/all. */
export function closedSince(lookback: ClosedLookback, now = new Date()): string | null {
  const years = lookback === "1y" ? 1 : lookback === "2y" ? 2 : lookback === "5y" ? 5 : 0;
  if (!years) return null;
  const d = new Date(now);
  d.setUTCFullYear(d.getUTCFullYear() - years);
  return d.toISOString().slice(0, 10);
}

/** The status half of the filter: for-sale, plus closed within the lookback. */
export function statusClause(lookback: ClosedLookback, now = new Date()): string {
  const forSale = eqSet("StandardStatus", FOR_SALE_STATUSES);
  if (lookback === "none") return forSale;
  if (lookback === "all") return `(${forSale} or StandardStatus eq 'Closed')`;
  return `(${forSale} or (StandardStatus eq 'Closed' and CloseDate ge ${closedSince(lookback, now)}))`;
}

/** Networks + types — the half that does NOT depend on status. */
export function baseClause(scope: Pick<MlsScope, "networks" | "propertyTypes">): string | null {
  const parts: string[] = [];
  if (scope.networks.length > 0) parts.push(eqSet(NETWORK_FIELD, scope.networks));
  if (scope.propertyTypes.length > 0) parts.push(eqSet("PropertyType", scope.propertyTypes));
  return parts.length ? parts.join(" and ") : null;
}

/** The full filter for "everything this scope keeps". */
export function scopeFilter(scope: MlsScope, now = new Date()): string {
  const base = baseClause(scope);
  const status = statusClause(scope.closedLookback, now);
  return base ? `${base} and ${status}` : status;
}

/**
 * Is a record (as it arrives from the feed) inside the scope? Used on nightly
 * updates, which pull EVERY change in the agent's networks/types regardless of
 * status, so a listing that expired or closed outside the lookback can be
 * removed instead of lingering as "Active" forever.
 */
export function recordInScope(rec: Record<string, unknown>, scope: MlsScope, now = new Date()): boolean {
  const status = String(rec.StandardStatus ?? "");
  if ((FOR_SALE_STATUSES as readonly string[]).includes(status)) return true;
  if (status !== "Closed" || scope.closedLookback === "none") return false;
  if (scope.closedLookback === "all") return true;
  const since = closedSince(scope.closedLookback, now);
  const closeDate = String(rec.CloseDate ?? "").slice(0, 10);
  return !!since && !!closeDate && closeDate >= since;
}

export function normalizeScope(input: any, fallbackNetworks: string[] = []): MlsScope | { error: string } {
  const allowedTypes = new Set(PROPERTY_TYPE_OPTIONS.map((o) => o.value));
  const types = Array.isArray(input?.propertyTypes)
    ? Array.from(new Set((input.propertyTypes as unknown[]).map(String))).filter((t) => allowedTypes.has(t))
    : [];
  if (types.length === 0) return { error: "Pick at least one property type." };
  const lookback = (CLOSED_LOOKBACKS as readonly string[]).includes(input?.closedLookback)
    ? (input.closedLookback as ClosedLookback)
    : "none";
  const networks = Array.isArray(input?.networks) ? (input.networks as unknown[]).map(String) : fallbackNetworks;
  return { networks, propertyTypes: types, closedLookback: lookback };
}
