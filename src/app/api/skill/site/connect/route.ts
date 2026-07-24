// POST /api/skill/site/connect — register the Claude-built site's deployment
// URL against the agent's subdomain. Option A ("point, don't host"): the
// platform proxies {subdomain}.chatrealty.io to this deployment. Sets status
// "preview": ONLY the agent (via a signed preview link) and admins see the
// built site; everyone else keeps the platform-rendered fallback until
// go-live. See docs/chatrealty-api/external-site.md.

import { NextRequest, NextResponse } from "next/server";
import { authenticateSkillRequest, requireScope, skillRateLimit } from "@/lib/skill-auth";
import User from "@/models/User";
import dbConnect from "@/lib/mongodb";

const NO_STORE = { "Cache-Control": "no-store" };

function validDeploymentUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" && !(u.protocol === "http:" && (u.hostname === "localhost" || u.hostname === "127.0.0.1"))) {
      return null;
    }
    // Never allow pointing a subdomain back at ourselves (proxy loop).
    if (u.hostname.endsWith("chatrealty.io")) return null;
    return u.origin;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const auth = await authenticateSkillRequest(req);
  if (auth.ok === false) {
    return NextResponse.json({ error: auth.reason }, { status: auth.status, headers: NO_STORE });
  }
  const scopeError = requireScope(auth, "site:manage");
  if (scopeError) return scopeError;
  const rateLimited = skillRateLimit(auth, "write");
  if (rateLimited) return rateLimited;

  const body = await req.json().catch(() => ({}));
  const deploymentUrl = validDeploymentUrl(body?.deploymentUrl);
  if (!deploymentUrl) {
    return NextResponse.json(
      { error: "deploymentUrl must be a valid https URL (e.g. your Vercel deployment)." },
      { status: 400, headers: NO_STORE }
    );
  }

  await dbConnect();
  const subdomain = (auth.user.agentProfile as any)?.subdomain || null;
  await User.updateOne(
    { _id: auth.user._id },
    {
      $set: {
        "agentProfile.externalSite.deploymentUrl": deploymentUrl,
        "agentProfile.externalSite.status": "preview",
        "agentProfile.externalSite.connectedAt": new Date(),
      },
    }
  );

  return NextResponse.json(
    {
      ok: true,
      status: "preview",
      deploymentUrl,
      subdomain,
      previewNote: subdomain
        ? `Preview is private: only you and ChatRealty admins can see the built site at https://${subdomain}.chatrealty.io (use the Preview link from your dashboard). Everyone else still sees your current ChatRealty page until you go live.`
        : "No subdomain set on your profile yet — choose one in Settings so your site has a home.",
    },
    { headers: NO_STORE }
  );
}
