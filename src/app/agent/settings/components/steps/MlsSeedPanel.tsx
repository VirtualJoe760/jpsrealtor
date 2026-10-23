"use client";

// src/app/agent/settings/components/steps/MlsSeedPanel.tsx
//
// Step 2 and 3 of the MLS Data Feed card, shown once associations are picked:
//   2. What goes in the database — property types and closed history, with a
//      live size meter against the agent's storage allowance. Over the limit,
//      seeding is blocked and the panel names the plan that would fit (the
//      server enforces the same check; this is only the explanation).
//   3. The database itself — Start seeding, live progress, and the fixed
//      nightly update.
//
// Counts come from POST /api/integrations/mls-feed/estimate (exact $counts
// against the agent's own MLS). Seeding runs server-side in chunks
// (src/lib/mls-seed.ts), so the agent can leave the page while it works.

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Check, AlertCircle, HardDrive, Play, RefreshCw } from "lucide-react";
import { toast } from "react-toastify";
import {
  CLOSED_LOOKBACKS,
  CLOSED_LOOKBACK_LABELS,
  PROPERTY_TYPE_OPTIONS,
  type ClosedLookback,
} from "@/lib/mls-scope";
import { NIGHTLY_SYNC_LABEL } from "@/lib/mls-feed-constants";

type Estimate = {
  ok: true;
  scope: { networks: string[]; propertyTypes: string[]; closedLookback: ClosedLookback };
  byType: Record<string, number | null>;
  closedByLookback: Record<ClosedLookback, number | null>;
  selectedCount: number | null;
  bytesPerListing: number;
  bytesMeasured: boolean;
  projectedBytes: number | null;
  tier: string;
  tierLabel: string;
  limitBytes: number;
  pct: number | null;
  verdict: "fits" | "tight" | "exceeds" | "unknown";
  requiredTier: { tier: string; label: string; limitBytes: number } | null;
  upgradeUrl: string;
};

type Sync = {
  status: "idle" | "queued" | "running" | "done" | "error";
  mode: "seed" | "update" | null;
  rowsUpserted: number;
  rowsRemoved: number;
  expectedRows: number | null;
  dbRows?: number | null;
  startedAt: string | null;
  finishedAt: string | null;
  lastRunAt: string | null;
  lastError: string | null;
};

export type SeedFeedSlice = {
  networks: string[];
  propertyTypes: string[];
  closedLookback: ClosedLookback;
  estimate: Estimate | null;
  sync: Sync;
};

const mb = (b: number | null | undefined) =>
  b == null ? "—" : b >= 1024 ** 3 ? `${(b / 1024 ** 3).toFixed(1)} GB` : `${Math.max(1, Math.round(b / 1024 ** 2))} MB`;
const n = (x: number | null | undefined) => (x == null ? "—" : x.toLocaleString());
const TIER_NAMES: Record<string, string> = { free: "Free", beginner: "Beginner", experienced: "Experienced", topagent: "Top Agent" };
const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));

