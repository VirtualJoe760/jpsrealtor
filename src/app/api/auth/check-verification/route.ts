// src/app/api/auth/check-verification/route.ts
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import { clientIp } from "@/lib/turnstile";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Enumeration guard: this route reveals whether an email maps to a user
    // (404 vs 200). Cap at 20/10min per IP so it can't be scraped to build a
    // list of registered accounts. Generous enough for a real client polling
    // its own verification status.
    const ip = clientIp(request) || "unknown";
    const ipLimit = checkRateLimit(`check-verification:ip:${ip}`, { max: 20, windowMs: 10 * 60 * 1000 });
    if (!ipLimit.ok) {
      return NextResponse.json(
        { error: ipLimit.error },
        { status: ipLimit.status, headers: { "Retry-After": String(ipLimit.retryAfter) } }
      );
    }

    await dbConnect();

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Check if email is verified
    const isVerified = !!user.emailVerified;

    return NextResponse.json({
      verified: isVerified,
      emailVerified: user.emailVerified,
    });
  } catch (error) {
    console.error("Check verification error:", error);
    return NextResponse.json(
      { error: "An error occurred while checking verification status" },
      { status: 500 }
    );
  }
}
