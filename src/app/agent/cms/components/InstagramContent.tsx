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
  declineReason?: string | null;
  slideFeedback?: Array<{ n: number; note: string }>;
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

function Carousel({
  slides,
  isLight,
  onEnlarge,
}: {
  slides: Slide[];
  isLight: boolean;
  onEnlarge: (slides: Slide[], index: number) => void;
}) {
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
            onClick={() => onEnlarge(slides, i)}
            title="Click to enlarge"
            className="absolute inset-0 h-full w-full object-cover cursor-zoom-in"
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

/**
 * Full-screen slide viewer. A 300px carousel is fine for "is this the right
 * house"; it is useless for "is the agent's posture wrong in slide 2" or for
 * reading text-slide copy, which is most of what review actually is.
 */
function Lightbox({
  slides,
  index,
  onClose,
  onIndex,
}: {
  slides: Slide[];
  index: number;
  onClose: () => void;
  onIndex: (i: number) => void;
}) {
  const n = slides.length;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onIndex((index + 1) % n);
      if (e.key === "ArrowLeft") onIndex((index - 1 + n) % n);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, n, onClose, onIndex]);

  const s = slides[index];
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
      >
        <X className="h-5 w-5" />
      </button>

      <img
        src={s.url}
        alt={`Slide ${s.n}`}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[88vh] max-w-full rounded-lg object-contain"
      />

      {n > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); onIndex((index - 1 + n) % n); }}
            aria-label="Previous"
            className="absolute left-2 sm:left-6 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onIndex((index + 1) % n); }}
            aria-label="Next"
            className="absolute right-2 sm:right-6 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      <div className="absolute bottom-5 left-0 right-0 text-center text-sm text-white/70">
        {s.n} / {n} · {KIND_LABEL[s.kind] || s.kind}
      </div>
    </div>
  );
}

/**
 * Decline capture.
 *
 * The whole point of declining is the REASON. Without it a decline is just a
 * deleted post and the next generation repeats the same mistakes — which is
 * exactly what happened when feedback had to travel by chat message instead.
 *
 * Notes are per-slide because that is how the problems actually arrive: slide 2
 * has a blank strip, slide 3 has the same posture as slide 2, slide 7 compares
 * the town to somewhere else. A single free-text box loses which slide each
 * point was about, and that is the one thing needed to fix it.
 */
function DeclineModal({
  post,
  isLight,
  busy,
  onCancel,
  onSubmit,
}: {
  post: PendingPost;
  isLight: boolean;
  busy: boolean;
  onCancel: () => void;
  onSubmit: (reason: string, slideFeedback: Array<{ n: number; note: string }>) => void;
}) {
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState<Record<number, string>>({});

  const field = `w-full rounded-lg border px-3 py-2 text-sm ${
    isLight
      ? "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
      : "bg-gray-950 border-gray-700 text-gray-100 placeholder-gray-500"
  }`;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-4">
      <div
        className={`w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-xl border p-5 ${
          isLight ? "bg-white border-gray-200" : "bg-gray-900 border-gray-800"
        }`}
      >
        <h3 className={`font-semibold mb-1 ${isLight ? "text-gray-900" : "text-gray-100"}`}>
          What was wrong with it?
        </h3>
        <p className={`text-xs mb-4 ${isLight ? "text-gray-500" : "text-gray-400"}`}>
          {post.listing.address}. This goes back into how the next one is generated,
          so be as specific as you like.
        </p>

        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="Overall — colour, tone, anything that applies to the whole post"
          className={`${field} mb-4`}
        />

        <div className="space-y-2 mb-4">
          {post.slides.map((s) => (
            <div key={s.n} className="flex items-start gap-2">
              <img src={s.url} alt="" className="h-16 w-[52px] shrink-0 rounded object-cover" />
              <input
                value={notes[s.n] || ""}
                onChange={(e) => setNotes((prev) => ({ ...prev, [s.n]: e.target.value }))}
                placeholder={`Slide ${s.n} (${KIND_LABEL[s.kind] || s.kind}) — what's wrong?`}
                className={field}
              />
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className={`rounded-lg border px-3 py-1.5 text-sm ${
              isLight ? "border-gray-300 text-gray-700" : "border-gray-700 text-gray-300"
            }`}
          >
            Cancel
          </button>
          <button
            disabled={busy}
            onClick={() =>
              onSubmit(
                reason.trim(),
                Object.entries(notes)
                  .map(([n, note]) => ({ n: Number(n), note: note.trim() }))
                  .filter((f) => f.note)
              )
            }
            className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white
                       hover:bg-red-700 disabled:opacity-50"
          >
            Decline &amp; send feedback
          </button>
        </div>
      </div>
    </div>
  );
}

export default function InstagramContent({ isLight }: { isLight: boolean }) {
  const [posts, setPosts] = useState<PendingPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [openCaption, setOpenCaption] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ slides: Slide[]; index: number } | null>(null);
  const [declining, setDeclining] = useState<PendingPost | null>(null);

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

  async function act(
    id: string,
    action: "approve" | "decline",
    extra?: { reason?: string; slideFeedback?: Array<{ n: number; note: string }> }
  ) {
    setBusy(id);
    try {
      const r = await fetch(`/api/agent/pending-posts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        alert(j.message || "That didn't go through.");
      }
      await load();
    } finally {
      setBusy(null);
      setDeclining(null);
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
              <Carousel slides={p.slides} isLight={isLight} onEnlarge={(sl,i)=>setLightbox({slides:sl,index:i})} />

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
                    onClick={() => setDeclining(p)}
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

      {lightbox && (
        <Lightbox
          slides={lightbox.slides}
          index={lightbox.index}
          onClose={() => setLightbox(null)}
          onIndex={(i) => setLightbox((lb) => (lb ? { ...lb, index: i } : lb))}
        />
      )}

      {declining && (
        <DeclineModal
          post={declining}
          isLight={isLight}
          busy={busy === declining.id}
          onCancel={() => setDeclining(null)}
          onSubmit={(reason, slideFeedback) =>
            act(declining.id, "decline", { reason, slideFeedback })
          }
        />
      )}
    </div>
  );
}
