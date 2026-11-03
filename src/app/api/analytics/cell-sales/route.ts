/**
 * GET /api/analytics/cell-sales
 *
 * The individual closed transactions inside one grid cell — who listed them,
 * for how much, and what the property was. This is what the detail panel opens
 * when a square on the map is clicked.
 *
 * Params:
 *   bbox  required  "minLng,minLat,maxLng,maxLat" — the CELL's bbox, not the viewport
 *   year  optional  2021..2026, or "all" (default: all)
 *   limit optional  default 50, max 200
 *
 * Unlike the other three routes this reads the source collection
 * (`unified_closed_listings`) rather than a precompute. That is still a find
 * with a filter, a projection and a sort, and every field returned is stored —
 * the invariant bans computing aggregates, not listing records. See
 * `getCellSales` for why a precompute would be the wrong shape here.
 *
 * The bbox is expected to be ~0.005° (a single cell). Nothing enforces that —
 * a viewport-sized bbox would simply return the newest `limit` sales in it,
 * which is a legitimate if less useful answer.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/analytics/heatmap/guard'
import { getCellSales, parseBbox, parseYear } from '@/lib/analytics/heatmap/sources'

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 200

export async function GET(request: NextRequest) {
  const denied = await requireAdmin()
  if (denied) return denied

  const params = request.nextUrl.searchParams

  const bbox = parseBbox(params.get('bbox'))
  if (!bbox) {
    return NextResponse.json(
      { error: 'bbox is required, as "minLng,minLat,maxLng,maxLat"' },
      { status: 400 },
    )
  }

  const year = parseYear(params.get('year'))

  const rawLimit = Number(params.get('limit') ?? DEFAULT_LIMIT)
  const limit = Number.isFinite(rawLimit)
    ? Math.min(Math.max(Math.floor(rawLimit), 1), MAX_LIMIT)
    : DEFAULT_LIMIT

  try {
    const sales = await getCellSales({ bbox, year, limit })

    // Distinct listing agents AMONG THE ROWS BEING RETURNED. This is not a
    // precomputed market statistic and is not presented as one — it describes
    // exactly the list sitting next to it, which the caller can count itself.
    // A cell-wide agent count across all years is a different number and would
    // have to come from the precompute.
    const agentIds = new Set(
      sales.map((s) => s.listAgentMlsId ?? s.listAgentName).filter(Boolean) as string[],
    )

    return NextResponse.json(
      {
        sales,
        meta: {
          year,
          count: sales.length,
          truncated: sales.length === limit,
          distinctAgentsInList: agentIds.size,
          partialYear: year === 2026,
        },
      },
      { headers: { 'Cache-Control': 'private, max-age=300' } },
    )
  } catch (error) {
    console.error('[api/analytics/cell-sales]', error)
    return NextResponse.json({ error: 'Failed to load cell sales' }, { status: 500 })
  }
}
