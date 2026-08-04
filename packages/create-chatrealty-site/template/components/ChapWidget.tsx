"use client";

// CHAP presentation 1 of 3 — the floating widget.
//
// Sits bottom-right on every page, mounted from app/layout.tsx. Good default
// when search is a convenience rather than the point of the site.
//
// The other two presentations are components/ChapPanel.tsx (inline in a page)
// and components/ChapSearch.tsx (a full-page /search experience). All three
// share lib/use-chap.ts and components/ChapMessages.tsx — pick ONE by setting
// CHAP_PRESENTATION in lib/chap-presentation.ts.
//
// This stays mounted in app/layout.tsx no matter which you pick: when the
// choice is not "widget" it renders nothing, so you do not have to remember to
// remove it. That forgotten removal is exactly how a site once shipped with a
// floating widget AND a full-page search both reachable.

import { useState } from "react";
import { useChap } from "@/lib/use-chap";
import ChapMessages from "@/components/ChapMessages";
import { CHAP_PRESENTATION } from "@/lib/chap-presentation";

export default function ChapWidget() {
  const { enabled, busy, msgs, send, scrollRef } = useChap();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");

  // Not the chosen presentation — stand down silently. No warning: the widget
  // ships pre-mounted in the layout, so a site using the panel or full-page
  // search reaches this on every render by design, not by mistake.
  if (CHAP_PRESENTATION !== "widget") return null;

  // A floating button is decoration when chat is off, so it simply does not
  // appear — unlike the full-page presentation, which owes the visitor an
  // explanation because they navigated somewhere on purpose.
  if (!enabled) return null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    send(input);
    setInput("");
  }

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Chat about listings"
        className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white shadow-lg transition hover:scale-105"
      >
        {open ? (
          <span className="text-xl leading-none">×</span>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
            <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7a8.5 8.5 0 1 1 16.1-3.8z" />
          </svg>
        )}
      </button>

      {open && (
        <div
          className="fixed bottom-24 right-5 z-40 flex h-[520px] w-[min(92vw,380px)] flex-col overflow-hidden border border-gray-200 bg-white shadow-2xl"
          style={{ borderRadius: "calc(var(--radius) * 1.5)" }}
        >
          <div className="bg-brand px-4 py-3 text-white">
            <p className="text-sm font-semibold">Ask about homes</p>
            <p className="text-xs text-white/70">
              Live listing search — try “3 beds under $800k with a pool”
            </p>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            <ChapMessages
              msgs={msgs}
              busy={busy}
              empty={
                <p className="text-sm text-gray-400">
                  Ask about price ranges, neighborhoods, pools, or the market.
                </p>
              }
            />
          </div>

          <form onSubmit={submit} className="flex gap-2 border-t border-gray-200 p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about homes…"
              className="flex-1 border border-gray-300 px-3 py-2 text-sm focus:border-brand focus:outline-none"
              style={{ borderRadius: "var(--radius)" }}
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              style={{ borderRadius: "var(--radius)" }}
            >
              Send
            </button>
          </form>
        </div>
      )}
    </>
  );
}
