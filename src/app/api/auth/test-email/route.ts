// src/app/api/auth/test-email/route.ts
// Test endpoint to verify email configuration (ADMIN ONLY)

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import User from "@/models/user";
import { sendVerificationEmail } from "@/lib/email-resend";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Only allow admins to test email
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized - must be logged in" },
        { status: 401 }
      );
    }

    await dbConnect();
    const user = await User.findOne({ email: session.user.email });

    if (!user?.isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized - admin only" },
        { status: 403 }
      );
    }

    // Check environment variables
    const envCheck = {
      EMAIL_USER: !!process.env.EMAIL_USER,
      EMAIL_PASS: !!process.env.EMAIL_PASS,
      EMAIL_FROM: process.env.EMAIL_FROM || "NOT SET",
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || "NOT SET",
      NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || "NOT SET",
      EMAIL_SERVER_HOST: process.env.EMAIL_SERVER_HOST || "smtp.gmail.com",
      EMAIL_SERVER_PORT: process.env.EMAIL_SERVER_PORT || "587",
    };

    // Send test email
    try {
      await sendVerificationEmail(
        session.user.email,
        "TEST-TOKEN-" + Date.now(),
        session.user.name || session.user.email
      );

      return NextResponse.json({
        success: true,
        message: "Test email sent successfully",
        recipient: session.user.email,
        config: envCheck,
      });
    } catch (emailError) {
      return NextResponse.json(
        {
          success: false,
          error: emailError instanceof Error ? emailError.message : "Unknown error",
          config: envCheck,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Test email error:", error);
    return NextResponse.json(
      { error: "Failed to send test email" },
      { status: 500 }
    );
  }
}
