// src/lib/mls-seed.ts
//
// Seed an agent's tenant database from their stored MLS key — serverless,
// chunked, resumable — and keep it current with a nightly update.
//
// WHY CHUNKED: a seed is minutes of paging (GPS for-sale ≈ 6k listings; with
// two years of closed history ≈ 22k), longer than one serverless request may
// run. Each run pulls pages until a time budget, saves its place on
// User.mlsFeed.sync, and the next tick of /api/cron/mls-sync picks up.
//
// WHY THIS IS SAFE TO RESUME: the feed is walked oldest-change-first
// (`$orderby=ModificationTimestamp asc`) and every write is an upsert keyed on
// listing_key, so re-reading a few records is harmless. Resume prefers the
// feed's own nextLink; if that is gone or stale, it restarts from the highest
// ModificationTimestamp written, minus 1 ms — records sharing that timestamp
// are re-read, never skipped.
//
// WHY UPDATES PULL EVERY STATUS: @chatrealty/sync applies its status filter to
// incremental pulls too and never deletes, so a listing that expires simply
// stops arriving and sits in the tenant DB as "Active" forever — on a live
// site, a compliance problem. The nightly update pulls every change in the
// agent's associations/types, upserts what is still in scope, and DELETES by
// key what left it (expired, withdrawn, closed outside the lookback).
//
// Reuses the sync package's RESO client (429/Retry-After handling, photo
// expansion fallback), mapper and writer so the platform and the CLI write
// identical rows. Imported from its compiled dist/, NOT src/: the package's
// ESM source imports siblings as "./map.js", which TypeScript maps to map.ts
// but Turbopack does not ("Module not found: Can't resolve './map.js'").
// Rebuild dist (`npm run build` in packages/chatrealty-sync) when src changes.

import mongoose from "mongoose";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import TenantModel from "@/models/control/Tenant";
import { getTenantSql } from "@/lib/tenant/resolve-connection";
import { getAgentTier } from "@/lib/subscription-helpers";
import { DATA_TIERS, UPGRADE_URL } from "@/lib/data-tiers";
import type { SubscriptionTier } from "@/models/AgentSubscription";
import { feedCounter, getMlsFeedCredentials, type MlsFeedCredentials } from "@/lib/mls-feed";
import { DEFAULT_BYTES_PER_LISTING } from "@/lib/mls-feed-constants";
import {
  CLOSED_LOOKBACKS,

  PROPERTY_TYPE_OPTIONS,
  baseClause,
  closedSince,
  recordInScope,
  scopeFilter,
  statusClause,
  type ClosedLookback,
  type MlsScope,
} from "@/lib/mls-scope";
import { ResoClient, MEDIA_EXPAND, RateLimitedError } from "../../packages/chatrealty-sync/dist/reso-fetch.js";
import { mapResoProperty } from "../../packages/chatrealty-sync/dist/map.js";
import { upsertProperties } from "../../packages/chatrealty-sync/dist/write.js";

const PAGE_SIZE = 200;
/** Re-pull this much before the last finished watermark on each nightly update (matches the CLI). */
const UPDATE_OVERLAP_MS = 26 * 60 * 60 * 1000;
/** A saved nextLink older than this is treated as expired. */
const CURSOR_TTL_MS = 20 * 60 * 1000;
const TIER_ORDER: SubscriptionTier[] = ["free", "beginner", "experienced", "topagent"];
const TIER_NAME: Record<SubscriptionTier, string> = { free: "Free", beginner: "Basic", experienced: "Experienced", topagent: "Top Agent" };
const MEASURE_FLOOR_ROWS = 500;

const oid = (id: string) => new mongoose.Types.ObjectId(id);

// ---------------------------------------------------------------------------
// Estimate — "will this fit, and which tier would it need?"
// ---------------------------------------------------------------------------

