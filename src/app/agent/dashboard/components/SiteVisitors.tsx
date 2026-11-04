"use client";

// "Site visitors" — who has been browsing the agent's own sites, and for each
// visitor a timeline of the pages and listings they opened, when, and for how
// long. Data: /api/agent/visitors (list) and /api/agent/visitors/[key]
// (timeline), both scoped to the signed-in agent's sites.
//
// Anonymous visitors are listed too: they're the leads who haven't signed up
// yet. Their history moves onto their account once that browser signs in.

import { useEffect, useState } from "react";
import { Users, ChevronDown, ChevronRight, Home, FileText, Clock, Eye, UserCheck } from "lucide-react";
import type { VisitorRow, TimelineEntry } from "@/lib/agent-visitors";
import { formatDuration } from "@/app/components/crm/VisitorActivityCard";

const RANGES = [7, 30, 90] as const;

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  if (secs < 604800) return `${Math.floor(secs / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86400000);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function pageName(e: TimelineEntry): string {
  if (e.path === "/") return "Home page";
  return e.title?.split(/\s[|–-]\s/)[0]?.trim() || e.path;
}

function money(n: number): string {
  return n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(n % 1_000_000 ? 2 : 0)}M` : `$${Math.round(n / 1000)}K`;
}

function Timeline({ visitorKey, days, isLight }: { visitorKey: string; days: number; isLight: boolean }) {
  const [entries, setEntries] = useState<TimelineEntry[] | null>(null);
  const [failed, setFailed] = useState(false);
  const muted = isLight ? "text-gray-500" : "text-gray-400";
  const strong = isLight ? "text-gray-900" : "text-gray-100";

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/agent/visitors/${encodeURIComponent(visitorKey)}?days=${days}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => !cancelled && setEntries(d.timeline || []))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [visitorKey, days]);

  if (failed) return <p className={`px-3 pb-3 text-sm ${muted}`}>Couldn't load this visitor's pages.</p>;
  if (!entries) {
    return <div className={`mx-3 mb-3 h-16 animate-pulse rounded-lg ${isLight ? "bg-gray-100" : "bg-gray-800"}`} />;
  }
  if (entries.length === 0) return <p className={`px-3 pb-3 text-sm ${muted}`}>No pages in this range.</p>;

  // Group by calendar day, newest first (entries already arrive newest first).
  const groups: { day: string; items: TimelineEntry[] }[] = [];
  for (const e of entries) {
    const day = dayLabel(e.startedAt);
    if (groups.at(-1)?.day !== day) groups.push({ day, items: [] });
    groups.at(-1)!.items.push(e);
  }

  return (
    <div className="space-y-3 px-3 pb-3">
      {groups.map((g) => (
        <div key={g.day}>
          <p className={`mb-1 text-[11px] font-semibold uppercase tracking-wide ${muted}`}>{g.day}</p>
          <ul className={`divide-y ${isLight ? "divide-gray-100" : "divide-gray-800"}`}>
            {g.items.map((e, i) => (
              <li key={`${e.startedAt}-${i}`} className="flex items-center gap-3 py-2">
                <span className={`w-14 shrink-0 text-xs tabular-nums ${muted}`}>
                  {new Date(e.startedAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                </span>
                {e.listing ? (
                  e.listing.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={e.listing.photo} alt="" className="h-10 w-14 shrink-0 rounded object-cover" />
                  ) : (
                    <span className={`flex h-10 w-14 shrink-0 items-center justify-center rounded ${isLight ? "bg-gray-100" : "bg-gray-800"}`}>
                      <Home className={`h-4 w-4 ${muted}`} />
                    </span>
                  )
                ) : (
                  <span className={`flex h-10 w-14 shrink-0 items-center justify-center rounded ${isLight ? "bg-gray-50" : "bg-gray-800/60"}`}>
                    <FileText className={`h-4 w-4 ${muted}`} />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <a
                    href={`https://${e.host}${e.path}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`block truncate text-sm font-medium hover:underline ${strong}`}
                  >
                    {e.listing?.address || pageName(e)}
                  </a>
                  <p className={`truncate text-xs ${muted}`}>
                    {e.listing
                      ? [
                          e.listing.price != null ? money(e.listing.price) : null,
                          e.listing.beds != null ? `${e.listing.beds} bd` : null,
                          e.listing.baths != null ? `${e.listing.baths} ba` : null,
                          e.listing.city,
                          e.listing.status && e.listing.status !== "Active" ? e.listing.status : null,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "Listing"
                      : e.path}
                  </p>
                </div>
                <span className={`shrink-0 text-xs font-medium tabular-nums ${strong}`}>{formatDuration(e.durationMs)}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export default function SiteVisitors({ isLight }: { isLight: boolean }) {
  const [days, setDays] = useState<number>(30);
  const [visitors, setVisitors] = useState<VisitorRow[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [showAnon, setShowAnon] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setVisitors(null);
    setFailed(false);
    setOpen(null);
    fetch(`/api/agent/visitors?days=${days}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => !cancelled && setVisitors(d.visitors || []))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [days]);

  const muted = isLight ? "text-gray-500" : "text-gray-400";
  const strong = isLight ? "text-gray-900" : "text-gray-100";
  const known = (visitors || []).filter((v) => v.userId);
  const anon = (visitors || []).filter((v) => !v.userId);
  const shown = showAnon ? visitors || [] : known;
  const listingViews = (visitors || []).reduce((n, v) => n + v.listingViews, 0);
  const totalMs = (visitors || []).reduce((n, v) => n + v.totalMs, 0);

  return (
    <div className={`rounded-xl border p-6 ${isLight ? "bg-white border-gray-200" : "bg-gray-900/60 border-gray-800"}`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Users className={`h-5 w-5 ${isLight ? "text-blue-600" : "text-emerald-400"}`} />
          <h2 className={`text-lg font-bold ${strong}`}>Site visitors</h2>
        </div>
        <div className={`flex rounded-lg p-0.5 text-xs ${isLight ? "bg-gray-100" : "bg-gray-800"}`}>
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setDays(r)}
              className={`rounded-md px-2.5 py-1 font-medium ${
                days === r ? (isLight ? "bg-white text-gray-900 shadow-sm" : "bg-gray-700 text-white") : muted
              }`}
            >
              {r}d
            </button>
          ))}
        </div>
      </div>

      {failed ? (
        <p className={`text-sm ${muted}`}>Couldn't load visitors.</p>
      ) : !visitors ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`h-12 animate-pulse rounded-lg ${isLight ? "bg-gray-100" : "bg-gray-800"}`} />
          ))}
        </div>
      ) : visitors.length === 0 ? (
        <p className={`text-sm ${muted}`}>
          No visitors in the last {days} days. When someone browses your site, you'll see which pages and
          listings they opened, when, and for how long. Recording started Nov 3, 2026.
        </p>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Signed-in visitors", value: known.length, icon: UserCheck },
              { label: "Anonymous visitors", value: anon.length, icon: Users },
              { label: "Listings viewed", value: listingViews, icon: Home },
              { label: "Time on site", value: formatDuration(totalMs), icon: Clock },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className={`rounded-lg p-3 ${isLight ? "bg-gray-50" : "bg-gray-800/60"}`}>
                <p className={`flex items-center gap-1 text-[11px] ${muted}`}>
                  <Icon className="h-3 w-3" /> {label}
                </p>
                <p className={`text-lg font-bold ${strong}`}>{value}</p>
              </div>
            ))}
          </div>

          {shown.length === 0 ? (
            <p className={`text-sm ${muted}`}>No signed-in visitors in this range — only anonymous browsing.</p>
          ) : (
            <ul className={`divide-y rounded-lg border ${isLight ? "divide-gray-100 border-gray-100" : "divide-gray-800 border-gray-800"}`}>
              {shown.map((v) => {
                const isOpen = open === v.key;
                const Chevron = isOpen ? ChevronDown : ChevronRight;
                return (
                  <li key={v.key}>
                    <button
                      type="button"
                      onClick={() => setOpen(isOpen ? null : v.key)}
                      className={`flex w-full items-center gap-3 p-3 text-left ${isLight ? "hover:bg-gray-50" : "hover:bg-gray-800/50"}`}
                    >
                      <Chevron className={`h-4 w-4 shrink-0 ${muted}`} />
                      {v.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={v.image} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
                      ) : (
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                            isLight ? "bg-blue-50 text-blue-600" : "bg-emerald-900/30 text-emerald-400"
                          }`}
                        >
                          {(v.name || v.email || "?").charAt(0).toUpperCase()}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-sm font-medium ${strong}`}>
                          {v.name || v.email || "Anonymous visitor"}
                          {v.contactId && (
                            <span className={`ml-2 rounded px-1.5 py-0.5 text-[10px] font-medium ${isLight ? "bg-green-50 text-green-700" : "bg-green-900/30 text-green-400"}`}>
                              Contact
                            </span>
                          )}
                        </p>
                        <p className={`truncate text-xs ${muted}`}>
                          {v.userId ? v.email : `Not signed in · ${v.sessions} visit${v.sessions === 1 ? "" : "s"}`}
                        </p>
                      </div>
                      <div className={`hidden shrink-0 items-center gap-4 text-xs tabular-nums sm:flex ${muted}`}>
                        <span className="flex items-center gap-1" title="Pages viewed"><Eye className="h-3 w-3" />{v.pageViews}</span>
                        <span className="flex items-center gap-1" title="Listings viewed"><Home className="h-3 w-3" />{v.listingViews}</span>
                        <span className="flex items-center gap-1" title="Time on site"><Clock className="h-3 w-3" />{formatDuration(v.totalMs)}</span>
                      </div>
                      <span className={`w-16 shrink-0 text-right text-xs ${muted}`}>{timeAgo(v.lastSeen)}</span>
                    </button>
                    {isOpen && <Timeline visitorKey={v.key} days={days} isLight={isLight} />}
                  </li>
                );
              })}
            </ul>
          )}

          {anon.length > 0 && (
            <button
              type="button"
              onClick={() => setShowAnon((s) => !s)}
              className={`mt-3 text-xs font-medium ${isLight ? "text-blue-600" : "text-emerald-400"}`}
            >
              {showAnon ? "Hide anonymous visitors" : `Show ${anon.length} anonymous visitor${anon.length === 1 ? "" : "s"}`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
