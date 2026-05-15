// src/app/api/auth/forgot-password/route.ts
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { sendPasswordResetEmail } from "@/lib/email-resend";
import { verifyTurnstile, clientIp } from "@/lib/turnstile";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { email, turnstileToken } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const ip = clientIp(request) || "unknown";

    // Rate limit by IP (10/hr) and by email (3/hr). Either limit blocks. This
    // is the actual fix for the bot-driven password-reset spam — Turnstile
    // stops the dumb scrapers, rate limit stops a determined attacker who
    // farms tokens.
    const ipLimit = checkRateLimit(`forgot-pwd:ip:${ip}`, { max: 10, windowMs: 60 * 60 * 1000 });
    if (!ipLimit.ok) {
      return NextResponse.json(
        { error: ipLimit.error },
        { status: ipLimit.status, headers: { "Retry-After": String(ipLimit.retryAfter) } }
      );
    }
    const emailLimit = checkRateLimit(`forgot-pwd:email:${email.toLowerCase()}`, { max: 3, windowMs: 60 * 60 * 1000 });
    if (!emailLimit.ok) {
      // Return the same "always success" message we use for unknown emails so
      // attackers can't distinguish "rate-limited" from "not a user". The
      // legitimate user just won't get the email this time.
      return NextResponse.json({
        success: true,
        message: "If an account exists with that email, you will receive a password reset link shortly.",
      });
    }

    // Verify Turnstile. In dev with no secret, this auto-passes; in prod with
    // no secret, it denies (turnstile.ts handles both cases).
    const captcha = await verifyTurnstile(turnstileToken, ip);
    if (!captcha.success) {
      return NextResponse.json(
        { error: captcha.error || "CAPTCHA verification failed" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({
        success: true,
        message: "If an account exists with that email, you will receive a password reset link shortly.",
      });
    }

    // Generate reset token (32 bytes = 64 hex characters)
    const resetToken = randomBytes(32).toString("hex");

    // Token expires in 1 hour
    const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Save token to user
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetTokenExpires;
    await user.save();

    // Send reset email
    const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${resetToken}`;
    await sendPasswordResetEmail(user.email, resetUrl, user.name || "User");

    return NextResponse.json({
      success: true,
      message: "If an account exists with that email, you will receive a password reset link shortly.",
    });
  } catch (error) {
    console.error("Error in forgot-password:", error);
    return NextResponse.json(
      { error: "Failed to process password reset request" },
      { status: 500 }
    );
  }
}
