// /admin/loop — the loop console.
//
// One screen answering "what is the loop doing right now": the derived stage,
// the handshake toggle, ticket fingerprints from the field, report summaries,
// a merged activity feed, and an async chat channel to each agent.
//
// The chat is a MAILBOX, not a stream — Tom polls every ~15 minutes (openclaw
// cron), the repairer every ~5 (scheduled task, only while the desktop app is
// open). The UI says so under the composer, because a chat box implies
// liveness this system deliberately doesn't have.
//
// Full report markdown stays on /admin/agent-feedback; this page links there.
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTheme } from "@/app/contexts/ThemeContext";
import {
  Activity,
  CheckCircle2,
  Fingerprint,
  Loader2,
  MessageSquare,
  RefreshCw,
  Send,
} from "lucide-react";

type Cluster = {
  fingerprint: string;
  association: string;
  failingStep: string;
  errorClass: string;
  status: "open" | "triaged" | "in_progress" | "resolved";
  goal: string | null;
  triageNote: string | null;
  population: number;
  firstSeenAt: string;
  lastSeenAt: string;
  resolutionNotes: string | null;
};

type ChatMsg = { id: string; from: "admin" | "agent"; body: string; at: string; readAt: string | null };

type Payload = {
  testingOn: boolean;
  toggleUpdatedBy: string;
  toggleUpdatedAt: string;
  stage: string;
  detail: string;
  reports: Array<{
    id: string;
    title: string;
    status: "new" | "in_progress" | "complete";
    reporterTokenName: string | null;
    submittedAt: string;
    completedAt: string | null;
    resolutionNotes: string | null;
  }>;
  fingerprints: Cluster[];
  chat: { tom: ChatMsg[]; repairer: ChatMsg[] };
  events: Array<{ at: string; kind: string; text: string }>;
};

