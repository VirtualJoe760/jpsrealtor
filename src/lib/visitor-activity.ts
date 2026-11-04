// src/lib/visitor-activity.ts
// Summarizes a visitor's PageView rows for the admin Users panel and the
// agent's contact panel. Callers decide the scope: admin passes only userId
// (every site); an agent passes agentId too, so they only ever see browsing on
// sites they own — never what the same person did on another agent's site.

import mongoose from "mongoose";
import PageView from "@/models/PageView";

export interface VisitorActivitySummary {
  totals: {
    pageViews: number;
    sessions: number;
    totalMs: number;
    firstSeen: string | null;
    lastSeen: string | null;
  };
  topPages: { host: string; path: string; title?: string; views: number; totalMs: number; lastSeen: string }[];
  recent: { host: string; path: string; title?: string; startedAt: string; durationMs: number }[];
  hosts: { host: string; views: number }[];
}

export async function summarizeVisitorActivity(opts: {
  userId: string;
  agentId?: string;
}): Promise<VisitorActivitySummary> {
  const match: Record<string, unknown> = { userId: new mongoose.Types.ObjectId(opts.userId) };
  if (opts.agentId) match.agentId = new mongoose.Types.ObjectId(opts.agentId);

  const [agg] = await PageView.aggregate([
    { $match: match },
    {
      $facet: {
        totals: [
          {
            $group: {
              _id: null,
              pageViews: { $sum: 1 },
              sessions: { $addToSet: "$sessionId" },
              totalMs: { $sum: "$durationMs" },
              firstSeen: { $min: "$startedAt" },
              lastSeen: { $max: "$startedAt" },
            },
          },
        ],
        topPages: [
          { $sort: { startedAt: -1 } },
          {
            $group: {
              _id: { host: "$host", path: "$path" },
              title: { $first: "$title" },
              views: { $sum: 1 },
              totalMs: { $sum: "$durationMs" },
              lastSeen: { $max: "$startedAt" },
            },
          },
          { $sort: { totalMs: -1, views: -1 } },
          { $limit: 15 },
        ],
        recent: [
          { $sort: { startedAt: -1 } },
          { $limit: 40 },
          { $project: { _id: 0, host: 1, path: 1, title: 1, startedAt: 1, durationMs: 1 } },
        ],
        hosts: [{ $group: { _id: "$host", views: { $sum: 1 } } }, { $sort: { views: -1 } }],
      },
    },
  ]);

  const t = agg?.totals?.[0];
  return {
    totals: {
      pageViews: t?.pageViews || 0,
      sessions: (t?.sessions || []).filter(Boolean).length,
      totalMs: t?.totalMs || 0,
      firstSeen: t?.firstSeen ? new Date(t.firstSeen).toISOString() : null,
      lastSeen: t?.lastSeen ? new Date(t.lastSeen).toISOString() : null,
    },
    topPages: (agg?.topPages || []).map((p: any) => ({
      host: p._id.host,
      path: p._id.path,
      title: p.title || undefined,
      views: p.views,
      totalMs: p.totalMs,
      lastSeen: new Date(p.lastSeen).toISOString(),
    })),
    recent: (agg?.recent || []).map((r: any) => ({
      host: r.host,
      path: r.path,
      title: r.title || undefined,
      startedAt: new Date(r.startedAt).toISOString(),
      durationMs: r.durationMs || 0,
    })),
    hosts: (agg?.hosts || []).map((h: any) => ({ host: h._id, views: h.views })),
  };
}
