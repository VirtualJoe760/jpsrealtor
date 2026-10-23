// packages/mcp-server/src/tools/find_cashflowing_listings.ts
//
// Find active for-sale listings that produce positive rental cash flow in an
// area (VPS-precomputed cashflowStats), and render them as an interactive board
// (reusing the listing-board MCP App UI) with a cash-flow line per card.
//
// `strategy` picks whose rent the math runs on. Every figure on a card — cash
// flow, cap rate, rent, break-even — comes from that one strategy's block (the
// route guarantees it); the assumptions line below must describe the same
// strategy, or a seasonal list gets captioned with long-term expense ratios.

import { request } from "../http.js";
import type { ToolDef } from "./types.js";
import { fetchImageDataUri } from "./_media.js";
import { LISTING_BOARD_URI } from "../ui/listing-board.js";

const HUB = "https://www.chatrealty.io";

const STRATEGY_LABEL: Record<string, string> = {
  longTerm: "long-term lease",
  seasonal: "seasonal, asking rates",
  closedSeasonal: "seasonal, achieved rates",
};

const RENT_BASIS: Record<string, string> = {
  longTerm: "Rent is the long-term annual-lease rate (furnished seasonal earns more in resort areas — re-run with strategy seasonal/closedSeasonal).",
  seasonal: "Rent is ASKING seasonal rates annualized across the year (never the peak-month rate).",
  closedSeasonal: "Rent is ACHIEVED seasonal rates from closed furnished leases, annualized across the year (never the peak-month rate).",
};

