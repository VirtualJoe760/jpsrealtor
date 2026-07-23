// src/app/api/skill/feedback/[id]/upload/route.ts
//
// PUT → receive the feedback zip. Auth is the ONE-TIME token in the query
// string (the customer-side shell has no bearer token — the connector holds
// it), single-use, 30-min expiry, 4MB cap. Bytes go to GridFS bucket
// "crfeedback" and the zip is emailed to the owner as an attachment
// (non-blocking; GridFS is the source of truth for /review-cr-feedback).

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import mongoose from "mongoose";
import { Resend } from "resend";
import dbConnect from "@/lib/mongoose";
import { platformFrom } from "@/lib/email-brand";
import FeedbackSubmission from "@/models/FeedbackSubmission";

const NO_STORE = { "Cache-Control": "no-store" };
// Keep in sync with ../route.ts (route files can't export consts).
const MAX_ZIP_BYTES = 4 * 1024 * 1024;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const token = new URL(req.url).searchParams.get("token") || "";
  if (!token || !mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400, headers: NO_STORE });
  }

  await dbConnect();
  const doc = await FeedbackSubmission.findById(id);
  if (
    !doc ||
    doc.status !== "awaiting_upload" ||
    doc.uploadTokenExpiresAt.getTime() < Date.now() ||
    doc.uploadTokenHash !== crypto.createHash("sha256").update(token).digest("hex")
  ) {
    return NextResponse.json(
      { error: "invalid_or_expired_upload_token" },
      { status: 403, headers: NO_STORE }
    );
  }

  const buf = Buffer.from(await req.arrayBuffer());
  if (buf.length === 0) {
    return NextResponse.json({ error: "empty_body" }, { status: 400, headers: NO_STORE });
  }
  if (buf.length > MAX_ZIP_BYTES) {
    return NextResponse.json(
      { error: "too_large", message: `Zip exceeds ${MAX_ZIP_BYTES} bytes — exclude node_modules/.next/.git and retry.` },
      { status: 413, headers: NO_STORE }
    );
  }
  // Zip magic bytes (PK\x03\x04 / PK\x05\x06 empty) — cheap sanity check.
  if (!(buf[0] === 0x50 && buf[1] === 0x4b)) {
    return NextResponse.json(
      { error: "not_a_zip", message: "Body must be a zip archive." },
      { status: 400, headers: NO_STORE }
    );
  }

  const db = mongoose.connection.db!;
  const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: "crfeedback" });
  const fileId = await new Promise<mongoose.Types.ObjectId>((resolve, reject) => {
    const stream = bucket.openUploadStream(`feedback-${id}.zip`, {
      contentType: "application/zip",
      metadata: { feedbackId: id, kind: doc.kind },
    });
    stream.on("error", reject);
    stream.on("finish", () => resolve(stream.id as mongoose.Types.ObjectId));
    stream.end(buf);
  });

  doc.status = "uploaded";
  doc.fileId = fileId;
  doc.fileBytes = buf.length;
  // Burn the token — single use.
  doc.uploadTokenHash = "used";
  await doc.save();

  // Email the package to the owner, zip attached (non-blocking convenience
  // copy; GridFS remains the source of truth).
  (async () => {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: platformFrom(),
      to: [process.env.BUG_REPORTS_EMAIL || "bugs@chatrealty.io"],
      replyTo: doc.reporter.email || undefined,
      subject: `[CR-FEEDBACK][${doc.kind}] ${doc.summary.slice(0, 80)} (${id})`,
      text: `Feedback package uploaded (${(buf.length / 1024).toFixed(0)} KB) by ${doc.reporter.name || "unknown"} <${doc.reporter.email || "unknown"}>.\n\nSummary: ${doc.summary}\n\nReview locally with: /review-cr-feedback (id ${id})`,
      attachments: [{ filename: `feedback-${id}.zip`, content: buf.toString("base64") }],
    });
  })().catch((err) => console.error("[feedback] email notify failed (non-blocking):", err));

  return NextResponse.json(
    { uploaded: true, feedbackId: id, bytes: buf.length, message: "Package received — thank you. The ChatRealty team reviews these directly." },
    { headers: NO_STORE }
  );
}
