// src/lib/listings/cashflow-query.ts
//
// Read layer over the VPS-precomputed rental cash-flow data (a pure read — no
// request-time math beyond re-deriving custom scenarios from stored fixedCosts).
// ONE source of truth shared by both consumers:
//   • the MCP skill routes (/api/skill/listings/cashflow, …) → Claude tools
//   • the web-chat tool executors (src/lib/chat-v2/tool-executors.ts) → app chat
//
// Data shapes (written by build-cashflow.py / build-rent-rates.py):
//   • unified_listings.cashflowStats  — rentEstimate, capRatePct, fixedCosts,
//     scenarios.down20/down25 (each with monthlyCashflow + cashflows flag),
//     assumptions.
//   • rent_rates (by postalCode) + subdivisions.rentStats — going rate.

import dbConnect from "@/lib/mongoose";
import UnifiedListing from "@/models/unified-listing";
import Subdivision from "@/models/subdivisions";
import RentRate from "@/models/rent-rate";
import { getCurrentMortgageRate } from "@/lib/listings/mortgage-rate";

// The builder ran cash-flow math on some junk listings (e.g. a $795 "list
// price"), producing absurd cap rates (3000%+) that would float to the top of a
// cash-flow sort. Guard with a price floor + a cap-rate sanity ceiling — no
// legitimate residential listing is under $50k or has a 30%+ cap rate.
const MIN_LIST_PRICE = 50_000;
const MAX_SANE_CAP_PCT = 30;

export type SortBy = "cashflow" | "capRate" | "cashOnCash" | "price";

export interface FindCashflowParams {
  city?: string;
  postalCode?: string;
  subdivision?: string;
  downPaymentPct?: number; // default 0.20
  minMonthlyCashflow?: number; // default 0
  maxPrice?: number;
  beds?: number;
  mortgageRate?: number; // override → re-derive path
  sortBy?: SortBy;
  limit?: number; // default 25
}

const LISTING_FIELDS =
  "listingKey slugAddress unparsedAddress city postalCode subdivisionName listPrice " +
  "bedsTotal bedroomsTotal bathsTotal bathroomsTotalInteger livingArea yearBuilt " +
  "daysOnMarket standardStatus latitude longitude coordinates primaryPhotoUrl media cashflowStats";

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function saneCap(capRatePct: any): boolean {
  if (capRatePct == null) return true; // some legit listings carry no cap rate
  return typeof capRatePct === "number" && capRatePct <= MAX_SANE_CAP_PCT && capRatePct >= -50;
}

function scenarioKey(downPct: number): string {
  return `down${Math.round(downPct * 100)}`;
}

/**
 * Re-derive a financing scenario from the stored debt-free `fixedCosts` +
 * `listPrice` — lets us answer "with 30% down at 6.5%" without a rebuild.
 */
