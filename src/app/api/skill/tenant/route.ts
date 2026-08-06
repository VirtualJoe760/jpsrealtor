// GET /api/skill/tenant — the caller's tenant + data-tier facts, in one read.
//
// Built for @chatrealty/sync's seed preflight: before writing a single row it
// asks "how much storage does this account's tier allow?", compares against
// the feed's exact $count, and speaks the verdict in plain English — fits /
// tight / needs an upgrade — with the upgrade URL. The same shape is useful
// to any tooling that needs to know whether a tenant exists without trying to
// provision one.
//
// Any valid crt_live_ token; the answer is scoped to the caller. Storage
// numbers come from src/lib/data-tiers.ts — the single source the CLI, this
// route, and billing copy all quote.

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import { authenticateSkillRequest, skillRateLimit } from "@/lib/skill-auth";
import { getAgentTier } from "@/lib/subscription-helpers";
import { storageForTier, UPGRADE_URL } from "@/lib/data-tiers";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(req: NextRequest) {
  const auth = await authenticateSkillRequest(req);
  if (auth.ok === false) {
    return NextResponse.json({ error: auth.reason }, { status: auth.status, headers: NO_STORE });
  }
  const rl = skillRateLimit(auth, "identity");
  if (rl) return rl;

  await dbConnect();
  const tier = await getAgentTier(String(auth.user._id));
  const storage = storageForTier(tier);

  return NextResponse.json(
    {
      tenantId: auth.tenantId ?? null,
      dataSource: auth.dataSource,
      tier,
      storageLimitBytes: storage.storageLimitBytes,
      storageLabel: storage.label,
      upgradeUrl: UPGRADE_URL,
    },
    { headers: NO_STORE }
  );
}
