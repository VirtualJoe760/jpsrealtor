// src/app/api/auth/2fa/send-code/route.ts
// Send Two-Factor Authentication code via email

import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "crypto";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import TwoFactorToken from "@/models/twoFactorToken";
import { send2FACode } from "@/lib/email-resend";

// Mark this route as dynamic to prevent static optimization during build
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Check if user exists and has 2FA enabled
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    if (!user.twoFactorEnabled) {
      return NextResponse.json(
        { error: "Two-factor authentication is not enabled for this account" },
        { status: 400 }
      );
    }

    // Generate 6-digit code
    const code = String(randomInt(100000, 999999));

    // Delete any existing tokens for this email
    await TwoFactorToken.deleteMany({ email: email.toLowerCase() });

    // Create new token with 10-minute expiry
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await TwoFactorToken.create({
      email: email.toLowerCase(),
      code,
      expires,
    });

    // Send code via email
    const emailToSend = user.twoFactorEmail || user.email;
    await send2FACode(emailToSend, code, user.name || "User");

    return NextResponse.json({
      success: true,
      message: "Verification code sent to your email",
    });
  } catch (error) {
    console.error("Error sending 2FA code:", error);
    return NextResponse.json(
      { error: "Failed to send verification code" },
      { status: 500 }
    );
  }
}
