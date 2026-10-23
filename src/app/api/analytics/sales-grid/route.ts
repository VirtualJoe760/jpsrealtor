/**
 * GET /api/analytics/sales-grid
 *
 * Closed-sale density cells for a viewport. Powers the heat layer of the
 * Analytics tab.
 *
 * Params:
 *   bbox     required  "minLng,minLat,maxLng,maxLat"
 *   year     optional  2021..2026, or "all" (default: all)
 *   minSales optional  default 1
 *
 * bbox is REQUIRED and the result is always limited. Unbounded this is 34,082
 * documents, and the viewport filter is the only thing that lets the
 * center_2dsphere index do any work.
 *
 * Every field returned is stored. The route reads, captions and returns.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/analytics/heatmap/guard'
import { getGridCells, parseBbox, parseYear } from '@/lib/analytics/heatmap/sources'

/** Cells are ~0.3mi; a city-level viewport is a few hundred, a county is thousands. */
const MAX_CELLS = 5000

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

  const rawMin = Number(params.get('minSales') ?? 1)
  const minSales = Number.isFinite(rawMin) && rawMin >= 1 ? Math.floor(rawMin) : 1

  try {
    const cells = await getGridCells({ bbox, year, minSales, limit: MAX_CELLS })
    return NextResponse.json(
      {
        cells,
        meta: {
          year,
          minSales,
          count: cells.length,
          truncated: cells.length === MAX_CELLS,
          // 2026 is 11 of 12 months. The UI must say so rather than let a
          // partial year read as a decline.
          partialYear: year === 2026,
        },
      },
      // Precomputes rebuild daily at most; this is per-admin but carries no
      // per-user data, so a short private cache is safe and keeps panning cheap.
      { headers: { 'Cache-Control': 'private, max-age=300' } },
    )
  } catch (error) {
    console.error('[api/analytics/sales-grid]', error)
    return NextResponse.json({ error: 'Failed to load sales grid' }, { status: 500 })
  }
}
