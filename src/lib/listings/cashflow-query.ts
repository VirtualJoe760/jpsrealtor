// src/lib/listings/cashflow-query.ts
//
// Read layer over the VPS-precomputed rental cash-flow data (a pure read — no
// request-time math beyond re-deriving custom scenarios from stored fixedCosts).
// ONE source of truth shared by both consumers:
//   • the MCP skill routes (/api/skill/listings/cashflow, …) → Claude tools
//   • the web-chat tool executors (src/lib/chat-v2/tool-executors.ts) → app chat
//
// Data shapes (written by build-cashflow.py / build-rent-rates.py /
// build-cashflow-profile.py in the chatrealty-backend repo):
//   • unified_listings.cashflowStats  — rentEstimate, capRatePct, fixedCosts,
//     scenarios.down20/down25 (each with monthlyCashflow + cashflows flag),
//     assumptions — all LONG-TERM. strategies.seasonal / .closedSeasonal are
//     complete blocks of the same shape on seasonal rent (asking / achieved).
//   • rent_rates (by postalCode) + subdivisions.rentStats — going rate.
//   • subdivisions/cities.cashflowProfile — the whole-area rollup (four
//     strategies, per-bedroom economics, verdicts + caveats). Contract:
//     chatrealty-backend docs/tools/cashflow-profile.md.

import dbConnect from "@/lib/mongoose";
import UnifiedListing from "@/models/unified-listing";
import Subdivision from "@/models/subdivisions";
import { City } from "@/models/cities";
import RentRate from "@/models/rent-rate";

// The builder ran cash-flow math on some junk listings (e.g. a $795 "list
// price"), producing absurd cap rates (3000%+) that would float to the top of a
// cash-flow sort. Guard with a price floor + a cap-rate sanity ceiling — no
// legitimate residential listing is under $50k or has a 30%+ cap rate.
const MIN_LIST_PRICE = 50_000;
const MAX_SANE_CAP_PCT = 30;

// Fractional ownership prices a SHARE of the home while the rent estimate is for
// the whole home, so the yield is impossible and sorts straight to the top:
// 72985 Somera Road is a $289k Co-Ownership share of a 4bd / 3,163 sqft house
// and ranked #1 in Palm Desert. Measured 2026-10-16 before this guard: a
// fractional listing was the #1 result in 4 of the 9 cities that have any.
// build-cashflow.py doesn't exclude these subtypes yet, so the filter lives here
// (contract: chatrealty-backend docs/tools/listing-cashflow.md, "junk guards").
// $nin also keeps listings with no propertySubType.
export const FRACTIONAL_SUBTYPES = ["Co-Ownership", "Own Your Own", "Timeshare"];

export type SortBy = "cashflow" | "capRate" | "cashOnCash" | "price";

// Which rent the cash flow is built on. Long-term sits at the TOP level of
// cashflowStats; the two seasonal layers are complete blocks of their own
// (fixedCosts, scenarios, capRatePct, breakEvenDownPct, rentEstimate) under
// `strategies`. Every figure on a row is read from ONE block — the top-level
// break-even and rent are long-term only, and quoting them beside a seasonal
// cash flow shipped as a bug in the backend once (commit 6ade664).
export type CashflowStrategy = "longTerm" | "seasonal" | "closedSeasonal";
export const CASHFLOW_STRATEGIES: CashflowStrategy[] = ["longTerm", "seasonal", "closedSeasonal"];
const STRATEGY_BLOCK: Record<CashflowStrategy, string> = {
  longTerm: "cashflowStats",
  seasonal: "cashflowStats.strategies.seasonal", // ASKING seasonal rates
  closedSeasonal: "cashflowStats.strategies.closedSeasonal", // ACHIEVED seasonal rates
};

// Stored rates carry float noise (0.07400000000000001).
const RATE_EPS = 5e-5;
// breakEvenDownPct is stored rounded to 4 decimals (build-cashflow.py).
const BEP_SLACK = 1e-4;

