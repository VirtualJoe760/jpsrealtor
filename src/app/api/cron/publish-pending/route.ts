// src/app/api/cron/publish-pending/route.ts
//
// Publish approved carousels to Instagram.
//
// THIS IS THE PIECE THAT WAS MISSING. The review queue, the approve endpoint
// and the generator all existed, but nothing ever read an approved post and
// posted it — so approving a post did exactly nothing and the failure was
// silent. `approvedAt` appeared in no job anywhere in the codebase.
//
// SCHEDULING. Vercel crons run on UTC and have no timezone support, so this
// runs HOURLY and publishes only when it is the posting hour in the agent's
// local timezone. That keeps 9am meaning 9am across DST instead of drifting an
// hour twice a year, which a fixed UTC cron would do.
//
// Instagram's Content Publishing API has no scheduling of its own — there are
// no drafts and no future-dated posts — so the scheduling has to live here.
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import PendingPost from "@/models/PendingPost";
import { publishCarousel, resolveIgAccount } from "@/lib/instagram-publish";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const NO_STORE = { "Cache-Control": "no-store" };

/** The hour, in the agent's timezone, that automated posts go out. */
const POST_HOUR = 9;
const TZ = "America/Los_Angeles";

function hourIn(tz: string, at = new Date()): number {
  return Number(
    new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hour12: false }).format(at)
  );
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  }

  const force = req.nextUrl.searchParams.get("force") === "1";
  const hour = hourIn(TZ);
  if (!force && hour !== POST_HOUR) {
    return NextResponse.json(
      { skipped: `it is ${hour}:00 in ${TZ}, posting hour is ${POST_HOUR}:00` },
      { headers: NO_STORE }
    );
  }

  await dbConnect();

  // Due = approved, and either scheduled for the past or not scheduled at all
  // (approve without a slot means "next available", which is now).
  const now = new Date();
  const due = await PendingPost.find({
    status: "approved",
    approvedAt: { $ne: null },
    $or: [{ scheduledFor: null }, { scheduledFor: { $lte: now } }],
  })
    .sort({ scheduledFor: 1, approvedAt: 1 })
    .limit(5);

  const results: any[] = [];
  for (const post of due) {
    try {
      const imageUrls = (post.slides || []).map((s: any) => s.url).filter(Boolean);
      if (imageUrls.length < 2) throw new Error(`only ${imageUrls.length} slides`);

      const { igUserId, token } = await resolveIgAccount(String(post.agentId));
      const out = await publishCarousel({
        igUserId,
        token,
        imageUrls,
        caption: post.caption || "",
      });

      // Use the model's OWN field names. Mongoose strict mode drops fields the
      // schema does not declare without a word, so inventing `igMediaId` here
      // would have recorded a successful post with no id and no permalink.
      post.status = "posted";
      post.postedAt = new Date();
      post.igPostId = out.mediaId;
      post.permalink = out.permalink || null;
      post.error = null;
      await post.save();
      results.push({ code: post.approvalCode, ok: true, permalink: out.permalink });
    } catch (e: any) {
      // Leave it APPROVED so the next run retries. A transient Graph error
      // should not silently consume a post the agent already signed off.
      post.error = String(e?.message || e).slice(0, 500);
      post.failedAttempts = (post.failedAttempts || 0) + 1;
      if (post.failedAttempts >= 5) post.status = "failed";
      await post.save();
      results.push({ code: post.approvalCode, ok: false, error: post.error });
    }
  }

  return NextResponse.json(
    { hour, tz: TZ, considered: due.length, results },
    { headers: NO_STORE }
  );
}
