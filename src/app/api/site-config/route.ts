// GET /api/site-config?subdomain=X[&pv=token] — the proxy middleware's
// lookup for external (Claude-built) site routing. Returns where the
// subdomain should point and whether the caller's preview credential is
// valid. Public by design (status + deployment origin are low-sensitivity);
// previewOk requires a valid signed token, verified HERE because the edge
// middleware can't run jsonwebtoken.

import { NextRequest, NextResponse } from "next/server";
import { isSiteReady } from "@/lib/agent-site-readiness";
import jwt from "jsonwebtoken";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";

export const dynamic = "force-dynamic";

function verifyPreview(token: string | null, subdomain: string): boolean {
  if (!token) return false;
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return false;
  try {
    const d = jwt.verify(token, secret) as { kind?: string; sub?: string };
    return d.kind === "site-preview" && d.sub === subdomain;
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const subdomain = req.nextUrl.searchParams.get("subdomain")?.toLowerCase().trim();
  const pv = req.nextUrl.searchParams.get("pv");
  if (!subdomain || !/^[a-z0-9-]{1,63}$/.test(subdomain)) {
    return NextResponse.json({ status: "none" }, { headers: { "Cache-Control": "no-store" } });
  }

  await dbConnect();
  const user = await User.findOne(
    { "agentProfile.subdomain": subdomain },
    {
      "agentProfile.externalSite": 1,
      // Readiness fields — an agent who hasn't finished setup gets a
      // "coming soon" page instead of a half-empty site.
      name: 1,
      phone: 1,
      "agentProfile.heroPhoto": 1,
      "agentProfile.heroPhotoDark": 1,
      "agentProfile.headshot": 1,
      "agentProfile.headline": 1,
      "agentProfile.personalStory": 1,
      "agentProfile.videoIntro": 1,
      "agentProfile.cellPhone": 1,
      "agentProfile.officePhone": 1,
    }
  ).lean<any>();

  const site = user?.agentProfile?.externalSite || {};
  const status: string = site.status || "none";
  const url: string | null = site.deploymentUrl || null;

  const previewOk = status === "preview" && verifyPreview(pv, subdomain);

  // Token-less lookups are CDN-cacheable briefly (the common case: every page
  // view on a subdomain). Preview-token lookups are personal — no-store.
  const cache = pv ? "no-store" : "public, s-maxage=30, stale-while-revalidate=60";

  // `exists` distinguishes "no such agent" from "agent hasn't published yet";
  // `ready` is the go-live checklist. The proxy serves /coming-soon when an
  // agent exists but isn't ready, instead of a hollow site.
  const exists = Boolean(user);
  const ready = exists ? isSiteReady(user) : false;

  return NextResponse.json(
    { status, url: status === "none" ? null : url, previewOk, exists, ready },
    { headers: { "Cache-Control": cache } }
  );
}
