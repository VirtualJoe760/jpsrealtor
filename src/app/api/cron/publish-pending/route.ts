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
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const NO_STORE = { "Cache-Control": "no-store" };

/** The hour, in the agent's timezone, that automated posts go out. */
const POST_HOUR = 9;
const TZ = "America/Los_Angeles";

/**
 * Carousels post Tue / Thu / Sun only — docs/content-templates/auto-posting.md.
 *
 * THIS GATE WAS MISSING and it reposted a listing on a Wednesday. The cron
 * runs hourly and only ever checked the HOUR, so every day was a posting day.
 * The slot maths had the same hole: it handed out "the next 9am" rather than
 * the next 9am that is actually a slot.
 */
const POST_DAYS = new Set([0, 2, 4]); // Sun, Tue, Thu

function weekdayIn(tz: string, at = new Date()): number {
  const name = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" }).format(at);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(name);
}

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
  const day = weekdayIn(TZ);
  const dayName = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][day];
  if (!force && !POST_DAYS.has(day)) {
    return NextResponse.json(
      { skipped: `${dayName} is not a posting day (Tue/Thu/Sun)` },
      { headers: NO_STORE }
    );
  }
  if (!force && hour !== POST_HOUR) {
    return NextResponse.json(
      { skipped: `it is ${hour}:00 in ${TZ}, posting hour is ${POST_HOUR}:00` },
      { headers: NO_STORE }
    );
  }

  await dbConnect();

  // Due = approved, and either scheduled for the past or not scheduled at all
  // (approve without a slot means "next available", which is now).
  //
  // The window reaches to the END of this hour, not to `now`. This job fires at
  // the top of the hour and a slot is stamped at :00, so comparing against the
  // instant of the run makes the two race — a run at 16:00:00.1 would find a
  // 16:00:00.3 slot "not due", and since the next run is 10am and fails the
  // posting-hour check, the post would silently slip a full day. We are already
  // inside the posting hour by the time we get here; anything slotted for this
  // hour goes now.
  const now = new Date();
  const endOfHour = new Date(now);
  endOfHour.setMinutes(59, 59, 999);
  const due = await PendingPost.find({
    status: "approved",
    approvedAt: { $ne: null },
    archivedAt: null,
    $or: [{ scheduledFor: null }, { scheduledFor: { $lte: endOfHour } }],
  })
    // FIRST APPROVED, FIRST POSTED. The slot decides WHETHER anything goes
    // out; approval order decides WHICH. Sorting by scheduledFor instead would
    // let a post approved today jump one approved last week simply because it
    // was given an earlier slot.
    .sort({ approvedAt: 1 })
    .limit(5);

  // ONE CAROUSEL PER SLOT. Three slots a week is the schedule; draining the
  // whole approved queue into a single morning would post three carousels
  // back to back. Duplicates and failures do NOT consume the slot — the loop
  // keeps going until something actually publishes.
  const results: any[] = [];
  let published = 0;
  for (const post of due) {
    if (published >= 1) break;
    try {
      // ALREADY-POSTED GUARD. A listing that has gone out must never go out
      // again, whatever route queued it. This is the failure the incident was
      // really about: the same property was published twice — once outside
      // this system entirely (no PendingPost record exists for it), once by
      // this job — and nothing connected the two. Checking the LISTING rather
      // than this record catches a duplicate regardless of which path created
      // it, as long as one of them left a record.
      const already = await PendingPost.findOne({
        _id: { $ne: post._id },
        listingKey: post.listingKey,
        status: "posted",
      }).select("approvalCode postedAt igPostId").lean();
      if (already) {
        post.status = "expired";
        post.archivedAt = new Date();
        post.error =
          `duplicate: listing already posted by ${(already as any).approvalCode} on ` +
          `${new Date((already as any).postedAt).toISOString().slice(0, 10)}`;
        await post.save();
        results.push({ code: post.approvalCode, ok: false, skipped: post.error });
        continue;
      }

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
      // One-way latch. Excluded from every publish query from here on, and
      // nothing in the codebase clears it.
      post.archivedAt = new Date();
      post.igPostId = out.mediaId;
      post.permalink = out.permalink || null;
      post.error = null;

      // RETENTION. Instagram now holds the images, so ours are dead weight.
      // Drop the Cloudinary assets and empty the slide array, keeping only
      // what an archive list needs: the listing, when it went out, and where
      // it lives. A posted record shrinks from ~10 slides to a few hundred
      // bytes and can never be re-staged anyway.
      const publicIds = (post.slides || []).map((sl: any) => sl.publicId).filter(Boolean);
      let swept = 0;
      for (const pid of publicIds) {
        try {
          await cloudinary.uploader.destroy(pid);
          swept++;
        } catch {
          /* a leftover asset is cosmetic; never fail a published post over it */
        }
      }
      post.slideCount = (post.slides || []).length;
      post.slides = [] as any;
      post.assetsDeletedAt = new Date();

      await post.save();
      published++;
      results.push({
        code: post.approvalCode,
        ok: true,
        permalink: out.permalink,
        assetsSwept: `${swept}/${publicIds.length}`,
      });
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
