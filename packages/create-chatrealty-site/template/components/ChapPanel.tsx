"use client";

// CHAP presentation 3 of 3 — the inline panel.
//
// Drop it into any page as a normal block: a homepage section, a sidebar on
// /listings, the bottom of a neighborhood page. Use this when search should be
// part of the page's flow rather than floating over it or owning a route.
//
//   <ChapPanel title="Ask about this neighborhood" height={420} />
//
// See components/ChapWidget.tsx (floating) and components/ChapSearch.tsx
// (full page). All three share lib/use-chap.ts and components/ChapMessages.tsx.

import { useState } from "react";
import { useChap } from "@/lib/use-chap";
import ChapMessages from "@/components/ChapMessages";

export default function ChapPanel({
  title = "Ask about homes",
  subtitle = "Live listing search — describe what you’re after.",
  height = 460,
}: {
  title?: string;
  subtitle?: string;
  height?: number;
}) {
  const { enabled, busy, msgs, send, scrollRef } = useChap();
  const [input, setInput] = useState("");

  // Inline, so it holds a slot in the page's layout. Rendering nothing would
  // leave a gap mid-page; rendering an error would be noise next to real
  // content. It just stays quiet until it has something to offer.
  if (enabled !== true) return null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    send(input);
    setInput("");
  }

  return (
    <section
      className="flex flex-col overflow-hidden border border-gray-200 bg-white"
      style={{ height, borderRadius: "var(--radius)" }}
    >
      <div className="border-b border-gray-200 px-5 py-4">
        <h2 className="font-semibold text-gray-900">{title}</h2>
        <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-5">
        <ChapMessages
          msgs={msgs}
          busy={busy}
          empty={<p className="text-sm text-gray-400">Try “3 beds under $800k with a pool”.</p>}
        />
      </div>

      <form onSubmit={submit} className="flex gap-2 border-t border-gray-200 p-4">
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
    </section>
  );
}
