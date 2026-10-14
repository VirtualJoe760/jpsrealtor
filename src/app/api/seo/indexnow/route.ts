// POST /api/seo/indexnow
//
// Pushes changed URLs to Bing and Yandex. Called by whatever changes a page:
// the MLS sync when a listing's status or price moves, and the publishing
// pipeline when an article goes out.
//
// Auth: this is under /api, which is default-deny at the proxy (see
// AGENTS.md §3), but it also checks a shared secret in-file rather than relying
// on that alone — the whole point of §3's warning. The secret is CRON_SECRET,
// already set for the scheduled jobs.

import { NextRequest, NextResponse } from 'next/server'
import { submitToIndexNow } from '@/lib/indexnow'
import { getBaseUrl } from '@/lib/domain-utils'

export const maxDuration = 30

export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  const provided =
    request.headers.get('authorization')?.replace(/^Bearer /, '') ||
    request.headers.get('x-cron-secret')
  if (!secret || provided !== secret) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  let payload: { urls?: unknown; paths?: unknown }
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const host = (request.headers.get('host') || '').replace(/:\d+$/, '').toLowerCase()
  // The canonical host, not the request host: submitting
  // josephsardella.com URLs would ask Bing to index the supplementary domain
  // the canonicals are consolidating AWAY from.
  const baseUrl = getBaseUrl(host)
  const canonicalHost = new URL(baseUrl).host

  const urls: string[] = []
  if (Array.isArray(payload.urls)) {
    urls.push(...payload.urls.filter((u): u is string => typeof u === 'string'))
  }
  // `paths` is the convenient form for callers that only know the route.
  if (Array.isArray(payload.paths)) {
    for (const p of payload.paths) {
      if (typeof p === 'string') urls.push(`${baseUrl}${p.startsWith('/') ? p : `/${p}`}`)
    }
  }

  if (!urls.length) {
    return NextResponse.json({ error: 'No urls or paths supplied' }, { status: 400 })
  }

  const result = await submitToIndexNow(urls, canonicalHost)
  if (!result) {
    return NextResponse.json(
      { ok: false, reason: 'INDEXNOW_KEY is not configured' },
      { status: 200, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  return NextResponse.json(
    { ok: true, ...result },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
