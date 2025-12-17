// src/app/api/auth/2fa/verify-code/route.ts
// Verify Two-Factor Authentication code and create session

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import TwoFactorToken from "@/models/twoFactorToken";
import jwt from "jsonwebtoken";

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return NextResponse.json(
        { error: "Email and code are required" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Find the token
    const token = await TwoFactorToken.findOne({
      email: email.toLowerCase(),
      code: code.trim(),
    });

    if (!token) {
      return NextResponse.json(
        { error: "Invalid verification code" },
        { status: 400 }
      );
    }

    // Check if token is expired
    if (new Date() > token.expires) {
      await TwoFactorToken.deleteOne({ _id: token._id });
      return NextResponse.json(
        { error: "Verification code has expired" },
        { status: 400 }
      );
    }

    // Get user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    // Delete the used token
    await TwoFactorToken.deleteOne({ _id: token._id });

    // Create JWT token for NextAuth session
    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
      throw new Error("NEXTAUTH_SECRET is not defined");
    }

    const jwtToken = jwt.sign(
      {
        id: String(user._id),
        email: user.email,
        name: user.name,
        image: user.image,
        roles: user.roles,
        isAdmin: user.isAdmin,
      },
      secret,
      { expiresIn: "30d" }
    );

    return NextResponse.json({
      success: true,
      message: "Verification successful",
      token: jwtToken,
      user: {
        id: String(user._id),
        email: user.email,
        name: user.name,
        image: user.image,
        roles: user.roles,
        isAdmin: user.isAdmin,
      },
    });
  } catch (error) {
    console.error("Error verifying 2FA code:", error);
    return NextResponse.json(
      { error: "Failed to verify code" },
      { status: 500 }
    );
  }
}
