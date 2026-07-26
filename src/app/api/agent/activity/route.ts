// GET /api/agent/activity
//
// The agent dashboard's activity feed: who signed up, who inquired, who saved
// a home on their site. Session-scoped — an agent only ever sees their own
// stream (agentId === session user id), never another agent's.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import AgentActivity from "@/models/AgentActivity";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  }

  const limit = Math.min(
    Math.max(parseInt(request.nextUrl.searchParams.get("limit") || "25", 10) || 25, 1),
    100
  );

  try {
    await dbConnect();
    const items = await AgentActivity.find({
      agentId: new mongoose.Types.ObjectId(session.user.id),
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json(
      {
        items: items.map((a: any) => ({
          id: String(a._id),
          type: a.type,
          title: a.title,
          detail: a.detail ?? null,
          contactId: a.contactId ? String(a.contactId) : null,
          listingKey: a.listingKey ?? null,
          source: a.source ?? null,
          createdAt: a.createdAt,
        })),
      },
      { headers: NO_STORE }
    );
  } catch (err) {
    console.error("[agent/activity] failed:", err);
    return NextResponse.json({ error: "failed" }, { status: 500, headers: NO_STORE });
  }
}
