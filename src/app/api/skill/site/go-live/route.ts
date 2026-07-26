// POST /api/skill/site/go-live — make the connected external site PUBLIC on
// the agent's subdomain. COMPLIANCE GATE enforced server-side (not just guide
// language): no license number on the profile → no launch.

import { NextRequest, NextResponse } from "next/server";
import { authenticateSkillRequest, requireScope, skillRateLimit } from "@/lib/skill-auth";
import User from "@/models/User";
import dbConnect from "@/lib/mongodb";

const NO_STORE = { "Cache-Control": "no-store" };

export async function POST(req: NextRequest) {
  const auth = await authenticateSkillRequest(req);
  if (auth.ok === false) {
    return NextResponse.json({ error: auth.reason }, { status: auth.status, headers: NO_STORE });
  }
  const scopeError = requireScope(auth, "site:manage");
  if (scopeError) return scopeError;
  const rateLimited = skillRateLimit(auth, "write");
  if (rateLimited) return rateLimited;

  const ap = (auth.user.agentProfile as any) || {};
  const site = ap.externalSite || {};

  if (!site.deploymentUrl || site.status === "none" || !site.status) {
    return NextResponse.json(
      { error: "No site connected yet. Connect your deployment first (connect_site)." },
      { status: 409, headers: NO_STORE }
    );
  }
  // COMPLIANCE: license number must exist before anything goes public.
  // (licenseNumber is a TOP-LEVEL legacy field; check agentProfile too for safety.)
  const license = (auth.user as any).licenseNumber || ap.licenseNumber;
  if (!license || !String(license).trim()) {
    return NextResponse.json(
      {
        error:
          "A license number is required before going live. Add it to the agent's ChatRealty profile (Settings) — it must be displayed on the site, including the footer.",
        code: "license_required",
      },
      { status: 409, headers: NO_STORE }
    );
  }

  await dbConnect();
  await User.updateOne(
    { _id: auth.user._id },
    {
      $set: {
        "agentProfile.externalSite.status": "live",
        "agentProfile.externalSite.liveAt": new Date(),
      },
    }
  );

  const subdomain = ap.subdomain || null;
  return NextResponse.json(
    {
      ok: true,
      status: "live",
      url: subdomain ? `https://${subdomain}.chatrealty.io` : null,
    },
    { headers: NO_STORE }
  );
}
