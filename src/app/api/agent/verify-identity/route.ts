// src/app/api/agent/verify-identity/route.ts
// Agent ID verification (Stripe Identity: photo ID + live selfie).
//
// Un-parked 2026-10-28: paid agents verify their ID before the admin confirms
// them and their public site goes live. See src/lib/agent-onboarding.ts.
//   POST → { url } of Stripe's hosted check (resumes an unfinished one)
//   GET  → re-reads the result from Stripe (agent returning from the check)
// Results also arrive via the main Stripe webhook (identity.verification_session.*).

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import {
  startIdentityVerification,
  syncIdentityVerification,
  IdentityUnavailableError,
} from "@/lib/agent-onboarding";

export const dynamic = "force-dynamic";

async function currentAgent() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  await dbConnect();
  return User.findOne({ email: session.user.email }).select("_id roles agentApplication.identityStatus").lean<any>();
}

export async function POST() {
  const user = await currentAgent();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.roles?.includes("realEstateAgent")) {
    return NextResponse.json({ error: "ID verification is for agents." }, { status: 403 });
  }
  if (user.agentApplication?.identityStatus === "verified") {
    return NextResponse.json({ error: "Your ID is already verified." }, { status: 400 });
  }
  const base = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || "https://www.chatrealty.io";
  try {
    const url = await startIdentityVerification(String(user._id), `${base}/agent/dashboard?identity=1`);
    return NextResponse.json({ url });
  } catch (error) {
    if (error instanceof IdentityUnavailableError) {
      return NextResponse.json({ error: "ID verification opens soon — we'll email you when it's ready.", unavailable: true }, { status: 503 });
    }
    console.error("[verify-identity] error:", (error as Error).message);
    return NextResponse.json({ error: "Couldn't start ID verification" }, { status: 500 });
  }
}

export async function GET() {
  const user = await currentAgent();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await syncIdentityVerification(String(user._id));
  } catch (error) {
    console.error("[verify-identity] sync error:", (error as Error).message);
  }
  const fresh = await User.findById(user._id).select("agentApplication.identityStatus").lean<any>();
  return NextResponse.json(
    { identityStatus: fresh?.agentApplication?.identityStatus || null },
    { headers: { "Cache-Control": "no-store" } }
  );
}
