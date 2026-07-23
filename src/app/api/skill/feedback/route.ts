// src/app/api/skill/feedback/route.ts
//
// POST → open a feedback submission (the MCP `give_feedback` tool's target).
// Returns a ONE-TIME upload URL the customer's shell curls a source-only zip
// to — the archive bytes never pass through the model. Any valid token, no
// scope, NOT dataSource-gated (testers with no data give the most feedback).

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import dbConnect from "@/lib/mongoose";
import { authenticateSkillRequest, skillRateLimit } from "@/lib/skill-auth";
import FeedbackSubmission from "@/models/FeedbackSubmission";

const NO_STORE = { "Cache-Control": "no-store" };
const UPLOAD_TTL_MIN = 30;
// Keep in sync with [id]/upload/route.ts (route files can't export consts).
const MAX_ZIP_BYTES = 4 * 1024 * 1024; // Vercel request-body ceiling is ~4.5MB

export async function POST(req: NextRequest) {
  const auth = await authenticateSkillRequest(req);
  if (auth.ok === false) {
    return NextResponse.json({ error: auth.reason }, { status: auth.status, headers: NO_STORE });
  }
  const rl = skillRateLimit(auth, "write");
  if (rl) return rl;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers: NO_STORE });
  }
  const summary = typeof body.summary === "string" ? body.summary.trim().slice(0, 2000) : "";
  if (!summary) {
    return NextResponse.json(
      { error: "validation_failed", message: "summary is required" },
      { status: 400, headers: NO_STORE }
    );
  }
  const kind = ["feedback", "bug", "session-export"].includes(body.kind) ? body.kind : "feedback";

  await dbConnect();
  const plaintext = crypto.randomBytes(24).toString("base64url");
  const doc = await FeedbackSubmission.create({
    summary,
    kind,
    reporter: {
      userId: auth.user._id,
      email: auth.user.email || undefined,
      name: auth.user.name || undefined,
      tokenName: auth.tokenName,
    },
    uploadTokenHash: crypto.createHash("sha256").update(plaintext).digest("hex"),
    uploadTokenExpiresAt: new Date(Date.now() + UPLOAD_TTL_MIN * 60 * 1000),
  });

  const base = process.env.NEXT_PUBLIC_BASE_URL || "https://www.chatrealty.io";
  return NextResponse.json(
    {
      feedbackId: String(doc._id),
      uploadUrl: `${base}/api/skill/feedback/${String(doc._id)}/upload?token=${plaintext}`,
      maxBytes: MAX_ZIP_BYTES,
      expiresInMinutes: UPLOAD_TTL_MIN,
      instructions: [
        "1. Write feedback.md (or bugreport.md) at the project root: what was tested, what worked, what didn't, suggestions.",
        "2. Write SESSION-LOG.md: a faithful breakdown of the full conversation — the asks, decisions, tool calls, and outcomes.",
        "3. From the project directory, zip SOURCE ONLY (must stay under 4MB): exclude node_modules, .next, .git, *.zip, and every .env* file (secrets never leave the machine).",
        "4. Upload with: curl -X PUT --data-binary @feedback.zip -H \"Content-Type: application/zip\" \"<uploadUrl>\"",
        "5. Confirm the response says uploaded, then tell the agent the feedbackId.",
      ],
    },
    { status: 201, headers: NO_STORE }
  );
}
