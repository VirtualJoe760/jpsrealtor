// src/app/admin/agent-feedback/page.tsx
//
// The human window onto the judge loop (docs/testing/README.md):
//
//   testing ON  → the judge is clear to dispatch Test Claude
//   judge submits an MD report here → judge turns testing OFF
//   our routine reads the report, fixes, marks complete, turns testing ON
//
// This page shows the toggle, who last flipped it, and every report with its
// markdown. The toggle and report-status controls are manual overrides — the
// routine normally drives both, but the loop spans two machines and either
// side can be down; this is where Joseph unsticks it.
"use client";

import { useCallback, useEffect, useState } from "react";
import { useTheme } from "@/app/contexts/ThemeContext";
import { FlaskConical, RefreshCw, ChevronDown, ChevronUp, CheckCircle2, Circle, Loader2 } from "lucide-react";

type Report = {
  id: string;
  title: string;
  status: "new" | "in_progress" | "complete";
  markdown: string;
  resolutionNotes: string | null;
  reporterTokenName: string | null;
  submittedAt: string;
  completedAt: string | null;
};

type Payload = {
  testingOn: boolean;
  toggleUpdatedBy: string;
  toggleUpdatedAt: string;
  reports: Report[];
};

const STATUS_META: Record<Report["status"], { label: string; cls: string }> = {
  new: { label: "New", cls: "bg-amber-500/15 text-amber-500 border-amber-500/30" },
  in_progress: { label: "In progress", cls: "bg-blue-500/15 text-blue-500 border-blue-500/30" },
  complete: { label: "Complete", cls: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
};

export default function AgentFeedbackPage() {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  const [data, setData] = useState<Payload | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/agent-feedback");
    if (r.ok) setData(await r.json());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    try {
      await fetch("/api/admin/agent-feedback", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      await load();
    } finally {
      setBusy(false);
    }
  }

  const cardClass = `rounded-xl p-5 ${isLight ? "bg-white border border-gray-200" : "bg-white/5 border border-white/10"}`;
  const textPrimary = isLight ? "text-gray-900" : "text-white";
  const textMuted = isLight ? "text-gray-500" : "text-gray-400";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${textPrimary}`}>Agent Feedback</h1>
          <p className={`text-sm mt-1 ${textMuted}`}>
            Judge-loop reports from test builds. The routine polls every few minutes, fixes, and re-arms testing.
          </p>
        </div>
        <button
          onClick={load}
          className={`p-2 rounded-lg ${isLight ? "hover:bg-gray-100" : "hover:bg-white/10"} ${textMuted}`}
          aria-label="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* The toggle — the cross-machine handshake. */}
      <div className={cardClass}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <FlaskConical className={`w-6 h-6 ${data?.testingOn ? "text-emerald-500" : textMuted}`} />
            <div>
              <div className={`font-semibold ${textPrimary}`}>
                Testing is {data ? (data.testingOn ? "ON" : "OFF") : "…"}
              </div>
              {data && (
                <div className={`text-xs ${textMuted}`}>
                  Last set by <span className="font-medium">{data.toggleUpdatedBy}</span>
                  {" · "}
                  {new Date(data.toggleUpdatedAt).toLocaleString()}
                  {" — ON means the judge may dispatch the next test build."}
                </div>
              )}
            </div>
          </div>
          <button
            disabled={busy || !data}
            onClick={() => patch({ testingOn: !data!.testingOn })}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition disabled:opacity-50 ${
              data?.testingOn ? "bg-emerald-500" : isLight ? "bg-gray-300" : "bg-white/20"
            }`}
            aria-label="Toggle testing"
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                data?.testingOn ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Reports, newest first. */}
      {!data ? (
        <div className={`${cardClass} flex items-center gap-2 ${textMuted}`}>
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      ) : data.reports.length === 0 ? (
        <div className={`${cardClass} ${textMuted} text-sm`}>
          No reports yet. When the judge submits one, it appears here and the routine picks it up.
        </div>
      ) : (
        data.reports.map((r) => {
          const meta = STATUS_META[r.status];
          const expanded = open === r.id;
          return (
            <div key={r.id} className={cardClass}>
              <button
                onClick={() => setOpen(expanded ? null : r.id)}
                className="flex w-full items-start justify-between gap-3 text-left"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${meta.cls}`}>{meta.label}</span>
                    <span className={`font-semibold ${textPrimary}`}>{r.title}</span>
                  </div>
                  <div className={`text-xs mt-1 ${textMuted}`}>
                    {new Date(r.submittedAt).toLocaleString()}
                    {r.reporterTokenName ? ` · via token "${r.reporterTokenName}"` : ""}
                    {r.completedAt ? ` · completed ${new Date(r.completedAt).toLocaleString()}` : ""}
                  </div>
                </div>
                {expanded ? (
                  <ChevronUp className={`w-4 h-4 shrink-0 ${textMuted}`} />
                ) : (
                  <ChevronDown className={`w-4 h-4 shrink-0 ${textMuted}`} />
                )}
              </button>

              {expanded && (
                <div className="mt-4 space-y-4">
                  {/* Verbatim markdown. A renderer can come later; the content
                      being unabridged and copyable matters more than styling. */}
                  <pre
                    className={`whitespace-pre-wrap rounded-lg p-4 text-[13px] leading-relaxed overflow-x-auto ${
                      isLight ? "bg-gray-50 border border-gray-200 text-gray-800" : "bg-black/30 border border-white/10 text-gray-200"
                    }`}
                  >
                    {r.markdown}
                  </pre>

                  {r.resolutionNotes && (
                    <div
                      className={`rounded-lg p-4 text-sm ${
                        isLight ? "bg-emerald-50 border border-emerald-200 text-emerald-900" : "bg-emerald-950/20 border border-emerald-900 text-emerald-200"
                      }`}
                    >
                      <div className="font-semibold mb-1">Resolution</div>
                      <div className="whitespace-pre-wrap">{r.resolutionNotes}</div>
                    </div>
                  )}

                  {r.status !== "complete" && (
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
                      <button
                        disabled={busy}
                        onClick={() => patch({ reportId: r.id, status: "complete" })}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Mark complete
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
