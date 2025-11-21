import React from 'react'
import Link from 'next/link'

export default function Page() {
  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>JPSRealtor CMS</h1>
      <p>Welcome to the Payload CMS admin panel.</p>
      <Link href="/admin" style={{ color: 'blue', textDecoration: 'underline' }}>
        Go to Admin Panel →
      </Link>
    </div>
  )
}