export type ScopeEstimate = {
  ok: true;
  /** The selection these numbers describe — lets the card tell a stale estimate from a current one. */
  scope: MlsScope;
  /** For-sale counts per property type, within the chosen associations. */
  byType: Record<string, number | null>;
  /** Closed counts per lookback, within the chosen associations AND types. */
  closedByLookback: Record<ClosedLookback, number | null>;
  selectedCount: number | null;
  bytesPerListing: number;
  bytesMeasured: boolean;
  projectedBytes: number | null;
  tier: SubscriptionTier;
  tierLabel: string;
  limitBytes: number;
  pct: number | null;
  verdict: "fits" | "tight" | "exceeds" | "unknown";
  /** Smallest tier whose allowance holds the projection, or null if none does. */
  requiredTier: { tier: SubscriptionTier; label: string; limitBytes: number } | null;
  upgradeUrl: string;
  computedAt: string;
};

async function inBatches<T, R>(items: T[], size: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  // Spark throttles bursts (the platform's own pipeline holds ~2 req/s), so
  // counts go out a few at a time, not all at once.
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(...(await Promise.all(items.slice(i, i + size).map(fn))));
  }
  return out;
}

async function tenantFor(userId: string) {
  return TenantModel.findOne({ ownerUserId: userId }).select("tenantId status").lean();
}

/** Measured bytes/listing from the tenant DB once it has enough rows; else the default. */
async function bytesPerListing(userId: string): Promise<{ bpl: number; measured: boolean }> {
  try {
    const t: any = await tenantFor(userId);
    if (!t || t.status !== "active") return { bpl: DEFAULT_BYTES_PER_LISTING, measured: false };
    const { sql } = await getTenantSql(t.tenantId);
    const rows: any[] = (await sql`SELECT pg_database_size(current_database())::bigint AS bytes, (SELECT count(*) FROM property)::int AS rows`) as any[];
    const bytes = Number(rows[0]?.bytes ?? 0);
    const n = Number(rows[0]?.rows ?? 0);
    if (n >= MEASURE_FLOOR_ROWS && bytes > 0) return { bpl: bytes / n, measured: true };
  } catch {
    /* an unreachable DB just means we use the typical figure */
  }
  return { bpl: DEFAULT_BYTES_PER_LISTING, measured: false };
}

export async function estimateScope(
  userId: string,
  scope: MlsScope
): Promise<ScopeEstimate | { ok: false; message: string }> {
  await dbConnect();
  const creds = await getMlsFeedCredentials(userId);
  if (!creds) return { ok: false, message: "Save an MLS key first." };
  const counter = await feedCounter(creds);
  if ("reason" in counter) return { ok: false, message: counter.message };

  const forSale = statusClause("none");
  const nets = baseClause({ networks: scope.networks, propertyTypes: [] });
  const types = PROPERTY_TYPE_OPTIONS.map((o) => o.value);
  const typeCounts = await inBatches(types, 3, (t) =>
    counter.count([nets, `PropertyType eq '${t.replace(/'/g, "''")}'`, forSale].filter(Boolean).join(" and "))
  );
  const byType: Record<string, number | null> = {};
  types.forEach((t, i) => (byType[t] = typeCounts[i]));

  const selBase = baseClause(scope);
  const lookbacks = CLOSED_LOOKBACKS.filter((l) => l !== "none");
  const closedCounts = await inBatches(lookbacks, 2, (l) => {
    const since = closedSince(l);
    const closed = since ? `StandardStatus eq 'Closed' and CloseDate ge ${since}` : `StandardStatus eq 'Closed'`;
    return counter.count([selBase, closed].filter(Boolean).join(" and "));
  });
  const closedByLookback = { none: 0 } as Record<ClosedLookback, number | null>;
  lookbacks.forEach((l, i) => (closedByLookback[l] = closedCounts[i]));

  const forSaleSelected = scope.propertyTypes.reduce<number | null>(
    (sum, t) => (sum == null || byType[t] == null ? null : sum + (byType[t] as number)),
    0
  );
  const closedSelected = closedByLookback[scope.closedLookback];
  const selectedCount = forSaleSelected == null || closedSelected == null ? null : forSaleSelected + closedSelected;

  // Without the selection's own total there is no honest verdict — say so
  // instead of showing a meter built on a guess.
  if (selectedCount == null) {
    return { ok: false, message: "Your MLS didn't answer every count just now. Try again in a moment." };
  }

  const { bpl, measured } = await bytesPerListing(userId);
  const tier = await getAgentTier(userId);
  const { storageLimitBytes: limitBytes, label: tierLabel } = DATA_TIERS[tier] ?? DATA_TIERS.free;
  const projectedBytes = selectedCount == null ? null : Math.round(selectedCount * bpl);
  const pct = projectedBytes == null ? null : Math.round((projectedBytes / limitBytes) * 100);
  const verdict = pct == null ? "unknown" : pct >= 100 ? "exceeds" : pct >= 70 ? "tight" : "fits";
  const fit = projectedBytes == null ? null : TIER_ORDER.find((t) => projectedBytes < DATA_TIERS[t].storageLimitBytes);
  const requiredTier = fit ? { tier: fit, label: DATA_TIERS[fit].label, limitBytes: DATA_TIERS[fit].storageLimitBytes } : null;

  const result: ScopeEstimate = {
    ok: true,
    scope,
    byType,
    closedByLookback,
    selectedCount,
    bytesPerListing: Math.round(bpl),
    bytesMeasured: measured,
    projectedBytes,
    tier,
    tierLabel,
    limitBytes,
    pct,
    verdict,
    requiredTier,
    upgradeUrl: `${UPGRADE_URL}?section=billing`,
    computedAt: new Date().toISOString(),
  };
  await User.updateOne({ _id: oid(userId) }, { $set: { "mlsFeed.estimate": result } });
  return result;
}

