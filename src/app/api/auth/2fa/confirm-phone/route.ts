// src/app/api/auth/2fa/confirm-phone/route.ts
// Confirm phone number verification code and enable SMS 2FA

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import TwoFactorToken from "@/models/twoFactorToken";

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

    const { code } = await request.json();

    if (!code) {
      return NextResponse.json(
        { error: "Verification code is required" },
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

    // Find verification token
    const token = await TwoFactorToken.findOne({
      email: user.email.toLowerCase(),
      code: code,
      type: 'phone_verification',
      expires: { $gt: new Date() },
    });

    if (!token) {
      return NextResponse.json(
        { error: "Invalid or expired verification code" },
        { status: 400 }
      );
    }

    // Update user with verified phone number
    user.twoFactorPhone = token.metadata.phoneNumber;
    user.phoneVerified = true;
    user.twoFactorMethod = 'sms';
    user.twoFactorEnabled = true;
    await user.save();

    // Delete the verification token
    await TwoFactorToken.deleteOne({ _id: token._id });

    return NextResponse.json({
      success: true,
      message: "Phone number verified and SMS 2FA enabled successfully",
      phoneNumber: token.metadata.phoneNumber,
    });
  } catch (error) {
    console.error("Error confirming phone verification:", error);
    return NextResponse.json(
      { error: "Failed to verify phone number" },
      { status: 500 }
    );
  }
}
