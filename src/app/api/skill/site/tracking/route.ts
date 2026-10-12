// GET/PATCH /api/skill/site/tracking — the agent's visitor-tracking tag IDs.
//
// Mirrors the "Tracking & Ads" step in /agent/settings so an MCP client can read
// and set the same values. These are PUBLIC measurement IDs that ship in the
// page HTML, so returning them over the skill API leaks nothing that a visitor
// could not already read with View Source — unlike access tokens, which stay
// out of this payload deliberately.

import { NextRequest, NextResponse } from "next/server";
import { authenticateSkillRequest, requireScope, skillRateLimit } from "@/lib/skill-auth";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";

const NO_STORE = { "Cache-Control": "no-store" };

// Same shapes the settings UI validates against and that nav-layout.ts enforces
// server-side. A malformed tag is worse than a missing one: it loads, reports
// nothing, and looks installed.
const PATTERNS: Record<string, RegExp> = {
  metaPixelId: /^\d{8,20}$/,
  ga4MeasurementId: /^G-[A-Z0-9]{6,15}$/i,
  googleAdsId: /^AW-\d{6,15}$/i,
  googleAdsConversionLabel: /^[A-Za-z0-9_-]{5,40}$/,
};

function shape(tracking: Record<string, any> = {}) {
  return {
    metaPixelId: tracking.metaPixelId || null,
    ga4MeasurementId: tracking.ga4MeasurementId || null,
    googleAdsId: tracking.googleAdsId || null,
    googleAdsConversionLabel: tracking.googleAdsConversionLabel || null,
    enabled: tracking.enabled !== false,
    // Spelled out because it is the question agents actually ask: GA4 measures
    // traffic but cannot build Google Ads audiences on its own.
    capabilities: {
      metaRetargeting: Boolean(tracking.metaPixelId) && tracking.enabled !== false,
      youtubeRetargeting: Boolean(tracking.googleAdsId) && tracking.enabled !== false,
      analytics: Boolean(tracking.ga4MeasurementId) && tracking.enabled !== false,
    },
  };
}

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
  return NextResponse.json(shape(ap.tracking), { headers: NO_STORE });
}

export async function PATCH(req: NextRequest) {
  const auth = await authenticateSkillRequest(req);
  if (auth.ok === false) {
    return NextResponse.json({ error: auth.reason }, { status: auth.status, headers: NO_STORE });
  }
  const scopeError = requireScope(auth, "site:manage");
  if (scopeError) return scopeError;
  const rateLimited = skillRateLimit(auth, "identity");
  if (rateLimited) return rateLimited;

  const body = await req.json().catch(() => ({}));
  const update: Record<string, any> = {};
  const rejected: string[] = [];

  for (const [key, pattern] of Object.entries(PATTERNS)) {
    if (!(key in body)) continue;
    const raw = body[key];
    // Empty string clears the field back to the platform default.
    if (raw === null || raw === "") {
      update[`agentProfile.tracking.${key}`] = "";
      continue;
    }
    const value = String(raw).trim();
    if (!pattern.test(value)) {
      rejected.push(key);
      continue;
    }
    update[`agentProfile.tracking.${key}`] = value;
  }

  if (typeof body.enabled === "boolean") {
    update["agentProfile.tracking.enabled"] = body.enabled;
  }

  if (rejected.length) {
    return NextResponse.json(
      {
        error: `Invalid format for: ${rejected.join(", ")}`,
        expected: Object.fromEntries(rejected.map((k) => [k, String(PATTERNS[k])])),
      },
      { status: 400, headers: NO_STORE }
    );
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400, headers: NO_STORE });
  }

  await dbConnect();
  const updated = await User.findByIdAndUpdate(
    (auth.user as any)._id,
    { $set: update },
    { new: true }
  )
    .select("agentProfile.tracking")
    .lean<{ agentProfile?: { tracking?: Record<string, any> } }>();

  return NextResponse.json(
    { updated: true, ...shape(updated?.agentProfile?.tracking) },
    { headers: NO_STORE }
  );
}
