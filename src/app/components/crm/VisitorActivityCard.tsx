"use client";

// "Site activity" — what a visitor looked at and for how long. Used on the
// admin Users panel (every site, host shown) and the agent's contact panel
// (their own sites only; the API does the scoping). Data comes from PageView
// rows written by <PageViewTracker/>.

import { useEffect, useState } from "react";
import { Clock, Eye, MousePointerClick, CalendarClock } from "lucide-react";
import type { VisitorActivitySummary } from "@/lib/visitor-activity";

// Recording began with this release; anything earlier was never captured.
const TRACKING_SINCE = "Nov 3, 2026";

export function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function ago(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

function pageLabel(p: { path: string; title?: string }): string {
  if (p.path === "/") return "Home page";
  // Titles are usually "Page | Site name"; the first part is the useful bit.
  const t = p.title?.split(/\s[|–-]\s/)[0]?.trim();
  return t || p.path;
}

export default function VisitorActivityCard({
  url,
  isLight,
  showHost = false,
}: {
  url: string;
  isLight: boolean;
  showHost?: boolean;
}) {
  const [data, setData] = useState<VisitorActivitySummary | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error" | "unlinked">("loading");
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    setShowAll(false);
    fetch(url, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((json) => {
        if (cancelled) return;
        if (json.linked === false) {
          setState("unlinked");
          return;
        }
        setData(json.activity);
        setState("ready");
      })
      .catch(() => !cancelled && setState("error"));
    return () => {
      cancelled = true;
    };
  }, [url]);

  const box = isLight ? "bg-gray-50" : "bg-white/5";
  const primary = isLight ? "text-gray-900" : "text-white";
  const secondary = isLight ? "text-gray-500" : "text-gray-400";
  const divider = isLight ? "divide-gray-200" : "divide-white/10";

  const header = <p className={`text-xs font-medium mb-2 ${secondary}`}>SITE ACTIVITY</p>;

  if (state === "loading") {
    return (
      <div className={`p-3 rounded-lg ${box}`}>
        {header}
        <p className={`text-sm ${secondary}`}>Loading…</p>
      </div>
    );
  }
  if (state === "error") {
    return (
      <div className={`p-3 rounded-lg ${box}`}>
        {header}
        <p className={`text-sm ${secondary}`}>Couldn't load activity.</p>
      </div>
    );
  }
  if (state === "unlinked") {
    return (
      <div className={`p-3 rounded-lg ${box}`}>
        {header}
        <p className={`text-sm ${secondary}`}>This contact hasn't signed in on your site, so there's no browsing to show.</p>
      </div>
    );
  }
  if (!data || data.totals.pageViews === 0) {
    return (
      <div className={`p-3 rounded-lg ${box}`}>
        {header}
        <p className={`text-sm ${secondary}`}>No pages viewed yet. Recording started {TRACKING_SINCE}.</p>
      </div>
    );
  }

  const { totals, topPages, recent } = data;
  const stats = [
    { icon: MousePointerClick, label: "Visits", value: String(totals.sessions || 1) },
    { icon: Eye, label: "Pages viewed", value: String(totals.pageViews) },
    { icon: Clock, label: "Time on site", value: formatDuration(totals.totalMs) },
    { icon: CalendarClock, label: "Last seen", value: totals.lastSeen ? ago(totals.lastSeen) : "—" },
  ];
  const recentShown = showAll ? recent : recent.slice(0, 8);

  return (
    <div className={`p-3 rounded-lg ${box} space-y-3`}>
      <div>
        {header}
        <div className="grid grid-cols-2 gap-2">
          {stats.map(({ icon: Icon, label, value }) => (
            <div key={label}>
              <p className={`text-[11px] flex items-center gap-1 ${secondary}`}>
                <Icon size={11} /> {label}
              </p>
              <p className={`text-sm font-semibold ${primary}`}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {topPages.length > 0 && (
        <div>
          <p className={`text-[11px] font-medium mb-1 ${secondary}`}>MOST TIME SPENT</p>
          <ul className={`divide-y ${divider}`}>
            {topPages.slice(0, 5).map((p) => (
              <li key={`${p.host}${p.path}`} className="py-1.5 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className={`text-sm truncate ${primary}`} title={p.path}>{pageLabel(p)}</p>
                  <p className={`text-[11px] truncate ${secondary}`}>
                    {showHost ? `${p.host}${p.path}` : p.path}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-sm font-medium ${primary}`}>{formatDuration(p.totalMs)}</p>
                  <p className={`text-[11px] ${secondary}`}>{p.views} view{p.views === 1 ? "" : "s"}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <p className={`text-[11px] font-medium mb-1 ${secondary}`}>RECENT PAGES</p>
        <ul className={`divide-y ${divider}`}>
          {recentShown.map((r, i) => (
            <li key={`${r.startedAt}-${i}`} className="py-1.5 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <a
                  href={`https://${r.host}${r.path}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`text-sm truncate block hover:underline ${primary}`}
                  title={`${r.host}${r.path}`}
                >
                  {pageLabel(r)}
                </a>
                <p className={`text-[11px] truncate ${secondary}`}>
                  {ago(r.startedAt)}
                  {showHost ? ` · ${r.host}` : ""}
                </p>
              </div>
              <p className={`text-xs shrink-0 ${secondary}`}>{formatDuration(r.durationMs)}</p>
            </li>
          ))}
        </ul>
        {recent.length > 8 && (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className={`mt-1 text-xs font-medium ${isLight ? "text-blue-600" : "text-blue-400"}`}
          >
            {showAll ? "Show less" : `Show all ${recent.length}`}
          </button>
        )}
      </div>
    </div>
  );
}
