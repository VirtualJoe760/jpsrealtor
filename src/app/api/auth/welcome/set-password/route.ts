// src/app/api/auth/welcome/set-password/route.ts
//
// POST /api/auth/welcome/set-password
// Body: { token, password }
//
// Validates the token, sets the user's password (replacing the random
// placeholder created at lead-intake time), marks them verified, and consumes
// the token so it can't be reused.

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import VerificationToken from "@/models/verificationToken";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token and password are required" },
        { status: 400 }
      );
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
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

    user.password = await bcrypt.hash(password, 12);
    if (!user.emailVerified) user.emailVerified = new Date();
    await user.save();

    // Consume the token so the link can't be reused
    await VerificationToken.deleteOne({ _id: record._id });

    return NextResponse.json({
      success: true,
      email: user.email,
    });
  } catch (err: any) {
    console.error("[welcome/set-password] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to set password" },
      { status: 500 }
    );
  }
}
