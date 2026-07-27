"use client";

// Instagram content awaiting approval, in the CMS above the blog/landing tabs.
//
// These are CAROUSELS, so they're presented as carousels — one slide at a time
// at the real 4:5 aspect, arrows and dots, exactly how it will look in the
// feed. A horizontal strip of thumbnails shows that slides exist; it doesn't
// let you judge whether a slide is any good, which is the entire job here.
//
// Nothing publishes without an explicit approve.
// See docs/content-templates/auto-posting.md.

import { useCallback, useEffect, useState } from "react";
import { Check, X, Clock, AlertTriangle, ExternalLink, Instagram, ChevronLeft, ChevronRight } from "lucide-react";

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
  postedAt: string | null;
  permalink: string | null;
  error: string | null;
  attempt: number;
};

const KIND_LABEL: Record<string, string> = {
  cover: "Cover",
  room: "Room",
  cma: "Market",
  text: "Copy",
  cta: "Closing",
};

function fmtSlot(iso: string | null): string {
  if (!iso) return "next available slot";
  const d = new Date(iso);
  return (
    d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }) +
    " at " +
    d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
  );
}

function Carousel({ slides, isLight }: { slides: Slide[]; isLight: boolean }) {
  const [i, setI] = useState(0);
  const n = slides.length;
  if (n === 0) return null;
  const go = (d: number) => setI((prev) => (prev + d + n) % n);
  const s = slides[i];

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-full max-w-[300px]">
        {/* 4:5 is Instagram's portrait crop — showing it at any other ratio
            misrepresents what will actually be published. */}
        <div className="relative w-full aspect-[4/5] overflow-hidden rounded-lg border border-gray-300 dark:border-gray-700">
          <img
            src={s.url}
            alt={`Slide ${s.n} — ${s.kind}`}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <span className="absolute left-2 top-2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
            {s.n}/{n} · {KIND_LABEL[s.kind] || s.kind}
          </span>
        </div>

        {n > 1 && (
          <>
            <button
              onClick={() => go(-1)}
              aria-label="Previous slide"
              className="absolute left-1 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-1.5
                         text-white hover:bg-black/80"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => go(1)}
              aria-label="Next slide"
              className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-1.5
                         text-white hover:bg-black/80"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {n > 1 && (
        <div className="mt-2 flex items-center gap-1.5">
          {slides.map((sl, idx) => (
            <button
              key={sl.n}
              onClick={() => setI(idx)}
              aria-label={`Go to slide ${sl.n}`}
              className={`h-1.5 rounded-full transition-all ${
                idx === i
                  ? "w-4 bg-blue-500"
                  : isLight
                  ? "w-1.5 bg-gray-300 hover:bg-gray-400"
                  : "w-1.5 bg-gray-600 hover:bg-gray-500"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function InstagramContent({ isLight }: { isLight: boolean }) {
  const [posts, setPosts] = useState<PendingPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [openCaption, setOpenCaption] = useState<string | null>(null);

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

  const textPrimary = isLight ? "text-gray-900" : "text-gray-100";
  const textMuted = isLight ? "text-gray-500" : "text-gray-400";
  const panel = `rounded-xl border mb-4 ${isLight ? "bg-white border-gray-200" : "bg-gray-900/60 border-gray-800"}`;

  // Stay out of the way when there's nothing to decide — the CMS is primarily
  // the blog, and an empty panel above it is just noise.
  if (loading || posts.length === 0) return null;

  return (
    <div className={`${panel} p-5`}>
      <div className="flex items-center gap-2 mb-4">
        <Instagram className="w-4 h-4 text-pink-500" />
        <h2 className={`font-semibold ${textPrimary}`}>Instagram Content</h2>
        <span className={`text-xs ${textMuted}`}>
          {posts.length} awaiting review
        </span>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((p) => {
          const decided = p.status === "approved" || p.status === "posted";
          return (
            <div
              key={p.id}
              className={`rounded-lg border p-4 ${isLight ? "border-gray-200" : "border-gray-800"}`}
            >
              <Carousel slides={p.slides} isLight={isLight} />

              <div className="mt-3">
                <div className={`font-medium text-sm truncate ${textPrimary}`}>
                  {p.listing.address || p.listingKey}
                </div>
                <div className={`text-xs mt-0.5 ${textMuted}`}>
                  {[p.listing.price, p.listing.city,
                    p.listing.beds ? `${p.listing.beds} bd` : null,
                    p.listing.sqft ? `${p.listing.sqft.toLocaleString()} sqft` : null,
                  ].filter(Boolean).join(" · ")}
                </div>
                <div className={`text-xs mt-1 ${textMuted}`}>
                  {p.slides.length} slides
                  {p.attempt > 1 && ` · take ${p.attempt}`}
                  {" · "}
                  <span className="font-mono">reply POST {p.approvalCode}</span>
                </div>
              </div>

              {p.status === "approved" && (
                <div className="mt-2 inline-flex items-center gap-1 text-xs text-emerald-500">
                  <Clock className="w-3 h-3" /> {fmtSlot(p.scheduledFor)}
                </div>
              )}
              {p.status === "posted" && p.permalink && (
                <a href={p.permalink} target="_blank" rel="noreferrer"
                   className="mt-2 inline-flex items-center gap-1 text-xs text-blue-500 hover:underline">
                  View post <ExternalLink className="w-3 h-3" />
                </a>
              )}
              {p.status === "failed" && (
                <div className="mt-2 inline-flex items-center gap-1 text-xs text-red-500">
                  <AlertTriangle className="w-3 h-3" /> failed
                </div>
              )}
              {p.error && <p className="mt-1 text-xs text-red-500 break-words">{p.error}</p>}

              <button
                onClick={() => setOpenCaption(openCaption === p.id ? null : p.id)}
                className={`mt-2 text-xs underline ${textMuted}`}
              >
                {openCaption === p.id ? "Hide caption" : "Show caption"}
              </button>
              {openCaption === p.id && (
                <pre className={`mt-1.5 text-xs whitespace-pre-wrap font-sans ${textMuted}`}>
                  {p.caption}
                </pre>
              )}

              {!decided && (
                <div className="mt-3 flex gap-2">
                  <button
                    disabled={busy === p.id}
                    onClick={() => act(p.id, "approve")}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg
                               bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white
                               hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" /> Approve
                  </button>
                  <button
                    disabled={busy === p.id}
                    onClick={() => act(p.id, "decline")}
                    className={`inline-flex items-center justify-center gap-1.5 rounded-lg border
                                px-3 py-1.5 text-sm disabled:opacity-50
                                ${isLight ? "border-gray-300 text-gray-700 hover:bg-gray-50"
                                          : "border-gray-700 text-gray-300 hover:bg-gray-800"}`}
                  >
                    <X className="w-4 h-4" />
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
