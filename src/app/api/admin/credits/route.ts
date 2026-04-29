// src/app/api/admin/credits/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import dbConnect from "@/lib/mongoose";
import PointsLedger from "@/models/PointsLedger";

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdmin();
    if (!auth.authorized) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { userId, amount, reason } = await request.json();

    if (!userId || !amount || amount <= 0) {
      return NextResponse.json(
        { error: "userId and a positive amount are required" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Find or create ledger
    let ledger = await PointsLedger.findOne({ userId });

    if (!ledger) {
      ledger = new PointsLedger({
        userId,
        balance: 0,
        totalEarned: 0,
        totalSpent: 0,
        tier: "beginner",
        transactions: [],
      });
    }

    // Credit the points
    const description = reason
      ? `Admin bonus: ${reason}`
      : "Admin bonus credits";

    ledger.creditPoints(amount, "bonus", description);
    await ledger.save();

    return NextResponse.json({
      success: true,
      newBalance: ledger.balance,
      totalEarned: ledger.totalEarned,
    });
  } catch (error: any) {
    console.error("[Admin Credits POST]", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
