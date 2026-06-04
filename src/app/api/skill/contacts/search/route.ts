// src/app/api/skill/contacts/search/route.ts
//
// GET → minimal contact search. Returns id + display name + primary phone +
// primary email + status + last contact date. Does NOT return notes /
// noteHistory / full PII chain — call /api/skill/contacts/[id] for that.
//
// Two-step PII gate: search returns just enough to identify a person; full
// pull requires an explicit second call. Cap is 50/page hard.
//
// contacts:read scope, read tier.

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import Contact from "@/models/Contact";
import { authenticateSkillRequest, requireScope, skillRateLimit } from "@/lib/skill-auth";

const NO_STORE = { "Cache-Control": "no-store" };
const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(req: NextRequest) {
  const auth = await authenticateSkillRequest(req);
  const denied = requireScope(auth, "contacts:read");
  if (denied) return denied;
  if (auth.ok === false) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  const rl = skillRateLimit(auth, "read");
  if (rl) return rl;

  const sp = req.nextUrl.searchParams;
  const q = sp.get("q")?.trim();
  const status = sp.get("status")?.trim();
  const tag = sp.get("tag")?.trim();
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(sp.get("limit")) || DEFAULT_LIMIT));
  const skip = Math.max(0, Number(sp.get("skip")) || 0);

  await dbConnect();
  const query: Record<string, any> = { userId: auth.user._id };

  if (q) {
    const regex = new RegExp(escapeRegex(q), "i");
    query.$or = [
      { firstName: regex },
      { lastName: regex },
      { organization: regex },
      { "emails.address": regex },
      // Phone is normalized to E.164; substring match on the raw digits.
      { "phones.number": regex },
      { phone: regex }, // legacy field
      { email: regex }, // legacy field
    ];
  }
  if (status) query.status = status;
  if (tag) query.tags = tag;

  const [items, total] = await Promise.all([
    Contact.find(query)
      .select(
        "firstName lastName organization status tags phones emails phone email " +
        "lastContactDate lastContactMethod source createdAt"
      )
      .sort({ lastContactDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Contact.countDocuments(query),
  ]);

  return NextResponse.json(
    {
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
          organization: c.organization || null,
          status: c.status || null,
          tags: c.tags || [],
          primaryPhone,
          primaryEmail,
          source: c.source || null,
          lastContactDate: c.lastContactDate || null,
          lastContactMethod: c.lastContactMethod || null,
          createdAt: c.createdAt,
        };
      }),
      total,
      skip,
      limit,
      hasMore: skip + items.length < total,
      _note:
        "Search returns minimal display data. For notes, history, address, and interests, call get_contact with the id.",
    },
    { headers: NO_STORE }
  );
}
