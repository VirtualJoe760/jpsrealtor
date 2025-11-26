import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Interactive Map | Palm Desert & Coachella Valley Real Estate',
  description: 'Explore homes for sale on our interactive map. Browse properties in Palm Desert, Indian Wells, La Quinta, and across the Coachella Valley with real-time MLS data.',
  keywords: ['interactive map', 'homes for sale map', 'Palm Desert real estate map', 'Coachella Valley property search', 'MLS map'],
  openGraph: {
    title: 'Interactive Map | Palm Desert & Coachella Valley Real Estate',
    description: 'Explore homes for sale on our interactive map. Browse properties in Palm Desert, Indian Wells, La Quinta, and across the Coachella Valley.',
    images: [
      {
        url: '/city-images/palm-springs.jpg',
        width: 1200,
        height: 630,
        alt: 'Coachella Valley Real Estate Map',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Interactive Map | Palm Desert & Coachella Valley Real Estate',
    description: 'Explore homes for sale on our interactive map across the Coachella Valley.',
    images: ['/city-images/palm-springs.jpg'],
  },
}

export default function MapLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
