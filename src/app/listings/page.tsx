import { Metadata } from 'next'
import IframeSearch from '@/components/IframeSearch'

export const metadata: Metadata = {
  title: 'Property Listings | Palm Desert & Coachella Valley Homes for Sale',
  description: 'Browse the latest homes for sale in Palm Desert, Indian Wells, La Quinta, and the greater Coachella Valley. Find your perfect property with Joseph Sardella.',
  keywords: ['Palm Desert homes for sale', 'Coachella Valley real estate', 'houses for sale', 'MLS listings', 'property search'],
  openGraph: {
    title: 'Property Listings | Palm Desert & Coachella Valley Homes for Sale',
    description: 'Browse the latest homes for sale in Palm Desert, Indian Wells, La Quinta, and the greater Coachella Valley. Find your perfect property with Joseph Sardella.',
    images: [
      {
        url: '/city-images/palm-desert.jpg',
        width: 1200,
        height: 630,
        alt: 'Palm Desert Homes for Sale',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Property Listings | Palm Desert & Coachella Valley Homes for Sale',
    description: 'Browse the latest homes for sale in Palm Desert, Indian Wells, La Quinta, and the greater Coachella Valley.',
    images: ['/city-images/palm-desert.jpg'],
  },
}

const Listings = () => {
  return (
    <IframeSearch />
  )
}

export default Listings