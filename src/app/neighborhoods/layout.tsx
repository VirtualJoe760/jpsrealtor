/**
 * Navless Layout for Neighborhoods
 * No traditional navigation - seamless, immersive experience
 */

import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Coachella Valley Neighborhoods | Palm Desert, Indian Wells, La Quinta & More',
  description: 'Explore neighborhoods across the Coachella Valley including Palm Desert, Indian Wells, La Quinta, Rancho Mirage, Palm Springs, and more. Find your perfect community.',
  keywords: ['Coachella Valley neighborhoods', 'Palm Desert communities', 'Indian Wells', 'La Quinta', 'Rancho Mirage', 'Palm Springs neighborhoods'],
  openGraph: {
    title: 'Coachella Valley Neighborhoods | Palm Desert, Indian Wells, La Quinta & More',
    description: 'Explore neighborhoods across the Coachella Valley including Palm Desert, Indian Wells, La Quinta, Rancho Mirage, Palm Springs, and more.',
    images: [
      {
        url: '/city-images/la-quinta.jpg',
        width: 1200,
        height: 630,
        alt: 'Coachella Valley Neighborhoods',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Coachella Valley Neighborhoods | Palm Desert, Indian Wells, La Quinta & More',
    description: 'Explore neighborhoods across the Coachella Valley including Palm Desert, Indian Wells, La Quinta, and more.',
    images: ['/city-images/la-quinta.jpg'],
  },
}

export default function NeighborhoodsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      {children}
    </div>
  );
}
