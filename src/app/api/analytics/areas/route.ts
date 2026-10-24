/**
 * GET /api/analytics/areas
 *
 * Top named areas for a year, with the geometry needed to plot them.
 *
 * Params:
 *   scope  subdivision | city | zip   (default: subdivision)
 *   year   2021..2026                 (default: 2026)
 *   city   optional exact city name
 *   limit  default 25, max 200
 *
 * Two finds merged by key — market_history for the ranked numbers, area_geo for
 * the centroid and radius. Both keep the same key format, so the merge is a
 * lookup and the no-calculation invariant holds.
 *
 * Unlike the hotspot route this one may run unbounded: market_history rows are
 * named areas, so an unfiltered top-25 is a legitimate "busiest areas in
 * Southern California" answer rather than a silently mis-scoped one.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/analytics/heatmap/guard'
import { getAreaByKey, getAreas, YEARS, type AreaScope } from '@/lib/analytics/heatmap/sources'

const SCOPES: AreaScope[] = ['subdivision', 'city', 'zip']
const DEFAULT_LIMIT = 25
const MAX_LIMIT = 200
const DEFAULT_YEAR = 2026

export async function GET(request: NextRequest) {
  const denied = await requireAdmin()
  if (denied) return denied

  const params = request.nextUrl.searchParams

  const rawScope = (params.get('scope') ?? 'subdivision') as AreaScope
  if (!SCOPES.includes(rawScope)) {
    return NextResponse.json(
      { error: `scope must be one of ${SCOPES.join(', ')}` },
      { status: 400 },
    )
  }

  // Unlike the other two routes, "all years" is not a thing here: market_history
  // stores one row per year and medians never merge across them.
  const rawYear = Number(params.get('year') ?? DEFAULT_YEAR)
  const year = YEARS.includes(rawYear as (typeof YEARS)[number]) ? rawYear : DEFAULT_YEAR

  const city = params.get('city')?.trim() || null

  const rawLimit = Number(params.get('limit') ?? DEFAULT_LIMIT)
  const limit = Number.isFinite(rawLimit)
    ? Math.min(Math.max(Math.floor(rawLimit), 1), MAX_LIMIT)
    : DEFAULT_LIMIT

  // Single-area lookup — what the detail panel opens on a zone click. Returns
  // the one row rather than a ranked list, so it bypasses the limit entirely.
  const key = params.get('key')?.trim()
  if (key) {
    try {
      const area = await getAreaByKey({ scope: rawScope, key, year })
      if (!area) {
        return NextResponse.json(
          { error: `No ${rawScope} history for "${key}" in ${year}`, area: null },
          { status: 404 },
        )
      }
      return NextResponse.json(
        { area, meta: { scope: rawScope, year, key, partialYear: area.partialYear } },
        { headers: { 'Cache-Control': 'private, max-age=300' } },
      )
    } catch (error) {
      console.error('[api/analytics/areas] key lookup', error)
      return NextResponse.json({ error: 'Failed to load area' }, { status: 500 })
    }
  }

  try {
    const areas = await getAreas({ scope: rawScope, year, city, limit })
    return NextResponse.json(
      {
        areas,
        meta: {
          scope: rawScope,
          year,
          city,
          count: areas.length,
          partialYear: areas.some((a) => a.partialYear),
          monthsCovered: areas.find((a) => a.partialYear)?.yearMonthsCovered ?? null,
          // area_geo has no placeholder-free record for every key; the UI lists
          // these but cannot plot them.
          unplottable: areas.filter((a) => a.lat === null).length,
        },
      },
      { headers: { 'Cache-Control': 'private, max-age=300' } },
    )
  } catch (error) {
    console.error('[api/analytics/areas]', error)
    return NextResponse.json({ error: 'Failed to load areas' }, { status: 500 })
  }
}
