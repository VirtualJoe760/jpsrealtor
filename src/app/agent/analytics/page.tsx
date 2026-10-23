'use client'

/**
 * Agent dashboard → Analytics.
 *
 * Admin-only while the caption rules and viewport query cost are evaluated on
 * real data. The check here is navigation UX only — the authoritative gate is
 * `requireAdmin()` on each of the three read routes, because a client-side
 * check protects nothing. Removing this block would make the page empty for a
 * non-admin, not leak anything.
 */

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import AgentNav from '@/app/components/AgentNav'
import AnalyticsClient from '@/app/components/analytics/AnalyticsClient'

export default function AgentAnalyticsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const isAdmin = Boolean((session?.user as { isAdmin?: boolean } | undefined)?.isAdmin)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin')
  }, [status, router])

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-neutral-500">
        Loading…
      </div>
    )
  }

  return (
    // h-screen + a flex column so the map fills exactly the space the nav
    // leaves, however tall the nav wraps to. min-h-screen would let the map
    // overflow and cut off its own legend.
    <div className="flex h-screen flex-col overflow-hidden">
      <div className="mx-auto flex min-h-0 w-full max-w-[1800px] flex-1 flex-col px-4 pt-16 md:pt-0">
        <div className="flex-shrink-0">
          <AgentNav />
        </div>

        {isAdmin ? (
          <AnalyticsClient />
        ) : (
          <div className="py-20 text-center">
            <h1 className="text-lg font-semibold">Analytics</h1>
            <p className="mx-auto mt-2 max-w-md text-sm text-neutral-500">
              This tab is in limited release and is not available on your account yet.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
