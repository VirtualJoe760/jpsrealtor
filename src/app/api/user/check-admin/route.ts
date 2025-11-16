// src/app/api/user/check-admin/route.ts
// Check if current user is admin

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import User from "@/models/user";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ isAdmin: false });
    }

    await dbConnect();

    const user = await User.findOne({ email: session.user.email }).select("isAdmin").lean();

    return NextResponse.json({
      isAdmin: user?.isAdmin || false,
    });
  } catch (error) {
    console.error("Error checking admin status:", error);
    return NextResponse.json({ isAdmin: false });
  }
}
