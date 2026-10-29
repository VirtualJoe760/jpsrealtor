// src/app/api/domains/check/route.ts
// Availability + what the agent would pay (registrar price + $10, yearly).
//
// Uses the Vercel Registrar API. The /v4 endpoints this used before were
// sunset on 2025-11-09 and returned 400 for every search.
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkAvailability, getPrice, RegistrarError } from "@/lib/domains/registrar";
import {
  normalizeDomain,
  quoteDomain,
  tldOf,
  SELF_SERVE_TLDS,
  MAX_REGISTRAR_PRICE_USD,
} from "@/config/domain-pricing";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const domain = normalizeDomain(body?.domain);
  if (!domain) {
    return NextResponse.json({ error: "Enter a domain like yourname.com" }, { status: 400 });
  }
  if (!SELF_SERVE_TLDS.includes(tldOf(domain))) {
    return NextResponse.json({
      domain,
      available: false,
      reason: `.${tldOf(domain)} domains can't be bought here. Try .com, .net, .org, .homes or .realty — or connect one you already own.`,
    });
  }

  try {
    const [available, price] = await Promise.all([checkAvailability(domain), getPrice(domain)]);
    if (!available) return NextResponse.json({ domain, available: false, reason: "That domain is taken." });
    if (price.purchasePrice > MAX_REGISTRAR_PRICE_USD) {
      return NextResponse.json({
        domain,
        available: false,
        reason: "That's a premium domain. Contact us to buy it.",
      });
    }
    return NextResponse.json({ domain, available: true, ...quoteDomain(price.purchasePrice, price.renewalPrice) });
  } catch (error) {
    if (error instanceof RegistrarError && error.code === "tld_not_supported") {
      return NextResponse.json({ domain, available: false, reason: "That domain ending isn't supported." });
    }
    console.error("[domains/check] Error:", (error as Error).message);
    return NextResponse.json({ error: "Couldn't check that domain right now" }, { status: 502 });
  }
}
