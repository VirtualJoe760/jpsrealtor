// src/app/api/skill/me/route.ts
//
// GET → returns who the bearer token belongs to, so the desktop skill can
// confirm the connection and know what URL to print for created pages.

import { NextRequest, NextResponse } from "next/server";
import { authenticateSkillRequest, skillRateLimit } from "@/lib/skill-auth";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(req: NextRequest) {
  const auth = await authenticateSkillRequest(req);
  if (auth.ok === false) {
    return NextResponse.json(
      { error: auth.reason },
      { status: auth.status, headers: NO_STORE }
    );
  }
  const rateLimited = skillRateLimit(auth, "identity");
  if (rateLimited) return rateLimited;
  const user = auth.user;
  const ap = (user.agentProfile as any) || {};
  // Construct the agent's public LP base URL. Prefer custom domain → subdomain
  // on chatrealty.io → fallback to jpsrealtor.com.
  let lpBaseUrl = "https://jpsrealtor.com/lp";
  if (ap.customDomain) {
    lpBaseUrl = `https://${ap.customDomain.replace(/^https?:\/\//, "").replace(/\/+$/, "")}/lp`;
  } else if (ap.subdomain) {
    lpBaseUrl = `https://${ap.subdomain}.chatrealty.io/lp`;
  }

  return NextResponse.json(
    {
      agentName: user.name || ap.siteName || null,
      agentEmail: user.email || null,
      siteName: ap.siteName || null,
      lpBaseUrl,
      tokenName: auth.tokenName,
      tokenLast4: auth.tokenLast4,
      // BYOD data-source signal (2026-07-23): "tenant" = your own DB is
      // connected; "none" = no data yet (data reads will 403 no_data_source);
      // "dogfood" = platform owner's internal dataset (admin accounts only).
      // The MCP build guide keys its step 1 off this field.
      dataSource: auth.dataSource,
    },
    { headers: NO_STORE }
  );
}
