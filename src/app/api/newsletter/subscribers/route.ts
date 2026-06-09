// src/app/api/newsletter/subscribers/route.ts
//
// Agent/admin: list the signed-in owner's newsletter subscribers + status
// counts. Scoped to session.user.id (each agent owns their own list), matching
// the /agent/cms ownership model. Powers the future CMS subscriber view.
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import NewsletterSubscriber from "@/models/NewsletterSubscriber";

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
  const status = searchParams.get("status"); // active | unsubscribed | pending
  const limit = Math.min(Number(searchParams.get("limit") || 200), 1000);
  const skip = Math.max(Number(searchParams.get("skip") || 0), 0);

  const match: any = { ownerId };
  if (status) match.status = status;

  const [subscribers, total, byStatus] = await Promise.all([
    NewsletterSubscriber.find(match)
      .select("email name status source tags createdAt unsubscribedAt")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    NewsletterSubscriber.countDocuments(match),
    NewsletterSubscriber.aggregate([
      { $match: { ownerId } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
  ]);

  const counts = byStatus.reduce(
    (acc: Record<string, number>, r: any) => {
      acc[r._id] = r.count;
      return acc;
    },
    { active: 0, unsubscribed: 0, pending: 0 }
  );

  return json({ subscribers, total, counts });
}
