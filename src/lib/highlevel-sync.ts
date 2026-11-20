// src/lib/highlevel-sync.ts
//
// THE CONTACT FEED: ChatRealty CRM → the agent's HighLevel sub-account.
//
// One cursor per agent walks their Mongo `Contact` book in (updatedAt, _id)
// order and upserts each contact into HighLevel, then adds its tags.
//   • Connecting HighLevel resets the cursor → full backfill of the book.
//   • After that the cursor just keeps moving: the 5-minute cron
//     (/api/cron/highlevel-sync) sends anything created or edited since.
// Work is time-boxed and resumable (like src/lib/mls-seed.ts): a run sends
// until its budget runs out, saves its place, and the next tick continues.
//
// Rules:
//   • One-way. Nothing is read back from HighLevel, and deletes don't propagate.
//   • Tags are ADDED (POST /contacts/:id/tags), never replaced, so tags the
//     agent adds inside HighLevel survive. Every contact also gets "chatrealty".
//   • isPersonal contacts (family/friends flagged by contact cleanup) are
//     skipped — a marketing CRM's workflows shouldn't text the agent's mom.
//   • doNotContact contacts sync with HighLevel's `dnd: true`.
//   • Recording the sync on a Contact uses timestamps:false, or bumping
//     updatedAt would re-queue every contact forever.

import mongoose from "mongoose";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import Contact from "@/models/Contact";
import { getAccessToken, hlFetch } from "@/lib/highlevel";

const BATCH = 50;
const PACE_MS = 250; // 2 requests per contact → ~8 req/s, under the 10/s burst limit

/** Reset the cursor so the next run copies the agent's whole book. */
export async function queueFullHighLevelSync(userId: string): Promise<void> {
  await dbConnect();
  const total = await Contact.countDocuments({ userId: new mongoose.Types.ObjectId(userId) });
  await User.updateOne(
    { _id: userId },
    {
      $set: {
        "highLevel.sync.status": "queued",
        "highLevel.sync.synced": 0,
        "highLevel.sync.skipped": 0,
        "highLevel.sync.failed": 0,
        "highLevel.sync.backfillTotal": total,
        "highLevel.sync.backfillStartedAt": new Date(),
      },
      $unset: {
        "highLevel.sync.cursorUpdatedAt": "",
        "highLevel.sync.cursorId": "",
        "highLevel.sync.backfillDoneAt": "",
        "highLevel.sync.leaseUntil": "",
        "highLevel.sync.lastError": "",
      },
    }
  );
}

function primaryEmail(c: any): string | undefined {
  const e = (c.emails || []).find((x: any) => x.isPrimary) || (c.emails || [])[0];
  return (e?.address || c.email || "").trim().toLowerCase() || undefined;
}

function primaryPhone(c: any): string | undefined {
  const p = (c.phones || []).find((x: any) => x.isPrimary) || (c.phones || [])[0];
  return (p?.number || c.phone || "").trim() || undefined;
}

function cursorFilter(userId: mongoose.Types.ObjectId, at?: Date | null, id?: string | null) {
  if (!id) return { userId };
  const oid = new mongoose.Types.ObjectId(id);
  // Old documents can lack updatedAt; Mongo sorts those first, so they are
  // walked by _id before any dated contact.
  if (!at) {
    return { userId, $or: [{ updatedAt: null, _id: { $gt: oid } }, { updatedAt: { $ne: null } }] };
  }
  return { userId, $or: [{ updatedAt: { $gt: at } }, { updatedAt: at, _id: { $gt: oid } }] };
}

/** Send one contact. Returns the HighLevel contact id. Throws on API failure. */
async function sendContact(token: string, locationId: string, c: any): Promise<string> {
  const a = c.address || {};
  const body: Record<string, any> = {
    locationId,
    firstName: c.firstName || undefined,
    lastName: c.lastName || undefined,
    email: primaryEmail(c),
    phone: primaryPhone(c),
    address1: a.street || undefined,
    city: a.city || undefined,
    state: a.state || undefined,
    postalCode: a.zip || undefined,
    country: a.country || undefined,
    companyName: c.organization || undefined,
    website: c.website || undefined,
    source: "ChatRealty",
    ...(c.doNotContact ? { dnd: true } : {}),
  };
  for (const k of Object.keys(body)) if (body[k] === undefined) delete body[k];

  const res = await hlFetch(token, "/contacts/upsert", { method: "POST", body: JSON.stringify(body) });
  const hlId: string | undefined = res?.contact?.id;
  if (!hlId) throw new Error("upsert returned no contact id");

  const tags = Array.from(
    new Set(["chatrealty", ...((c.tags || []) as string[]).map((t) => String(t).trim()).filter(Boolean)])
  );
  await hlFetch(token, `/contacts/${hlId}/tags`, { method: "POST", body: JSON.stringify({ tags }) });
  return hlId;
}

export interface SyncRunResult {
  userId: string;
  sent: number;
  skipped: number;
  failed: number;
  caughtUp: boolean;
  note?: string;
}

