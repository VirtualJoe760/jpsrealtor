// src/app/api/mortgage-rates/route.ts
import { NextResponse } from "next/server";
import { getMortgageRates } from "@/lib/listings/mortgage-rate";

/**
 * GET /api/mortgage-rates
 *
 * Thin wrapper over the shared rate source (src/lib/listings/mortgage-rate.ts)
 * so the calculator + chat use the SAME live rate as the cash-flow math (DRY).
 * Response shape is preserved for existing consumers: `data.frm_30` / `data.frm_15`
 * are PERCENTAGES (e.g. 6.48), not decimals.
 */
export async function GET() {
  const { frm30, frm15, source } = await getMortgageRates();
  const live = source === "live";

  return NextResponse.json({
    success: live,
    fallback: !live,
    data: {
      frm_30: +(frm30 * 100).toFixed(2),
      frm_15: frm15 != null ? +(frm15 * 100).toFixed(2) : 6.1,
      date: new Date().toISOString().split("T")[0],
    },
  });
}
