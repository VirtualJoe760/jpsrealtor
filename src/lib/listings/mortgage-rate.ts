// src/lib/listings/mortgage-rate.ts
//
// Single source of truth for the live mortgage rate, shared by:
//   • cashflow-query.ts        — re-derives per-listing cash flow at the live rate
//   • /api/mortgage-rates      — the get_mortgage_rates surface (calculator, chat)
//
// Returns DECIMALS (0.0648), matching cashflowStats.assumptions.mortgageRate.
// Source verified 2026-06-10 (API Ninjas):
//   GET /v1/mortgagerate → [{ "week": "current", "data": { "frm_30": "6.48", ... } }]
// Two non-obvious gotchas this guards against: the rate is a STRING nested under
// `data` in a LIST, and downstream math expects a decimal, not a percentage.

const DEFAULT_RATE = 0.07; // PMMS-ish fallback when the API key is absent/erroring

export interface MortgageRates {
  frm30: number;          // 30-yr fixed, decimal (e.g. 0.0648)
  frm15: number | null;   // 15-yr fixed, decimal — null when the API omits it
  source: 'live' | 'fallback';
}

/** Fetch + parse both fixed-rate terms once. Never throws — falls back instead. */
export async function getMortgageRates(): Promise<MortgageRates> {
  const key = process.env.API_NINJA_KEY ?? process.env.API_NINJAS_KEY;
  if (!key) return { frm30: DEFAULT_RATE, frm15: null, source: 'fallback' };
  try {
    const r = await fetch('https://api.api-ninjas.com/v1/mortgagerate', {
      headers: { 'X-Api-Key': key },
      next: { revalidate: 21600 }, // 6h cache; Freddie Mac PMMS updates weekly
    });
    if (!r.ok) return { frm30: DEFAULT_RATE, frm15: null, source: 'fallback' };

    const data = await r.json();
    const recs = Array.isArray(data) ? data : data?.data ?? [data];
    const rec = recs.find((x: any) => x?.week === 'current') ?? recs[0];

    const p30 = parseFloat(String(rec?.data?.frm_30 ?? rec?.frm_30 ?? ''));
    const p15 = parseFloat(String(rec?.data?.frm_15 ?? rec?.frm_15 ?? ''));
    const frm30 = p30 / 100;
    const frm15 = Number.isFinite(p15) ? p15 / 100 : null;

    // Sanity-clamp the headline rate; ignore obviously bad payloads.
    if (!Number.isFinite(frm30) || frm30 < 0.02 || frm30 > 0.2) {
      return { frm30: DEFAULT_RATE, frm15: null, source: 'fallback' };
    }
    return { frm30, frm15, source: 'live' };
  } catch {
    return { frm30: DEFAULT_RATE, frm15: null, source: 'fallback' };
  }
}

/** 30-yr decimal rate + provenance — the shape cashflow-query consumes. */
export async function getCurrentMortgageRate(): Promise<{ rate: number; source: 'live' | 'fallback' }> {
  const { frm30, source } = await getMortgageRates();
  return { rate: frm30, source };
}
