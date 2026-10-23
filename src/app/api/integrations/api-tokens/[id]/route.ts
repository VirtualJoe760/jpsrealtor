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

  // Since 2026-10-17 a Settings key is bound to the owner's tenant on first use
  // and claimed website keys are bound at birth (skill-auth.ts, site-claim.ts),
  // so the hash can sit in Tenant.tokenHashes too. Pull it there as well —
  // skill auth already refuses it via the User row, but the tenant mirror must
  // not keep matching a dead key (control-plane.md, denormalization invariant).
  if (t.tokenHash) {
    try {
      const { default: TenantModel } = await import("@/models/control/Tenant");
      const { TenantTokenRepo } = await import("@/lib/control/store");
      const bound: any = await TenantModel.findOne({ tokenHashes: t.tokenHash }).select("tenantId").lean();
      if (bound?.tenantId) await TenantTokenRepo.revokeToken(bound.tenantId, t.tokenHash);
    } catch (err) {
      console.error("[api-tokens] tenant unbind failed:", (err as Error)?.message);
    }
  }

  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}