export async function saveScope(userId: string, scope: MlsScope): Promise<void> {
  await dbConnect();
  await User.updateOne(
    { _id: oid(userId) },
    { $set: { "mlsFeed.propertyTypes": scope.propertyTypes, "mlsFeed.closedLookback": scope.closedLookback } }
  );
}

/** The scope currently saved on the record (networks from the picker + types/lookback). */
export async function savedScope(userId: string): Promise<MlsScope> {
  await dbConnect();
  const u: any = await User.findById(userId).select("mlsFeed.networks mlsFeed.propertyTypes mlsFeed.closedLookback").lean();
  const f = u?.mlsFeed ?? {};
  return {
    networks: Array.isArray(f.networks) ? f.networks : [],
    propertyTypes: Array.isArray(f.propertyTypes) && f.propertyTypes.length ? f.propertyTypes : ["Residential"],
    closedLookback: (CLOSED_LOOKBACKS as readonly string[]).includes(f.closedLookback) ? f.closedLookback : "none",
  };
}

// ---------------------------------------------------------------------------
// Start a seed
// ---------------------------------------------------------------------------

export type StartSeedResult =
  | { ok: true; expectedRows: number | null }
  | { ok: false; reason: "no_key" | "no_scope" | "no_database" | "too_big" | "busy" | "feed"; message: string; estimate?: ScopeEstimate };

export async function startSeed(userId: string): Promise<StartSeedResult> {
  await dbConnect();
  const u: any = await User.findById(userId).select("mlsFeed.status mlsFeed.networks mlsFeed.sync.status").lean();
  if (u?.mlsFeed?.status !== "connected") return { ok: false, reason: "no_key", message: "Connect a working MLS key first." };
  if (!Array.isArray(u.mlsFeed.networks) || u.mlsFeed.networks.length === 0) {
    return { ok: false, reason: "no_scope", message: "Pick at least one association first." };
  }
  if (["queued", "running"].includes(u.mlsFeed.sync?.status)) {
    return { ok: false, reason: "busy", message: "A seed is already running." };
  }
  const tenant: any = await tenantFor(userId);
  if (!tenant || tenant.status !== "active") {
    return { ok: false, reason: "no_database", message: "Your ChatRealty database isn't set up yet." };
  }

  // The server re-checks the size — the button being disabled in the card is
  // not the enforcement. A seed that hits the storage wall mid-run leaves a
  // database that can neither finish nor start over (data-tiers.md).
  const scope = await savedScope(userId);
  const est = await estimateScope(userId, scope);
  if ("message" in est) return { ok: false, reason: "feed", message: est.message };
  if (est.verdict === "exceeds") {
    return {
      ok: false,
      reason: "too_big",
      message: est.requiredTier
        ? `This selection needs about ${Math.round((est.projectedBytes ?? 0) / 1024 ** 2)} MB — more than your plan allows. It fits the ${TIER_NAME[est.requiredTier.tier]} plan (${est.requiredTier.label}).`
        : "This selection is larger than any plan allows. Narrow the associations, types or closed history.",
      estimate: est,
    };
  }

  const now = new Date();
  await User.updateOne(
    { _id: oid(userId) },
    {
      $set: {
        "mlsFeed.sync": {
          status: "queued",
          mode: "seed",
          scope,
          watermark: null,
          completedWatermark: null,
          cursor: null,
          rowsUpserted: 0,
          rowsRemoved: 0,
          expectedRows: est.selectedCount,
          requestedAt: now,
          lastError: null,
          leaseUntil: null,
        },
      },
    }
  );
  return { ok: true, expectedRows: est.selectedCount };
}

