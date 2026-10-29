// GET/PUT /api/agent/mls-association — the signed-in user's MLS association
// (name, MLS ID, the association's contact info). Used by the application
// form, the dashboard prompt and Settings. See src/lib/mls-membership.ts.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import { parseMlsMembership, mlsMembershipSet } from "@/lib/mls-membership";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await dbConnect();
  const user = await User.findOne({ email: session.user.email })
    .select("agentProfile.mlsMembership")
    .lean<{ agentProfile?: { mlsMembership?: Record<string, unknown> } }>();
  const m = user?.agentProfile?.mlsMembership || {};
  return NextResponse.json(
    {
      membership: {
        associationName: m.associationName || "",
        mlsId: m.mlsId || "",
        contactName: m.contactName || "",
        contactPhone: m.contactPhone || "",
        contactEmail: m.contactEmail || "",
        website: m.website || "",
      },
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { value, error } = parseMlsMembership(await request.json().catch(() => null));
  if (error || !value) return NextResponse.json({ error }, { status: 400 });
  await dbConnect();
  const r = await User.updateOne({ email: session.user.email }, { $set: mlsMembershipSet(value) });
  if (!r.matchedCount) return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
