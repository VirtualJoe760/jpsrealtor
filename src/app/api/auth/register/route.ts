// src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import dbConnect from "@/lib/mongoose";
import User from "@/models/user";
import VerificationToken from "@/models/verificationToken";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await User.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      name: name || undefined,
      roles: ["endUser"], // Default role
    });

    // Generate verification token
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
      await sendVerificationEmail(email, token, name || email);
      emailSent = true;
      console.log('✅ Registration email sent to:', email);
    } catch (emailError) {
      console.error("❌ Failed to send verification email:", emailError);
      if (emailError instanceof Error) {
        console.error("Email error details:", emailError.message);
      }
      // Don't fail registration if email fails, but warn the user
    }

    return NextResponse.json(
      {
        message: emailSent
          ? "User created successfully. Please check your email to verify your account."
          : "User created successfully, but we couldn't send the verification email. Please contact support.",
        emailSent,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "An error occurred during registration" },
      { status: 500 }
    );
  }
}
