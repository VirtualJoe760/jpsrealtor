// src/app/api/newsletter/issues/[id]/route.ts
//
// Agent/admin: read or edit a single newsletter issue (owner-scoped). Editing
// is allowed only while the issue is a draft — once sent it's immutable.
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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return json({ error: "Unauthorized" }, 401);

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return json({ error: "Not found" }, 404);

  await dbConnect();
  const issue = await Newsletter.findOne({
    _id: id,
    ownerId: new mongoose.Types.ObjectId(session.user.id),
  }).lean();

  if (!issue) return json({ error: "Not found" }, 404);
  return json({ issue });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return json({ error: "Unauthorized" }, 401);

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return json({ error: "Not found" }, 404);

  await dbConnect();
  const issue = await Newsletter.findOne({
    _id: id,
    ownerId: new mongoose.Types.ObjectId(session.user.id),
  });
  if (!issue) return json({ error: "Not found" }, 404);
  if (issue.status !== "draft") {
    return json({ error: "Only draft issues can be edited" }, 409);
  }

  const body = await request.json().catch(() => ({}));
  if (typeof body.subject === "string") issue.subject = body.subject.trim().slice(0, 200);
  if (typeof body.previewText === "string") issue.previewText = body.previewText.slice(0, 200);
  if (typeof body.bodyHtml === "string") issue.bodyHtml = body.bodyHtml;
  if (typeof body.bodyMarkdown === "string") issue.bodyMarkdown = body.bodyMarkdown;
  await issue.save();

  return json({ issue });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return json({ error: "Unauthorized" }, 401);

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return json({ error: "Not found" }, 404);

  await dbConnect();
  const res = await Newsletter.deleteOne({
    _id: id,
    ownerId: new mongoose.Types.ObjectId(session.user.id),
    status: { $ne: "sent" }, // keep a record of anything already delivered
  });

  if (res.deletedCount === 0) {
    return json({ error: "Not found or already sent" }, 404);
  }
  return json({ success: true });
}
