// src/app/api/domains/list/route.ts
// List all domains attached to the Vercel project
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listProjectDomains } from "@/lib/vercel-domains";

export async function GET() {
  try {
    // Require authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const domains = await listProjectDomains();

    return NextResponse.json({
      domains: domains.map((d) => ({
        name: d.name,
        apexName: d.apexName,
        verified: d.verified,
        verification: d.verification || [],
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      })),
      total: domains.length,
    });
  } catch (error: any) {
    console.error("[domains/list] Error:", error.message);
    return NextResponse.json(
      { error: error.message || "Failed to list domains" },
      { status: 500 }
    );
  }
}
