"use client";

// A search box that hands its query to the full-page CHAP experience.
//
// Companion to components/ChapSearch.tsx: drop it in a hero, the visitor types
// a sentence, and /search picks the query up and answers it on arrival.
//
// It hands off to /search, so it only works when the site has chosen the
// full-page presentation (CHAP_PRESENTATION = "search"). Under any other
// choice /search 404s, so this box would send visitors to a dead end — it
// renders nothing instead, and says why in dev. A build once shipped this in
// the hero with the floating widget still mounted, giving one site two CHAP
// front doors; picking the constant is now the whole decision.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CHAP_PRESENTATION, warnWrongPresentation } from "@/lib/chap-presentation";

export default function HeroSearch({
  placeholder = "Ask about homes — “3 beds under $800k with a pool”",
  cta = "Search",
}: {
  placeholder?: string;
  cta?: string;
}) {
  const [q, setQ] = useState("");
  const router = useRouter();

  // Nothing to hand off to — /search only exists under the full-page choice.
  if (CHAP_PRESENTATION !== "search") {
    warnWrongPresentation("HeroSearch", "search");
    return null;
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const query = q.trim();
        // An empty box still goes to /search rather than doing nothing — the
        // page opens with its own prompt and suggestions, which is a better
        // answer than an unresponsive button.
        router.push(query ? `/search?q=${encodeURIComponent(query)}` : "/search");
      }}
      className="flex w-full max-w-xl gap-2"
    >
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        aria-label="Ask about homes"
        className="flex-1 border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 focus:border-brand focus:outline-none"
        style={{ borderRadius: "var(--radius)" }}
      />
      <button
        type="submit"
        className="bg-brand px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
        style={{ borderRadius: "var(--radius)" }}
      >
        {cta}
      </button>
    </form>
  );
}
