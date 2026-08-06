// /admin/loop — the loop console. THE one admin surface for the feedback
// system (/admin/agent-feedback was merged in and redirects here).
//
// One screen answering "what is the loop doing right now": the derived stage,
// the handshake toggle (flippable), ticket fingerprints from the field,
// reports with full markdown on expand + lifecycle controls, bug reports and
// feedback submissions, a merged activity feed, and an async chat channel to
// each agent.
//
// The chat is a MAILBOX, not a stream — Tom polls every ~15 minutes (openclaw
// cron), the repairer every ~5 (scheduled task, only while the desktop app is
// open). The UI says so under the composer, because a chat box implies
// liveness this system deliberately doesn't have.
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTheme } from "@/app/contexts/ThemeContext";
import {
  Activity,
  Bug,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Fingerprint,
  Inbox,
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

type Report = {
  id: string;
  title: string;
  status: "new" | "in_progress" | "complete";
  reporterTokenName: string | null;
  submittedAt: string;
  completedAt: string | null;
  resolutionNotes: string | null;
};

type Payload = {
  testingOn: boolean;
  toggleUpdatedBy: string;
  toggleUpdatedAt: string;
  presence: { tomLastPoll: string | null; repairerLastAction: string | null };
  stage: string;
  detail: string;
  reports: Report[];
  fingerprints: Cluster[];
  chat: { tom: ChatMsg[]; repairer: ChatMsg[] };
  bugs: Array<{
    id: string;
    title: string;
    severity: "low" | "medium" | "high" | "critical";
    area: string;
    status: "new" | "triaged" | "fixed" | "wont_fix";
    reporterTokenName: string | null;
    createdAt: string;
    resolutionNotes: string | null;
  }>;
  feedback: Array<{
    id: string;
    summary: string;
    kind: string;
    status: "awaiting_upload" | "uploaded" | "reviewed";
    reporterTokenName: string | null;
    fileBytes: number | null;
    createdAt: string;
  }>;
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

// Presence chip: green while the agent's last observable act is inside its
// normal cadence, grey once it has gone quiet past it. Derived from data the
// agents already touch — Tom's token stamp, the repairer's last visible act —
// so it cannot claim liveness the system doesn't have.
function AgentPresence({
  label,
  at,
  freshMins,
  muted,
}: {
  label: string;
  at: string | null | undefined;
  freshMins: number;
  muted: string;
}) {
  if (!at) return <span className={`text-[10px] ${muted}`}>{label} · no signal</span>;
  const mins = Math.max(0, Math.round((Date.now() - new Date(at).getTime()) / 60_000));
  const fresh = mins <= freshMins;
  return (
    <span className={`text-[10px] ${fresh ? "text-emerald-500" : muted}`}>
      {fresh ? "●" : "○"} {label} · {mins < 1 ? "just now" : `${mins}m ago`}
    </span>
  );
}

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
  const [actionError, setActionError] = useState<string | null>(null);
  const [openFp, setOpenFp] = useState<string | null>(null);
  const [openReport, setOpenReport] = useState<string | null>(null);
  const [reportMd, setReportMd] = useState<Record<string, string>>({});
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/loop");
    if (r.ok) setData(await r.json());
  }, []);

  // Full markdown is fetched lazily per report — 20 full reports would bloat
  // the 15s poll for text that is rarely open.
  async function toggleReport(id: string) {
    if (openReport === id) {
      setOpenReport(null);
      return;
    }
    setOpenReport(id);
    if (!reportMd[id]) {
      try {
        const r = await fetch(`/api/admin/loop?report=${id}`);
        if (!r.ok) throw new Error(String(r.status));
        const full = await r.json();
        setReportMd((m) => ({ ...m, [id]: full.markdown || "(empty)" }));
      } catch {
        setReportMd((m) => ({
          ...m,
          [id]: "(failed to load — collapse and re-expand to retry)",
        }));
        // A failed load must not stick as cached "content": clear it so the
        // next expand refetches.
        setTimeout(() => setReportMd((m) => {
          const { [id]: _, ...rest } = m;
          return rest;
        }), 4000);
      }
    }
  }

  // Two freshness mechanisms, deliberately layered (docs/testing/
  // loop-console.md): an SSE stream for instant updates, and the 15s poll as
  // the always-on safety net beneath it. The poll stays even while the stream
  // is healthy — it is cheap, and a silently dead stream then costs 15s of
  // staleness instead of forever.
  const [live, setLive] = useState<"connecting" | "live" | "polling">("connecting");
  useEffect(() => {
    load();
    const t = setInterval(load, 15_000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    const es = new EventSource("/api/admin/loop/stream");
    let bumpTimer: ReturnType<typeof setTimeout> | null = null;
    // Change streams can fire in bursts (a repair completes = report update +
    // toggle update + fingerprint resolve); coalesce into one refetch.
    const debouncedLoad = () => {
      if (bumpTimer) clearTimeout(bumpTimer);
      bumpTimer = setTimeout(load, 400);
    };

    // Every (re)connect means "I may have missed events" — serverless cuts
    // the stream at maxDuration and EventSource silently reconnects. A full
    // snapshot is one cheap GET, so that is the whole resume story.
    es.onopen = () => {
      setLive("live");
      load();
    };
    es.addEventListener("chat", (e) => {
      const m = JSON.parse((e as MessageEvent).data);
      setData((prev) => {
        if (!prev) return prev;
        const thread = prev.chat[m.channel as "tom" | "repairer"];
        if (thread.some((x) => x.id === m.id)) return prev; // poll got it first
        return {
          ...prev,
          chat: { ...prev.chat, [m.channel]: [...thread, m] },
        };
      });
      debouncedLoad(); // activity feed + unread counts still come from the GET
    });
    es.addEventListener("bump", debouncedLoad);
    es.onerror = () => {
      // EventSource retries on its own; between attempts the 15s poll carries
      // the page. Only the badge changes.
      setLive("polling");
    };
    return () => {
      if (bumpTimer) clearTimeout(bumpTimer);
      es.close();
    };
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

  // One helper for every PATCH shape the route accepts: {fingerprint,status},
  // {reportId,status,resolutionNotes?}, {testingOn}. Failures surface — a
  // silent no-op on the TOGGLE would misrepresent the loop's armed state,
  // which is the one lie this console must never tell.
  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    setActionError(null);
    try {
      const r = await fetch("/api/admin/loop", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        setActionError(`Update failed (${r.status}) — nothing was changed.`);
        return;
      }
      await load();
    } catch {
      setActionError("Update failed (network) — nothing was changed.");
    } finally {
      setBusy(false);
    }
  }
  const setFpStatus = (fingerprint: string, status: Cluster["status"]) =>
    patch({ fingerprint, status });

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
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded border ${
                  live === "live"
                    ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
                    : "bg-amber-500/15 text-amber-500 border-amber-500/30"
                }`}
                title={
                  live === "live"
                    ? "Streaming: updates arrive the moment they happen (SSE)"
                    : "Stream reconnecting — the 15s poll is carrying the page"
                }
              >
                {live === "live" ? "● live" : "○ polling"}
              </span>
              <AgentPresence label="Tom" at={data.presence?.tomLastPoll} freshMins={20} muted={textMuted} />
              <AgentPresence label="Repairer" at={data.presence?.repairerLastAction} freshMins={10} muted={textMuted} />
              <span className={`text-xs ${textMuted}`}>
                toggle {data.testingOn ? "ON" : "OFF"} · flipped by {data.toggleUpdatedBy} ·{" "}
                {new Date(data.toggleUpdatedAt).toLocaleString()}
              </span>
              <button
                onClick={() => patch({ testingOn: !data.testingOn })}
                disabled={busy}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition disabled:opacity-50 ${
                  data.testingOn ? "bg-emerald-600" : isLight ? "bg-gray-300" : "bg-white/20"
                }`}
                title={data.testingOn ? "Turn testing off" : "Turn testing on"}
              >
                <span
                  className={`h-4 w-4 rounded-full bg-white transition ${
                    data.testingOn ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
            <p className={`text-sm mt-2 ${textMuted}`}>{data.detail}</p>
            {actionError && <p className="text-[11px] mt-2 text-red-500">{actionError}</p>}

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

          <div className="grid gap-6 lg:grid-cols-2">
            {/* ── Tickets ─────────────────────────────────────────────── */}
            <div className={`${cardClass} self-start`}>
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

            {/* ── Reports — full markdown on expand + lifecycle controls ── */}
            <div className={cardClass}>
              <h2 className={`text-base font-semibold ${textPrimary}`}>Session reports</h2>
              <div className="mt-3 space-y-2">
                {data.reports.length === 0 && <p className={`text-sm ${textMuted}`}>No reports yet.</p>}
                {data.reports.slice(0, 10).map((r) => {
                  const meta = REPORT_STATUS_META[r.status];
                  const expanded = openReport === r.id;
                  return (
                    <div
                      key={r.id}
                      className={`rounded-lg border p-3 ${isLight ? "border-gray-200" : "border-white/10"}`}
                    >
                      <button className="w-full text-left" onClick={() => toggleReport(r.id)}>
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-sm font-medium truncate ${textPrimary}`}>{r.title}</span>
                          <span className="flex items-center gap-2 shrink-0">
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${meta.cls}`}>
                              {meta.label}
                            </span>
                            {expanded ? (
                              <ChevronUp className={`w-4 h-4 ${textMuted}`} />
                            ) : (
                              <ChevronDown className={`w-4 h-4 ${textMuted}`} />
                            )}
                          </span>
                        </div>
                        <p className={`text-xs mt-1 ${textMuted}`}>
                          {new Date(r.submittedAt).toLocaleString()}
                          {r.completedAt ? ` · completed ${new Date(r.completedAt).toLocaleString()}` : ""}
                          {r.reporterTokenName ? ` · via ${r.reporterTokenName}` : ""}
                        </p>
                      </button>
                      {expanded && (
                        <div className="mt-3 space-y-3">
                          {reportMd[r.id] === undefined ? (
                            <p className={`flex items-center gap-2 text-xs ${textMuted}`}>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading report…
                            </p>
                          ) : (
                            <pre
                              className={`whitespace-pre-wrap rounded-lg border p-4 text-[13px] leading-relaxed overflow-x-auto max-h-96 overflow-y-auto ${
                                isLight
                                  ? "bg-gray-50 border-gray-200 text-gray-800"
                                  : "bg-black/30 border-white/10 text-gray-200"
                              }`}
                            >
                              {reportMd[r.id]}
                            </pre>
                          )}
                          {r.resolutionNotes && (
                            <div
                              className={`rounded-lg border p-3 text-xs ${
                                isLight
                                  ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                                  : "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
                              }`}
                            >
                              <p className="font-semibold mb-1">Resolution</p>
                              <p className="whitespace-pre-wrap">{r.resolutionNotes}</p>
                            </div>
                          )}
                          <div className="flex gap-2">
                            {r.status === "new" && (
                              <button
                                disabled={busy}
                                onClick={() => patch({ reportId: r.id, status: "in_progress" })}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
                              >
                                <Circle className="w-3.5 h-3.5" /> Mark in progress
                              </button>
                            )}
                            {r.status !== "complete" && (
                              <button
                                disabled={busy}
                                onClick={() => patch({ reportId: r.id, status: "complete" })}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" /> Mark complete
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* ── Bug reports (report_bug) ───────────────────────────── */}
            <div className={cardClass}>
              <div className="flex items-center justify-between">
                <h2 className={`text-base font-semibold flex items-center gap-2 ${textPrimary}`}>
                  <Bug className="w-4 h-4" /> Bug reports
                </h2>
                <span className={`text-xs ${textMuted}`}>
                  {data.bugs.filter((b) => b.status === "new").length} new
                </span>
              </div>
              <p className={`text-xs mt-1 ${textMuted}`}>
                Filed by builders via the MCP <code>report_bug</code> tool. Triage lives in{" "}
                <code>scripts/cr-bugs.mjs</code>.
              </p>
              <div className="mt-3 space-y-2 max-h-80 overflow-y-auto">
                {data.bugs.length === 0 && <p className={`text-sm ${textMuted}`}>No bug reports.</p>}
                {data.bugs.map((b) => (
                  <div
                    key={b.id}
                    className={`rounded-lg border p-3 ${isLight ? "border-gray-200" : "border-white/10"}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-sm truncate ${textPrimary}`}>{b.title}</span>
                      <span className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded border ${
                            b.severity === "critical"
                              ? "bg-red-500/15 text-red-500 border-red-500/30"
                              : b.severity === "high"
                                ? "bg-amber-500/15 text-amber-500 border-amber-500/30"
                                : "bg-gray-500/15 text-gray-400 border-gray-500/30"
                          }`}
                        >
                          {b.severity}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded border ${
                            b.status === "fixed"
                              ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
                              : b.status === "new"
                                ? "bg-amber-500/15 text-amber-500 border-amber-500/30"
                                : "bg-gray-500/15 text-gray-400 border-gray-500/30"
                          }`}
                        >
                          {b.status}
                        </span>
                      </span>
                    </div>
                    <p className={`text-[11px] mt-1 ${textMuted}`}>
                      {b.area} · {new Date(b.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Feedback submissions (give_feedback) ───────────────── */}
            <div className={cardClass}>
              <div className="flex items-center justify-between">
                <h2 className={`text-base font-semibold flex items-center gap-2 ${textPrimary}`}>
                  <Inbox className="w-4 h-4" /> Feedback submissions
                </h2>
                <span className={`text-xs ${textMuted}`}>
                  {data.feedback.filter((f) => f.status === "uploaded").length} awaiting review
                </span>
              </div>
              <p className={`text-xs mt-1 ${textMuted}`}>
                Session zips via the MCP <code>give_feedback</code> tool. Review lives in{" "}
                <code>scripts/cr-feedback.mjs</code>.
              </p>
              <div className="mt-3 space-y-2 max-h-80 overflow-y-auto">
                {data.feedback.length === 0 && (
                  <p className={`text-sm ${textMuted}`}>No feedback submissions.</p>
                )}
                {data.feedback.map((f) => (
                  <div
                    key={f.id}
                    className={`rounded-lg border p-3 ${isLight ? "border-gray-200" : "border-white/10"}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-sm truncate ${textPrimary}`}>{f.summary}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded border shrink-0 ${
                          f.status === "reviewed"
                            ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
                            : f.status === "uploaded"
                              ? "bg-amber-500/15 text-amber-500 border-amber-500/30"
                              : "bg-gray-500/15 text-gray-400 border-gray-500/30"
                        }`}
                      >
                        {f.status}
                      </span>
                    </div>
                    <p className={`text-[11px] mt-1 ${textMuted}`}>
                      {f.kind}
                      {f.fileBytes ? ` · ${(f.fileBytes / 1024).toFixed(0)} KB` : ""} ·{" "}
                      {new Date(f.createdAt).toLocaleString()}
                    </p>
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
