// POST /api/activity/page-view
//
// Beacon from <PageViewTracker/>: one call when a page is opened and again
// each time the tab is hidden or the visitor moves on, carrying the visible
// time so far. Upserts on the browser-minted viewId and keeps the largest
// duration, so repeat beacons for one view never double-count.
//
// Public (under the /api/activity prefix in proxy.ts) because visitors browse
// before they sign up. Anonymous rows carry anonymousId; the first beacon after
// sign-in stamps userId onto that browser's earlier rows, so an agent sees what
// a lead looked at BEFORE registering, not just after.
//
// Impersonation sessions are not recorded — an admin acting as an agent is
// not that agent's visitor.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import PageView from "@/models/PageView";
import User from "@/models/User";
import { checkRateLimit } from "@/lib/rate-limit";
import { subdomainOfHost } from "@/lib/agent-host";
import { isPlatformDomain } from "@/lib/domain-utils";
import { resolveDomainOwner } from "@/lib/resolveDomainOwner";
import { backfillSignupOrigin } from "@/lib/signup-origin";

const NO_STORE = { "Cache-Control": "no-store" };
const MAX_DURATION_MS = 6 * 60 * 60 * 1000; // a tab left open overnight is not 9 hours of interest
const ID_RE = /^[A-Za-z0-9_-]{6,80}$/;

// host → owning agent id (or null). Hosts change owner rarely; 10 min is fine.
const ownerCache = new Map<string, { id: string | null; at: number }>();

async function hostOwner(request: NextRequest, host: string): Promise<string | null> {
  const hit = ownerCache.get(host);
  if (hit && Date.now() - hit.at < 10 * 60 * 1000) return hit.id;

  let id: string | null = null;
  const sub = subdomainOfHost(host);
  if (sub) {
    const agent: any = await User.findOne({ "agentProfile.subdomain": sub }, { _id: 1 }).lean();
    id = agent ? String(agent._id) : null;
  } else if (host !== "localhost" && !isPlatformDomain(host)) {
    // Custom domains and registry domains. The resolver's last-resort
    // "primary agent" answer only counts on a non-platform host (jpsrealtor.com
    // really is Joseph's); on chatrealty.io it would wrongly credit him.
    const owner = await resolveDomainOwner(request);
    id = owner.ownerId;
  }
  ownerCache.set(host, { id, at: Date.now() });
  return id;
}

function clean(v: unknown, max: number): string | undefined {
  return typeof v === "string" && v.length ? v.slice(0, max) : undefined;
}

export async function POST(request: NextRequest) {
  let body: any;
  try {
    // sendBeacon posts text/plain; parse the raw body either way.
    body = JSON.parse(await request.text());
  } catch {
    return NextResponse.json({ error: "bad body" }, { status: 400, headers: NO_STORE });
  }

  const viewId = body?.viewId;
  const path = clean(body?.path, 500);
  const anonymousId = clean(body?.anonymousId, 80);
  if (typeof viewId !== "string" || !ID_RE.test(viewId) || !path || !path.startsWith("/")) {
    return NextResponse.json({ error: "bad view" }, { status: 400, headers: NO_STORE });
  }
  if (anonymousId && !ID_RE.test(anonymousId)) {
    return NextResponse.json({ error: "bad id" }, { status: 400, headers: NO_STORE });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = checkRateLimit(`page-view:${ip}`, { max: 240, windowMs: 60_000 });
  if (!rl.ok) return NextResponse.json({ error: rl.error }, { status: 429, headers: NO_STORE });

  const host = (request.headers.get("host") || "").split(":")[0].toLowerCase();
  const durationMs = Math.min(Math.max(Number(body?.durationMs) || 0, 0), MAX_DURATION_MS);
  const startedAtRaw = Number(body?.startedAt);
  const startedAt =
    Number.isFinite(startedAtRaw) && Math.abs(Date.now() - startedAtRaw) < 24 * 60 * 60 * 1000
      ? new Date(startedAtRaw)
      : new Date();
  const deviceType = ["mobile", "tablet", "desktop"].includes(body?.deviceType) ? body.deviceType : undefined;

  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if ((session?.user as any)?.impersonatedBy) {
      return NextResponse.json({ ok: true, skipped: "impersonation" }, { headers: NO_STORE });
    }
    const userId =
      session?.user?.id && mongoose.isValidObjectId(session.user.id)
        ? new mongoose.Types.ObjectId(session.user.id)
        : undefined;

    const agentId = await hostOwner(request, host);

    const toSet: Record<string, unknown> = {};
    const title = clean(body?.title, 200);
    if (title) toSet.title = title;
    if (userId) toSet.userId = userId;

    await PageView.updateOne(
      { viewId },
      {
        $setOnInsert: {
          viewId,
          host,
          path,
          referrer: clean(body?.referrer, 500),
          sessionId: clean(body?.sessionId, 80),
          anonymousId,
          deviceType,
          startedAt,
          agentId: agentId ? new mongoose.Types.ObjectId(agentId) : undefined,
        },
        $max: { durationMs },
        // Title is re-sent each beacon: on the opening one, Next may not have
        // swapped document.title to the new page yet.
        ...(Object.keys(toSet).length ? { $set: toSet } : {}),
      },
      { upsert: true }
    );

    // First signed-in beacon from this browser: claim its anonymous history,
    // and fill in where a Google/Facebook sign-up came from.
    if (userId && body?.first === true) {
      if (anonymousId) {
        await PageView.updateMany({ anonymousId, userId: { $exists: false } }, { $set: { userId } });
      }
      await backfillSignupOrigin(request, String(userId));
    }

    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  } catch (err) {
    console.error("[page-view] failed:", err);
    return NextResponse.json({ error: "failed" }, { status: 500, headers: NO_STORE });
  }
}