// ---------------------------------------------------------------------------
// The chunk runner
// ---------------------------------------------------------------------------

function resoClientFor(creds: MlsFeedCredentials): ResoClient {
  return new ResoClient({
    baseUrl: creds.baseUrl,
    bearerToken: creds.authMode === "bearer" ? creds.bearerToken : undefined,
    tokenUrl: creds.authMode === "oauth" ? creds.tokenUrl : "",
    clientId: creds.authMode === "oauth" ? creds.clientId : "",
    clientSecret: creds.authMode === "oauth" ? creds.clientSecret : "",
    scope: creds.authMode === "oauth" ? creds.scope : undefined,
    resource: "Property",
    pageSize: PAGE_SIZE,
    expandMedia: true,
  });
}

function firstPageUrl(baseUrl: string, mode: "seed" | "update", scope: MlsScope, watermark: string | null): string {
  // Seed: only what the scope keeps. Update: every status, so departures can be
  // seen and removed (see header).
  const clauses: string[] = [];
  const scoped = mode === "seed" ? scopeFilter(scope) : baseClause(scope);
  if (scoped) clauses.push(scoped);
  if (watermark) {
    const resumeFrom = new Date(new Date(watermark).getTime() - 1).toISOString();
    clauses.push(`ModificationTimestamp gt ${resumeFrom}`);
  }
  const params = new URLSearchParams();
  params.set("$orderby", "ModificationTimestamp asc");
  params.set("$top", String(PAGE_SIZE));
  params.set("$expand", MEDIA_EXPAND);
  if (clauses.length) params.set("$filter", clauses.join(" and "));
  return `${baseUrl.replace(/\/+$/, "")}/Property?${params.toString()}`;
}

const maxTs = (a: string | null, b: unknown): string | null => {
  if (typeof b !== "string" || !b) return a;
  return !a || b > a ? b : a;
};

export type ChunkResult = { ran: boolean; done?: boolean; upserted?: number; removed?: number; error?: string };

/**
 * Run one chunk for one agent, up to `budgetMs`. Takes a lease so a cron tick
 * and the Start button's kick-off can't write the same tenant at once.
 */
