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

/** Automated posts go out at 9am Pacific; see /api/cron/publish-pending. */
const POST_HOUR = 9;
const TZ = "America/Los_Angeles";

/**
 * The next 9am in the agent's timezone, as a UTC instant.
 *
 * Computed by asking Intl what the offset is on the day in question rather
 * than hard-coding one, so the slot stays at 9am through DST instead of
 * sliding an hour twice a year.
 */
function nextPostSlot(from = new Date()): Date {
  const offsetMs = (at: Date) => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: TZ, hour12: false,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    }).formatToParts(at).reduce<Record<string, string>>((a, p) => {
      if (p.type !== "literal") a[p.type] = p.value;
      return a;
    }, {});
    const asUTC = Date.UTC(
      +parts.year, +parts.month - 1, +parts.day,
      +parts.hour % 24, +parts.minute, +parts.second
    );
    return asUTC - at.getTime();
  };

  for (let addDays = 0; addDays < 3; addDays++) {
    const probe = new Date(from.getTime() + addDays * 86400000);
    const off = offsetMs(probe);
    const local = new Date(probe.getTime() + off);
    const slotLocal = Date.UTC(
      local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), POST_HOUR, 0, 0
    );
    // Truncate to the minute. `off` carries the sub-second part of `from`, so
    // an untruncated slot lands on e.g. 16:00:00.256Z — and the publish cron
    // fires at the TOP of the hour, so a run at 16:00:00.100Z would find the
    // post "not due yet", and the next run an hour later fails the 9am check.
    // A quarter of a second of drift would have cost a full day, silently.
    const slotUtc = new Date(Math.floor((slotLocal - off) / 60000) * 60000);
    if (slotUtc.getTime() > from.getTime()) return slotUtc;
  }
  return new Date(from.getTime() + 86400000);
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

    if (body.scheduledFor) {
      const when = new Date(body.scheduledFor);
      if (isNaN(when.getTime())) return bad("validation_failed", "scheduledFor is not a valid date.");
      post.scheduledFor = when;
    } else {
      // Approving without naming a slot means the NEXT 9am. This used to be
      // left null on the theory that "slot policy lives in one place" — but
      // the place it supposedly lived did not exist, so approving a post set a
      // status and nothing ever acted on it. An approved post with no slot is
      // indistinguishable from a forgotten one; give it a real time the agent
      // can see in the dashboard.
      post.scheduledFor = nextPostSlot();
    }
  }

  if (action === "decline") {
    post.status = "declined";
    post.declinedAt = new Date();
    post.declineReason = body.reason ? String(body.reason).slice(0, 2000) : null;

    // Per-slide notes are the useful half. "Slide 2 has a blank strip at the
    // bottom and the same posture as slide 3" is actionable; "this post is bad"
    // is not, and a post-level-only field silently discards the difference.
    if (Array.isArray(body.slideFeedback)) {
      post.slideFeedback = body.slideFeedback
        .map((f: any) => ({ n: Number(f?.n), note: String(f?.note || "").slice(0, 1000) }))
        .filter((f: any) => Number.isInteger(f.n) && f.note);
    }

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
