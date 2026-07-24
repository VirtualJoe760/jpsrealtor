// GET /api/site-config?subdomain=X[&pv=token] — the proxy middleware's
// lookup for external (Claude-built) site routing. Returns where the
// subdomain should point and whether the caller's preview credential is
// valid. Public by design (status + deployment origin are low-sensitivity);
// previewOk requires a valid signed token, verified HERE because the edge
// middleware can't run jsonwebtoken.

import { NextRequest, NextResponse } from "next/server";
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
    { "agentProfile.externalSite": 1 }
  ).lean<any>();

  const site = user?.agentProfile?.externalSite || {};
  const status: string = site.status || "none";
  const url: string | null = site.deploymentUrl || null;

  const previewOk = status === "preview" && verifyPreview(pv, subdomain);

  // Token-less lookups are CDN-cacheable briefly (the common case: every page
  // view on a subdomain). Preview-token lookups are personal — no-store.
  const cache = pv ? "no-store" : "public, s-maxage=30, stale-while-revalidate=60";

  return NextResponse.json(
    { status, url: status === "none" ? null : url, previewOk },
    { headers: { "Cache-Control": cache } }
  );
}