export async function runSyncChunk(userId: string, budgetMs = 240_000): Promise<ChunkResult> {
  await dbConnect();
  const started = Date.now();
  const now = new Date();
  const leased: any = await User.findOneAndUpdate(
    {
      _id: oid(userId),
      "mlsFeed.sync.status": { $in: ["queued", "running"] },
      $or: [{ "mlsFeed.sync.leaseUntil": null }, { "mlsFeed.sync.leaseUntil": { $lt: now } }],
    },
    {
      $set: {
        "mlsFeed.sync.status": "running",
        "mlsFeed.sync.leaseUntil": new Date(Date.now() + budgetMs + 60_000),
        "mlsFeed.sync.lastRunAt": now,
      },
    },
    { new: true }
  )
    .select("mlsFeed.sync")
    .lean();
  if (!leased) return { ran: false };

  const sync = leased.mlsFeed.sync;
  if (!sync.startedAt) await User.updateOne({ _id: oid(userId) }, { $set: { "mlsFeed.sync.startedAt": now } });
  const mode: "seed" | "update" = sync.mode === "update" ? "update" : "seed";
  const scope: MlsScope = sync.scope;

  let watermark: string | null = sync.watermark ?? null;
  let upserted = 0;
  let removed = 0;
  try {
    const creds = await getMlsFeedCredentials(userId);
    if (!creds) throw new Error("No MLS key is saved.");
    const tenant: any = await tenantFor(userId);
    if (!tenant || tenant.status !== "active") throw new Error("Your ChatRealty database isn't available.");
    const { getPool } = await getTenantSql(tenant.tenantId);
    const pool = getPool();
    const client = resoClientFor(creds);

    const cursorFresh = sync.cursor && sync.cursorAt && Date.now() - new Date(sync.cursorAt).getTime() < CURSOR_TTL_MS;
    let url: string | null = cursorFresh ? sync.cursor : firstPageUrl(creds.baseUrl, mode, scope, watermark);
    let done = false;

    while (url) {
      const { records, nextLink } = await client.fetchPage(url);
      const rows: any[] = [];
      const gone: string[] = [];
      for (const rec of records as Record<string, unknown>[]) {
        watermark = maxTs(watermark, rec.ModificationTimestamp);
        if (mode === "update" && !recordInScope(rec, scope)) {
          if (typeof rec.ListingKey === "string" && rec.ListingKey) gone.push(rec.ListingKey);
          continue;
        }
        const row = mapResoProperty(rec);
        if (row) rows.push(row);
      }
      if (rows.length) upserted += (await upsertProperties(pool as any, rows)).upserted;
      // Count what was actually deleted, not what was seen leaving: most
      // departures in a nightly window were never in this database (they left
      // the for-sale set before the seed), and "22 removed" for 0 deletions
      // was the first test run's wrong answer.
      let pageRemoved = 0;
      if (gone.length) {
        const r = await pool.query("DELETE FROM property WHERE listing_key = ANY($1::text[])", [gone]);
        pageRemoved = r.rowCount ?? 0;
        removed += pageRemoved;
      }
      url = records.length > 0 ? nextLink : null;
      // Save our place after every page: a run killed mid-chunk loses one page, not the run.
      await User.updateOne(
        { _id: oid(userId) },
        {
          $set: {
            "mlsFeed.sync.watermark": watermark,
            "mlsFeed.sync.cursor": url,
            "mlsFeed.sync.cursorAt": new Date(),
            "mlsFeed.sync.leaseUntil": new Date(Date.now() + budgetMs + 60_000),
          },
          $inc: { "mlsFeed.sync.rowsUpserted": rows.length, "mlsFeed.sync.rowsRemoved": pageRemoved },
        }
      );
      if (!url) {
        done = true;
        break;
      }
      if (Date.now() - started > budgetMs) break;
    }

    if (done) {
      const finished = new Date();
      await User.updateOne(
        { _id: oid(userId) },
        {
          $set: {
            "mlsFeed.sync.status": "done",
            "mlsFeed.sync.finishedAt": finished,
            "mlsFeed.sync.completedWatermark": watermark,
            "mlsFeed.sync.cursor": null,
            "mlsFeed.sync.leaseUntil": null,
            "mlsFeed.sync.lastError": null,
          },
        }
      );
      try {
        const { sql } = await getTenantSql(tenant.tenantId);
        const c: any[] = (await sql`SELECT count(*)::int AS n FROM property`) as any[];
        const dbRows = Number(c[0]?.n ?? 0);
        await TenantModel.updateOne(
          { tenantId: tenant.tenantId },
          { $set: { "metering.rowCount": dbRows, "metering.lastSyncAt": finished } }
        );
        // The writer's tally counts writes (a listing modified mid-walk is read
        // twice); the card should report what the database actually holds.
        await User.updateOne({ _id: oid(userId) }, { $set: { "mlsFeed.sync.dbRows": dbRows } });
      } catch {
        /* metering is a nicety; never fail a finished seed over it */
      }
    } else {
      await User.updateOne({ _id: oid(userId) }, { $set: { "mlsFeed.sync.leaseUntil": null } });
    }
    return { ran: true, done, upserted, removed };
  } catch (err: any) {
    // A throttled feed is not a failed seed: keep it running and let the next
    // tick resume (quotas are per key; the wait is the feed's, not ours).
    const throttled = err instanceof RateLimitedError || /\b429\b/.test(String(err?.message));
    await User.updateOne(
      { _id: oid(userId) },
      {
        $set: {
          "mlsFeed.sync.status": throttled ? "running" : "error",
          "mlsFeed.sync.lastError": throttled ? "Your MLS is rate-limiting this key — resuming shortly." : String(err?.message || err).slice(0, 300),
          "mlsFeed.sync.leaseUntil": null,
        },
      }
    );
    return { ran: true, error: String(err?.message || err) };
  }
}

