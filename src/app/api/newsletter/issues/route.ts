// src/app/api/newsletter/issues/route.ts
//
// Agent/admin: list + create newsletter issues, scoped to session.user.id.
// Authoring (rich composer / AI-generated drafts) lands later; this is the
// backend CRUD the CMS UI will drive.
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import Newsletter from "@/models/Newsletter";

export const dynamic = "force-dynamic";

function json(body: any, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return json({ error: "Unauthorized" }, 401);

  await dbConnect();
  const ownerId = new mongoose.Types.ObjectId(session.user.id);
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  const match: any = { ownerId };
  if (status) match.status = status;

  const issues = await Newsletter.find(match)
    .select("subject previewText status sentAt recipientCount scheduledFor createdAt updatedAt")
    .sort({ updatedAt: -1 })
    .limit(200)
    .lean();

  return json({ issues });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return json({ error: "Unauthorized" }, 401);

  const body = await request.json().catch(() => ({}));
  const subject = String(body.subject || "").trim();
  if (!subject) return json({ error: "Subject is required" }, 400);

  await dbConnect();
  const ownerId = new mongoose.Types.ObjectId(session.user.id);

  const issue = await Newsletter.create({
    ownerId,
    createdBy: ownerId,
    subject: subject.slice(0, 200),
    previewText: body.previewText ? String(body.previewText).slice(0, 200) : undefined,
    bodyHtml: typeof body.bodyHtml === "string" ? body.bodyHtml : "",
    bodyMarkdown: typeof body.bodyMarkdown === "string" ? body.bodyMarkdown : undefined,
    status: "draft",
  });

  return json({ issue }, 201);
}