/** Advance one agent's feed until `budgetMs` runs out or the book is caught up. */
export async function runHighLevelSync(userId: string, budgetMs = 50_000): Promise<SyncRunResult> {
  const started = Date.now();
  const result: SyncRunResult = { userId, sent: 0, skipped: 0, failed: 0, caughtUp: false };
  await dbConnect();

  // Lease: only one run per agent at a time (cron tick vs "Sync now").
  const now = new Date();
  const leased: any = await User.findOneAndUpdate(
    {
      _id: userId,
      "highLevel.status": "connected",
      $or: [{ "highLevel.sync.leaseUntil": null }, { "highLevel.sync.leaseUntil": { $lt: now } }],
    },
    {
      $set: {
        "highLevel.sync.leaseUntil": new Date(Date.now() + budgetMs + 60_000),
        "highLevel.sync.status": "running",
      },
    },
    { new: true }
  )
    .select("highLevel.sync highLevel.locationId")
    .lean();
  if (!leased) return { ...result, note: "busy or not connected" };

  const sync = leased.highLevel?.sync || {};
  let cursorAt: Date | null = sync.cursorUpdatedAt || null;
  let cursorId: string | null = sync.cursorId || null;
  const ownerId = new mongoose.Types.ObjectId(userId);
  let lastError: string | undefined;
  // Counts not yet written to the User doc (result keeps the run's totals).
  let pending = { sent: 0, skipped: 0, failed: 0 };

  try {
    const auth = await getAccessToken(userId);
    if (!auth) throw new Error("no HighLevel access token");

    while (Date.now() - started < budgetMs) {
      const batch: any[] = await Contact.find(cursorFilter(ownerId, cursorAt, cursorId))
        .sort({ updatedAt: 1, _id: 1 })
        .limit(BATCH)
        .select(
          "firstName lastName email emails phone phones address organization website tags isPersonal doNotContact updatedAt"
        )
        .lean();
      if (batch.length === 0) {
        result.caughtUp = true;
        break;
      }

      for (const c of batch) {
        if (Date.now() - started >= budgetMs) break;
        if (c.isPersonal || (!primaryEmail(c) && !primaryPhone(c))) {
          result.skipped++;
          pending.skipped++;
        } else {
          try {
            const hlId = await sendContact(auth.token, auth.locationId, c);
            await Contact.updateOne(
              { _id: c._id },
              { $set: { highLevelContactId: hlId, highLevelSyncedAt: new Date() } },
              { timestamps: false }
            );
            result.sent++;
            pending.sent++;
          } catch (err: any) {
            result.failed++;
            pending.failed++;
            lastError = String(err?.message || err).slice(0, 300);
            console.error(`[highlevel-sync] contact ${c._id} failed:`, lastError);
            // A dead token fails every contact — stop instead of burning the batch.
            if (/ 401:/.test(lastError)) throw err;
          }
          await new Promise((r) => setTimeout(r, PACE_MS));
        }
        cursorAt = c.updatedAt || null;
        cursorId = String(c._id);
      }

      // Persist per batch so a killed function loses at most one batch.
      await saveProgress(userId, cursorAt, cursorId, pending, "running", lastError);
      pending = { sent: 0, skipped: 0, failed: 0 };
    }
  } catch (err: any) {
    lastError = String(err?.message || err).slice(0, 300);
    await saveProgress(userId, cursorAt, cursorId, pending, "error", lastError, { release: true });
    return { ...result, note: lastError };
  }

  await saveProgress(userId, cursorAt, cursorId, pending, result.caughtUp ? "idle" : "queued", lastError, {
    release: true,
    caughtUp: result.caughtUp,
  });
  return result;
}

async function saveProgress(
  userId: string,
  cursorAt: Date | null,
  cursorId: string | null,
  counts: { sent: number; skipped: number; failed: number },
  status: "running" | "queued" | "idle" | "error",
  lastError?: string,
  opts: { release?: boolean; caughtUp?: boolean } = {}
) {
  const $set: Record<string, any> = {
    "highLevel.sync.status": status,
    "highLevel.sync.lastRunAt": new Date(),
  };
  if (cursorId) {
    $set["highLevel.sync.cursorId"] = cursorId;
    $set["highLevel.sync.cursorUpdatedAt"] = cursorAt;
  }
  if (lastError) $set["highLevel.sync.lastError"] = lastError;
  const update: Record<string, any> = {
    $set,
    $inc: {
      "highLevel.sync.synced": counts.sent,
      "highLevel.sync.skipped": counts.skipped,
      "highLevel.sync.failed": counts.failed,
    },
  };
  if (opts.release) update.$unset = { "highLevel.sync.leaseUntil": "" };
  await User.updateOne({ _id: userId }, update);
  // Stamp backfillDoneAt only the FIRST time the feed catches up.
  if (opts.caughtUp) {
    await User.updateOne(
      { _id: userId, "highLevel.sync.backfillDoneAt": null },
      { $set: { "highLevel.sync.backfillDoneAt": new Date() } }
    );
  }
}

/** Cron entry: advance every connected agent's feed, sharing the time budget. */
export async function processHighLevelSyncs(totalBudgetMs = 240_000): Promise<SyncRunResult[]> {
  await dbConnect();
  const agents: any[] = await User.find({ "highLevel.status": "connected" }).select("_id").lean();
  const results: SyncRunResult[] = [];
  const started = Date.now();
  for (const a of agents) {
    const left = totalBudgetMs - (Date.now() - started);
    if (left < 5_000) break;
    const share = Math.max(5_000, Math.floor(left / Math.max(1, agents.length - results.length)));
    results.push(await runHighLevelSync(String(a._id), share));
  }
  return results;
}
