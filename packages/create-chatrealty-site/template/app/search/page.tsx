// /search — the full-page CHAP presentation.
//
// Ships wired but UNLINKED: nothing in the nav points here by default, so a
// build that keeps the floating widget is unaffected and this route simply
// goes unvisited. A build that chooses the full-page presentation links it in
// the nav (and usually points a hero search box at /search?q=…) and deletes
// <ChapWidget /> from app/layout.tsx.
//
// Suspense is required, not decorative: ChapSearch reads useSearchParams to
// pick up a handed-off hero query, and Next needs a boundary around any client
// component that does, or the whole route opts out of static rendering.
import { Suspense } from "react";
import ChapSearch from "@/components/ChapSearch";

export const metadata = {
  title: "Search",
  description: "Ask about homes in plain language.",
};

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="py-24 text-center text-sm text-gray-400">Loading search…</div>}>
      <ChapSearch />
    </Suspense>
  );
}
