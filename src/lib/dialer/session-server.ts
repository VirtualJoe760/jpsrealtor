import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import mongoose from 'mongoose';

export function dialerJson(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}
export async function dialerOwner() {
  const session = await getServerSession(authOptions);
  const id = session?.user?.id;
  if (!id || !/^[a-f\d]{24}$/i.test(id)) return null;
  await dbConnect();
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
