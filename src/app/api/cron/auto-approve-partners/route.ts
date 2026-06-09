// src/app/api/cron/auto-approve-partners/route.ts
// 24h auto-approve backstop for service-partner applications.
//
// When the admin has auto-approve turned OFF, applications sit "pending" for
// manual review. This job approves anything still pending after 24 hours so
// applications never languish. Idempotent — only touches status:"pending".
//
// Scheduling:
//   - Vercel Cron (vercel.json) hits this hourly; Vercel sends
//     `Authorization: Bearer ${CRON_SECRET}` automatically when CRON_SECRET is set.
//   - A VPS cron / manual run can authenticate with the existing INTERNAL_API_SECRET:
//       curl -H "x-internal-secret: $INTERNAL_API_SECRET" https://host/api/cron/auto-approve-partners

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import { approvePartner } from "@/lib/partner-moderation";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const AUTO_APPROVE_AFTER_MS = 24 * 60 * 60 * 1000; // 24 hours

function isAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  const internalSecret = process.env.INTERNAL_API_SECRET;
  const authHeader = req.headers.get("authorization");
  const internalHeader = req.headers.get("x-internal-secret");

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true;
  if (internalSecret && internalHeader === internalSecret) return true;
  // Also accept ?secret= for simple external schedulers.
  const url = new URL(req.url);
  const qsSecret = url.searchParams.get("secret");
  if (cronSecret && qsSecret === cronSecret) return true;
  if (internalSecret && qsSecret === internalSecret) return true;
  return false;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  const cutoff = new Date(Date.now() - AUTO_APPROVE_AFTER_MS);
  const stale = await User.find({
    roles: "serviceProvider",
    "servicePartnerProfile.status": "pending",
    "servicePartnerProfile.appliedAt": { $lte: cutoff },
  });

  const approved: string[] = [];
  for (const user of stale) {
    try {
      await approvePartner(user, "auto-approve-24h");
      approved.push(user.email);
    } catch (err) {
      console.error(`[cron/auto-approve-partners] failed for ${user.email}:`, err);
    }
  }

  console.log(`[cron/auto-approve-partners] approved ${approved.length} pending partner(s) older than 24h`);
  return NextResponse.json(
    { success: true, approvedCount: approved.length, approved },
    { headers: { "Cache-Control": "no-store" } }
  );
}
