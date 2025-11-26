import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = 'Joseph Sardella - Palm Desert Real Estate Agent'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default async function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0a0a0a',
          backgroundImage: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)',
        }}
      >
        {/* Left side - Agent Photo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '400px',
            height: '100%',
            position: 'relative',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://jpsrealtor.com/joey/about.png"
            alt="Joseph Sardella"
            style={{
              width: '320px',
              height: '400px',
              objectFit: 'cover',
              borderRadius: '20px',
              border: '4px solid #10b981',
            }}
          />
        </div>

        {/* Right side - Text Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'center',
            padding: '40px',
            flex: 1,
          }}
        >
          {/* Name */}
          <div
            style={{
              fontSize: 56,
              fontWeight: 700,
              color: '#ffffff',
              marginBottom: '8px',
              lineHeight: 1.1,
            }}
          >
            Joseph Sardella
          </div>

          {/* Title */}
          <div
            style={{
              fontSize: 28,
              fontWeight: 400,
              color: '#10b981',
              marginBottom: '24px',
            }}
          >
            Real Estate Professional
          </div>

          {/* Tagline */}
          <div
            style={{
              fontSize: 22,
              fontWeight: 400,
              color: '#a1a1aa',
              marginBottom: '32px',
              maxWidth: '500px',
              lineHeight: 1.4,
            }}
          >
            Your trusted guide to buying, selling, and investing in the Coachella Valley real estate market.
          </div>

          {/* Location Badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              padding: '12px 20px',
              borderRadius: '30px',
              border: '1px solid rgba(16, 185, 129, 0.3)',
            }}
          >
            <div style={{ fontSize: 18, color: '#10b981' }}>
              Palm Desert & Coachella Valley
            </div>
          </div>

          {/* Website */}
          <div
            style={{
              fontSize: 20,
              fontWeight: 500,
              color: '#71717a',
              marginTop: '24px',
            }}
          >
            jpsrealtor.com
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
