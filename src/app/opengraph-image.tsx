// src/app/opengraph-image.tsx
// Dynamic OG image — delegates to /api/og which handles all domain/agent logic.
// Uses Next.js file convention so social crawlers get the right image per domain.

import { ImageResponse } from 'next/og'
import { headers } from 'next/headers'

export const runtime = 'nodejs'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OGImage() {
  const hdrs = await headers()
  const host = hdrs.get('host') || 'localhost:3000'
  const proto = hdrs.get('x-forwarded-proto') || 'http'
  const bareHost = host.split(':')[0]

  // Detect subdomain
  let subdomain: string | undefined
  if (bareHost.includes('chatrealty')) {
    const parts = bareHost.split('chatrealty')[0]?.replace(/\.$/, '')
    subdomain = parts?.split('.').filter(s => s && s !== 'www').pop()
  } else if (bareHost.endsWith('.localhost')) {
    const sub = bareHost.split('.localhost')[0]
    if (sub && sub !== 'www') subdomain = sub
  }

  // Fetch the OG image from our API route which already handles all the logic
  const ogUrl = `${proto}://${host}/api/og${subdomain ? `?subdomain=${subdomain}` : ''}`

  try {
    const res = await fetch(ogUrl)
    if (res.ok) {
      const buffer = await res.arrayBuffer()
      return new Response(buffer, {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=3600, s-maxage=86400',
        },
      })
    }
  } catch {
    // Fall through to fallback
  }

  // Fallback: simple branded image
  const isJps = bareHost.includes('jpsrealtor') || bareHost.includes('josephsardella')
  const title = isJps ? 'Joseph Sardella' : 'chatRealty'
  const subtitle = isJps ? 'Palm Desert Real Estate Agent' : 'AI-Powered Real Estate'

  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', backgroundColor: 'white',
      }}>
        <div style={{ fontSize: 64, fontWeight: 700, color: '#1e3a5f', marginBottom: 16 }}>
          {title}
        </div>
        <div style={{ fontSize: 28, color: '#6b7280' }}>
          {subtitle}
        </div>
      </div>
    ),
    { ...size }
  )
}
