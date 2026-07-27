// GET /api/agent/pending-posts
//
// The review queue for the agent dashboard: generated social posts waiting on
// their approval. Session-scoped — an agent only ever sees their own posts.
//
// See docs/content-templates/auto-posting.md.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import PendingPost from "@/models/PendingPost";

const NO_STORE = { "Cache-Control": "no-store" };

// What the review UI shows by default: things that still need a decision, plus
// what's approved and waiting for its slot. Posted/declined/expired are history
// and only load when asked for.
const ACTIVE_STATUSES = ["generating", "awaiting_review", "approved", "failed"];

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  }

  const sp = request.nextUrl.searchParams;
  const limit = Math.min(Math.max(parseInt(sp.get("limit") || "20", 10) || 20, 1), 50);
  const statusParam = sp.get("status");

  const statuses = statusParam
    ? statusParam.split(",").map((s) => s.trim()).filter(Boolean)
    : ACTIVE_STATUSES;

  try {
    await dbConnect();
    const items = await PendingPost.find({
      agentId: new mongoose.Types.ObjectId(session.user.id),
      status: { $in: statuses },
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json(
      {
        items: items.map((p: any) => ({
          id: String(p._id),
          status: p.status,
          template: p.template,
          listingKey: p.listingKey,
          listing: p.listingSnapshot || {},
          slides: (p.slides || []).map((s: any) => ({
            n: s.n,
            url: s.url,
            kind: s.kind,
          })),
          caption: p.caption,
          approvalCode: p.approvalCode,
          scheduledFor: p.scheduledFor,
          rollCount: p.rollCount,
          approvedAt: p.approvedAt,
          approvedVia: p.approvedVia,
          declinedAt: p.declinedAt,
          postedAt: p.postedAt,
          permalink: p.permalink,
          error: p.error,
          attempt: p.generation?.attempt ?? 1,
          createdAt: p.createdAt,
        })),
      },
      { headers: NO_STORE }
    );
  } catch (err: any) {
    console.error("[GET /api/agent/pending-posts]", err);
    return NextResponse.json(
      { error: "failed", message: err?.message || "Could not load posts." },
      { status: 500, headers: NO_STORE }
    );
  }
}
