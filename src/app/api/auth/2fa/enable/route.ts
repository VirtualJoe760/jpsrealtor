// src/app/api/auth/2fa/enable/route.ts
// Enable Two-Factor Authentication for a user

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import User from "@/models/user";

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    await dbConnect();

    // Get user email from request body (for 2FA email)
    const { twoFactorEmail } = await request.json();

    // Use provided email or fall back to user's email
    const email2FA = twoFactorEmail || session.user.email;

    // Update user to enable 2FA
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    user.twoFactorEnabled = true;
    user.twoFactorEmail = email2FA;
    await user.save();

    return NextResponse.json({
      success: true,
      message: "Two-factor authentication enabled successfully",
    });
  } catch (error) {
    console.error("Error enabling 2FA:", error);
    return NextResponse.json(
      { error: "Failed to enable two-factor authentication" },
      { status: 500 }
    );
  }
}
