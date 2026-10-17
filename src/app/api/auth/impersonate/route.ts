// src/app/api/auth/impersonate/route.ts
// Admin impersonation — log in as another user while retaining admin identity.
//
// POST /api/auth/impersonate
//   { action: "start", subdomain: "bethanyklier" }  → become that agent
//   { action: "stop" }                               → return to admin account
//
// Only available to admin accounts. The impersonated session carries an
// `impersonatedBy` field so the app knows this is an admin session.
//
// WHERE IT LIVES (2026-10-16): on the AGENT'S OWN SUBDOMAIN. Started from www
// (Admin → Users → "Log in as"), this no longer overwrites the admin's www
// session: it mints a 30-second hand-off token and returns `redirect` to
// /api/auth/receive on {slug}.chatrealty.io, which sets a host-only session
// there. The admin's www session is untouched, so "Exit to Admin" only has to
// drop the subdomain session and go back. Started ON the agent's subdomain
// (the /auth/admin-access chooser), it sets the cookie on that host directly.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getToken, encode } from "next-auth/jwt";
import { authOptions } from "@/lib/auth";
import { agentOrigin, platformOrigin, subdomainOfHost } from "@/lib/agent-host";
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

  const hostHeader = req.headers.get("host") || "localhost";
  const hostSub = subdomainOfHost(hostHeader.split(":")[0]);
  const cookieName = process.env.NODE_ENV === "production"
    ? "__Secure-next-auth.session-token"
    : "next-auth.session-token";

  // ── Stop impersonation: restore admin session ──
  if (action === "stop") {
    const adminEmail = currentToken?.impersonatedBy;
    if (!adminEmail) {
      return NextResponse.json({ error: "Not currently impersonating" }, { status: 400 });
    }

    // On the agent's subdomain: the admin's own session is still on www, so
    // just end this host's session and send them back there.
    if (hostSub) {
      const res = NextResponse.json({
        message: "Returned to admin",
        redirect: `${platformOrigin(req.nextUrl.protocol, hostHeader)}/admin/users`,
      });
      res.cookies.set(cookieName, "", {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        maxAge: 0,
      });
      return res;
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
    .select("_id name email image roles isAdmin twoFactorEnabled agentProfile.subdomain agentProfile.externalSite.status")
    .lean();

  if (!agent) {
    return NextResponse.json({ error: `Agent with subdomain "${subdomain}" not found` }, { status: 404 });
  }

  // An agent whose subdomain serves their own external site: that host runs
  // the agent's code, and the proxy refuses to create a session there (doc
  // audit M1/M2, 2026-10-17). Impersonating them needs a www-hosted
  // impersonation mode that doesn't exist yet — say so instead of dead-ending.
  const extStatus = (agent as any).agentProfile?.externalSite?.status;
  if (extStatus === "live" || extStatus === "preview") {
    return NextResponse.json(
      {
        error: `${agent.name || "This agent"}'s subdomain serves their own site, so "Log in as" isn't available for them yet.`,
        reason: "external_site",
      },
      { status: 409 }
    );
  }

  // Started anywhere but the agent's own subdomain (normally www): hand off to
  // it. Nothing is set on THIS host, so the admin stays signed in here.
  if (hostSub !== subdomain) {
    const handoff = await encode({
      token: {
        id: "",
        roles: [],
        isAdmin: false,
        transferAuth: true,
        impersonation: true,
        targetUserId: String(agent._id),
        impersonatedBy: session.user.email,
        impersonatedByName: session.user.name || undefined,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 30,
      },
      secret,
      maxAge: 30,
    });
    const receive = new URL("/api/auth/receive", agentOrigin(req.nextUrl.protocol, hostHeader, subdomain));
    receive.searchParams.set("token", handoff);
    receive.searchParams.set("redirect", "/agent/dashboard");
    return NextResponse.json({
      message: `Now viewing as: ${agent.name} (${agent.email})`,
      user: { name: agent.name, email: agent.email },
      redirect: receive.toString(),
    });
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

  response.cookies.set(cookieName, agentToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 30 * 24 * 60 * 60,
  });

  return response;
}
