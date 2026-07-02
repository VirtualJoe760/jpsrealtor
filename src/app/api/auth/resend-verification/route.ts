// src/app/api/auth/resend-verification/route.ts
// Allow users to resend verification email

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import VerificationToken from "@/models/verificationToken";
import { sendVerificationEmail } from "@/lib/email-resend";
import { clientIp } from "@/lib/turnstile";
import { checkRateLimit } from "@/lib/rate-limit";

// Mark this route as dynamic to prevent static optimization during build
export const dynamic = 'force-dynamic';

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

    // Email-spam guard: this route sends a verification email (cost + can be
    // used to spam an inbox). Cap at 3/10min per target email and 10/10min per
    // IP. On exceed, mirror the enumeration-safe 200 message below so we don't
    // reveal whether the email belongs to a real, unverified account. A real
    // user resending once or twice never trips this.
    const emailKey = email.toLowerCase();
    const ip = clientIp(request) || "unknown";
    const ipLimit = checkRateLimit(`resend-verify:ip:${ip}`, { max: 10, windowMs: 10 * 60 * 1000 });
    if (!ipLimit.ok) {
      return NextResponse.json(
        { error: ipLimit.error },
        { status: ipLimit.status, headers: { "Retry-After": String(ipLimit.retryAfter) } }
      );
    }
    const emailLimit = checkRateLimit(`resend-verify:email:${emailKey}`, { max: 3, windowMs: 10 * 60 * 1000 });
    if (!emailLimit.ok) {
      return NextResponse.json(
        { message: "If an account exists with this email, a verification email will be sent." },
        { status: 200, headers: { "Retry-After": String(emailLimit.retryAfter) } }
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