export function deriveCashflow(cf: any, downPct: number, annualRate: number, termYears = 30) {
  const price = cf.listPrice;
  const loan = price * (1 - downPct);
  const r = annualRate / 12;
  const n = termYears * 12;
  const pi = r === 0 ? loan / n : (loan * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  const f = cf.fixedCosts || {};
  const monthly =
    (f.grossRent - f.vacancy) -
    (f.propertyTax + f.insurance + f.hoa + f.management + f.maintenance) -
    pi;
  const cashIn = price * downPct + price * (cf.assumptions?.closingCostPct ?? 0.03);
  return {
    downPct,
    monthlyCashflow: Math.round(monthly),
    annualCashflow: Math.round(monthly * 12),
    monthlyPI: Math.round(pi),
    cashOnCashPct: cashIn ? +(((monthly * 12) / cashIn) * 100).toFixed(2) : null,
    cashflows: monthly > 0,
  };
}

function rawPhotoUrl(l: any): string | null {
  return (
    l.media?.[0]?.uriLarge ||
    l.media?.[0]?.uri1024 ||
    l.media?.[0]?.uri800 ||
    l.media?.[0]?.uri640 ||
    l.media?.[0]?.MediaURL ||
    l.media?.[0]?.Uri800 ||
    l.primaryPhotoUrl ||
    null
  );
}

/** Normalized listing-with-cashflow row consumed by both render surfaces. */
export interface CashflowListing {
  listingKey: string;
  slugAddress: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  subdivision: string | null;
  price: number | null;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  yearBuilt: number | null;
  daysOnMarket: number | null;
  latitude: number | null;
  longitude: number | null;
  primaryPhotoUrl: string | null;
  monthlyRent: number | null;
  rentConfidence: string | null;
  rentSource: string | null;
  capRatePct: number | null;
  monthlyCashflow: number | null;
  annualCashflow: number | null;
  cashOnCashPct: number | null;
  cashflows: boolean | null;
}

function mapRow(l: any, scenario: any): CashflowListing {
  const cf = l.cashflowStats || {};
  return {
    listingKey: l.listingKey,
    slugAddress: l.slugAddress || null,
    address: l.unparsedAddress || null,
    city: l.city || null,
    postalCode: l.postalCode || null,
    subdivision: l.subdivisionName || null,
    price: l.listPrice ?? null,
    beds: l.bedsTotal ?? l.bedroomsTotal ?? null,
    baths: l.bathsTotal ?? l.bathroomsTotalInteger ?? null,
    sqft: l.livingArea ?? null,
    yearBuilt: l.yearBuilt ?? null,
    daysOnMarket: l.daysOnMarket ?? null,
    latitude: typeof l.latitude === "number" ? l.latitude : l.coordinates?.coordinates?.[1] ?? null,
    longitude: typeof l.longitude === "number" ? l.longitude : l.coordinates?.coordinates?.[0] ?? null,
    primaryPhotoUrl: rawPhotoUrl(l),
    monthlyRent: cf.rentEstimate?.monthlyRent ?? null,
    rentConfidence: cf.rentEstimate?.confidence ?? null,
    rentSource: cf.rentEstimate?.source ?? null,
    capRatePct: cf.capRatePct ?? null,
    monthlyCashflow: scenario?.monthlyCashflow ?? null,
    annualCashflow: scenario?.annualCashflow ?? null,
    cashOnCashPct: scenario?.cashOnCashPct ?? null,
    cashflows: scenario?.cashflows ?? null,
  };
}

export interface FindCashflowResult {
  listings: CashflowListing[];
  meta: {
    count: number;
    downPaymentPct: number;
    mortgageRate: number | null;
    sortBy: SortBy;
    area: string | null;
    derived: boolean; // true when scenarios were re-derived (custom down%/rate)
    assumptions: any | null; // echo from the data — never hard-code
  };
}

/**
 * Find active for-sale listings that cash-flow in an area.
 *  - Fast path: down 20%/25% and no rate override → read the precomputed scenario.
 *  - Re-derive path: custom down% or rate → recompute from fixedCosts.
 */
export async function findCashflowingListings(params: FindCashflowParams): Promise<FindCashflowResult> {
  await dbConnect();
  const {
    city,
    postalCode,
    subdivision,
    downPaymentPct = 0.2,
    minMonthlyCashflow = 0,
    maxPrice,
    beds,
    mortgageRate,
    sortBy = "cashflow",
    limit = 25,
  } = params;

  const baseMatch: any = {
    propertyType: "A",
    standardStatus: { $in: ["Active", "ComingSoon"] },
    listPrice: maxPrice ? { $gte: MIN_LIST_PRICE, $lte: maxPrice } : { $gte: MIN_LIST_PRICE },
    "cashflowStats.rentEstimate.monthlyRent": { $gt: 0 },
  };
  if (city) baseMatch.city = city;
  if (postalCode) baseMatch.postalCode = postalCode;
  if (subdivision) baseMatch.subdivisionName = new RegExp(`^${escapeRegex(subdivision)}$`, "i");
  if (beds) baseMatch.bedsTotal = beds;

  const dk = scenarioKey(downPaymentPct);
  const PRECOMPUTED_RATE = 0.07; // the static rate the backend baked into cashflowStats

  // Default to the CURRENT market 30-yr rate (same source as get_mortgage_rates),
  // not the baked-in 7%. Re-derive each listing unless the effective rate equals
  // the precomputed assumption (then the fast precomputed read is exact).
  let effectiveRate: number;
  let rateSource: "user" | "live" | "fallback";
  if (mortgageRate != null) {
    effectiveRate = mortgageRate;
    rateSource = "user";
  } else {
    const live = await getCurrentMortgageRate();
    effectiveRate = live.rate;
    rateSource = live.source;
  }

  const fastPath = (dk === "down20" || dk === "down25") && Math.abs(effectiveRate - PRECOMPUTED_RATE) < 1e-6;

  let listings: CashflowListing[] = [];
  let derived = !fastPath;
  let assumptions: any = null;

  if (fastPath) {
    const cfField = `cashflowStats.scenarios.${dk}`;
    const q = { ...baseMatch, [`${cfField}.monthlyCashflow`]: { $gte: minMonthlyCashflow } };
    const sortField = (
      {
        cashflow: `${cfField}.monthlyCashflow`,
        capRate: "cashflowStats.capRatePct",
        cashOnCash: `${cfField}.cashOnCashPct`,
        price: "listPrice",
      } as Record<SortBy, string>
    )[sortBy];
    const rows = await UnifiedListing.find(q)
      .sort({ [sortField]: sortBy === "price" ? 1 : -1 })
      .limit(limit)
      .select(LISTING_FIELDS)
      .lean<any[]>();
    const clean = rows.filter((r) => saneCap(r.cashflowStats?.capRatePct));
    listings = clean.map((r) => mapRow(r, r.cashflowStats?.scenarios?.[dk]));
    assumptions = clean[0]?.cashflowStats?.assumptions ?? null;
    effectiveRate = assumptions?.mortgageRate ?? null;
  } else {
    derived = true;
    const preMatch = { ...baseMatch };
    // For the DEFAULT rate, down20.cashflows is a superset of any higher-down
    // winner → cheap pre-narrow. For a custom rate, scan the area.
    if (mortgageRate == null) preMatch["cashflowStats.scenarios.down20.cashflows"] = true;
    const rows = await UnifiedListing.find(preMatch).limit(3000).select(LISTING_FIELDS).lean<any[]>();
    const computed = rows
      .filter((r) => saneCap(r.cashflowStats?.capRatePct) && r.cashflowStats?.fixedCosts && r.cashflowStats?.listPrice)
      .map((r) => {
        const rate = mortgageRate ?? r.cashflowStats?.assumptions?.mortgageRate ?? 0.07;
        return { row: r, sc: deriveCashflow(r.cashflowStats, downPaymentPct, rate) };
      })
      .filter((x) => x.sc.cashflows && x.sc.monthlyCashflow >= minMonthlyCashflow);
    computed.sort((a, b) => {
      if (sortBy === "price") return (a.row.listPrice ?? 0) - (b.row.listPrice ?? 0);
      if (sortBy === "capRate") return (b.row.cashflowStats?.capRatePct ?? 0) - (a.row.cashflowStats?.capRatePct ?? 0);
      if (sortBy === "cashOnCash") return (b.sc.cashOnCashPct ?? 0) - (a.sc.cashOnCashPct ?? 0);
      return b.sc.monthlyCashflow - a.sc.monthlyCashflow;
    });
    const top = computed.slice(0, limit);
    listings = top.map((x) => mapRow(x.row, x.sc));
    assumptions = top[0]?.row.cashflowStats?.assumptions ?? rows[0]?.cashflowStats?.assumptions ?? null;
    effectiveRate = mortgageRate ?? assumptions?.mortgageRate ?? null;
  }

  return {
    listings,
    meta: {
      count: listings.length,
      downPaymentPct,
      mortgageRate: effectiveRate,
      sortBy,
      area: subdivision || city || postalCode || null,
      derived,
      assumptions,
    },
  };
}

/** Market going rate for an area — subdivision rentStats first, else ZIP rent_rates. */
export async function getGoingRate(params: { postalCode?: string; subdivision?: string; city?: string }) {
  await dbConnect();
  const { postalCode, subdivision } = params;
  if (subdivision) {
    const sub = await Subdivision.findOne(
      { $or: [{ slug: subdivision }, { name: new RegExp(`^${escapeRegex(subdivision)}$`, "i") }] },
      { name: 1, slug: 1, city: 1, rentStats: 1 }
    ).lean<any>();
    if (sub?.rentStats) {
      return { scope: "subdivision", name: sub.name, slug: sub.slug, city: sub.city, rentStats: sub.rentStats };
    }
  }
  if (postalCode) {
    const rr = await RentRate.findOne({ postalCode }).lean<any>();
    if (rr) return { scope: "zip", postalCode, rentStats: rr };
  }
  return null;
}

/** Full per-listing cash-flow breakdown (both scenarios + fixedCosts to re-derive). */
export async function analyzeListingCashflow(listingKey: string) {
  await dbConnect();
  const l = await UnifiedListing.findOne(
    { listingKey },
    {
      listingKey: 1,
      unparsedAddress: 1,
      city: 1,
      postalCode: 1,
      subdivisionName: 1,
      listPrice: 1,
      bedsTotal: 1,
      bathsTotal: 1,
      livingArea: 1,
      associationFee: 1,
      cashflowStats: 1,
    }
  ).lean<any>();
  if (!l) return null;
  return {
    listingKey: l.listingKey,
    address: l.unparsedAddress ?? null,
    city: l.city ?? null,
    subdivision: l.subdivisionName ?? null,
    price: l.listPrice ?? null,
    beds: l.bedsTotal ?? null,
    baths: l.bathsTotal ?? null,
    sqft: l.livingArea ?? null,
    hoaFee: l.associationFee ?? null,
    // null → the chat should say "cash-flow analysis unavailable" (don't invent).
    cashflowStats: l.cashflowStats ?? null,
  };
}