export const find_cashflowing_listings: ToolDef = {
  name: "find_cashflowing_listings",
  description:
    "Find active for-sale listings that produce POSITIVE rental cash flow in an area, ranked from PRE-COMPUTED investment math (rent estimate, financing, expenses, break-even) — read the figures, do not calculate them yourself. Renders an interactive BOARD; each card shows monthly cash flow, cap rate, estimated rent and break-even down payment. Use when the user wants actual listings back ('which homes in Palm Desert cash-flow with 20% down?'); for 'does this AREA cash-flow?' call get_area_cashflow instead. " +
    "STRATEGY: `strategy` picks the rent the math runs on — longTerm (default, annual lease), seasonal (asking furnished seasonal rates) or closedSeasonal (achieved seasonal rates from closed leases). In resort/golf markets (Coachella Valley) the seasonal strategies are where most positive results are — more than twice as many listings cash-flow on achieved seasonal rents as on long-term — so when long-term comes back thin there, re-run with closedSeasonal. Always say which strategy a list is for; a listing can cash-flow seasonally and not long-term. Seasonal layers use vacation-rental expenses (20% management, 15% vacancy, 8% maintenance) — read them from the result, never hard-code. " +
    "Defaults to 20% down at the current 30-yr rate stored with the data; pass downPaymentPct / mortgageRate to re-run another scenario (re-derived from stored costs, no rebuild). LEAD your reply with the count, strategy and assumptions. Fractional-ownership listings (Co-Ownership, Own Your Own, Timeshare) are always excluded: they price a share against a whole-home rent. Caveats to surface: property tax is derived from list price (Mello-Roos NOT modeled); HOA is from the MLS fee. A listing with no cash-flow data simply isn't included — don't invent rents.",
  uiResourceUri: LISTING_BOARD_URI,
  inputSchema: {
    type: "object",
    properties: {
      city: { type: "string", description: 'e.g. "Palm Desert"' },
      postalCode: { type: "string", description: "ZIP — near-universal coverage; the most reliable area key." },
      subdivision: { type: "string", description: 'e.g. "Indian Wells Country Club"' },
      strategy: {
        type: "string",
        enum: ["longTerm", "seasonal", "closedSeasonal"],
        description:
          "Whose rent the cash flow is built on. longTerm (default) = annual lease; seasonal = ASKING furnished seasonal rates; closedSeasonal = ACHIEVED seasonal rates from closed leases (the stronger seasonal signal — more coverage).",
      },
      downPaymentPct: { type: "number", description: "Decimal, default 0.20. 0.20/0.25 read precomputed scenarios; any other value is re-derived." },
      minMonthlyCashflow: { type: "number", description: "Minimum monthly cash flow (default 0 = any positive)." },
      maxPrice: { type: "number" },
      beds: { type: "number" },
      mortgageRate: { type: "number", description: "Annual rate as a decimal (e.g. 0.065 = 6.5%). Triggers a re-derive of the math." },
      sortBy: { type: "string", enum: ["cashflow", "capRate", "cashOnCash", "price"], description: "Default cashflow." },
      limit: { type: "number", description: "Max listings on the board (1-30, default 20)." },
    },
    additionalProperties: false,
  },
  async handler(input, config) {
    const { limit, ...rest } = input as Record<string, unknown>;
    const n = typeof limit === "number" ? Math.max(1, Math.min(30, Math.floor(limit))) : 20;
    const query: Record<string, string | number | boolean> = { limit: n };
    for (const [k, v] of Object.entries(rest)) {
      if (v !== undefined && v !== null) query[k] = v as string | number | boolean;
    }

    const data: any = await request(config, "/api/skill/listings/cashflow", { query });
    const items: any[] = Array.isArray(data?.listings) ? data.listings : [];
    const meta: any = data?.meta || {};
    const base = config.apiBase.replace(/\/+$/, "");

    const listings = await Promise.all(
      items.map(async (it) => {
        let thumb: string | null = null;
        if (it.primaryPhotoUrl) {
          const opt = `${base}/_next/image?url=${encodeURIComponent(it.primaryPhotoUrl)}&w=640&q=75`;
          thumb = (await fetchImageDataUri(opt)) || (await fetchImageDataUri(it.primaryPhotoUrl));
        }
        return {
          listingKey: it.listingKey,
          address: it.address ?? null,
          city: it.city ?? null,
          price: it.price ?? null,
          beds: it.beds ?? null,
          baths: it.baths ?? null,
          sqft: it.sqft ?? null,
          yearBuilt: it.yearBuilt ?? null,
          detailUrl: `${HUB}/mls-listings/${it.listingKey}`,
          lat: it.latitude ?? null,
          lng: it.longitude ?? null,
          thumb,
          // cash-flow fields the board renders — all from the same strategy.
          // Stored scenarios carry cents; the card shows whole dollars.
          monthlyCashflow: typeof it.monthlyCashflow === "number" ? Math.round(it.monthlyCashflow) : null,
          capRatePct: it.capRatePct ?? null,
          cashOnCashPct: it.cashOnCashPct ?? null,
          monthlyRent: it.monthlyRent ?? null,
          rentConfidence: it.rentConfidence ?? null,
          breakEvenDownPct: it.breakEvenDownPct ?? null,
        };
      })
    );

    const strategy: string = meta.strategy || "longTerm";
    const a: any = meta.assumptions || {};
    // Seasonal layers override the long-term expense ratios.
    const eff: any = { ...a, ...(meta.assumptionOverrides || {}) };
    const downPct = Math.round((meta.downPaymentPct ?? 0.2) * 100);
    const rate = meta.mortgageRate ?? a.mortgageRate ?? null;
    const ratePct = rate != null ? +(rate * 100).toFixed(2) : null;
    const area = meta.area || "the area";
    const label = STRATEGY_LABEL[strategy] || strategy;
    const title = `${listings.length} listing${listings.length === 1 ? "" : "s"} cash-flow at ${downPct}% down (${label}) — ${area}`;

    const pct = (v: unknown, dflt: number) => Math.round((typeof v === "number" ? v : dflt) * 100);
    const assumptionsLine =
      a.mortgageRate != null
        ? `Assumes ${ratePct}% / ${a.loanTermYears || 30}-yr loan, ${pct(eff.vacancyPct, 0.05)}% vacancy, ${pct(
            eff.managementPct,
            0.08
          )}% management, ${pct(eff.maintenancePct, 0.05)}% maintenance. Property tax derived from list price (Mello-Roos / special assessments not modeled). ${
            RENT_BASIS[strategy] || ""
          }`
        : "";

    return {
      _structuredContent: {
        title,
        listings,
        strategy,
        assumptions: a,
        assumptionOverrides: meta.assumptionOverrides ?? null,
        downPaymentPct: meta.downPaymentPct ?? 0.2,
        mortgageRate: rate,
        count: listings.length,
      },
      _mcpText:
        `${listings.length} listing${listings.length === 1 ? "" : "s"} in ${area} cash-flow at ${downPct}% down on ${label} rent` +
        (ratePct ? ` (${ratePct}% / ${a.loanTermYears || 30}-yr)` : "") +
        `, sorted by ${meta.sortBy === "capRate" ? "cap rate" : meta.sortBy === "cashOnCash" ? "cash-on-cash" : meta.sortBy === "price" ? "price" : "monthly cash flow"}. ${assumptionsLine} ` +
        (meta.strategyNote ? `Data note: ${meta.strategyNote} ` : "") +
        "Fractional-ownership listings excluded. " +
        listings
          .slice(0, 12)
          .map(
            (l) =>
              `${l.address || "?"} — $${l.price ? Number(l.price).toLocaleString("en-US") : "n/a"}, +$${
                l.monthlyCashflow != null ? Number(l.monthlyCashflow).toLocaleString("en-US") : "?"
              }/mo${l.capRatePct != null ? ", " + Number(l.capRatePct).toFixed(1) + "% cap" : ""}${
                l.breakEvenDownPct != null ? ", break-even " + Math.round(Number(l.breakEvenDownPct) * 100) + "% down" : ""
              }${l.rentConfidence === "low" ? " (rent est. low-confidence)" : ""}`
          )
          .join("; "),
    };
  },
};
