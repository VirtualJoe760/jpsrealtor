// src/app/api/auth/impersonate/route.ts
// Admin impersonation — log in as another user while retaining admin identity.
//
// POST /api/auth/impersonate
//   { action: "start", subdomain: "bethanyklier" }  → become that agent
//   { action: "stop" }                               → return to admin account
//
// Only available to admin accounts. Sets a new JWT as the target user with
// an `impersonatedBy` field so the app knows this is an admin session.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getToken, encode } from "next-auth/jwt";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";

const ADMIN_EMAILS = ["josephsardella@gmail.com"];

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const currentToken = await getToken({ req });
  const secret = process.env.NEXTAUTH_SECRET!;
  const { action, subdomain } = await req.json();

  // ── Stop impersonation: restore admin session ──
  if (action === "stop") {
    const adminEmail = currentToken?.impersonatedBy;
    if (!adminEmail) {
      return NextResponse.json({ error: "Not currently impersonating" }, { status: 400 });
    }

    await dbConnect();
    const admin = await User.findOne({ email: adminEmail })
      .select("_id name email image roles isAdmin twoFactorEnabled")
      .lean();

    if (!admin) {
      return NextResponse.json({ error: "Admin account not found" }, { status: 404 });
    }

    const adminToken = await encode({
      token: {
        id: String(admin._id),
        email: admin.email,
        name: admin.name,
        picture: admin.image,
        roles: admin.roles || [],
        isAdmin: admin.isAdmin ?? true,
        twoFactorEnabled: admin.twoFactorEnabled || false,
        requiresTwoFactor: false,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
      },
      secret,
      maxAge: 30 * 24 * 60 * 60,
    });

    const response = NextResponse.json({
      message: `Returned to admin account: ${admin.email}`,
      user: { name: admin.name, email: admin.email },
    });

    const cookieName = process.env.NODE_ENV === "production"
      ? "__Secure-next-auth.session-token"
      : "next-auth.session-token";

    response.cookies.set(cookieName, adminToken, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 30 * 24 * 60 * 60,
    });

    return response;
  }

  // ── Start impersonation ──
  if (action !== "start" || !subdomain) {
    return NextResponse.json(
      { error: 'Provide { action: "start", subdomain } or { action: "stop" }' },
      { status: 400 }
    );
  }

  // Only admins can impersonate
  const isAdmin =
    ADMIN_EMAILS.includes(session.user.email) ||
    currentToken?.isAdmin === true;

  if (!isAdmin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  // Don't allow nested impersonation
  if (currentToken?.impersonatedBy) {
    return NextResponse.json(
      { error: "Already impersonating. Stop current impersonation first." },
      { status: 400 }
    );
  }

  // Look up the target agent by subdomain
  await dbConnect();
  const agent = await User.findOne({ "agentProfile.subdomain": subdomain })
    .select("_id name email image roles isAdmin twoFactorEnabled")
    .lean();

  if (!agent) {
    return NextResponse.json({ error: `Agent with subdomain "${subdomain}" not found` }, { status: 404 });
  }

  // Issue a new JWT as the agent, with impersonation marker
  const agentToken = await encode({
    token: {
      id: String(agent._id),
      email: agent.email,
      name: agent.name,
      picture: agent.image,
      roles: agent.roles || [],
      isAdmin: false, // Agent is not admin, even though the viewer is
      twoFactorEnabled: false,
      requiresTwoFactor: false,
      // Impersonation fields — this is what makes it reversible
      impersonatedBy: session.user.email,
      impersonatedByName: session.user.name,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
    },
    secret,
    maxAge: 30 * 24 * 60 * 60,
  });

  const response = NextResponse.json({
    message: `Now viewing as: ${agent.name} (${agent.email})`,
    user: { name: agent.name, email: agent.email },
  });

  const cookieName = process.env.NODE_ENV === "production"
    ? "__Secure-next-auth.session-token"
    : "next-auth.session-token";

  response.cookies.set(cookieName, agentToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 30 * 24 * 60 * 60,
  });

  return response;
}
