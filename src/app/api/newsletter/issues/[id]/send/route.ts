// src/app/api/newsletter/issues/[id]/send/route.ts
//
// Agent/admin: send a draft newsletter issue to the owner's active subscribers
// via Resend. Batches (Resend caps batch.send at 100), injects a per-recipient
// unsubscribe link + RFC 8058 List-Unsubscribe headers, and flips the issue to
// sending → sent / failed with a recipient count. Idempotent guard: refuses to
// resend an issue that's already sending/sent.
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { Resend } from "resend";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import Newsletter from "@/models/Newsletter";
import NewsletterSubscriber from "@/models/NewsletterSubscriber";

export const dynamic = "force-dynamic";

const BATCH_SIZE = 100;

function json(body: any, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return json({ error: "Unauthorized" }, 401);

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return json({ error: "Not found" }, 404);

  await dbConnect();
  const ownerId = new mongoose.Types.ObjectId(session.user.id);

  const issue = await Newsletter.findOne({ _id: id, ownerId });
  if (!issue) return json({ error: "Not found" }, 404);
  if (issue.status === "sending" || issue.status === "sent") {
    return json({ error: `Issue is already ${issue.status}` }, 409);
  }
  if (!issue.bodyHtml?.trim()) {
    return json({ error: "Issue has no content to send" }, 400);
  }

  const apiKey = process.env.RESEND_API_KEY || process.env.FULL_ACCESS_RESEND_API_KEY;
  if (!apiKey) {
    return json({ error: "Email sending is not configured (RESEND_API_KEY)" }, 503);
  }

  const subscribers = await NewsletterSubscriber.find({
    ownerId,
    status: "active",
  })
    .select("email name unsubscribeToken")
    .lean();

  if (subscribers.length === 0) {
    return json({ error: "No active subscribers to send to" }, 400);
  }

  // Claim the issue so a concurrent click can't double-send.
  issue.status = "sending";
  await issue.save();

  const resend = new Resend(apiKey);
  const fromEmail = process.env.EMAIL_FROM || "newsletter@jpsrealtor.com";
  const fromName = session.user.name || "ChatRealty";
  const origin =
    process.env.NEXTAUTH_URL ||
    `https://${request.headers.get("host") || "jpsrealtor.com"}`;

  let sent = 0;
  try {
    for (const group of chunk(subscribers, BATCH_SIZE)) {
      const payload = group.map((s: any) => {
        const unsub = `${origin}/api/newsletter/unsubscribe?token=${s.unsubscribeToken}`;
        const footer = `<hr style="border:none;border-top:1px solid #e5e5e5;margin:32px 0 16px"/><p style="font-size:12px;color:#888;font-family:Arial,sans-serif">You're receiving this because you subscribed at ${origin.replace(/^https?:\/\//, "")}. <a href="${unsub}" style="color:#888">Unsubscribe</a>.</p>`;
        return {
          from: `${fromName} <${fromEmail}>`,
          to: s.email as string,
          subject: issue.subject,
          html: `${issue.bodyHtml}${footer}`,
          headers: {
            "List-Unsubscribe": `<${unsub}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        };
      });

      const res = await resend.batch.send(payload as any);
      if ((res as any)?.error) throw new Error(JSON.stringify((res as any).error));
      sent += payload.length;
    }

    issue.status = "sent";
    issue.sentAt = new Date();
    issue.recipientCount = sent;
    issue.error = undefined;
    await issue.save();

    return json({ success: true, recipientCount: sent });
  } catch (err: any) {
    console.error("[newsletter/send] Error:", err);
    issue.status = "failed";
    issue.error = String(err?.message || err).slice(0, 500);
    issue.recipientCount = sent;
    await issue.save();
    return json({ error: "Send failed", recipientCount: sent }, 500);
  }
}