const STAGE_META: Record<string, { label: string; cls: string }> = {
  armed: { label: "Armed — awaiting Tom's next firing", cls: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" },
  "report-waiting": { label: "Report waiting for the repairer", cls: "bg-amber-500/15 text-amber-500 border-amber-500/30" },
  repairing: { label: "Repairer is fixing", cls: "bg-blue-500/15 text-blue-500 border-blue-500/30" },
  paused: { label: "Paused", cls: "bg-gray-500/15 text-gray-400 border-gray-500/30" },
};

const FP_STATUS_META: Record<Cluster["status"], { label: string; cls: string }> = {
  open: { label: "open", cls: "bg-red-500/15 text-red-500 border-red-500/30" },
  triaged: { label: "triaged", cls: "bg-amber-500/15 text-amber-500 border-amber-500/30" },
  in_progress: { label: "in progress", cls: "bg-blue-500/15 text-blue-500 border-blue-500/30" },
  resolved: { label: "resolved", cls: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
};

const REPORT_STATUS_META: Record<string, { label: string; cls: string }> = {
  new: { label: "new", cls: "bg-amber-500/15 text-amber-500 border-amber-500/30" },
  in_progress: { label: "in progress", cls: "bg-blue-500/15 text-blue-500 border-blue-500/30" },
  complete: { label: "complete", cls: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
};

// The four stops a cycle passes through, for the pipeline strip.
const PIPELINE: Array<{ key: string; label: string }> = [
  { key: "armed", label: "Armed" },
  { key: "building", label: "Build + judge" },
  { key: "report-waiting", label: "Report" },
  { key: "repairing", label: "Repair" },
];

export default function LoopConsolePage() {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  const [data, setData] = useState<Payload | null>(null);
  const [busy, setBusy] = useState(false);
  const [channel, setChannel] = useState<"tom" | "repairer">("tom");
  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [openFp, setOpenFp] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/loop");
    if (r.ok) setData(await r.json());
  }, []);

  // "View the loop in progress" means the page keeps itself current: poll
  // every 15s. Cheap — the GET is a handful of indexed reads.
  useEffect(() => {
    load();
    const t = setInterval(load, 15_000);
    return () => clearInterval(t);
  }, [load]);

  // Keyed on the last message id, not the array — the array is a fresh
  // reference on every 15s poll, and scrolling on each one yanks the viewport
  // out from under a reader mid-thread.
  const lastMsgId = data ? (data.chat[channel][data.chat[channel].length - 1]?.id ?? null) : null;
  useEffect(() => {
    if (lastMsgId) chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [lastMsgId, channel]);

  async function send() {
    const body = draft.trim();
    if (!body || busy) return;
    setBusy(true);
    setSendError(null);
    try {
      const r = await fetch("/api/admin/loop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel, body }),
      });
      if (!r.ok) {
        // Keep the draft — a failed send must never destroy what was typed.
        setSendError(`Send failed (${r.status}). Your message is still in the box.`);
        return;
      }
      setDraft("");
      await load();
    } catch {
      setSendError("Send failed (network). Your message is still in the box.");
    } finally {
      setBusy(false);
    }
  }

  async function setFpStatus(fingerprint: string, status: Cluster["status"]) {
    setBusy(true);
    try {
      await fetch("/api/admin/loop", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fingerprint, status }),
      });
      await load();
    } finally {
      setBusy(false);
    }
  }

  const cardClass = `rounded-xl p-5 ${isLight ? "bg-white border border-gray-200" : "bg-white/5 border border-white/10"}`;
  const textPrimary = isLight ? "text-gray-900" : "text-white";
  const textMuted = isLight ? "text-gray-500" : "text-gray-400";

  const stage = data ? STAGE_META[data.stage] || STAGE_META.paused : null;
  const activeIdx = data ? PIPELINE.findIndex((p) => p.key === data.stage) : -1;
  const openClusters = data?.fingerprints.filter((f) => f.status !== "resolved") ?? [];
  const resolvedClusters = data?.fingerprints.filter((f) => f.status === "resolved") ?? [];
  const thread = data ? data.chat[channel] : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${textPrimary}`}>Loop Console</h1>
          <p className={`text-sm mt-1 ${textMuted}`}>
            The feedback loop, live: stage, field tickets, reports, and a channel to each agent.
            Auto-refreshes every 15s.
          </p>
        </div>
        <button
          onClick={load}
          className={`p-2 rounded-lg ${isLight ? "hover:bg-gray-100" : "hover:bg-white/10"} ${textMuted}`}
          title="Refresh now"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {!data ? (
        <div className={cardClass}>
          <div className={`flex items-center gap-2 text-sm ${textMuted}`}>
            <Loader2 className="w-4 h-4 animate-spin" /> Loading the loop…
          </div>
        </div>
      ) : (
        <>
          {/* ── Stage ───────────────────────────────────────────────── */}
          <div className={cardClass}>
            <div className="flex flex-wrap items-center gap-3">
              <span className={`text-xs px-2 py-0.5 rounded-full border ${stage!.cls}`}>{stage!.label}</span>
              <span className={`text-xs ${textMuted}`}>
                toggle {data.testingOn ? "ON" : "OFF"} · flipped by {data.toggleUpdatedBy} ·{" "}
                {new Date(data.toggleUpdatedAt).toLocaleString()}
              </span>
            </div>
            <p className={`text-sm mt-2 ${textMuted}`}>{data.detail}</p>

            {/* Pipeline strip. "building" is never reported by the API — the
                control plane cannot see a build in flight (that is the whole
                in-flight-marker story), so the strip shows it as the gap
                between Armed and Report. */}
            <div className="mt-4 flex items-center gap-0">
              {PIPELINE.map((p, i) => {
                const active = i === activeIdx;
                return (
                  <div key={p.key} className="flex items-center">
                    {i > 0 && <div className={`h-px w-6 sm:w-10 ${isLight ? "bg-gray-300" : "bg-white/20"}`} />}
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full border ${
                        active
                          ? "bg-blue-600 text-white border-blue-600"
                          : isLight
                            ? "bg-gray-50 text-gray-500 border-gray-200"
                            : "bg-white/5 text-gray-400 border-white/10"
                      }`}
                    >
                      {p.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* ── Tickets ─────────────────────────────────────────────── */}
            <div className={cardClass}>
              <div className="flex items-center justify-between">
                <h2 className={`text-base font-semibold flex items-center gap-2 ${textPrimary}`}>
                  <Fingerprint className="w-4 h-4" /> Field tickets
                </h2>
                <span className={`text-xs ${textMuted}`}>
                  {openClusters.length} open fingerprint{openClusters.length === 1 ? "" : "s"}
                </span>
              </div>
              <p className={`text-xs mt-1 ${textMuted}`}>
                One row per distinct failure mode; population = how many machines reported it.
                Tom triages these before spending a session on coverage.
              </p>

              <div className="mt-3 space-y-2">
                {openClusters.length === 0 && (
                  <p className={`text-sm ${textMuted}`}>No open tickets — the loop is coverage-driven right now.</p>
                )}
                {openClusters.map((f) => {
                  const meta = FP_STATUS_META[f.status];
                  const expanded = openFp === f.fingerprint;
                  return (
                    <div
                      key={f.fingerprint}
                      className={`rounded-lg border p-3 ${isLight ? "border-gray-200" : "border-white/10"}`}
                    >
                      <button
                        className="w-full text-left"
                        onClick={() => setOpenFp(expanded ? null : f.fingerprint)}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-sm font-medium truncate ${textPrimary}`}>
                            {f.association} · {f.failingStep}
                          </span>
                          <span className="flex items-center gap-2 shrink-0">
                            <span className={`text-xs ${textMuted}`}>×{f.population}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${meta.cls}`}>{meta.label}</span>
                          </span>
                        </div>
                        <p className={`text-xs mt-1 truncate ${textMuted}`}>{f.errorClass}</p>
                      </button>
                      {expanded && (
                        <div className="mt-2 space-y-2">
                          {f.goal && (
                            <p className={`text-xs ${textMuted}`}>
                              <span className="font-semibold">Tom's goal:</span> {f.goal}
                            </p>
                          )}
                          {f.triageNote && <p className={`text-xs ${textMuted}`}>{f.triageNote}</p>}
                          <p className={`text-xs ${textMuted}`}>
                            first seen {new Date(f.firstSeenAt).toLocaleString()} · last{" "}
                            {new Date(f.lastSeenAt).toLocaleString()}
                          </p>
                          <div className="flex gap-2">
                            <button
                              disabled={busy}
                              onClick={() => setFpStatus(f.fingerprint, "resolved")}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Mark resolved
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {resolvedClusters.length > 0 && (
                  <p className={`text-xs pt-1 ${textMuted}`}>
                    + {resolvedClusters.length} resolved fingerprint{resolvedClusters.length === 1 ? "" : "s"} (a fresh
                    ticket reopens one automatically)
                  </p>
                )}
              </div>
            </div>

            {/* ── Reports ─────────────────────────────────────────────── */}
            <div className={cardClass}>
              <div className="flex items-center justify-between">
                <h2 className={`text-base font-semibold ${textPrimary}`}>Recent reports</h2>
                <Link href="/admin/agent-feedback" className="text-xs text-blue-500 hover:underline">
                  full markdown →
                </Link>
              </div>
              <div className="mt-3 space-y-2">
                {data.reports.length === 0 && <p className={`text-sm ${textMuted}`}>No reports yet.</p>}
                {data.reports.slice(0, 8).map((r) => {
                  const meta = REPORT_STATUS_META[r.status];
                  return (
                    <div
                      key={r.id}
                      className={`rounded-lg border p-3 ${isLight ? "border-gray-200" : "border-white/10"}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-sm font-medium truncate ${textPrimary}`}>{r.title}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border shrink-0 ${meta.cls}`}>
                          {meta.label}
                        </span>
                      </div>
                      <p className={`text-xs mt-1 ${textMuted}`}>
                        {new Date(r.submittedAt).toLocaleString()}
                        {r.completedAt ? ` · completed ${new Date(r.completedAt).toLocaleString()}` : ""}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* ── Chat ────────────────────────────────────────────────── */}
            <div className={cardClass}>
              <h2 className={`text-base font-semibold flex items-center gap-2 ${textPrimary}`}>
                <MessageSquare className="w-4 h-4" /> Agent chat
              </h2>
              <div className="mt-3 flex gap-2">
                {(["tom", "repairer"] as const).map((c) => (
                  <button
                    key={c}
                    onClick={() => setChannel(c)}
                    className={`text-xs px-3 py-1.5 rounded-full border ${
                      channel === c
                        ? "bg-blue-600 text-white border-blue-600"
                        : isLight
                          ? "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                          : "bg-white/5 text-gray-300 border-white/10 hover:bg-white/10"
                    }`}
                  >
                    {c === "tom" ? "Tom (judge)" : "Repairer (Dev Claude)"}
                  </button>
                ))}
              </div>

              <div
                className={`mt-3 h-72 overflow-y-auto rounded-lg border p-3 space-y-2 ${
                  isLight ? "bg-gray-50 border-gray-200" : "bg-black/30 border-white/10"
                }`}
              >
                {thread.length === 0 && (
                  <p className={`text-xs ${textMuted}`}>
                    No messages on this channel yet. Write one below — the agent reads it on its next
                    firing.
                  </p>
                )}
                {thread.map((m) => (
                  <div key={m.id} className={m.from === "admin" ? "flex justify-end" : "flex justify-start"}>
                    <div
                      className={`max-w-[85%] rounded-lg px-3 py-2 text-[13px] leading-relaxed ${
                        m.from === "admin"
                          ? "bg-blue-600 text-white"
                          : isLight
                            ? "bg-white border border-gray-200 text-gray-800"
                            : "bg-white/10 text-gray-200"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{m.body}</p>
                      <p className={`mt-1 text-[10px] ${m.from === "admin" ? "text-blue-200" : textMuted}`}>
                        {new Date(m.at).toLocaleString()}
                        {m.from === "admin" && (m.readAt ? " · answered" : " · awaiting reply")}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              <div className="mt-3 flex gap-2">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    // Guard busy (the button is disabled but Enter isn't) and
                    // IME composition — Enter that confirms Japanese/Chinese
                    // input must not fire a send.
                    if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return;
                    e.preventDefault();
                    if (!busy) send();
                  }}
                  placeholder={`Message ${channel === "tom" ? "Tom" : "the repairer"}…`}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm outline-none ${
                    isLight
                      ? "bg-white border-gray-200 text-gray-900 placeholder-gray-400"
                      : "bg-white/5 border-white/10 text-white placeholder-gray-500"
                  }`}
                />
                <button
                  disabled={busy || !draft.trim()}
                  onClick={send}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" /> Send
                </button>
              </div>
              {sendError && <p className="text-[11px] mt-2 text-red-500">{sendError}</p>}
              <p className={`text-[11px] mt-2 ${textMuted}`}>
                This is a mailbox, not live chat: Tom reads on his next cron firing (≤15 min while his
                cron is on); the repairer on its next poll (≤5 min while the desktop app is open). A
                message shows &ldquo;answered&rdquo; once the agent replies — the reply is the
                delivery receipt.
              </p>
            </div>

            {/* ── Activity ────────────────────────────────────────────── */}
            <div className={cardClass}>
              <h2 className={`text-base font-semibold flex items-center gap-2 ${textPrimary}`}>
                <Activity className="w-4 h-4" /> Activity
              </h2>
              <div className="mt-3 space-y-2">
                {data.events.map((e, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span
                      className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${
                        e.kind === "ticket" ? "bg-red-500" : e.kind === "chat" ? "bg-blue-500" : e.kind === "toggle" ? "bg-amber-500" : "bg-emerald-500"
                      }`}
                    />
                    <div className="min-w-0">
                      <p className={`text-xs truncate ${textPrimary}`}>{e.text}</p>
                      <p className={`text-[10px] ${textMuted}`}>{new Date(e.at).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
