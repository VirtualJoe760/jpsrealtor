// GET /api/agent/pending-posts/archive
//
// What has already gone out. Deliberately thin: a published post's slides are
// emptied and its Cloudinary assets swept by the publish job, because
// Instagram holds the images from that point and ours are dead weight. What
// survives is what an archive is actually for — which listing, when it went
// out, and where to find it.
//
// Session-scoped, like every other agent route: agentId is part of the query,
// so one agent can never read another's history.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import PendingPost from "@/models/PendingPost";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  }
  await dbConnect();

  const limit = Math.min(Number(request.nextUrl.searchParams.get("limit") || 50), 200);

  const rows = await PendingPost.find({
    agentId: new mongoose.Types.ObjectId(session.user.id),
    status: "posted",
  })
    .select(
      "approvalCode listingKey listingSnapshot postedAt igPostId permalink " +
        "slideCount assetsDeletedAt approvedAt approvedVia"
    )
    .sort({ postedAt: -1 })
    .limit(limit)
    .lean();

  return NextResponse.json(
    {
      count: rows.length,
      posts: rows.map((p: any) => ({
        id: String(p._id),
        code: p.approvalCode,
        listingKey: p.listingKey,
        address: p.listingSnapshot?.address || null,
        city: p.listingSnapshot?.city || null,
        price: p.listingSnapshot?.price ?? null,
        postedAt: p.postedAt,
        approvedAt: p.approvedAt,
        approvedVia: p.approvedVia,
        slides: p.slideCount ?? null,
        permalink: p.permalink,
        igPostId: p.igPostId,
        // Whether the Cloudinary originals have been reclaimed yet.
        assetsSwept: Boolean(p.assetsDeletedAt),
      })),
    },
    { headers: NO_STORE }
  );
}
