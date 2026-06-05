// src/app/api/skill/me/stats/route.ts
//
// GET → counts that help Claude answer "what should I work on?" or pick
// follow-up actions. Cheap aggregate counts only; no PII.

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import Article from "@/models/article";
import { authenticateSkillRequest, skillRateLimit } from "@/lib/skill-auth";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(req: NextRequest) {
  const auth = await authenticateSkillRequest(req);
  if (auth.ok === false) {
    return NextResponse.json(
      { error: auth.reason },
      { status: auth.status, headers: NO_STORE }
    );
  }
  const rateLimited = skillRateLimit(auth, "identity");
  if (rateLimited) return rateLimited;

  await dbConnect();
  const userId = auth.user._id;

  // Articles (incl. landing pages) by category × status.
  // One aggregate, server-side, so we don't ship 1000 docs.
  const articleAgg = await Article.aggregate([
    { $match: { "author.id": userId } },
    { $group: { _id: { category: "$category", status: "$status" }, count: { $sum: 1 } } },
  ]);

  const articles = {
    drafts: 0,
    published: 0,
    archived: 0,
    byCategory: {} as Record<string, { drafts: number; published: number; archived: number }>,
  };
  for (const row of articleAgg) {
    const cat = row._id?.category || "unknown";
    const status = (row._id?.status as "draft" | "published" | "archived") || "draft";
    const count = row.count as number;
    if (!articles.byCategory[cat]) {
      articles.byCategory[cat] = { drafts: 0, published: 0, archived: 0 };
    }
    if (status === "draft") {
      articles.drafts += count;
      articles.byCategory[cat].drafts += count;
    } else if (status === "published") {
      articles.published += count;
      articles.byCategory[cat].published += count;
    } else if (status === "archived") {
      articles.archived += count;
      articles.byCategory[cat].archived += count;
    }
  }

  return NextResponse.json(
    {
      articles,
      // Placeholders — future tools wire these in:
      // contacts: await Contact.countDocuments({ ownerId: userId })   (needs contacts:read)
      // campaigns: await Campaign.countDocuments({ agentId: userId }) (needs campaigns:read)
    },
    { headers: NO_STORE }
  );
}
