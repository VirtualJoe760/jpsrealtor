// src/app/api/credits/balance/route.ts
// GET — current credit balance, tier, and recent transactions.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import CreditLedger from "@/models/CreditLedger";
import { CREDIT_TIERS, creditsToDollars } from "@/config/credits";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const user = await User.findOne({ email: session.user.email }).select("_id").lean();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const ledger = await CreditLedger.findOne({ userId: (user as any)._id }).lean();
    if (!ledger) {
      return NextResponse.json({
        balance: 0,
        totalEarned: 0,
        totalSpent: 0,
        tier: "beginner",
        tierConfig: CREDIT_TIERS.beginner,
        dollarSpendValue: 0,
        transactions: [],
        totalTransactions: 0,
      });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const sorted = ((ledger as any).transactions || [])
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(offset, offset + limit);

    return NextResponse.json({
      balance: (ledger as any).balance,
      totalEarned: (ledger as any).totalEarned,
      totalSpent: (ledger as any).totalSpent,
      tier: (ledger as any).tier,
      tierConfig: CREDIT_TIERS[(ledger as any).tier as keyof typeof CREDIT_TIERS] || CREDIT_TIERS.beginner,
      dollarSpendValue: creditsToDollars((ledger as any).balance),
      transactions: sorted,
      totalTransactions: ((ledger as any).transactions || []).length,
    });
  } catch (error: any) {
    console.error("[api/credits/balance] error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
