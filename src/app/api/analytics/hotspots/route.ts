/**
 * GET /api/analytics/hotspots
 *
 * Clustered hot zones — the circle layer and the side list of the Analytics tab.
 *
 * Params:
 *   bbox   "minLng,minLat,maxLng,maxLat"   } at least one of these
 *   cities comma-separated exact city names }
 *   year   2021..2026, or "all" (default: all)
 *   limit  default 50, max 200
 *
 * One of bbox or cities is REQUIRED. `rank` is global within
 * { propertyType, year }, not local: the unfiltered top ten for 2026 is Long
 * Beach, Seal Beach, West Hollywood, Pasadena, Los Angeles, Hemet, Huntington
 * Beach, Palm Springs, Laguna Woods, Laguna Woods. An agent asking for "the
 * busiest areas" without a bound would be shown a different region's market and
 * nothing in the response would say so, so this 400s instead.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/analytics/heatmap/guard'
import { getHotspots, parseBbox, parseYear } from '@/lib/analytics/heatmap/sources'

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 200

export async function GET(request: NextRequest) {
  const denied = await requireAdmin()
  if (denied) return denied

  const params = request.nextUrl.searchParams

  const bbox = parseBbox(params.get('bbox'))
  const cities =
    params
      .get('cities')
      ?.split(',')
      .map((c) => c.trim())
      .filter(Boolean) ?? null

  if (!bbox && !(cities && cities.length)) {
    return NextResponse.json(
      {
        error:
          'bbox or cities is required. Zone rank is global within a year, so an unbounded top-N returns the busiest markets statewide rather than yours.',
      },
      { status: 400 },
    )
  }

  const year = parseYear(params.get('year'))

  const rawLimit = Number(params.get('limit') ?? DEFAULT_LIMIT)
  const limit = Number.isFinite(rawLimit)
    ? Math.min(Math.max(Math.floor(rawLimit), 1), MAX_LIMIT)
    : DEFAULT_LIMIT

  try {
    const zones = await getHotspots({ bbox, cities, year, limit })

    // partialYear is stored per zone; surfacing it once saves the UI from
    // re-deriving a fact the precompute already settled.
    const partial = zones.some((z) => z.partialYear)

    return NextResponse.json(
      {
        zones,
        meta: {
          year,
          count: zones.length,
          truncated: zones.length === limit,
          partialYear: partial,
          monthsCovered: zones.find((z) => z.partialYear)?.yearMonthsCovered ?? null,
          bounded: bbox ? 'bbox' : 'cities',
        },
      },
      { headers: { 'Cache-Control': 'private, max-age=300' } },
    )
  } catch (error) {
    console.error('[api/analytics/hotspots]', error)
    return NextResponse.json({ error: 'Failed to load hotspots' }, { status: 500 })
  }
}
