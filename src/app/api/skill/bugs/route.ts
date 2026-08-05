// src/app/api/skill/bugs/route.ts
//
// POST → file a testing-phase bug report (the MCP `report_bug` tool's target).
//
// Auth: any valid crt_live token, NO scope required (meta surface, like /me) and
// deliberately NOT dataSource-gated — accounts with dataSource "none" are
// exactly the testers most likely to hit bugs. Rate tier "write" (30/min)
// bounds spam; per-user daily cap below bounds it harder.

import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import dbConnect from "@/lib/mongoose";
import { authenticateSkillRequest, skillRateLimit } from "@/lib/skill-auth";
import { platformFrom } from "@/lib/email-brand";
import BugReport, { BUG_AREAS, bugFingerprint } from "@/models/BugReport";

const NO_STORE = { "Cache-Control": "no-store" };
const MAX_OPEN_PER_USER_PER_DAY = 20;

const clip = (v: unknown, max: number): string | undefined => {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t ? t.slice(0, max) : undefined;
};

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

  const title = clip(body.title, 200);
  const description = clip(body.description, 8000);
  if (!title || !description) {
    return NextResponse.json(
      { error: "validation_failed", message: "title and description are required" },
      { status: 400, headers: NO_STORE }
    );
  }
  const severity = ["low", "medium", "high", "critical"].includes(body.severity)
    ? body.severity
    : "medium";
  const area = (BUG_AREAS as readonly string[]).includes(body.area) ? body.area : "other";

  await dbConnect();

  // DEDUPE BEFORE THE CAP. Every test session authenticates as the same judge
  // account, so a session that files one defect three times (a retry, or the
  // same 404 hit from three pages) used to burn three of twenty daily slots and
  // leave the queue holding literal triplicates. A repeat of an already-open
  // defect is EVIDENCE, not a new report: bump the count, refresh the
  // timestamp, and charge it nothing.
  const fingerprint = bugFingerprint(area, title);
  const existing = await BugReport.findOneAndUpdate(
    { fingerprint, status: { $in: ["new", "triaged"] } },
    { $inc: { duplicateCount: 1 }, $set: { lastReportedAt: new Date() } },
    { new: true }
  );
  if (existing) {
    return NextResponse.json(
      {
        bugId: String(existing._id),
        deduplicated: true,
        duplicateCount: existing.duplicateCount,
        message:
          "Already filed and still open — recorded as another occurrence. " +
          "No need to re-file this one; it did not count against your daily limit.",
      },
      { headers: NO_STORE }
    );
  }

  // Per-user daily cap — a stuck agent loop shouldn't flood the queue.
  //
  // CRITICAL REPORTS ARE NEVER CAPPED. The cap exists to bound noise, and a
  // budget spent on low/medium noise must not swallow the one finding that
  // actually blocks a build. A session hit exactly that: it found a critical
  // serving bug, got a 429, and the report reached us only as prose in a
  // session summary. Losing that is far worse than one extra row here.
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  if (severity !== "critical") {
    const recent = await BugReport.countDocuments({
      "reporter.userId": auth.user._id,
      severity: { $ne: "critical" },
      createdAt: { $gte: dayAgo },
    });
    if (recent >= MAX_OPEN_PER_USER_PER_DAY) {
      return NextResponse.json(
        {
          error: "rate_limited",
          message:
            "Daily bug-report limit reached for low/medium/high reports — thank you, we have plenty " +
            "to work through. Reports filed with severity \"critical\" are still accepted; if this one " +
            "blocks the build, re-file it as critical.",
        },
        { status: 429, headers: NO_STORE }
      );
    }
  }

  const doc = await BugReport.create({
    title,
    severity,
    area,
    description,
    stepsToReproduce: clip(body.stepsToReproduce, 4000),
    expected: clip(body.expected, 2000),
    actual: clip(body.actual, 4000),
    environment: clip(body.environment, 2000),
    fingerprint,
    duplicateCount: 1,
    lastReportedAt: new Date(),
    reporter: {
      userId: auth.user._id,
      email: auth.user.email || undefined,
      name: auth.user.name || undefined,
      tokenName: auth.tokenName,
    },
  });

  // Email the report to the bugs inbox with the full markdown attached —
  // non-blocking; the DB row above is the source of truth for /check-cr-bugs.
  (async () => {
    const md = [
      `# ChatRealty Bug Report — ${title}`,
      "",
      `**ID:** ${String(doc._id)}`,
      `**Severity:** ${severity}   **Area:** ${area}   **Status:** new`,
      `**Reporter:** ${auth.user.name || "unknown"} <${auth.user.email || "unknown"}> (token: ${auth.tokenName})`,
      `**Filed:** ${doc.createdAt.toISOString()}`,
      "",
      "## Description",
      description,
      ...(doc.stepsToReproduce ? ["", "## Steps to reproduce", doc.stepsToReproduce] : []),
      ...(doc.expected ? ["", "## Expected", doc.expected] : []),
      ...(doc.actual ? ["", "## Actual", doc.actual] : []),
      ...(doc.environment ? ["", "## Environment", doc.environment] : []),
    ].join("\n");
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: platformFrom(),
      to: [process.env.BUG_REPORTS_EMAIL || "bugs@chatrealty.io"],
      replyTo: auth.user.email || undefined,
      subject: `[CR-BUG][${severity}] ${title} (${area})`,
      text: `New testing-phase bug report ${String(doc._id)} — full report attached as markdown.\n\n${md.slice(0, 2000)}`,
      attachments: [
        {
          filename: `bug-${String(doc._id)}.md`,
          content: Buffer.from(md, "utf8").toString("base64"),
        },
      ],
    });
  })().catch((err) => console.error("[bugs] email notify failed (non-blocking):", err));

  return NextResponse.json(
    {
      bugId: String(doc._id),
      status: "new",
      message:
        "Bug filed — thank you. ChatRealty is in its testing phase and reports like this directly shape the fixes; the team reviews them promptly.",
    },
    { status: 201, headers: NO_STORE }
  );
}
