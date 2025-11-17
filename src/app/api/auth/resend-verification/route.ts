// src/app/api/auth/resend-verification/route.ts
// Allow users to resend verification email

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import dbConnect from "@/lib/mongoose";
import User from "@/models/user";
import VerificationToken from "@/models/verificationToken";
import { sendVerificationEmail } from "@/lib/email-resend";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      // Don't reveal if user exists or not for security
      return NextResponse.json(
        { message: "If an account exists with this email, a verification email will be sent." },
        { status: 200 }
      );
    }

    // Check if already verified
    if (user.emailVerified) {
      return NextResponse.json(
        { error: "This email is already verified" },
        { status: 400 }
      );
    }

    // Delete any existing tokens for this email
    await VerificationToken.deleteMany({ identifier: email.toLowerCase() });

    // Generate new verification token
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await VerificationToken.create({
      identifier: email.toLowerCase(),
      token,
      expires,
    });

    // Send verification email
    let emailSent = false;
    try {
      await sendVerificationEmail(email, token, user.name || email);
      emailSent = true;
      console.log('✅ Resent verification email to:', email);
    } catch (emailError) {
      console.error("❌ Failed to resend verification email:", emailError);
      if (emailError instanceof Error) {
        console.error("Email error details:", emailError.message);
      }

      return NextResponse.json(
        {
          error: "Failed to send verification email. Please try again later or contact support.",
          details: emailError instanceof Error ? emailError.message : "Unknown error"
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: "Verification email sent. Please check your inbox and spam folder.",
        emailSent,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Resend verification error:", error);
    return NextResponse.json(
      { error: "An error occurred while resending verification email" },
      { status: 500 }
    );
  }
}
