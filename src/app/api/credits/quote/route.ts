// src/app/api/credits/quote/route.ts
// POST — preview the credit cost of an operation before committing it.
// Body shape: a discriminated CreditQuoteRequest (see src/lib/credits.ts).

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { quote, type CreditQuoteRequest } from "@/lib/credits";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as CreditQuoteRequest;
    if (!body?.type) {
      return NextResponse.json({ error: "Missing 'type' field" }, { status: 400 });
    }

    const result = quote(body);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[api/credits/quote] error:", error);
    return NextResponse.json(
      { error: "Bad request", details: error.message },
      { status: 400 }
    );
  }
}
