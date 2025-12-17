// src/app/api/auth/verify-email/route.ts
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import VerificationToken from "@/models/verificationToken";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = body.token;

    if (!token) {
      return NextResponse.json(
        { error: "Verification token is required" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Find the verification token
    const verificationToken = await VerificationToken.findOne({ token });

    if (!verificationToken) {
      return NextResponse.json(
        { error: "Invalid or expired verification token" },
        { status: 400 }
      );
    }

    // Check if token is expired
    if (new Date() > verificationToken.expires) {
      await VerificationToken.deleteOne({ _id: verificationToken._id });
      return NextResponse.json(
        { error: "Verification token has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // Find and update the user
    const user = await User.findOne({ email: verificationToken.identifier });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Mark email as verified
    user.emailVerified = new Date();
    await user.save();

    // Delete the verification token
    await VerificationToken.deleteOne({ _id: verificationToken._id });

    return NextResponse.json(
      {
        message: "Email verified successfully. You can now log in.",
        success: true,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Email verification error:", error);
    return NextResponse.json(
      { error: "An error occurred during email verification" },
      { status: 500 }
    );
  }
}
