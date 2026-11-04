// GET /api/agent/visitors?days=30
// The dashboard "Site visitors" list: who browsed the signed-in agent's own
// sites, newest first. Scoped to session.user.id — see src/lib/agent-visitors.ts.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import { listAgentVisitors } from "@/lib/agent-visitors";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !mongoose.isValidObjectId(session.user.id)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  }
  const days = Math.min(Math.max(parseInt(request.nextUrl.searchParams.get("days") || "30", 10) || 30, 1), 365);
  try {
    await dbConnect();
    const visitors = await listAgentVisitors(session.user.id, days);
    return NextResponse.json({ days, visitors }, { headers: NO_STORE });
  } catch (err) {
    console.error("[agent/visitors] failed:", err);
    return NextResponse.json({ error: "failed" }, { status: 500, headers: NO_STORE });
  }
}
