// src/lib/agent-visitors.ts
// The agent dashboard's "Site visitors" panel: who has been on the agent's own
// sites, and — per visitor — which pages and listings, for how long, and when.
//
// Every query is pinned to PageView.agentId === the agent, so an agent never
// sees browsing on another agent's site. Visitors are keyed "u:<userId>" when
// signed in, "a:<anonymousId>" when not (anonymous rows are re-keyed to the
// user once that browser signs in — see /api/activity/page-view).

import mongoose from "mongoose";
import PageView from "@/models/PageView";
import User from "@/models/User";
import Contact from "@/models/Contact";
import UnifiedListing from "@/models/unified-listing";

const LISTING_PATH = /^\/mls-listings\/([^/?#]+)/;

export function listingSlugFromPath(path: string): string | null {
  const m = LISTING_PATH.exec(path);
  return m ? decodeURIComponent(m[1]) : null;
}

export interface VisitorRow {
  key: string;
  userId: string | null;
  name: string | null;
  email: string | null;
  image: string | null;
  contactId: string | null;
  pageViews: number;
  listingViews: number;
  totalMs: number;
  sessions: number;
  firstSeen: string;
  lastSeen: string;
}

export async function listAgentVisitors(agentId: string, days: number): Promise<VisitorRow[]> {
  const agent = new mongoose.Types.ObjectId(agentId);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const rows = await PageView.aggregate([
    // Agent's own browsing on their own site is not a visitor.
    { $match: { agentId: agent, startedAt: { $gte: since }, userId: { $ne: agent } } },
    {
      $group: {
        _id: { $ifNull: [{ $concat: ["u:", { $toString: "$userId" }] }, { $concat: ["a:", "$anonymousId"] }] },
        userId: { $first: "$userId" },
        pageViews: { $sum: 1 },
        listingViews: {
          $sum: { $cond: [{ $regexMatch: { input: "$path", regex: "^/mls-listings/" } }, 1, 0] },
        },
        totalMs: { $sum: "$durationMs" },
        sessions: { $addToSet: "$sessionId" },
        firstSeen: { $min: "$startedAt" },
        lastSeen: { $max: "$startedAt" },
      },
    },
    { $match: { _id: { $ne: null } } },
    { $sort: { lastSeen: -1 } },
    { $limit: 100 },
  ]);

  const userIds = rows.map((r: any) => r.userId).filter(Boolean);
  const [users, contacts] = await Promise.all([
    userIds.length
      ? User.find({ _id: { $in: userIds } }).select("name email image").lean()
      : Promise.resolve([]),
    userIds.length
      ? Contact.find({ userId: agent, linkedUserId: { $in: userIds } }).select("linkedUserId").lean()
      : Promise.resolve([]),
  ]);
  const userMap = new Map((users as any[]).map((u) => [String(u._id), u]));
  const contactMap = new Map((contacts as any[]).map((c) => [String(c.linkedUserId), String(c._id)]));

  return rows.map((r: any) => {
    const uid = r.userId ? String(r.userId) : null;
    const u = uid ? userMap.get(uid) : null;
    return {
      key: r._id,
      userId: uid,
      name: u?.name || null,
      email: u?.email || null,
      image: u?.image || null,
      contactId: uid ? contactMap.get(uid) || null : null,
      pageViews: r.pageViews,
      listingViews: r.listingViews,
      totalMs: r.totalMs,
      sessions: (r.sessions || []).filter(Boolean).length || 1,
      firstSeen: new Date(r.firstSeen).toISOString(),
      lastSeen: new Date(r.lastSeen).toISOString(),
    };
  });
}

export interface TimelineListing {
  slug: string;
  address: string | null;
  city: string | null;
  price: number | null;
  beds: number | null;
  baths: number | null;
  status: string | null;
  photo: string | null;
}

export interface TimelineEntry {
  host: string;
  path: string;
  title: string | null;
  startedAt: string;
  durationMs: number;
  listing: TimelineListing | null;
}

/** Parses "u:<id>" / "a:<anonId>" into a PageView filter, or null if malformed. */
export function visitorFilter(key: string): Record<string, unknown> | null {
  if (key.startsWith("u:") && mongoose.isValidObjectId(key.slice(2))) {
    return { userId: new mongoose.Types.ObjectId(key.slice(2)) };
  }
  if (key.startsWith("a:") && /^[A-Za-z0-9_-]{6,80}$/.test(key.slice(2))) {
    return { anonymousId: key.slice(2), userId: { $exists: false } };
  }
  return null;
}

export async function agentVisitorTimeline(
  agentId: string,
  key: string,
  days: number
): Promise<TimelineEntry[] | null> {
  const filter = visitorFilter(key);
  if (!filter) return null;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const views: any[] = await PageView.find({
    ...filter,
    agentId: new mongoose.Types.ObjectId(agentId),
    startedAt: { $gte: since },
  })
    .sort({ startedAt: -1 })
    .limit(300)
    .select("host path title startedAt durationMs")
    .lean();

  // One lookup for every listing page in the timeline.
  const slugs = [...new Set(views.map((v) => listingSlugFromPath(v.path)).filter(Boolean))] as string[];
  const listings: any[] = slugs.length
    ? await UnifiedListing.find({ $or: [{ slugAddress: { $in: slugs } }, { listingKey: { $in: slugs } }] })
        .select("slugAddress listingKey unparsedAddress city listPrice bedsTotal bathroomsTotalDecimal bathroomsTotalInteger standardStatus primaryPhotoUrl primaryPhoto")
        .lean()
    : [];
  const bySlug = new Map<string, any>();
  for (const l of listings) {
    // Prefer the Active row when a relisted address has several.
    for (const k of [l.slugAddress, l.listingKey].filter(Boolean)) {
      const prev = bySlug.get(k);
      if (!prev || (prev.standardStatus !== "Active" && l.standardStatus === "Active")) bySlug.set(k, l);
    }
  }

  return views.map((v) => {
    const slug = listingSlugFromPath(v.path);
    const l = slug ? bySlug.get(slug) : null;
    return {
      host: v.host,
      path: v.path,
      title: v.title || null,
      startedAt: new Date(v.startedAt).toISOString(),
      durationMs: v.durationMs || 0,
      listing: slug
        ? {
            slug,
            address: l?.unparsedAddress || null,
            city: l?.city || null,
            price: typeof l?.listPrice === "number" ? l.listPrice : null,
            beds: l?.bedsTotal ?? null,
            baths: l?.bathroomsTotalDecimal ?? l?.bathroomsTotalInteger ?? null,
            // Off-market rows drop out of unifiedlistings; the page title still names it.
            status: l?.standardStatus || (l ? null : "Off market"),
            // Synced rows carry Spark's primaryPhoto object; primaryPhotoUrl is rare.
            photo: l?.primaryPhoto?.uri300 || l?.primaryPhoto?.uri640 || l?.primaryPhotoUrl || null,
          }
        : null,
    };
  });
}
