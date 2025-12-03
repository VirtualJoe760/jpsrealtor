// src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import dbConnect from "@/lib/mongoose";
import User from "@/models/user";
import VerificationToken from "@/models/verificationToken";
import { sendVerificationEmail } from "@/lib/email-resend";

// Mark this route as dynamic to prevent static optimization during build
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      email,
      password,
      name,
      // Marketing consent fields
      phone,
      address,
      city,
      state,
      zipCode,
      ownsRealEstate,
      timeframe,
      realEstateGoals,
      smsConsent,
      newsletterConsent
    } = body;

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

    // Get IP address for consent tracking
    const forwarded = request.headers.get('x-forwarded-for');
    const ipAddress = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';

    // Create user with optional marketing consent data
    const userData: any = {
      email: email.toLowerCase(),
      password: hashedPassword,
      name: name || undefined,
      roles: ["endUser"], // Default role
    };

    // Add optional fields if provided
    if (phone) userData.phone = phone;
    if (realEstateGoals) userData.realEstateGoals = realEstateGoals;

    // Construct current address if provided
    if (address || city || state || zipCode) {
      const addressParts = [address, city, state, zipCode].filter(Boolean);
      if (addressParts.length > 0) {
        userData.currentAddress = addressParts.join(', ');
      }
    }

    // Add SMS consent if provided
    if (smsConsent !== undefined && smsConsent) {
      userData.smsConsent = {
        agreed: smsConsent,
        agreedAt: new Date(),
        phoneNumber: phone || undefined,
        ipAddress: ipAddress,
      };
    }

    // Add newsletter consent if provided
    if (newsletterConsent !== undefined && newsletterConsent) {
      userData.newsletterConsent = {
        agreed: newsletterConsent,
        agreedAt: new Date(),
        email: email,
        ipAddress: ipAddress,
      };
    }

    const user = await User.create(userData);

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

    // Subscribe to SendFox if newsletter consent was given
    if (newsletterConsent) {
      try {
        const fullAddress = [address, city, state, zipCode].filter(Boolean).join(', ');
        const firstName = name?.split(' ')[0] || '';
        const lastName = name?.split(' ').slice(1).join(' ') || '';

        await fetch(new URL('/api/contact', request.url).toString(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            firstName,
            lastName,
            email,
            phone,
            address: fullAddress,
            message: `Sign Up Form - Marketing Consent\n\nOwns Real Estate: ${ownsRealEstate || 'Not specified'}\nTimeframe: ${timeframe || 'Not specified'}\nReal Estate Goals: ${realEstateGoals || 'Not specified'}\n\nSMS Consent: ${smsConsent ? 'Yes' : 'No'}\nNewsletter Consent: ${newsletterConsent ? 'Yes' : 'No'}`,
            optIn: true,
          }),
        });
        console.log('✅ SendFox subscription successful for:', email);
      } catch (sendfoxError) {
        console.error('❌ Failed to subscribe to SendFox:', sendfoxError);
        // Don't fail registration if SendFox fails
      }
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
