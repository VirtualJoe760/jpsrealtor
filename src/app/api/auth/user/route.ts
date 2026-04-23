// src/app/api/auth/user/route.ts
// Get current user information including 2FA status

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    await dbConnect();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      _id: user._id,
      email: user.email,
      name: user.name,
      roles: user.roles,
      twoFactorEnabled: user.twoFactorEnabled,
      twoFactorEmail: user.twoFactorEmail,
      twoFactorMethod: user.twoFactorMethod,
      twoFactorPhone: user.twoFactorPhone,
      phoneVerified: user.phoneVerified,
      licenseNumber: user.licenseNumber,
      brokerageName: user.brokerageName,
      teamName: (user as any).team?.name,
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Failed to fetch user information" },
      { status: 500 }
    );
  }
}
