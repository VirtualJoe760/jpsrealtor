// src/app/api/domains/check/route.ts
// Check domain availability and price
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  checkDomainAvailability,
  getDomainPrice,
} from "@/lib/vercel-domains";

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { domain } = body;

    if (!domain || typeof domain !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'domain' field" },
        { status: 400 }
      );
    }

    // Normalize: lowercase, trim whitespace
    const normalizedDomain = domain.toLowerCase().trim();

    // Basic domain format validation
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z]{2,})+$/.test(normalizedDomain)) {
      return NextResponse.json(
        { error: "Invalid domain format" },
        { status: 400 }
      );
    }

    // Run availability and price checks in parallel
    const [availability, price] = await Promise.all([
      checkDomainAvailability(normalizedDomain),
      getDomainPrice(normalizedDomain).catch(() => null), // Price may not be available for all TLDs
    ]);

    return NextResponse.json({
      domain: normalizedDomain,
      available: availability.available,
      price: price?.price ?? null,
      period: price?.period ?? null,
    });
  } catch (error: any) {
    console.error("[domains/check] Error:", error.message);
    return NextResponse.json(
      { error: error.message || "Failed to check domain" },
      { status: 500 }
    );
  }
}
