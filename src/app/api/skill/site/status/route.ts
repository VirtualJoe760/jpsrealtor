// GET /api/skill/site/status — where the agent's external site stands.

import { NextRequest, NextResponse } from "next/server";
import { authenticateSkillRequest, requireScope, skillRateLimit } from "@/lib/skill-auth";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(req: NextRequest) {
  const auth = await authenticateSkillRequest(req);
  if (auth.ok === false) {
    return NextResponse.json({ error: auth.reason }, { status: auth.status, headers: NO_STORE });
  }
  const scopeError = requireScope(auth, "site:manage");
  if (scopeError) return scopeError;
  const rateLimited = skillRateLimit(auth, "identity");
  if (rateLimited) return rateLimited;

  const ap = (auth.user.agentProfile as any) || {};
  const site = ap.externalSite || {};
  const subdomain = ap.subdomain || null;

  return NextResponse.json(
    {
      status: site.status || "none",
      deploymentUrl: site.deploymentUrl || null,
      subdomain,
      subdomainUrl: subdomain ? `https://${subdomain}.chatrealty.io` : null,
      licenseOnFile: Boolean(ap.licenseNumber && String(ap.licenseNumber).trim()),
      connectedAt: site.connectedAt || null,
      liveAt: site.liveAt || null,
    },
    { headers: NO_STORE }
  );
}
