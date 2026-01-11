// src/app/api/auth/2fa/switch-method/route.ts
// Switch between email and SMS 2FA methods

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { method } = await request.json();

    if (!method || !['email', 'sms'].includes(method)) {
      return NextResponse.json(
        { error: "Invalid method. Must be 'email' or 'sms'" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Get user
    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Validate SMS method requirements
    if (method === 'sms') {
      if (!user.twoFactorPhone || !user.phoneVerified) {
        return NextResponse.json(
          { error: "Phone number must be verified before enabling SMS 2FA" },
          { status: 400 }
        );
      }
    }

    // Update method
    user.twoFactorMethod = method;
    await user.save();

    return NextResponse.json({
      success: true,
      message: `2FA method switched to ${method}`,
      method: method,
    });
  } catch (error) {
    console.error("Error switching 2FA method:", error);
    return NextResponse.json(
      { error: "Failed to switch 2FA method" },
      { status: 500 }
    );
  }
}
