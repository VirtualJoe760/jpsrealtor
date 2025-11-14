// src/app/api/auth/check-verification/route.ts
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import User from "@/models/user";

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