export default function MlsSeedPanel({
  isLight,
  feed,
  onFeed,
}: {
  isLight: boolean;
  feed: SeedFeedSlice;
  onFeed: (next: Partial<SeedFeedSlice>) => void;
}) {
  const textPrimary = isLight ? "text-gray-900" : "text-white";
  const textMuted = isLight ? "text-gray-500" : "text-gray-400";
  const box = `mt-4 p-4 rounded-lg border ${isLight ? "border-gray-200" : "border-gray-800"}`;

  const [types, setTypes] = useState<string[]>(feed.propertyTypes);
  const [lookback, setLookback] = useState<ClosedLookback>(feed.closedLookback);
  const [estimate, setEstimate] = useState<Estimate | null>(feed.estimate);
  const [estimating, setEstimating] = useState(false);
  const [estimateError, setEstimateError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const reqId = useRef(0);

  const estimateCurrent =
    !!estimate &&
    sameSet(estimate.scope?.networks ?? [], feed.networks) &&
    sameSet(estimate.scope?.propertyTypes ?? [], types) &&
    estimate.scope?.closedLookback === lookback;

  // Ask the MLS for exact counts, debounced: toggling three boxes should cost
  // one round of counts, not three. Saves the selection first so the seed —
  // which reads the SAVED scope — can never start from a stale one.
  const runEstimate = useCallback(async (t: string[], l: ClosedLookback) => {
    if (t.length === 0) return;
    const id = ++reqId.current;
    setEstimating(true);
    setEstimateError(null);
    try {
      await fetch("/api/integrations/mls-feed/scope", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyTypes: t, closedLookback: l }),
      });
      const res = await fetch("/api/integrations/mls-feed/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyTypes: t, closedLookback: l }),
      });
      const data = await res.json();
      if (id !== reqId.current) return; // a newer selection superseded this one
      if (data.ok) {
        setEstimate(data);
        onFeed({ estimate: data, propertyTypes: t, closedLookback: l });
      } else setEstimateError(data.message || "Couldn't check the size.");
    } catch {
      if (id === reqId.current) setEstimateError("Network error — couldn't check the size.");
    } finally {
      if (id === reqId.current) setEstimating(false);
    }
  }, [onFeed]);

  useEffect(() => {
    if (estimateCurrent || types.length === 0) return;
    const h = setTimeout(() => runEstimate(types, lookback), 900);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [types.join("|"), lookback, feed.networks.join("|")]);

  // Live progress while a seed or update runs.
  const running = feed.sync.status === "queued" || feed.sync.status === "running";
  useEffect(() => {
    if (!running) return;
    const h = setInterval(async () => {
      try {
        const res = await fetch("/api/integrations/mls-feed", { cache: "no-store" });
        if (res.ok) {
          const s = await res.json();
          onFeed({ sync: s.sync });
          if (s.sync?.status === "done") toast.success("Your database is seeded");
        }
      } catch {
        /* keep polling */
      }
    }, 4000);
    return () => clearInterval(h);
  }, [running, onFeed]);

  const startSeed = async () => {
    setStarting(true);
    try {
      const res = await fetch("/api/integrations/mls-feed/seed", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        onFeed({
          sync: { ...feed.sync, status: "queued", mode: "seed", rowsUpserted: 0, rowsRemoved: 0, expectedRows: data.expectedRows, lastError: null, finishedAt: null },
        });
        toast.success("Seeding started — you can leave this page");
      } else {
        toast.error(data.message || "Couldn't start seeding");
        if (data.estimate) setEstimate(data.estimate);
      }
    } catch {
      toast.error("Network error");
    } finally {
      setStarting(false);
    }
  };

  const toggleType = (v: string) =>
    setTypes((cur) => (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]));

  const est = estimateCurrent ? estimate : null;
  const bpl = est?.bytesPerListing ?? 20 * 1024;
  const over = est?.verdict === "exceeds";
  const canSeed = !!est && !over && !running && !estimating && types.length > 0;
  const pct = Math.min(100, est?.pct ?? 0);
  const barColor = !est ? "bg-gray-400" : over ? "bg-red-500" : est.verdict === "tight" ? "bg-amber-500" : "bg-emerald-500";
  const sync = feed.sync;

  return (
    <>
      {/* ---------------- 2. What goes in the database ---------------- */}
      <div className={box}>
        <div className={`text-sm font-semibold ${textPrimary}`}>What should your site include?</div>
        <p className={`text-xs mt-0.5 ${textMuted}`}>
          Pick the property types to show. Counts are listings for sale right now in your chosen associations.
        </p>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {PROPERTY_TYPE_OPTIONS.map((o) => {
            const on = types.includes(o.value);
            const count = estimate?.byType?.[o.value];
            return (
              <label
                key={o.value}
                className={`flex items-center justify-between gap-3 p-2.5 rounded-lg border cursor-pointer transition ${
                  on
                    ? isLight ? "border-sky-500 bg-sky-50" : "border-sky-500 bg-sky-950/20"
                    : isLight ? "border-gray-200 hover:border-gray-300" : "border-gray-700 hover:border-gray-600"
                }`}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <input type="checkbox" checked={on} onChange={() => toggleType(o.value)} />
                  <span className={`text-sm ${textPrimary}`}>{o.label}</span>
                </span>
                <span className={`text-xs whitespace-nowrap ${textMuted}`}>{count == null ? "—" : n(count)}</span>
              </label>
            );
          })}
        </div>
        {types.length === 0 && (
          <p className={`text-xs mt-2 ${isLight ? "text-red-700" : "text-red-400"}`}>Pick at least one property type.</p>
        )}

        <div className={`text-sm font-semibold mt-5 ${textPrimary}`}>Closed listings (sold history)?</div>
        <p className={`text-xs mt-0.5 ${textMuted}`}>
          Sold homes power comps and market history. They are most of a feed&apos;s size, so pick only as far back as you need.
        </p>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-5 gap-1.5">
          {CLOSED_LOOKBACKS.map((l) => {
            const on = lookback === l;
            const c = l === "none" ? 0 : estimate?.closedByLookback?.[l];
            const fresh = estimate && sameSet(estimate.scope?.propertyTypes ?? [], types);
            return (
              <button
                key={l}
                type="button"
                onClick={() => setLookback(l)}
                className={`text-left p-2.5 rounded-lg border transition ${
                  on
                    ? isLight ? "border-sky-500 ring-1 ring-sky-500 bg-sky-50" : "border-sky-500 ring-1 ring-sky-500 bg-sky-950/20"
                    : isLight ? "border-gray-200 hover:border-gray-300" : "border-gray-700 hover:border-gray-600"
                }`}
              >
                <div className={`text-xs font-semibold ${textPrimary}`}>{CLOSED_LOOKBACK_LABELS[l]}</div>
                <div className={`text-[11px] mt-0.5 ${textMuted}`}>
                  {l === "none" ? "For-sale only" : fresh && c != null ? `+${n(c)} · ${mb(c * bpl)}` : "—"}
                </div>
              </button>
            );
          })}
        </div>

        {/* Size meter */}
        <div className={`mt-5 p-3 rounded-lg ${isLight ? "bg-gray-50" : "bg-gray-800/50"}`}>
          <div className="flex items-center justify-between gap-3">
            <div className={`flex items-center gap-2 text-sm font-semibold ${textPrimary}`}>
              <HardDrive className="w-4 h-4" />
              {est ? `${n(est.selectedCount)} listings ≈ ${mb(est.projectedBytes)}` : "Checking the size…"}
            </div>
            <div className={`text-xs ${textMuted} flex items-center gap-1.5`}>
              {estimating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {est && `of ${mb(est.limitBytes)} · ${TIER_NAMES[est.tier] ?? est.tier} plan`}
            </div>
          </div>
          <div className={`mt-2 h-2 rounded-full overflow-hidden ${isLight ? "bg-gray-200" : "bg-gray-700"}`}>
            <div className={`h-full ${barColor} transition-all`} style={{ width: `${est ? Math.max(2, pct) : 0}%` }} />
          </div>
          {est && (
            <p className={`text-xs mt-2 ${over ? (isLight ? "text-red-700" : "text-red-400") : est.verdict === "tight" ? (isLight ? "text-amber-700" : "text-amber-400") : textMuted}`}>
              {over ? (
                <>
                  That&apos;s more than your {TIER_NAMES[est.tier] ?? est.tier} plan holds.{" "}
                  {est.requiredTier
                    ? <>It fits the <strong>{TIER_NAMES[est.requiredTier.tier] ?? est.requiredTier.tier}</strong> plan ({est.requiredTier.label}). </>
                    : <>No plan holds this much — narrow your selection. </>}
                  <a href={est.upgradeUrl} className="underline">See plans</a> or pick less closed history.
                </>
              ) : est.verdict === "tight" ? (
                <>Fits, but uses {est.pct}% of your space — little room for growth.</>
              ) : (
                <>Fits comfortably — {est.pct}% of your space{est.bytesMeasured ? " (measured from your database)" : ""}.</>
              )}
            </p>
          )}
          {estimateError && (
            <p className={`text-xs mt-2 flex items-center gap-1.5 ${isLight ? "text-red-700" : "text-red-400"}`}>
              <AlertCircle className="w-3.5 h-3.5" /> {estimateError}
            </p>
          )}
        </div>
      </div>

      {/* ---------------- 3. The database ---------------- */}
      <div className={box}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className={`text-sm font-semibold ${textPrimary}`}>Your listings database</div>
            <p className={`text-xs mt-0.5 ${textMuted}`}>
              Seeding copies your selection into your own ChatRealty database. After that it updates {NIGHTLY_SYNC_LABEL} —
              new listings, price and status changes, and removing listings that leave your selection.
            </p>
          </div>
        </div>

        {sync.status === "idle" && (
          <p className={`text-sm mt-3 ${textMuted}`}>Not seeded yet.</p>
        )}

        {running && (
          <div className="mt-3">
            <div className={`flex items-center gap-2 text-sm ${textPrimary}`}>
              <Loader2 className="w-4 h-4 animate-spin" />
              {sync.mode === "update" ? "Updating" : "Seeding"} — {n(sync.rowsUpserted)}
              {sync.expectedRows ? ` of ~${n(sync.expectedRows)}` : ""} listings written
            </div>
            {sync.expectedRows ? (
              <div className={`mt-2 h-2 rounded-full overflow-hidden ${isLight ? "bg-gray-200" : "bg-gray-700"}`}>
                <div
                  className="h-full bg-sky-500 transition-all"
                  style={{ width: `${Math.min(100, Math.max(2, Math.round((sync.rowsUpserted / sync.expectedRows) * 100)))}%` }}
                />
              </div>
            ) : null}
            <p className={`text-xs mt-2 ${textMuted}`}>
              It runs on our servers in short bursts — you can leave this page.
              {sync.lastError ? ` ${sync.lastError}` : ""}
            </p>
          </div>
        )}

        {sync.status === "done" && (
          <div className={`flex items-start gap-2 mt-3 text-sm ${isLight ? "text-green-800" : "text-green-300"}`}>
            <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>
              {sync.mode === "update"
                ? `Updated ${sync.finishedAt ? new Date(sync.finishedAt).toLocaleString() : ""}: ${n(sync.rowsUpserted)} changed, ${n(sync.rowsRemoved)} removed${sync.dbRows != null ? ` · ${n(sync.dbRows)} listings in your database` : ""}.`
                : `Seeded ${n(sync.dbRows ?? sync.rowsUpserted)} listings${sync.finishedAt ? ` on ${new Date(sync.finishedAt).toLocaleString()}` : ""}.`}
            </span>
          </div>
        )}

        {sync.status === "error" && (
          <div className={`flex items-start gap-2 mt-3 p-3 rounded-lg text-sm ${isLight ? "bg-red-50 text-red-800" : "bg-red-950/20 text-red-300"}`}>
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>The last run stopped: {sync.lastError || "unknown error"}. Starting again picks up safely.</span>
          </div>
        )}

        {!running && (
          <button
            onClick={startSeed}
            disabled={!canSeed || starting}
            className={`mt-3 px-4 py-2 rounded-lg text-sm font-bold text-white inline-flex items-center gap-2 disabled:opacity-50 ${
              isLight ? "bg-blue-600 hover:bg-blue-700" : "bg-emerald-600 hover:bg-emerald-700"
            }`}
            title={over ? "Your selection is larger than your plan allows" : undefined}
          >
            {starting ? <Loader2 className="w-4 h-4 animate-spin" /> : sync.status === "idle" ? <Play className="w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
            {sync.status === "idle" ? "Start seeding" : "Re-seed with this selection"}
          </button>
        )}
      </div>
    </>
  );
}
