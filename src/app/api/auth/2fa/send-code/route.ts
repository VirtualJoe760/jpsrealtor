// src/app/api/auth/2fa/send-code/route.ts
// Send Two-Factor Authentication code via email or SMS

import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "crypto";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import TwoFactorToken from "@/models/twoFactorToken";
import { send2FACode } from "@/lib/email-resend";
import { send2FACodeSMS } from "@/lib/twilio";

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

    // Send code via SMS or email based on user preference
    const method = user.twoFactorMethod || 'email';

    if (method === 'sms') {
      // Send via SMS
      if (!user.twoFactorPhone || !user.phoneVerified) {
        return NextResponse.json(
          { error: "SMS 2FA is enabled but phone number is not verified. Please use email or verify your phone number." },
          { status: 400 }
        );
      }

      const smsResult = await send2FACodeSMS(user.twoFactorPhone, code, user.name);

      if (!smsResult.success) {
        console.error("[2FA] SMS send failed:", smsResult.error);
        return NextResponse.json(
          { error: "Failed to send SMS. Please try email verification instead." },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `Verification code sent to your phone ending in ${user.twoFactorPhone.slice(-4)}`,
        method: 'sms',
      });
    } else {
      // Send via email (default)
      const emailToSend = user.twoFactorEmail || user.email;
      await send2FACode(emailToSend, code, user.name || "User");

      return NextResponse.json({
        success: true,
        message: "Verification code sent to your email",
        method: 'email',
      });
    }
  } catch (error) {
    console.error("Error sending 2FA code:", error);
    return NextResponse.json(
      { error: "Failed to send verification code" },
      { status: 500 }
    );
  }
}
