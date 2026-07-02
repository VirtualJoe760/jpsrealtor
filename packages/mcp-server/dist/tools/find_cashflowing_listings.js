"use strict";
// packages/mcp-server/src/tools/find_cashflowing_listings.ts
//
// Find active for-sale listings that produce positive rental cash flow in an
// area (VPS-precomputed cashflowStats), and render them as an interactive board
// (reusing the listing-board MCP App UI) with a cash-flow line per card.
Object.defineProperty(exports, "__esModule", { value: true });
exports.find_cashflowing_listings = void 0;
const http_js_1 = require("../http.js");
const _media_js_1 = require("./_media.js");
const listing_board_js_1 = require("../ui/listing-board.js");
const HUB = "https://www.chatrealty.io";
exports.find_cashflowing_listings = {
    name: "find_cashflowing_listings",
    description: "Find active for-sale listings that produce POSITIVE rental cash flow in an area, using pre-computed market rents + investment math (financing + expenses). Renders an interactive BOARD of the cash-flowing homes — each card shows monthly cash flow + cap rate + estimated rent. Use when the user asks for cash-flowing / cash-flow-positive / investment properties in a place (e.g. 'listings in Palm Desert that cash-flow with 20% down'). Defaults to 20% down at ~7%/30-yr; pass downPaymentPct / mortgageRate to re-run other scenarios (re-derived, no rebuild). LEAD your reply with the count + assumptions (read from the result's assumptions, never hard-code). Caveats to surface: the going rate is LONG-TERM annual rent (furnished seasonal/STR earns more — different model); property tax is derived from list price (Mello-Roos NOT modeled); HOA is from the MLS fee. If a listing lacks cash-flow data, it simply isn't included — don't invent rents.",
    uiResourceUri: listing_board_js_1.LISTING_BOARD_URI,
    inputSchema: {
        type: "object",
        properties: {
            city: { type: "string", description: 'e.g. "Palm Desert"' },
            postalCode: { type: "string", description: "ZIP — near-universal coverage; the most reliable area key." },
            subdivision: { type: "string", description: 'e.g. "Indian Wells Country Club"' },
            downPaymentPct: { type: "number", description: "Decimal, default 0.20. 0.20/0.25 use precomputed scenarios; any other value is re-derived." },
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
        const { limit, ...rest } = input;
        const n = typeof limit === "number" ? Math.max(1, Math.min(30, Math.floor(limit))) : 20;
        const query = { limit: n };
        for (const [k, v] of Object.entries(rest)) {
            if (v !== undefined && v !== null)
                query[k] = v;
        }
        const data = await (0, http_js_1.request)(config, "/api/skill/listings/cashflow", { query });
        const items = Array.isArray(data?.listings) ? data.listings : [];
        const meta = data?.meta || {};
        const base = config.apiBase.replace(/\/+$/, "");
        const listings = await Promise.all(items.map(async (it) => {
            let thumb = null;
            if (it.primaryPhotoUrl) {
                const opt = `${base}/_next/image?url=${encodeURIComponent(it.primaryPhotoUrl)}&w=640&q=75`;
                thumb = (await (0, _media_js_1.fetchImageDataUri)(opt)) || (await (0, _media_js_1.fetchImageDataUri)(it.primaryPhotoUrl));
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
                // cash-flow fields the board renders
                monthlyCashflow: it.monthlyCashflow ?? null,
                capRatePct: it.capRatePct ?? null,
                cashOnCashPct: it.cashOnCashPct ?? null,
                monthlyRent: it.monthlyRent ?? null,
                rentConfidence: it.rentConfidence ?? null,
            };
        }));
        const a = meta.assumptions || {};
        const downPct = Math.round((meta.downPaymentPct ?? 0.2) * 100);
        const rate = meta.mortgageRate ?? a.mortgageRate ?? null;
        const ratePct = rate != null ? +(rate * 100).toFixed(2) : null;
        const area = meta.area || "the area";
        const title = `${listings.length} listing${listings.length === 1 ? "" : "s"} cash-flow at ${downPct}% down — ${area}`;
        const assumptionsLine = a.mortgageRate != null
            ? `Assumes ${ratePct}% / ${a.loanTermYears || 30}-yr loan, ${Math.round((a.vacancyPct ?? 0.05) * 100)}% vacancy, ${Math.round((a.managementPct ?? 0.08) * 100)}% management. Property tax derived from list price (Mello-Roos / special assessments not modeled). Going rate is long-term annual rent.`
            : "";
        return {
            _structuredContent: {
                title,
                listings,
                assumptions: a,
                downPaymentPct: meta.downPaymentPct ?? 0.2,
                mortgageRate: rate,
                count: listings.length,
            },
            _mcpText: `${listings.length} listing${listings.length === 1 ? "" : "s"} in ${area} cash-flow at ${downPct}% down` +
                (ratePct ? ` (${ratePct}% / ${a.loanTermYears || 30}-yr)` : "") +
                `, sorted by monthly cash flow. ${assumptionsLine} ` +
                listings
                    .slice(0, 12)
                    .map((l) => `${l.address || "?"} — $${l.price ? Number(l.price).toLocaleString("en-US") : "n/a"}, +$${l.monthlyCashflow != null ? Number(l.monthlyCashflow).toLocaleString("en-US") : "?"}/mo${l.capRatePct != null ? ", " + Number(l.capRatePct).toFixed(1) + "% cap" : ""}${l.rentConfidence === "low" ? " (rent est. low-confidence)" : ""}`)
                    .join("; "),
        };
    },
};
