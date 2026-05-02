// src/app/api/auth/confirm-email-change/route.ts
// GET: Confirm email change via token from verification link

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 400 });
    }

    await dbConnect();

    const user = await User.findOne({
      pendingEmailToken: token,
      pendingEmailExpires: { $gt: new Date() },
    });

    if (!user) {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || "https://chatrealty.io";
      return NextResponse.redirect(`${baseUrl}/dashboard/settings?email_change=expired`);
    }

    // Check the new email isn't taken (race condition guard)
    const existing = await User.findOne({ email: user.pendingEmail });
    if (existing) {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || "https://chatrealty.io";
      return NextResponse.redirect(`${baseUrl}/dashboard/settings?email_change=taken`);
    }

    const oldEmail = user.email;
    const newEmail = user.pendingEmail;

    // Update email
    user.email = newEmail;
    user.pendingEmail = undefined;
    user.pendingEmailToken = undefined;
    user.pendingEmailExpires = undefined;
    await user.save();

    console.log(`[confirm-email-change] Email changed: ${oldEmail} → ${newEmail}`);

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || "https://chatrealty.io";
    return NextResponse.redirect(`${baseUrl}/dashboard/settings?email_change=success`);
  } catch (error: any) {
    console.error("[confirm-email-change] Error:", error);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || "https://chatrealty.io";
    return NextResponse.redirect(`${baseUrl}/dashboard/settings?email_change=error`);
  }
}
