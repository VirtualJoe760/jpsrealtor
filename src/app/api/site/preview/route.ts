// GET /api/site/preview — mint a short-lived signed preview link for the
// agent's own subdomain (or any subdomain, for admins) and bounce there.
// The proxy middleware verifies the token via /api/site-config, sets a
// host-scoped preview cookie, and serves the Claude-built site. Auth-tether
// in action: preview access flows from the ChatRealty session.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import jwt from "jsonwebtoken";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401, headers: NO_STORE });
  }

  await dbConnect();
  const me = await User.findOne(
    { email: session.user.email },
    { isAdmin: 1, "agentProfile.subdomain": 1 }
  ).lean<any>();

  const requested = req.nextUrl.searchParams.get("subdomain")?.toLowerCase().trim();
  const own = me?.agentProfile?.subdomain || null;
  const subdomain = requested || own;

  if (!subdomain) {
    return NextResponse.json(
      { error: "No subdomain on your profile yet — set one in Settings." },
      { status: 400, headers: NO_STORE }
    );
  }
  // Agents can only preview THEIR OWN subdomain; admins can preview any.
  if (subdomain !== own && !me?.isAdmin) {
    return NextResponse.json({ error: "Not your site." }, { status: 403, headers: NO_STORE });
  }

  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Server misconfigured." }, { status: 500, headers: NO_STORE });
  }
  const token = jwt.sign({ kind: "site-preview", sub: subdomain }, secret, { expiresIn: "15m" });

  const host = req.headers.get("host") || "";
  const target = host.includes("localhost")
    ? `http://${subdomain}.localhost:${host.split(":")[1] || "3000"}/?crpv=${encodeURIComponent(token)}`
    : `https://${subdomain}.chatrealty.io/?crpv=${encodeURIComponent(token)}`;

  return NextResponse.redirect(target);
}
