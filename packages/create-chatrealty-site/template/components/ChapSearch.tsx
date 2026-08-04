"use client";

// CHAP presentation 2 of 3 — the full-page search experience.
//
// Mounted by app/search/page.tsx. Use this when conversational search IS the
// site's front door rather than a helper: a hero query hands off to
// /search?q=…, and the conversation owns the whole viewport.
//
// See components/ChapWidget.tsx (floating) and components/ChapPanel.tsx
// (inline). All three share lib/use-chap.ts and components/ChapMessages.tsx.
// Using this one means CHAP_PRESENTATION = "search" in lib/chap-presentation.ts
// — the route gate lives in app/search/page.tsx, which 404s otherwise, so this
// component never needs its own check.

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useChap } from "@/lib/use-chap";
import ChapMessages from "@/components/ChapMessages";

const SUGGESTIONS = [
  "3 beds under $800k with a pool",
  "Something walkable with good light",
  "What's moving in this market right now?",
];

export default function ChapSearch() {
  const { enabled, busy, msgs, send, scrollRef } = useChap();
  const [input, setInput] = useState("");
  const params = useSearchParams();
  const handoff = params.get("q");
  const sentHandoff = useRef(false);

  // A query handed over from a hero search box runs itself once the transport
  // reports ready. The ref guards React's double-effect in dev and any
  // re-render from the hook, so the visitor never sees their question twice.
  useEffect(() => {
    if (!handoff || sentHandoff.current || enabled !== true) return;
    sentHandoff.current = true;
    send(handoff);
  }, [handoff, enabled, send]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    send(input);
    setInput("");
  }

  // Unlike the floating widget, this page cannot render nothing: the visitor
  // navigated here deliberately and is owed an explanation.
  if (enabled === false) {
    return (
      <div className="mx-auto max-w-xl py-24 text-center">
        <h1 className="text-2xl font-semibold text-gray-900">Search isn’t switched on yet</h1>
        <p className="mt-3 text-gray-500">
          Conversational search needs an LLM key. Browse the listings in the meantime.
        </p>
        <a
          href="/listings"
          className="mt-6 inline-block bg-brand px-5 py-2.5 text-sm font-semibold text-white"
          style={{ borderRadius: "var(--radius)" }}
        >
          Browse listings
        </a>
      </div>
    );
  }

  if (enabled === null) {
    return <div className="py-24 text-center text-sm text-gray-400">Loading search…</div>;
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-3xl flex-col py-8">
      {msgs.length === 0 && (
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-gray-900">Ask about homes</h1>
          <p className="mt-2 text-gray-500">
            Describe what you’re after in plain language — price, neighborhood, feel.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="border border-gray-300 px-3 py-1.5 text-sm text-gray-600 transition hover:border-brand hover:text-brand"
                style={{ borderRadius: "var(--radius)" }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 space-y-5 overflow-y-auto">
        <ChapMessages msgs={msgs} busy={busy} size="md" />
      </div>

      <form onSubmit={submit} className="sticky bottom-0 mt-6 flex gap-2 bg-white py-4">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about homes…"
          className="flex-1 border border-gray-300 px-4 py-3 focus:border-brand focus:outline-none"
          style={{ borderRadius: "var(--radius)" }}
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="bg-brand px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
          style={{ borderRadius: "var(--radius)" }}
        >
          Send
        </button>
      </form>
    </div>
  );
}
