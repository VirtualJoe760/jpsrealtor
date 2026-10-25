import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import mongoose from 'mongoose';
import User from '@/models/User';

export function dialerJson(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}
/**
 * The owner of a dialer request, or null when the caller may not use the dialer.
 *
 * **The dialer is admin-only** while calls are still simulated and live voice
 * dispatch is hard-disabled — shipping a half-built calling surface to every
 * agent invites real dials against other brokerages' contacts. The check lives
 * here, not in each route, because all four session-scoped dialer routes
 * (`sessions`, `sessions/[id]`, `sessions/[id]/commands`, `billing`) already
 * funnel through this function: a new route cannot forget the gate. The Twilio
 * status webhook deliberately does NOT use this — it has no session and
 * verifies its own signature.
 *
 * Non-admins get the callers' existing `401`, not a `403`. That is a deliberate
 * trade for keeping this a one-function chokepoint; if the status code ever
 * matters to a client, split the admin check out rather than scattering it.
 */
export async function dialerOwner() {
  const session = await getServerSession(authOptions);
  const id = session?.user?.id;
  if (!id || !/^[a-f\d]{24}$/i.test(id)) return null;
  await dbConnect();
  // Read isAdmin from the database, never from the JWT: the token is minted at
  // sign-in and would keep admin rights alive after they were revoked.
  const user = await User.findById(id).select('isAdmin').lean<{ isAdmin?: boolean }>();
  if (!user?.isAdmin) return null;
  return new mongoose.Types.ObjectId(id);
}
export function sessionDTO(doc: any, attempt?: any) {
  return {
    _id: String(doc._id), name: doc.name, status: doc.status, version: doc.version,
    updatedAt: doc.updatedAt,
    activeAttemptId: doc.activeAttemptId ? String(doc.activeAttemptId) : null,
    activeAttempt: attempt ? { _id: String(attempt._id), contactId: String(attempt.contactId), state: attempt.state,
      startedAt: attempt.startedAt, answeredAt: attempt.answeredAt, endedAt: attempt.endedAt } : null,
    items: doc.items.map((item: any) => ({ contactId: String(item.contactId), phone: item.phone, notes: item.notes, outcome: item.outcome })),
  };
}