// ---------------------------------------------------------------------------
// The cron's two jobs: queue tonight's updates, then advance whatever is due
// ---------------------------------------------------------------------------

function pacificParts(d = new Date()): { date: string; hour: number } {
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  });
  const p = Object.fromEntries(f.formatToParts(d).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour) % 24 };
}

/** Fixed nightly window for every agent (product decision 2026-10-16). */
export const NIGHTLY_HOUR_PACIFIC = 3;

/**
 * Queue the nightly update for every agent whose last run finished, once per
 * Pacific day, during the 3 AM hour. Idempotent across the hour's ticks.
 */
export async function enqueueNightlyUpdates(now = new Date()): Promise<number> {
  const { date, hour } = pacificParts(now);
  if (hour !== NIGHTLY_HOUR_PACIFIC) return 0;
  await dbConnect();
  const due: any[] = await User.find({
    "mlsFeed.status": "connected",
    "mlsFeed.sync.status": "done",
    "mlsFeed.sync.lastNightlyFor": { $ne: date },
  })
    .select("_id mlsFeed.sync.completedWatermark mlsFeed.networks mlsFeed.propertyTypes mlsFeed.closedLookback")
    .lean();
  for (const u of due) {
    const scope = await savedScope(String(u._id));
    const since = u.mlsFeed?.sync?.completedWatermark
      ? new Date(new Date(u.mlsFeed.sync.completedWatermark).getTime() - UPDATE_OVERLAP_MS).toISOString()
      : null;
    await User.updateOne(
      { _id: u._id, "mlsFeed.sync.status": "done" },
      {
        $set: {
          "mlsFeed.sync.status": "queued",
          "mlsFeed.sync.mode": "update",
          "mlsFeed.sync.scope": scope,
          "mlsFeed.sync.watermark": since,
          "mlsFeed.sync.cursor": null,
          "mlsFeed.sync.rowsUpserted": 0,
          "mlsFeed.sync.rowsRemoved": 0,
          "mlsFeed.sync.expectedRows": null,
          "mlsFeed.sync.requestedAt": now,
          "mlsFeed.sync.startedAt": null,
          "mlsFeed.sync.lastNightlyFor": date,
        },
      }
    );
  }
  return due.length;
}

/** Advance due runs, one agent at a time, until the shared budget is spent. */
export async function processDueSyncs(budgetMs = 240_000): Promise<Array<{ userId: string } & ChunkResult>> {
  await dbConnect();
  const started = Date.now();
  const now = new Date();
  const due: any[] = await User.find({
    "mlsFeed.sync.status": { $in: ["queued", "running"] },
    $or: [{ "mlsFeed.sync.leaseUntil": null }, { "mlsFeed.sync.leaseUntil": { $lt: now } }],
  })
    .select("_id")
    .sort({ "mlsFeed.sync.requestedAt": 1 })
    .limit(20)
    .lean();
  const out: Array<{ userId: string } & ChunkResult> = [];
  for (const u of due) {
    const left = budgetMs - (Date.now() - started);
    if (left < 30_000) break;
    out.push({ userId: String(u._id), ...(await runSyncChunk(String(u._id), left - 10_000)) });
  }
  return out;
}

