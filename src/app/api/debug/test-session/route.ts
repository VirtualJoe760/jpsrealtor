// Debug endpoint to test NextAuth session
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    console.log("🔍 Testing NextAuth session...");

    const session = await getServerSession(authOptions);

    console.log("Session result:", {
      hasSession: !!session,
      user: session?.user,
      expires: session?.expires,
    });

    return NextResponse.json({
      success: true,
      hasSession: !!session,
      session: session,
      env: {
        NEXTAUTH_URL: process.env.NEXTAUTH_URL,
        NEXTAUTH_SECRET_EXISTS: !!process.env.NEXTAUTH_SECRET,
        NEXTAUTH_SECRET_LENGTH: process.env.NEXTAUTH_SECRET?.length,
        AUTH_TRUST_HOST: process.env.AUTH_TRUST_HOST,
        NODE_ENV: process.env.NODE_ENV,
      },
      cookies: {
        hasCookies: !!request.headers.get("cookie"),
        cookieHeader: request.headers.get("cookie")?.substring(0, 100) + "...",
      },
    });
  } catch (error: any) {
    console.error("❌ Session test failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: error.stack,
        env: {
          NEXTAUTH_URL: process.env.NEXTAUTH_URL,
          NEXTAUTH_SECRET_EXISTS: !!process.env.NEXTAUTH_SECRET,
          AUTH_TRUST_HOST: process.env.AUTH_TRUST_HOST,
        },
      },
      { status: 500 }
    );
  }
}