export interface FindCashflowParams {
  city?: string;
  postalCode?: string;
  subdivision?: string;
  strategy?: CashflowStrategy; // default longTerm
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

// Only what scoring a candidate reads: about 250 bytes a row against roughly
// 30 KB for LISTING_FIELDS, which carries every photo URL in `media`.
function scoreFields(blk: string): string {
  return (
    "listingKey listPrice cashflowStats.listPrice " +
    "cashflowStats.assumptions.mortgageRate cashflowStats.assumptions.closingCostPct " +
    `${blk}.fixedCosts ${blk}.capRatePct`
  );
}

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

/** The chosen strategy's block on a listing, or null when it has none. */
function strategyBlock(l: any, strategy: CashflowStrategy): any | null {
  const cf = l.cashflowStats;
  if (!cf) return null;
  return strategy === "longTerm" ? cf : cf.strategies?.[strategy] ?? null;
}

/** True when the listing's stored scenarios were built at `rate`. */
function builtAtRate(l: any, rate: number): boolean {
  const stored = l.cashflowStats?.assumptions?.mortgageRate;
  return typeof stored === "number" && Math.abs(stored - rate) < RATE_EPS;
}

/** Monthly principal + interest per dollar borrowed (standard amortization). */
function paymentPerDollar(annualRate: number, termYears = 30): number {
  const r = annualRate / 12;
  const n = termYears * 12;
  return r === 0 ? 1 / n : (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

/**
 * The highest STORED breakEvenDownPct (built at `builtRate`) that can still
 * cash-flow at `downPct` and `rate`. Exact, not an estimate, in both directions.
 *
 * A listing cash-flows when its debt-free surplus S covers the payment:
 * S > P·(1−d)·pay(rate). Break-even is the d where they're equal, so
 * 1 − be₀ = S / (P·pay(built)), and solving for be₀ gives
 * be₀ < 1 − (1−d)·pay(rate)/pay(built). A rate above the built one tightens
 * the bound below d; a rate below it widens the bound above d.
 *
 * Floored at 0 because the backend stores a below-zero break-even (works with
 * no money down) as 0. Holds only for rows built at `builtRate` or lower: a
 * higher built rate widens the bound.
 */
function breakEvenBound(downPct: number, rate: number, builtRate: number): number {
  return Math.max(0, 1 - ((1 - downPct) * paymentPerDollar(rate)) / paymentPerDollar(builtRate));
}

/**
 * Re-derive a financing scenario from the stored debt-free `fixedCosts` +
 * `listPrice` — lets us answer "with 30% down at 6.5%" without a rebuild.
 */
export function deriveCashflow(cf: any, downPct: number, annualRate: number, termYears = 30) {
  const price = cf.listPrice;
  const loan = price * (1 - downPct);
  const pi = loan * paymentPerDollar(annualRate, termYears);
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
  // Rent, cap rate and break-even all come from the strategy's own block.
  monthlyRent: number | null;
  rentConfidence: string | null;
  rentSource: string | null;
  capRatePct: number | null;
  // Decimal (0.35 = 35% down). null = no down payment makes it work, OR the
  // row was re-derived at a rate other than the one break-even was built at.
  breakEvenDownPct: number | null;
  breakEvenNote: string | null;
  monthlyCashflow: number | null;
  annualCashflow: number | null;
  cashOnCashPct: number | null;
  cashflows: boolean | null;
}

function mapRow(l: any, scenario: any, strategy: CashflowStrategy, breakEvenValid: boolean): CashflowListing {
  const s = strategyBlock(l, strategy) || {};
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
    monthlyRent: s.rentEstimate?.monthlyRent ?? null,
    rentConfidence: s.rentEstimate?.confidence ?? null,
    rentSource: s.rentEstimate?.source ?? null,
    capRatePct: s.capRatePct ?? null,
    breakEvenDownPct: breakEvenValid ? s.breakEvenDownPct ?? null : null,
    breakEvenNote: breakEvenValid ? s.breakEvenNote ?? null : null,
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
    strategy: CashflowStrategy;
    area: string | null;
    derived: boolean; // true when scenarios were re-derived (custom down%/rate)
    assumptions: any | null; // echo from the data — never hard-code
    // Seasonal layers run vacation-rental expense ratios (20% mgmt / 15% vacancy
    // / 8% maintenance) over the long-term `assumptions`; null for longTerm.
    assumptionOverrides: any | null;
    strategyNote: string | null; // the block's own explanation of its rent basis
    excludedSubtypes: string[];
  };
}

/**
 * Find active for-sale listings that cash-flow in an area, on one strategy's
 * rent (long-term, seasonal asking, or seasonal achieved).
 *  - Fast path: down 20%/25% at the rate the data was built at → indexed
 *    find + sort on the precomputed scenario. No math.
 *  - Re-derive path: custom down% or rate → recompute from the SAME strategy's
 *    stored fixedCosts (the contract's one sanctioned request-time calculation)
 *    for every candidate the stored break-even can't rule out. No cap.
 *
 * With no rate given, every figure is at the rate stored in
 * `cashflowStats.assumptions.mortgageRate` — the backend writes the live
 * Freddie Mac 30-yr rate there on each run (Tue + Fri) — so this ranking always
 * agrees with analyze_listing_cashflow and get_area_cashflow for the same home.
 */
export async function findCashflowingListings(params: FindCashflowParams): Promise<FindCashflowResult> {
  await dbConnect();
  const {
    city,
    postalCode,
    subdivision,
    strategy = "longTerm",
    downPaymentPct = 0.2,
    minMonthlyCashflow = 0,
    maxPrice,
    beds,
    mortgageRate,
    sortBy = "cashflow",
    limit = 25,
  } = params;

  const blk = STRATEGY_BLOCK[strategy];
  const baseMatch: any = {
    propertyType: "A",
    standardStatus: { $in: ["Active", "ComingSoon"] },
    listPrice: maxPrice ? { $gte: MIN_LIST_PRICE, $lte: maxPrice } : { $gte: MIN_LIST_PRICE },
    propertySubType: { $nin: FRACTIONAL_SUBTYPES },
    [`${blk}.rentEstimate.monthlyRent`]: { $gt: 0 },
  };
  if (city) baseMatch.city = city;
  if (postalCode) baseMatch.postalCode = postalCode;
  if (subdivision) baseMatch.subdivisionName = new RegExp(`^${escapeRegex(subdivision)}$`, "i");
  if (beds) baseMatch.bedsTotal = beds;

  const dk = scenarioKey(downPaymentPct);
  const sane = (r: any) => saneCap(strategyBlock(r, strategy)?.capRatePct);

  let listings: CashflowListing[] = [];
  let derived = false;
  let assumptions: any = null;
  let first: any = null; // a returned row, for the strategy's note/overrides
  let effectiveRate: number | null = mortgageRate ?? null;

  const result = (): FindCashflowResult => {
    const s = first ? strategyBlock(first, strategy) : null;
    return {
      listings,
      meta: {
        count: listings.length,
        downPaymentPct,
        mortgageRate: effectiveRate,
        sortBy,
        strategy,
        area: subdivision || city || postalCode || null,
        derived,
        assumptions,
        assumptionOverrides: s?.assumptionOverrides ?? null,
        strategyNote: s?.note ?? null,
        excludedSubtypes: FRACTIONAL_SUBTYPES,
      },
    };
  };

  // The rate the stored figures were built at, read off one row (the backend
  // writes the same rate on every row in a run). Only needed for a custom rate.
  const bepPath = `${blk}.breakEvenDownPct`;
  const ratePath = "cashflowStats.assumptions.mortgageRate";
  let builtRate: number | null = null;
  if (mortgageRate != null) {
    const ref = await UnifiedListing.findOne({ ...baseMatch, [bepPath]: { $exists: true } })
      .select(ratePath)
      .lean<any>();
    const r = ref?.cashflowStats?.assumptions?.mortgageRate;
    builtRate = typeof r === "number" && r > 0 ? r : null;
  }

  // ── Fast path ─────────────────────────────────────────────────────────────
  // A precomputed scenario is exact only at the rate it was built at. With no
  // rate given that is by definition the rate we quote. With a rate given, any
  // returned row built at a different one sends the whole request down the
  // re-derive path, so no figure is quoted at the wrong rate. A rate that
  // differs from the built one skips the probe: it can't succeed, and without
  // an index it scans the area (~15 s with no area, measured 2026-10-16).
  const probe = mortgageRate == null || (builtRate != null && Math.abs(builtRate - mortgageRate) < RATE_EPS);
  if (probe && (dk === "down20" || dk === "down25")) {
    const sp = `${blk}.scenarios.${dk}`;
    const q = {
      ...baseMatch,
      [`${sp}.cashflows`]: true,
      [`${sp}.monthlyCashflow`]: { $gte: minMonthlyCashflow },
    };
    const sortField = (
      {
        cashflow: `${sp}.monthlyCashflow`,
        capRate: `${blk}.capRatePct`,
        cashOnCash: `${sp}.cashOnCashPct`,
        price: "listPrice",
      } as Record<SortBy, string>
    )[sortBy];
    const rows = await UnifiedListing.find(q)
      .sort({ [sortField]: sortBy === "price" ? 1 : -1 })
      .limit(limit + 10) // headroom for rows the cap-rate sanity check drops
      .select(LISTING_FIELDS)
      .lean<any[]>();
    if (mortgageRate == null || rows.every((r) => builtAtRate(r, mortgageRate))) {
      const clean = rows.filter(sane).slice(0, limit);
      listings = clean.map((r) => mapRow(r, strategyBlock(r, strategy)?.scenarios?.[dk], strategy, true));
      first = clean[0] ?? rows[0] ?? null;
      assumptions = first?.cashflowStats?.assumptions ?? null;
      effectiveRate = mortgageRate ?? assumptions?.mortgageRate ?? null;
      return result();
    }
  }

  // ── Re-derive path ────────────────────────────────────────────────────────
  // Every candidate is scored, with no cap. A cap on an unsorted find ranks an
  // arbitrary subset: Los Angeles has 3,977 long-term candidates, and the old
  // `.limit(3000)` dropped 977 of them unseen (measured 2026-10-16). Scoring
  // reads a tight projection; full rows are fetched for the winners only.
  derived = true;
  const preMatch: any = { ...baseMatch };
  if (mortgageRate == null) {
    // At the stored rate a listing cash-flows at down d exactly when its
    // breakEvenDownPct <= d (null = never). The old `down20.cashflows: true`
    // dropped every listing that only cash-flows above 20% down, which is the
    // very "what if I put 30% down?" question this path exists for.
    preMatch[bepPath] = { $lte: downPaymentPct + BEP_SLACK };
  } else if (builtRate != null) {
    // A custom rate moves every break-even by the same formula
    // (breakEvenBound), so the stored one still narrows exactly, in both
    // directions, given the rate it was built at. Rows built at a higher rate
    // than the reference row, or with no stored break-even (stale blocks
    // predate the field), can't be bounded this way and are scored
    // unfiltered. A null break-even still means never: no rate helps when
    // operating costs exceed rent.
    const bound = breakEvenBound(downPaymentPct, mortgageRate, builtRate + RATE_EPS);
    preMatch.$or = [
      { [bepPath]: { $lte: bound + BEP_SLACK } },
      { [bepPath]: { $exists: false } },
      { [ratePath]: { $not: { $lte: builtRate + RATE_EPS } } },
    ];
  }
  const rows = await UnifiedListing.find(preMatch).select(scoreFields(blk)).lean<any[]>();
  const computed = rows
    .filter((r) => {
      const s = strategyBlock(r, strategy);
      return sane(r) && s?.fixedCosts && r.cashflowStats?.listPrice;
    })
    .map((r) => {
      const cf = r.cashflowStats;
      const rate = mortgageRate ?? cf.assumptions?.mortgageRate ?? 0.07;
      // Financing over the chosen strategy's OWN fixedCosts (its rent, vacancy,
      // management) — never the top-level long-term ones.
      const view = { listPrice: cf.listPrice, fixedCosts: strategyBlock(r, strategy).fixedCosts, assumptions: cf.assumptions };
      return { row: r, rate, sc: deriveCashflow(view, downPaymentPct, rate) };
    })
    .filter((x) => x.sc.cashflows && x.sc.monthlyCashflow >= minMonthlyCashflow);
  const order = (a: (typeof computed)[number], b: (typeof computed)[number]) => {
    if (sortBy === "price") return (a.row.listPrice ?? 0) - (b.row.listPrice ?? 0);
    if (sortBy === "capRate")
      return (strategyBlock(b.row, strategy)?.capRatePct ?? 0) - (strategyBlock(a.row, strategy)?.capRatePct ?? 0);
    if (sortBy === "cashOnCash") return (b.sc.cashOnCashPct ?? 0) - (a.sc.cashOnCashPct ?? 0);
    return b.sc.monthlyCashflow - a.sc.monthlyCashflow;
  };
  // Cash flow is whole dollars, so a big area has ties; without a tie-break,
  // which tied listing takes the last slot depends on scan order.
  computed.sort((a, b) => order(a, b) || String(a.row.listingKey).localeCompare(String(b.row.listingKey)));
  const top = computed.slice(0, limit);
  // Full rows for the winners (or one candidate, for the meta block).
  const ids = (top.length ? top.map((x) => x.row) : rows.slice(0, 1)).map((r) => r._id);
  const full = ids.length
    ? await UnifiedListing.find({ _id: { $in: ids } }).select(LISTING_FIELDS).lean<any[]>()
    : [];
  const byId = new Map(full.map((r) => [String(r._id), r]));
  listings = top.flatMap((x) => {
    const r = byId.get(String(x.row._id));
    // Stored break-even is valid at a custom down payment (it doesn't depend
    // on one) but not at a rate other than the one it was built at.
    return r ? [mapRow(r, x.sc, strategy, builtAtRate(r, x.rate))] : [];
  });
  first = ids.length ? byId.get(String(ids[0])) ?? null : null;
  assumptions = first?.cashflowStats?.assumptions ?? null;
  effectiveRate = mortgageRate ?? assumptions?.mortgageRate ?? null;
  return result();
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

// ---------------------------------------------------------------------------
// Area cash-flow — one findOne on the precomputed cashflowProfile rollup.
//
// The block is returned WHOLE: its verdict.notes / quality.notes carry the
// provenance ("seasonal rates come from ZIP 92211, not the subdivision"), and
// cherry-picking a verdict without them is how a 2-comp number gets quoted as
// fact. No math here — every figure is a median over per-listing cashflowStats
// the backend already wrote, so the rollup can't disagree with listing detail.
// ---------------------------------------------------------------------------

export type AreaScope = "subdivision" | "city";

export interface AreaCashflowParams {
  slug?: string;
  name?: string;
  city?: string; // disambiguates a subdivision name — names repeat across cities
  scope?: AreaScope;
}

export interface AreaRef {
  scope: AreaScope;
  name: string;
  slug: string;
  city: string | null;
  hasCashflowProfile: boolean;
}

type AreaFound = {
  found: true;
  area: AreaRef;
  // Same slug/name, other scope (77 subdivision slugs equal a city slug — e.g.
  // "chula-vista" is both). Lets the caller switch without guessing.
  alsoMatches?: AreaRef[];
};

export type AreaCashflowResult =
  | { found: false; reason: string; candidates: AreaRef[] }
  | (AreaFound & { available: true; cashflowProfile: any })
  | (AreaFound & {
      available: false;
      reason: string;
      parentCity?: AreaRef;
      childSubdivisions?: AreaRef[];
    });

// Projecting one leaf of the block tells us it exists without hauling 10-20 KB
// per row — every block carries lastUpdated (verified 2026-10-15: 0 without).
const PRESENCE = "cashflowProfile.lastUpdated";

function subRef(s: any): AreaRef {
  return { scope: "subdivision", name: s.name, slug: s.slug, city: s.city ?? null, hasCashflowProfile: !!s.cashflowProfile };
}

function cityRef(c: any): AreaRef {
  return { scope: "city", name: c.name, slug: c.slug, city: c.name, hasCashflowProfile: !!c.cashflowProfile };
}

async function areaResult(doc: any, scope: AreaScope): Promise<AreaCashflowResult> {
  const area = scope === "city" ? cityRef(doc) : subRef(doc);
  if (doc.cashflowProfile) {
    return { found: true, available: true, area, cashflowProfile: doc.cashflowProfile };
  }
  if (scope === "city") {
    return {
      found: true,
      available: false,
      area,
      reason: `No cash-flow profile for ${doc.name}: it has no active for-sale listings with an estimated rent right now. This means unknown, not zero.`,
    };
  }

  // Absent on a subdivision. Two things can still answer the question:
  // children (PGA West-style parents carry no block; their courses do) and
  // the parent city's rollup.
  const [kids, parent] = await Promise.all([
    Subdivision.find({ parentSubdivision: doc._id })
      .select(`name slug city ${PRESENCE}`)
      .sort({ name: 1 })
      .limit(50)
      .lean<any[]>(),
    doc.city
      ? City.findOne({ normalizedName: String(doc.city).toLowerCase() }).select(`name slug ${PRESENCE}`).lean<any>()
      : null,
  ]);
  const childSubdivisions = kids.filter((k) => k.slug).map(subRef);
  const parentCity = parent ? cityRef(parent) : undefined;
  const reason = childSubdivisions.length
    ? `${doc.name} is a parent community — cash-flow profiles live on its child communities (childSubdivisions). Call again with one of their slugs.`
    : `No cash-flow profile for ${doc.name}: it has no active for-sale listings with an estimated rent right now. This means unknown, not zero.`;
  return {
    found: true,
    available: false,
    area,
    reason,
    ...(childSubdivisions.length ? { childSubdivisions } : {}),
    ...(parentCity ? { parentCity } : {}),
  };
}

/** Closest areas for words that matched nothing exactly — offered, never auto-picked. */
async function suggestAreas(text: string, cityName: string | undefined, wantSub: boolean, wantCity: boolean) {
  const out: AreaRef[] = [];
  if (wantCity) {
    const cities = await City.find({ normalizedName: new RegExp(escapeRegex(text.toLowerCase())) })
      .select(`name slug ${PRESENCE}`)
      .sort({ listingCount: -1 })
      .limit(5)
      .lean<any[]>();
    out.push(...cities.map(cityRef));
  }
  if (wantSub) {
    const q: any = { $text: { $search: text } };
    if (cityName) q.city = new RegExp(`^${escapeRegex(cityName)}$`, "i");
    const subs = await Subdivision.find(q)
      .select({ score: { $meta: "textScore" }, name: 1, slug: 1, city: 1, [PRESENCE]: 1 })
      .sort({ score: { $meta: "textScore" } })
      .limit(8)
      .lean<any[]>();
    out.push(...subs.filter((s) => s.slug).map(subRef));
  }
  return out;
}

/**
 * Resolve an area (slug, or name [+ city]) and return its precomputed
 * cashflowProfile whole. Resolution never guesses: an exact slug or exact name
 * wins; anything else returns candidates for the caller to pick from.
 */
export async function getAreaCashflow(params: AreaCashflowParams): Promise<AreaCashflowResult> {
  await dbConnect();
  const { scope } = params;
  const slug = params.slug?.trim().toLowerCase() || undefined;
  const name = params.name?.trim() || undefined;
  const cityName = params.city?.trim() || undefined;
  const wantSub = scope !== "city";
  const wantCity = scope !== "subdivision";
  const subFields = "_id name slug city cashflowProfile";
  const cityFields = "name slug cashflowProfile";

  // A city hit that also names a community: answer for the city (what a bare
  // "Chula Vista" means) and name the community so the caller can switch.
  const withAlso = async (c: any, subs: any[]) => {
    const r = await areaResult(c, "city");
    return subs.length && r.found ? { ...r, alsoMatches: subs.map(subRef) } : r;
  };

  // 1 · Exact slug. 77 subdivision slugs equal a city slug ("chula-vista" is
  // both), so without a scope look in both and let the city win.
  if (slug) {
    const [sub, c] = await Promise.all([
      wantSub ? Subdivision.findOne({ slug }).select(subFields).lean<any>() : null,
      wantCity ? City.findOne({ slug }).select(cityFields).lean<any>() : null,
    ]);
    if (c) return withAlso(c, sub ? [sub] : []);
    if (sub) return areaResult(sub, "subdivision");
  }

  // 2 · Exact name (normalizedName is the lowercased name). A bare city name
  // ("Palm Desert") means the city; a name given WITH a city means a community
  // inside it. normalizedName alone is not unique for subdivisions (152 are
  // named "other"), so several hits come back as candidates, not a pick.
  if (name) {
    const normalized = name.toLowerCase();
    const cityFirst = wantCity && !cityName;
    if (cityFirst) {
      const c = await City.findOne({ normalizedName: normalized }).select(cityFields).lean<any>();
      if (c) {
        const same = wantSub
          ? await Subdivision.find({ normalizedName: normalized }).select(`name slug city ${PRESENCE}`).limit(10).lean<any[]>()
          : [];
        return withAlso(c, same);
      }
    }
    if (wantSub) {
      const q: any = { normalizedName: normalized };
      if (cityName) q.city = new RegExp(`^${escapeRegex(cityName)}$`, "i");
      const subs = await Subdivision.find(q).select(`_id name slug city ${PRESENCE}`).limit(10).lean<any[]>();
      if (subs.length === 1) {
        const sub = await Subdivision.findById(subs[0]._id).select(subFields).lean<any>();
        if (sub) return areaResult(sub, "subdivision");
      }
      if (subs.length > 1) {
        return {
          found: false,
          reason: `"${name}" names ${subs.length} subdivisions in different cities. Pass city, or call again with one of these slugs.`,
          candidates: subs.map(subRef),
        };
      }
    }
    if (wantCity && !cityFirst) {
      const c = await City.findOne({ normalizedName: normalized }).select(cityFields).lean<any>();
      if (c) return areaResult(c, "city");
    }
  }

  // 3 · Nothing exact — offer the closest areas instead of guessing one.
  const text = name || slug?.replace(/-/g, " ");
  if (!text) {
    return { found: false, reason: "Pass a slug, or a name (plus city for a subdivision).", candidates: [] };
  }
  const candidates = await suggestAreas(text, cityName, wantSub, wantCity);
  return {
    found: false,
    reason: candidates.length
      ? `No ${scope ?? "subdivision or city"} matches "${text}" exactly. Closest matches are in candidates — call again with one of their slugs.`
      : `No ${scope ?? "subdivision or city"} matches "${text}".`,
    candidates,
  };
}
