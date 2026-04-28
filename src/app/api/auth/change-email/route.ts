// src/app/api/auth/change-email/route.ts
// POST: Initiate email change — sends verification to the new email address

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import crypto from "crypto";
import { sendEmailChangeVerification } from "@/lib/email-resend";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { newEmail } = await request.json();

    if (!newEmail || !newEmail.includes("@")) {
      return NextResponse.json({ error: "Valid email address required" }, { status: 400 });
    }

    const normalizedEmail = newEmail.trim().toLowerCase();

    if (normalizedEmail === session.user.email.toLowerCase()) {
      return NextResponse.json({ error: "That's already your current email" }, { status: 400 });
    }

    await dbConnect();

    // Check if email is already taken
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return NextResponse.json({ error: "This email is already in use" }, { status: 409 });
    }

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Generate verification token
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    user.pendingEmail = normalizedEmail;
    user.pendingEmailToken = token;
    user.pendingEmailExpires = expires;
    await user.save();

    // Send verification email to the NEW address
    sendEmailChangeVerification(
      normalizedEmail,
      user.name || "",
      token,
    ).catch((err) => console.error("[change-email] Verification email failed:", err));

    return NextResponse.json({
      success: true,
      message: "Verification email sent to your new address. Check your inbox.",
    });
  } catch (error: any) {
    console.error("[change-email] Error:", error);
    return NextResponse.json({ error: "Failed to initiate email change" }, { status: 500 });
  }
}
