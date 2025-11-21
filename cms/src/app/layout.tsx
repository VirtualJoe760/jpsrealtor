import React from 'react'
import './globals.css'

export const metadata = {
  title: 'JPSRealtor CMS',
  description: 'Content Management System for JPSRealtor',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
