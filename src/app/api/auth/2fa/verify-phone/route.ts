// src/app/api/auth/2fa/verify-phone/route.ts
// Send verification code to phone number for SMS 2FA setup

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { randomInt } from "crypto";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import TwoFactorToken from "@/models/twoFactorToken";
import { send2FACodeSMS, formatPhoneNumber } from "@/lib/twilio";

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { phoneNumber } = await request.json();

    if (!phoneNumber) {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 }
      );
    }

    // Format phone number to E.164
    const formattedPhone = formatPhoneNumber(phoneNumber);
    if (!formattedPhone) {
      return NextResponse.json(
        { error: "Invalid phone number format. Please use format: (760) 555-1234 or +17605551234" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Get user
    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Generate 6-digit verification code
    const code = String(randomInt(100000, 999999));

    // Delete any existing phone verification tokens for this user
    await TwoFactorToken.deleteMany({
      email: user.email.toLowerCase(),
      type: 'phone_verification'
    });

    // Create verification token with 10-minute expiry
    const expires = new Date(Date.now() + 10 * 60 * 1000);
    await TwoFactorToken.create({
      email: user.email.toLowerCase(),
      code,
      expires,
      type: 'phone_verification',
      metadata: { phoneNumber: formattedPhone },
    });

    // Send verification code via SMS
    const smsResult = await send2FACodeSMS(formattedPhone, code, user.name);

    if (!smsResult.success) {
      console.error("[Phone Verification] SMS send failed:", smsResult.error);
      return NextResponse.json(
        { error: `Failed to send SMS: ${smsResult.error}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Verification code sent to ${formattedPhone.slice(-4)}`,
      phoneNumber: formattedPhone,
    });
  } catch (error) {
    console.error("Error sending phone verification:", error);
    return NextResponse.json(
      { error: "Failed to send verification code" },
      { status: 500 }
    );
  }
}
