// src/app/api/auth/welcome/verify/route.ts
//
// POST /api/auth/welcome/verify
//
// Validates a one-time verification token issued by /api/leads/{buy,sell}-intake.
// On success: marks the user as email-verified and returns the user's email +
// name so the welcome page can pre-fill the password / OAuth UI.
//
// Does NOT consume the token here — it's consumed when the user actually
// submits a password (or signs in via OAuth) so the page can recover from
// reloads.

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import VerificationToken from "@/models/verificationToken";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();
    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    await dbConnect();

    const record = await VerificationToken.findOne({ token });
    if (!record) {
      return NextResponse.json({ error: "Invalid or expired link" }, { status: 400 });
    }
    if (record.expires < new Date()) {
      await VerificationToken.deleteOne({ _id: record._id });
      return NextResponse.json({ error: "This link has expired" }, { status: 400 });
    }

    const user = await User.findOne({ email: record.identifier });
    if (!user) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Mark as verified (idempotent — safe to call multiple times)
    if (!user.emailVerified) {
      user.emailVerified = new Date();
      await user.save();
    }

    return NextResponse.json({
      success: true,
      email: user.email,
      name: user.name || "",
    });
  } catch (err: any) {
    console.error("[welcome/verify] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to verify token" },
      { status: 500 }
    );
  }
}
