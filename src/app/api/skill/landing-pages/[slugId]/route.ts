// src/app/api/skill/landing-pages/[slugId]/route.ts
//
// GET → returns the landing-page draft so the skill can show the agent
// what was created (useful for follow-up edits or verification).

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import Article from "@/models/article";
import { authenticateSkillRequest, requireScope, skillRateLimit } from "@/lib/skill-auth";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slugId: string }> }
) {
  const auth = await authenticateSkillRequest(req);
  const denied = requireScope(auth, "landing_pages:read");
  if (denied) return denied;
  if (auth.ok === false) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  const rateLimited = skillRateLimit(auth, "read");
  if (rateLimited) return rateLimited;
  const { slugId } = await params;

  await dbConnect();
  const doc = await Article.findOne({
    slug: slugId,
    category: "landing-page",
    "author.id": auth.user._id,
  }).lean();

  if (!doc) {
    return NextResponse.json(
      { error: "not_found" },
      { status: 404, headers: NO_STORE }
    );
  }
  return NextResponse.json(doc, { headers: NO_STORE });
}
