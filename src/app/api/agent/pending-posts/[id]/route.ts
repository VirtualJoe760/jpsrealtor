// PATCH /api/agent/pending-posts/[id]
//
// The agent's decision on a generated post: approve, decline, or schedule it.
// Session-scoped — the agentId filter is part of every query, so one agent can
// never act on another's post even with a guessed id.
//
// Approving does NOT publish. It marks the post publishable; the publish job
// picks it up at its slot. Keeping those separate means a mis-tap is
// recoverable right up until the slot fires.
//
// See docs/content-templates/auto-posting.md.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import PendingPost from "@/models/PendingPost";

const NO_STORE = { "Cache-Control": "no-store" };

type Action = "approve" | "decline" | "schedule";

function bad(error: string, message: string, status = 400) {
  return NextResponse.json({ error, message }, { status, headers: NO_STORE });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  }

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) return bad("validation_failed", "Bad post id.");

  let body: any;
  try {
    body = await request.json();
  } catch {
    return bad("invalid_json", "Body must be JSON.");
  }

  const action = String(body.action || "").trim() as Action;
  if (!["approve", "decline", "schedule"].includes(action)) {
    return bad("validation_failed", 'action must be "approve", "decline", or "schedule".');
  }

  await dbConnect();

  const post = await PendingPost.findOne({
    _id: new mongoose.Types.ObjectId(id),
    agentId: new mongoose.Types.ObjectId(session.user.id),
  });
  if (!post) return bad("not_found", "Post not found.", 404);

  // A post that already went out cannot be un-posted from here. Say so plainly
  // rather than silently no-opping.
  if (post.status === "posted") {
    return bad("already_posted", "This post is already live on Instagram.", 409);
  }
  if (post.status === "generating") {
    return bad("still_generating", "This post is still being built. Try again shortly.", 409);
  }

  if (action === "approve") {
    if (!post.slides?.length) {
      return bad("no_slides", "This post has no slides to publish.");
    }
    post.status = "approved";
    post.approvedAt = new Date();
    post.approvedVia = "dashboard";
    post.declinedAt = null;
    post.declineReason = null;

    // Approving without naming a slot means "next available"; the publish job
    // assigns it. Don't invent a time here — slot policy lives in one place.
    if (body.scheduledFor) {
      const when = new Date(body.scheduledFor);
      if (isNaN(when.getTime())) return bad("validation_failed", "scheduledFor is not a valid date.");
      post.scheduledFor = when;
    }
  }

  if (action === "decline") {
    post.status = "declined";
    post.declinedAt = new Date();
    post.declineReason = body.reason ? String(body.reason).slice(0, 500) : null;
    post.approvedAt = null;
    post.approvedVia = null;
    post.scheduledFor = null;
  }

  if (action === "schedule") {
    const when = new Date(body.scheduledFor);
    if (!body.scheduledFor || isNaN(when.getTime())) {
      return bad("validation_failed", "schedule requires a valid scheduledFor.");
    }
    if (when.getTime() < Date.now()) {
      return bad("validation_failed", "scheduledFor is in the past.");
    }
    post.scheduledFor = when;
    // Scheduling is not approving. An agent can line up a slot and still decide
    // later; the publish job checks approvedAt, not scheduledFor.
  }

  await post.save();

  return NextResponse.json(
    {
      id: String(post._id),
      status: post.status,
      approvedAt: post.approvedAt,
      declinedAt: post.declinedAt,
      scheduledFor: post.scheduledFor,
    },
    { headers: NO_STORE }
  );
}
