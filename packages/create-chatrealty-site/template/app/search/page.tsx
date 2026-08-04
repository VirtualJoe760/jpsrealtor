// /search — the full-page CHAP presentation.
//
// This route exists only when CHAP_PRESENTATION = "search"; otherwise it 404s.
// It used to ship "wired but unlinked", on the theory that an unlinked route
// goes unvisited — but unlinked is not unreachable. A build dropped
// <HeroSearch /> in the hero, which routes here, while the floating widget was
// still mounted in the layout: two live CHAP front doors on one site. A route
// the site has not chosen should not answer, so now it doesn't.
//
// Suspense is required, not decorative: ChapSearch reads useSearchParams to
// pick up a handed-off hero query, and Next needs a boundary around any client
// component that does, or the whole route opts out of static rendering.
import { Suspense } from "react";
import { notFound } from "next/navigation";
import ChapSearch from "@/components/ChapSearch";
import { CHAP_PRESENTATION } from "@/lib/chap-presentation";

export const metadata = {
  title: "Search",
  description: "Ask about homes in plain language.",
};

export default function SearchPage() {
  if (CHAP_PRESENTATION !== "search") notFound();

  return (
    <Suspense fallback={<div className="py-24 text-center text-sm text-gray-400">Loading search…</div>}>
      <ChapSearch />
    </Suspense>
  );
}
