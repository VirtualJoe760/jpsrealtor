// src/app/api/skill/contacts/recent-leads/route.ts
//
// GET → recently-created contacts (i.e. new leads), optionally filtered by
// source. Same minimal projection as /search so PII surface stays small.
// Useful for "what's new this week?" prompts.

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import Contact from "@/models/Contact";
import { authenticateSkillRequest, requireScope, skillRateLimit } from "@/lib/skill-auth";

const NO_STORE = { "Cache-Control": "no-store" };
const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;
const DEFAULT_LOOKBACK_DAYS = 14;

export async function GET(req: NextRequest) {
  const auth = await authenticateSkillRequest(req);
  const denied = requireScope(auth, "contacts:read");
  if (denied) return denied;
  if (auth.ok === false) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  const rl = skillRateLimit(auth, "read");
  if (rl) return rl;

  const sp = req.nextUrl.searchParams;
  const source = sp.get("source")?.trim();
  const days = Math.min(180, Math.max(1, Number(sp.get("days")) || DEFAULT_LOOKBACK_DAYS));
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(sp.get("limit")) || DEFAULT_LIMIT));
  const skip = Math.max(0, Number(sp.get("skip")) || 0);

  const since = new Date();
  since.setDate(since.getDate() - days);

  await dbConnect();
  const query: Record<string, any> = {
    userId: auth.user._id,
    createdAt: { $gte: since },
  };
  if (source) query.source = source;

  const [items, total] = await Promise.all([
    Contact.find(query)
      .select(
        "firstName lastName organization status tags phones emails phone email " +
        "source createdAt lastContactDate"
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Contact.countDocuments(query),
  ]);

  return NextResponse.json(
    {
      since,
      lookbackDays: days,
      items: items.map((c: any) => {
        const primaryPhone =
          (c.phones || []).find((p: any) => p?.isPrimary)?.number ||
          c.phones?.[0]?.number ||
          c.phone ||
          null;
        const primaryEmail =
          (c.emails || []).find((e: any) => e?.isPrimary)?.address ||
          c.emails?.[0]?.address ||
          c.email ||
          null;
        const fullName = [c.firstName, c.lastName].filter(Boolean).join(" ") || c.organization || "Unnamed contact";
        return {
          id: String(c._id),
          name: fullName,
          status: c.status || null,
          tags: c.tags || [],
          primaryPhone,
          primaryEmail,
          source: c.source || null,
          createdAt: c.createdAt,
          lastContactDate: c.lastContactDate || null,
        };
      }),
      total,
      skip,
      limit,
      hasMore: skip + items.length < total,
    },
    { headers: NO_STORE }
  );
}
