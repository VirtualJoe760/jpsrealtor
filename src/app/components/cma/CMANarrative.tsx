"use client";

import { useState } from "react";
import { CMAResult } from "@/lib/cma/types";
import { useTheme } from "@/app/contexts/ThemeContext";
import { AlertCircle, Info, Lightbulb, ChevronDown } from "lucide-react";

export default function CMANarrative({ result }: { result: CMAResult }) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";
  const [detailsOpen, setDetailsOpen] = useState(false);

  const hasDetails = result.limitations.length > 0 || result.inferences.length > 0;

  return (
    <div className="space-y-3">
      {/* Narrative — always visible, compact */}
      {result.narrative && (
        <div className={`rounded-xl px-4 py-3 border ${
          isLight ? "bg-blue-50 border-blue-200" : "bg-blue-500/10 border-blue-500/20"
        }`}>
          <div className="flex gap-3 items-start">
            <Lightbulb className={`w-4 h-4 flex-shrink-0 mt-0.5 ${isLight ? "text-blue-600" : "text-blue-400"}`} />
            <p className={`text-sm leading-relaxed ${isLight ? "text-blue-900" : "text-blue-200"}`}>
              {result.narrative}
            </p>
          </div>
        </div>
      )}

      {/* Collapsible details — limitations, inferences, metadata */}
      {hasDetails && (
        <button
          onClick={() => setDetailsOpen(!detailsOpen)}
          className={`flex items-center gap-2 text-xs font-medium transition-colors ${
            isLight ? "text-gray-500 hover:text-gray-700" : "text-neutral-500 hover:text-neutral-300"
          }`}
        >
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${detailsOpen ? "rotate-180" : ""}`} />
          {detailsOpen ? "Hide" : "Show"} details
          {result.limitations.length > 0 && (
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
              isLight ? "bg-amber-100 text-amber-700" : "bg-amber-500/20 text-amber-400"
            }`}>
              {result.limitations.length} limitation{result.limitations.length > 1 ? "s" : ""}
            </span>
          )}
        </button>
      )}

      {detailsOpen && (
        <div className={`rounded-xl border p-4 space-y-3 text-xs ${
          isLight ? "bg-gray-50 border-gray-200" : "bg-neutral-900/30 border-neutral-800/50"
        }`}>
          {/* Limitations */}
          {result.limitations.length > 0 && (
            <div className="flex gap-2">
              <AlertCircle className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${isLight ? "text-amber-500" : "text-amber-400"}`} />
              <div className={isLight ? "text-amber-800" : "text-amber-200/80"}>
                {result.limitations.map((lim, i) => (
                  <span key={i}>{i > 0 && " · "}{lim}</span>
                ))}
              </div>
            </div>
          )}

          {/* Inferences — collapsed into a count with expand */}
          {result.inferences.length > 0 && (
            <div className="flex gap-2">
              <Info className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${isLight ? "text-gray-400" : "text-neutral-500"}`} />
              <div className={isLight ? "text-gray-600" : "text-neutral-400"}>
                {result.inferences.length} attribute{result.inferences.length > 1 ? "s" : ""} inferred from listing remarks or subdivision data.
              </div>
            </div>
          )}

          {/* Search metadata */}
          <div className={`flex flex-wrap gap-x-3 gap-y-1 pt-1 border-t ${
            isLight ? "border-gray-200 text-gray-400" : "border-neutral-800 text-neutral-600"
          }`}>
            <span>Generated {new Date(result.generatedAt).toLocaleDateString()}</span>
            <span>Active: L{result.searchCriteria.levelsUsed.active} ({result.searchCriteria.totalCandidatesEvaluated.active} evaluated)</span>
            <span>Closed: L{result.searchCriteria.levelsUsed.closed} ({result.searchCriteria.totalCandidatesEvaluated.closed} evaluated)</span>
            <span>{result.searchCriteria.sqftRangeUsed}</span>
          </div>
        </div>
      )}
    </div>
  );
}
