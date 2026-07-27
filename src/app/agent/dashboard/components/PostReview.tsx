"use client";

// The post review queue — generated carousels waiting on the agent's decision.
//
// This screen exists because Instagram's API has no drafts and no scheduling
// (verified against Meta's docs 2026-07-26), so "let me look at it before it
// goes out" has to happen here. Nothing publishes without an explicit approve.
//
// Designed to be usable on a phone: the agent gets a text, taps through, swipes
// the slides, approves. That is the whole loop.
//
// See docs/content-templates/auto-posting.md.

import { useCallback, useEffect, useState } from "react";
import { Check, X, Clock, AlertTriangle, ExternalLink, Images } from "lucide-react";

type Slide = { n: number; url: string; kind: string };

type PendingPost = {
  id: string;
  status: "generating" | "awaiting_review" | "approved" | "posted" | "declined" | "expired" | "failed";
  listingKey: string;
  listing: { address?: string; city?: string; price?: string; beds?: number; baths?: number; sqft?: number };
  slides: Slide[];
  caption: string;
  approvalCode: string;
  scheduledFor: string | null;
  approvedAt: string | null;
  postedAt: string | null;
  permalink: string | null;
  error: string | null;
  attempt: number;
  createdAt: string;
};

function fmtSlot(iso: string | null): string {
  if (!iso) return "next available slot";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }) +
    " at " + d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export default function PostReview({ isLight }: { isLight: boolean }) {
  const [posts, setPosts] = useState<PendingPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/agent/pending-posts?limit=20", { cache: "no-store" });
      if (!r.ok) throw new Error(String(r.status));
      const j = await r.json();
      setPosts(j.items || []);
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function act(id: string, action: "approve" | "decline") {
    setBusy(id);
    try {
      const r = await fetch(`/api/agent/pending-posts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        alert(j.message || "That didn't go through.");
      }
      await load();
    } finally {
      setBusy(null);
    }
  }

  const card = `rounded-xl border ${isLight ? "bg-white border-gray-200" : "bg-gray-900 border-gray-800"}`;
  const muted = isLight ? "text-gray-500" : "text-gray-400";
  const primary = isLight ? "text-gray-900" : "text-gray-100";

  if (loading) {
    return (
      <div className={`${card} p-6`}>
        <div className={`h-4 w-40 rounded ${isLight ? "bg-gray-200" : "bg-gray-800"} animate-pulse`} />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className={`${card} p-6`}>
        <div className="flex items-center gap-2 mb-1">
          <Images className={`w-4 h-4 ${muted}`} />
          <h3 className={`font-semibold ${primary}`}>Posts to review</h3>
        </div>
        {/* Informative rather than blank — an empty queue is the normal
            resting state between generation runs, not a problem. */}
        <p className={`text-sm ${muted}`}>
          Nothing waiting. New carousels are built Sunday, Tuesday and Thursday —
          you&apos;ll get a text when one is ready.
        </p>
      </div>
    );
  }

  return (
    <div className={`${card} p-6`}>
      <div className="flex items-center gap-2 mb-4">
        <Images className={`w-4 h-4 ${muted}`} />
        <h3 className={`font-semibold ${primary}`}>Posts to review</h3>
        <span className={`text-xs ${muted}`}>({posts.length})</span>
      </div>

      <div className="space-y-4">
        {posts.map((p) => {
          const isOpen = open === p.id;
          const decided = p.status === "approved" || p.status === "posted";
          return (
            <div
              key={p.id}
              className={`rounded-lg border p-4 ${isLight ? "border-gray-200" : "border-gray-800"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className={`font-medium truncate ${primary}`}>
                    {p.listing.address || p.listingKey}
                  </div>
                  <div className={`text-xs mt-0.5 ${muted}`}>
                    {[p.listing.price, p.listing.city,
                      p.listing.beds ? `${p.listing.beds} bd` : null,
                      p.listing.sqft ? `${p.listing.sqft.toLocaleString()} sqft` : null,
                    ].filter(Boolean).join("  ·  ")}
                  </div>
                  <div className={`text-xs mt-1 ${muted}`}>
                    {p.slides.length} slides
                    {p.attempt > 1 && ` · take ${p.attempt}`}
                    {" · "}
                    <span className="font-mono">reply POST {p.approvalCode}</span>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  {p.status === "approved" && (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-500">
                      <Clock className="w-3 h-3" /> {fmtSlot(p.scheduledFor)}
                    </span>
                  )}
                  {p.status === "posted" && p.permalink && (
                    <a href={p.permalink} target="_blank" rel="noreferrer"
                       className="inline-flex items-center gap-1 text-xs text-blue-500 hover:underline">
                      View post <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {p.status === "failed" && (
                    <span className="inline-flex items-center gap-1 text-xs text-red-500">
                      <AlertTriangle className="w-3 h-3" /> failed
                    </span>
                  )}
                </div>
              </div>

              {p.error && (
                <p className="mt-2 text-xs text-red-500 break-words">{p.error}</p>
              )}

              {/* Slides. Horizontal scroll so this works on a phone without
                  reflowing into a tall column the agent has to scroll past. */}
              {p.slides.length > 0 && (
                <div className="mt-3 -mx-1 overflow-x-auto">
                  <div className="flex gap-2 px-1 pb-1">
                    {p.slides.map((s) => (
                      <img
                        key={s.n}
                        src={s.url}
                        alt={`Slide ${s.n} — ${s.kind}`}
                        loading="lazy"
                        className="h-40 w-32 object-cover rounded border shrink-0
                                   border-gray-300 dark:border-gray-700"
                      />
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => setOpen(isOpen ? null : p.id)}
                className={`mt-3 text-xs underline ${muted}`}
              >
                {isOpen ? "Hide caption" : "Show caption"}
              </button>
              {isOpen && (
                <pre className={`mt-2 text-xs whitespace-pre-wrap font-sans ${muted}`}>
                  {p.caption}
                </pre>
              )}

              {!decided && (
                <div className="mt-4 flex gap-2">
                  <button
                    disabled={busy === p.id}
                    onClick={() => act(p.id, "approve")}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600
                               px-3 py-1.5 text-sm font-medium text-white
                               hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" /> Approve
                  </button>
                  <button
                    disabled={busy === p.id}
                    onClick={() => act(p.id, "decline")}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5
                                text-sm disabled:opacity-50
                                ${isLight ? "border-gray-300 text-gray-700 hover:bg-gray-50"
                                          : "border-gray-700 text-gray-300 hover:bg-gray-800"}`}
                  >
                    <X className="w-4 h-4" /> Decline
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
