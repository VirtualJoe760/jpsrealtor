/**
 * GET /api/analytics/cma
 *
 * A comparable market analysis for one map tile, as a downloadable PDF.
 *
 * Params:
 *   bbox  required  "minLng,minLat,maxLng,maxLat" — the TILE's bbox
 *   year  optional  2021..2026, or "all" (default: all)
 *   limit optional  comps per status, default 60, max 200
 *
 * ── Why this route may calculate, when the others may not ───────────────────
 *
 * The three analytics read routes serve only stored fields, because a computed
 * market statistic coming out of an API is unverifiable. This one builds a
 * DOCUMENT that prints every comparable it used on the same page as the
 * summary row, so each figure can be checked against the rows beneath it. It
 * imports `lib/cma`, never `lib/analytics/heatmap`, and the boundary is
 * documented in both modules.
 *
 * Rendering is Puppeteer. The alternative — hand-built PDF primitives — would
 * mean reimplementing table layout, and the template is a design artifact that
 * will change; HTML and CSS are the right source for it.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/mongoose'
import User from '@/models/User'
import { requireAdmin } from '@/lib/analytics/heatmap/guard'
import { collectComps, type Bbox } from '@/lib/cma/collect'
import { renderCma, type CmaBranding } from '@/lib/cma/render'

const DEFAULT_LIMIT = 60
const MAX_LIMIT = 200

/** Puppeteer needs a real Node runtime, not the edge sandbox. */
export const runtime = 'nodejs'
/** A cold Chromium launch plus two Mongo reads can exceed the default budget. */
export const maxDuration = 120

function parseBbox(raw: string | null): Bbox | null {
  if (!raw) return null
  const p = raw.split(',').map(Number)
  if (p.length !== 4 || p.some((n) => !Number.isFinite(n))) return null
  const [minLng, minLat, maxLng, maxLat] = p
  if (minLng >= maxLng || minLat >= maxLat) return null
  return { minLng, minLat, maxLng, maxLat }
}

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

  const rawYear = params.get('year')
  const year = !rawYear || rawYear === 'all' ? null : Number(rawYear)
  if (year !== null && !Number.isInteger(year)) {
    return NextResponse.json({ error: 'year must be a year or "all"' }, { status: 400 })
  }

  const rawLimit = Number(params.get('limit') ?? DEFAULT_LIMIT)
  const limit = Number.isFinite(rawLimit)
    ? Math.min(Math.max(Math.floor(rawLimit), 1), MAX_LIMIT)
    : DEFAULT_LIMIT

  try {
    const data = await collectComps({ bbox, year, limit })

    if (data.active.length + data.closed.length === 0) {
      return NextResponse.json(
        { error: 'No comparables inside this tile for the selected period.' },
        { status: 404 },
      )
    }

    // Branding from the agent's own profile — never a hardcoded brokerage.
    // One deployment serves many agents, so a literal here would stamp one
    // agency onto everyone else's sheet.
    const session = await getServerSession(authOptions)
    await dbConnect()
    const user = await User.findOne({ email: session?.user?.email })
      .select('name agentProfile.brokerage agentProfile.dreNumber agentProfile.customDomain')
      .lean<{ name?: string; agentProfile?: Record<string, any> }>()

    const ap = user?.agentProfile ?? {}
    const brand: CmaBranding = {
      agentName: user?.name || 'Agent',
      brokerage: ap.brokerage?.name ?? ap.brokerage ?? null,
      dreNumber: ap.dreNumber ?? null,
      site: (ap.customDomain || request.nextUrl.host).replace(/^www\./, '').toUpperCase(),
    }

    const html = renderCma(data, brand)

    const puppeteer = (await import('puppeteer')).default
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    })
    try {
      const page = await browser.newPage()
      await page.setContent(html, { waitUntil: 'domcontentloaded' })
      const pdf = await page.pdf({
        width: '11in',
        height: '8.5in',
        printBackground: true,
        preferCSSPageSize: true,
      })

      const city = (data.cities[0] || 'area').replace(/[^a-z0-9]+/gi, '-').toLowerCase()
      const stamp = new Date().toISOString().slice(0, 10)
      const filename = `cma-${city}-${year ?? 'all'}-${stamp}.pdf`

      return new NextResponse(new Uint8Array(pdf), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'private, no-store',
        },
      })
    } finally {
      await browser.close()
    }
  } catch (error) {
    console.error('[api/analytics/cma]', error)
    return NextResponse.json({ error: 'Failed to generate CMA' }, { status: 500 })
  }
}
