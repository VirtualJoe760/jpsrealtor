// /api/invest/interest — a signed-in user's NON-BINDING indication of interest
// in the planned pre-seed round. GET returns theirs, POST creates/updates it.
//
// No money moves here, by design: under Reg CF testing-the-waters the company
// may not accept funds or commitments before a Form C is filed with a funding
// portal. See docs/company/README.md.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import InvestorInterest from "@/models/InvestorInterest";
import { sendInvestorInterestNotification } from "@/lib/email-resend";

export const dynamic = "force-dynamic";

const MIN = 100;
const MAX = 3_000_000; // the whole round

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await dbConnect();
  const doc = await InvestorInterest.findOne({ userId: session.user.id }).select("amount note updatedAt").lean();
  return NextResponse.json({ interest: doc || null }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const amount = Math.round(Number(body?.amount));
  if (!Number.isFinite(amount) || amount < MIN || amount > MAX) {
    return NextResponse.json({ error: `Amount must be between $${MIN} and $${MAX.toLocaleString()}` }, { status: 400 });
  }
  const note = typeof body?.note === "string" ? body.note.trim().slice(0, 1000) : "";

  await dbConnect();
  const existing = await InvestorInterest.exists({ userId: session.user.id });
  const doc = await InvestorInterest.findOneAndUpdate(
    { userId: session.user.id },
    { $set: { amount, note, name: session.user.name || "", email: session.user.email } },
    { upsert: true, new: true, runValidators: true }
  ).lean();

  await sendInvestorInterestNotification({
    name: session.user.name || "",
    email: session.user.email,
    amount,
    note,
    updated: !!existing,
  });

  return NextResponse.json({ interest: { amount: doc!.amount, note: doc!.note, updatedAt: doc!.updatedAt } });
}
