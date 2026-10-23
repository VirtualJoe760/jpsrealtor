/**
 * Admin gate for the Analytics read routes.
 *
 * The Analytics tab is admin-only for now, while the caption rules and the
 * viewport query cost are evaluated on real data.
 *
 * `/api` is default-deny at the middleware, but that gate authenticates — it
 * does not check a tier or a role. Every route that must be narrower says so
 * itself, which is the same reason each credit-spending route carries its own
 * isFreeTier guard. Do not rely on the middleware alone.
 *
 * This mirrors the check in `api/admin/teams/route.ts`: the session is trusted
 * for identity only, and `isAdmin` is read from the database rather than from
 * the JWT, so revoking admin takes effect on the next request instead of on the
 * next token refresh.
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/mongoose'
import User from '@/models/User'

/**
 * Returns a 401/403 response when the caller is not an admin, or null when the
 * request may proceed:
 *
 *     const denied = await requireAdmin()
 *     if (denied) return denied
 *
 * It returns the response rather than a { ok, status, error } union on purpose.
 * This project compiles with `strict: false`, so `strictNullChecks` is off and
 * TypeScript will NOT narrow a discriminated union on a literal boolean — an
 * `if (!gate.ok)` guard still sees `GuardSuccess | GuardFailure` on both
 * branches and every `gate.error` access fails to compile. A single nullable
 * return needs no narrowing, so it behaves the same under either setting.
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  const session = await getServerSession(authOptions)
  const email = session?.user?.email
  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await dbConnect()
  const user = await User.findOne({ email }).select('isAdmin').lean<{ isAdmin?: boolean }>()
  if (!user?.isAdmin) {
    return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
  }
  return null
}
