// GET /api/agent/visitors/[key]?days=30
// One visitor's timeline on the signed-in agent's sites: every page and
// listing, when, and for how long. key = "u:<userId>" | "a:<anonymousId>".
// Rows are filtered by agentId = session user, so a key for someone who
// never visited this agent's site just returns an empty list.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import { agentVisitorTimeline } from "@/lib/agent-visitors";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(request: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !mongoose.isValidObjectId(session.user.id)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  }
  const { key } = await params;
  const days = Math.min(Math.max(parseInt(request.nextUrl.searchParams.get("days") || "30", 10) || 30, 1), 365);
  try {
    await dbConnect();
    const timeline = await agentVisitorTimeline(session.user.id, decodeURIComponent(key), days);
    if (!timeline) return NextResponse.json({ error: "bad visitor" }, { status: 400, headers: NO_STORE });
    return NextResponse.json({ timeline }, { headers: NO_STORE });
  } catch (err) {
    console.error("[agent/visitors/key] failed:", err);
    return NextResponse.json({ error: "failed" }, { status: 500, headers: NO_STORE });
  }
}
