// src/app/api/integrations/api-tokens/[id]/route.ts
//
// DELETE → revokes (sets revokedAt). We never hard-delete so we keep an audit
// trail of which token was used to do what.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";

const NO_STORE = { "Cache-Control": "no-store" };

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE });
  }
  const { id } = await params;

  await dbConnect();
  const user = await User.findById(session.user.id);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404, headers: NO_STORE });
  }

  const tokens = (user.agentProfile as any)?.aiIntegrations?.apiTokens || [];
  const t = tokens.find((x: any) => String(x._id) === id);
  if (!t) {
    return NextResponse.json({ error: "Token not found" }, { status: 404, headers: NO_STORE });
  }
  if (t.revokedAt) {
    return NextResponse.json({ ok: true, alreadyRevoked: true }, { headers: NO_STORE });
  }
  t.revokedAt = new Date();
  user.markModified("agentProfile.aiIntegrations.apiTokens");
  await user.save();

  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}
