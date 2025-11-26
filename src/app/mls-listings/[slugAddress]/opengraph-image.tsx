import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Property Listing'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

async function getListingData(slugAddress: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://jpsrealtor.com'
    const res = await fetch(`${baseUrl}/api/mls-listings/${slugAddress}`, {
      next: { revalidate: 3600 }, // Cache for 1 hour
    })
    if (!res.ok) return null
    const data = await res.json()
    return data?.listing ?? null
  } catch {
    return null
  }
}

function formatPrice(price: number | undefined): string {
  if (!price) return 'Price TBD'
  if (price >= 1_000_000) {
    return `$${(price / 1_000_000).toFixed(2)}M`
  }
  return `$${price.toLocaleString()}`
}

export default async function OGImage({
  params,
}: {
  params: Promise<{ slugAddress: string }>
}) {
  const { slugAddress } = await params
  const listing = await getListingData(slugAddress)

  // Fallback if no listing found
  if (!listing) {
    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0a0a0a',
            color: '#ffffff',
            fontSize: 48,
          }}
        >
          Property Not Found
        </div>
      ),
      { ...size }
    )
  }

  const address =
    listing.unparsedAddress ||
    listing.unparsedFirstLineAddress ||
    listing.address ||
    'Property Listing'

  const city = listing.city || ''
  const state = listing.stateOrProvince || 'CA'
  const price = formatPrice(listing.listPrice)
  const beds = listing.bedroomsTotal || listing.beds || 0
  const baths = listing.bathroomsTotalInteger || listing.bathroomsFull || 0
  const sqft = listing.livingArea || listing.buildingAreaTotal || 0
  const photoUrl = listing.primaryPhotoUrl || 'https://jpsrealtor.com/joey/about.png'

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'row',
          backgroundColor: '#0a0a0a',
        }}
      >
        {/* Left side - Property Photo */}
        <div
          style={{
            width: '55%',
            height: '100%',
            display: 'flex',
            position: 'relative',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoUrl}
            alt={address}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
          {/* Gradient overlay */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(90deg, transparent 70%, #0a0a0a 100%)',
            }}
          />
        </div>

        {/* Right side - Property Details */}
        <div
          style={{
            width: '45%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '40px',
            backgroundColor: '#0a0a0a',
          }}
        >
          {/* Price */}
          <div
            style={{
              fontSize: 56,
              fontWeight: 700,
              color: '#10b981',
              marginBottom: '16px',
            }}
          >
            {price}
          </div>

          {/* Address */}
          <div
            style={{
              fontSize: 28,
              fontWeight: 600,
              color: '#ffffff',
              marginBottom: '8px',
              lineHeight: 1.2,
              display: 'flex',
              flexWrap: 'wrap',
            }}
          >
            {address}
          </div>

          {/* City, State */}
          <div
            style={{
              fontSize: 22,
              fontWeight: 400,
              color: '#a1a1aa',
              marginBottom: '32px',
            }}
          >
            {city}, {state}
          </div>

          {/* Property Stats */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              gap: '24px',
              marginBottom: '32px',
            }}
          >
            {beds > 0 && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  padding: '16px 24px',
                  borderRadius: '12px',
                }}
              >
                <div style={{ fontSize: 32, fontWeight: 700, color: '#ffffff' }}>
                  {beds}
                </div>
                <div style={{ fontSize: 14, color: '#a1a1aa' }}>Beds</div>
              </div>
            )}
            {baths > 0 && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  padding: '16px 24px',
                  borderRadius: '12px',
                }}
              >
                <div style={{ fontSize: 32, fontWeight: 700, color: '#ffffff' }}>
                  {baths}
                </div>
                <div style={{ fontSize: 14, color: '#a1a1aa' }}>Baths</div>
              </div>
            )}
            {sqft > 0 && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  padding: '16px 24px',
                  borderRadius: '12px',
                }}
              >
                <div style={{ fontSize: 32, fontWeight: 700, color: '#ffffff' }}>
                  {sqft.toLocaleString()}
                </div>
                <div style={{ fontSize: 14, color: '#a1a1aa' }}>Sq Ft</div>
              </div>
            )}
          </div>

          {/* Agent Branding */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginTop: 'auto',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                fontWeight: 700,
                color: '#ffffff',
              }}
            >
              JS
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#ffffff' }}>
                Joseph Sardella
              </div>
              <div style={{ fontSize: 14, color: '#71717a' }}>jpsrealtor.com</div>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
