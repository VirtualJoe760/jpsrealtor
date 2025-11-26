import React from 'react'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sell Your Home | Joseph Sardella | Palm Desert Real Estate',
  description: 'Ready to sell your Coachella Valley home? Joseph Sardella provides expert guidance, market analysis, and proven strategies to get you top dollar for your property.',
  keywords: ['sell home Palm Desert', 'Coachella Valley home selling', 'list my house', 'real estate agent', 'home value'],
  openGraph: {
    title: 'Sell Your Home | Joseph Sardella | Palm Desert Real Estate',
    description: 'Ready to sell your Coachella Valley home? Joseph Sardella provides expert guidance, market analysis, and proven strategies to get you top dollar for your property.',
    images: [
      {
        url: '/misc/real-estate/front-yard/front-yard_00017_.png',
        width: 1200,
        height: 630,
        alt: 'Sell Your Home in the Coachella Valley',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sell Your Home | Joseph Sardella | Palm Desert Real Estate',
    description: 'Ready to sell your Coachella Valley home? Joseph Sardella provides expert guidance, market analysis, and proven strategies to get you top dollar for your property.',
    images: ['/misc/real-estate/front-yard/front-yard_00017_.png'],
  },
}

const page = () => {
  return (
    <div>page</div>
  )
}

export default page