// src/app/api/skill/contacts/[id]/route.ts
//
// GET → full contact detail incl. notes, history, interests, preferences.
// This is the PII-heavy endpoint — only call when the agent has explicitly
// asked Claude to dig into a specific person.
//
// Returns owner-scoped only (contact.userId === auth.user._id).
//
// Deliberately omits raw FUB data, originalData, and importBatchId — those
// are debugging fields that would just confuse Claude.

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import Contact from "@/models/Contact";
import { authenticateSkillRequest, requireScope, skillRateLimit } from "@/lib/skill-auth";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateSkillRequest(req);
  const denied = requireScope(auth, "contacts:read");
  if (denied) return denied;
  if (auth.ok === false) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  const rl = skillRateLimit(auth, "read");
  if (rl) return rl;

  const { id } = await params;

  await dbConnect();
  const c: any = await Contact.findOne({
    _id: id,
    userId: auth.user._id,
  })
    .select(
      "firstName lastName middleName nickname organization jobTitle " +
      "phones emails phone email birthday photo " +
      "address alternateAddress " +
      "source status tags labels " +
      "interests preferences consent " +
      "notes noteHistory lastContactDate lastContactMethod " +
      "createdAt updatedAt"
    )
    .lean()
    .catch(() => null);

  if (!c) {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
  }

  return NextResponse.json(
    {
      id: String(c._id),
      firstName: c.firstName || null,
      lastName: c.lastName || null,
      middleName: c.middleName || null,
      nickname: c.nickname || null,
      organization: c.organization || null,
      jobTitle: c.jobTitle || null,
      phones: c.phones || [],
      emails: c.emails || [],
      legacyPhone: c.phone || null,
      legacyEmail: c.email || null,
      birthday: c.birthday || null,
      photoUrl: c.photo || null,
      address: c.address || null,
      alternateAddress: c.alternateAddress || null,
      source: c.source || null,
      status: c.status || null,
      tags: c.tags || [],
      // labels are ObjectIds; expose count + ids so Claude can mention "tagged with N labels"
      // without us joining the Label collection here. (Add a label-resolution helper later.)
      labelIds: (c.labels || []).map((id: any) => String(id)),
      interests: c.interests || null,
      preferences: c.preferences || null,
      consent: c.consent
        ? {
            marketingConsent: !!c.consent.marketingConsent,
            tcpaConsent: !!c.consent.tcpaConsent,
            consentDate: c.consent.consentDate || null,
          }
        : null,
      notes: c.notes || null,
      noteHistory: (c.noteHistory || []).map((n: any) => ({
        content: n.content,
        createdAt: n.createdAt,
        updatedAt: n.updatedAt || null,
      })),
      lastContactDate: c.lastContactDate || null,
      lastContactMethod: c.lastContactMethod || null,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    },
    { headers: NO_STORE }
  );
}
