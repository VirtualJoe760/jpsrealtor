// src/app/api/admin/settings/partner-approval/route.ts
// Admin GET/PUT for the platform-wide "auto-approve service partners" toggle.

import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { getPartnerAutoApprove, setPartnerAutoApprove } from "@/lib/partner-moderation";

export const dynamic = "force-dynamic";

export async function GET() {
  const { authorized } = await verifyAdmin();
  if (!authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const autoApprove = await getPartnerAutoApprove();
  return NextResponse.json({ autoApprove }, { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(request: NextRequest) {
  const { authorized, userId } = await verifyAdmin();
  if (!authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  if (typeof body.autoApprove !== "boolean") {
    return NextResponse.json({ error: "autoApprove (boolean) is required" }, { status: 400 });
  }

  await setPartnerAutoApprove(body.autoApprove, userId);
  return NextResponse.json(
    {
      success: true,
      autoApprove: body.autoApprove,
      message: body.autoApprove
        ? "New partner applications will be auto-approved on submit."
        : "New partner applications require manual approval (auto-approved after 24h if untouched).",
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
