// Temporary debug endpoint to test MongoDB connection from Vercel
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import User from "@/models/user";

export async function GET() {
  try {
    console.log("🔍 Testing MongoDB connection...");
    console.log("MONGODB_URI exists:", !!process.env.MONGODB_URI);
    console.log("MONGODB_URI prefix:", process.env.MONGODB_URI?.substring(0, 20));

    const startTime = Date.now();
    await dbConnect();
    const connectTime = Date.now() - startTime;

    console.log(`✅ MongoDB connected in ${connectTime}ms`);

    // Try to query a user
    const userCount = await User.countDocuments();
    const queryTime = Date.now() - startTime - connectTime;

    console.log(`✅ Found ${userCount} users in ${queryTime}ms`);

    return NextResponse.json({
      success: true,
      message: "MongoDB connection successful",
      stats: {
        connectionTime: `${connectTime}ms`,
        queryTime: `${queryTime}ms`,
        totalTime: `${Date.now() - startTime}ms`,
        userCount,
      },
      env: {
        MONGODB_URI_EXISTS: !!process.env.MONGODB_URI,
        MONGODB_URI_PREFIX: process.env.MONGODB_URI?.substring(0, 20),
        NEXTAUTH_URL: process.env.NEXTAUTH_URL,
        NEXTAUTH_SECRET_EXISTS: !!process.env.NEXTAUTH_SECRET,
        AUTH_TRUST_HOST: process.env.AUTH_TRUST_HOST,
      },
    });
  } catch (error: any) {
    console.error("❌ MongoDB connection failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: error.stack,
        env: {
          MONGODB_URI_EXISTS: !!process.env.MONGODB_URI,
          NEXTAUTH_URL: process.env.NEXTAUTH_URL,
          NEXTAUTH_SECRET_EXISTS: !!process.env.NEXTAUTH_SECRET,
          AUTH_TRUST_HOST: process.env.AUTH_TRUST_HOST,
        },
      },
      { status: 500 }
    );
  }
}
