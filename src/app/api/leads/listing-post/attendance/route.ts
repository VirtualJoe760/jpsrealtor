import { createHash } from "node:crypto";
import { Types } from "mongoose";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { doesDomainBelongToAgent } from "@/lib/domain-utils";
import { listingCalendarDate, loadListingOpenHouses } from "@/lib/listings/listing-post-open-houses";
import { openHouseAttendanceNote, readOpenHouseAttendance } from "@/lib/listings/listing-post-pending";
import dbConnect from "@/lib/mongoose";
import { checkRateLimit } from "@/lib/rate-limit";
import Article from "@/models/article";
import Contact from "@/models/Contact";

function stableId(parts: string[]) {
  return new Types.ObjectId(createHash("sha256").update(JSON.stringify(parts)).digest("hex").slice(0, 24));
}

export async function POST(req: NextRequest) {
  if (req.headers.get("sec-fetch-site") === "cross-site" ||
      !req.headers.get("content-type")?.startsWith("application/json")) {
    return NextResponse.json({ error: "Invalid request." }, { status: 403 });
  }

  const session = await getServerSession(authOptions);
  const user = session?.user;
  const email = user?.email?.trim().toLowerCase();
  if (!user?.id || !Types.ObjectId.isValid(user.id) || !email) {
    return NextResponse.json({ error: "Sign in to send your response." }, { status: 401 });
  }
  if (!checkRateLimit(`listing-attendance:${user.id}`, { max: 10, windowMs: 3600000 }).ok) {
    return NextResponse.json({ error: "Please try again later." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const slug = body?.slug;
  const eventDate = body?.eventDate;
  if (typeof slug !== "string" || !slug || slug.length > 250 ||
      typeof eventDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(eventDate) ||
      eventDate > listingCalendarDate()) {
    return NextResponse.json({ error: "Invalid open house." }, { status: 400 });
  }

  try {
    await dbConnect();
    const post = await Article.findOne({ slug, category: "listing-post", status: "published" })
      .select("author.id visibility listingPost.address listingPost.listingKey listingPost.openHouse.date").maxTimeMS(2000).lean();
    const authorId = String(post?.author?.id ?? "");
    if (!post?.listingPost?.listingKey || !Types.ObjectId.isValid(authorId) ||
        (post.visibility === "private" && !(await doesDomainBelongToAgent(authorId)))) {
      return NextResponse.json({ error: "Open house unavailable." }, { status: 404 });
    }
    if (post.listingPost.openHouse?.date !== eventDate &&
        !(await loadListingOpenHouses(post.listingPost.listingKey)).some((event) => event.date === eventDate)) {
      return NextResponse.json({ error: "Open house unavailable." }, { status: 404 });
    }

    const linkedUserId = new Types.ObjectId(user.id);
    const userId = new Types.ObjectId(authorId);
    const existing = await Contact.findOne({ userId, $or: [{ linkedUserId }, { email }, { "emails.address": email }] })
      .select("_id").maxTimeMS(2000).lean();
    const contactId = existing?._id ?? stableId(["listing-attendance-contact", authorId, user.id]);
    if (!existing) {
      const [firstName = "Website visitor", ...lastName] = user.name?.trim().split(/\s+/).filter(Boolean) ?? [];
      await Contact.updateOne({ _id: contactId, userId }, {
        $setOnInsert: {
          firstName, lastName: lastName.join(" "), email, linkedUserId, source: "website",
          preferences: { smsOptIn: false, emailOptIn: false, callOptIn: false },
          consent: { marketingConsent: false, tcpaConsent: false },
        },
      }, { upsert: true, maxTimeMS: 2000 });
    }

    const noteId = stableId(["listing-attendance-note", authorId, user.id, slug, eventDate]);
    const attendance = readOpenHouseAttendance(body);
    const content = `Confirmed open house attendance for ${post.listingPost?.address || slug} (event ${eventDate}).${openHouseAttendanceNote(attendance)}`;
    await Contact.updateOne({ _id: contactId, userId, "noteHistory._id": { $ne: noteId } }, {
      $push: { noteHistory: { _id: noteId, content, createdAt: new Date() } },
      $addToSet: { tags: "Open House Attendee" },
    }, { maxTimeMS: 2000 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Could not save listing open house attendance", error);
    return NextResponse.json({ error: "Could not save your response." }, { status: 500 });
  }
}
