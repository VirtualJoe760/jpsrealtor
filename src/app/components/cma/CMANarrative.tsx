"use client";

import { CMAResult } from "@/lib/cma/types";
import { useTheme } from "@/app/contexts/ThemeContext";
import { AlertCircle, Info, Lightbulb } from "lucide-react";

export default function CMANarrative({ result }: { result: CMAResult }) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  return (
    <div className="space-y-4">
      {/* Narrative */}
      {result.narrative && (
        <div className={`rounded-xl p-4 border ${
          isLight ? "bg-blue-50 border-blue-200" : "bg-blue-500/10 border-blue-500/20"
        }`}>
          <div className="flex gap-3">
            <Lightbulb className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isLight ? "text-blue-600" : "text-blue-400"}`} />
            <p className={`text-sm leading-relaxed ${isLight ? "text-blue-900" : "text-blue-200"}`}>
              {result.narrative}
            </p>
          </div>
        </div>
      )}

      {/* Limitations */}
      {result.limitations.length > 0 && (
        <div className={`rounded-xl p-4 border ${
          isLight ? "bg-amber-50 border-amber-200" : "bg-amber-500/10 border-amber-500/20"
        }`}>
          <div className="flex gap-3">
            <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isLight ? "text-amber-600" : "text-amber-400"}`} />
            <div>
              <p className={`text-sm font-semibold mb-1 ${isLight ? "text-amber-900" : "text-amber-300"}`}>
                Limitations
              </p>
              <ul className={`text-xs space-y-1 ${isLight ? "text-amber-800" : "text-amber-200/80"}`}>
                {result.limitations.map((lim, i) => (
                  <li key={i}>• {lim}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Inferences */}
      {result.inferences.length > 0 && (
        <div className={`rounded-xl p-4 border ${
          isLight ? "bg-gray-50 border-gray-200" : "bg-neutral-900/40 border-neutral-700/30"
        }`}>
          <div className="flex gap-3">
            <Info className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isLight ? "text-gray-500" : "text-neutral-400"}`} />
            <div>
              <p className={`text-sm font-semibold mb-1 ${isLight ? "text-gray-700" : "text-neutral-300"}`}>
                Data Inferences
              </p>
              <ul className={`text-xs space-y-1 ${isLight ? "text-gray-600" : "text-neutral-400"}`}>
                {result.inferences.slice(0, 8).map((inf, i) => (
                  <li key={i}>• {inf}</li>
                ))}
                {result.inferences.length > 8 && (
                  <li className="opacity-60">+ {result.inferences.length - 8} more</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Search metadata */}
      <div className={`text-xs flex flex-wrap gap-x-4 gap-y-1 ${isLight ? "text-gray-400" : "text-neutral-600"}`}>
        <span>Generated {new Date(result.generatedAt).toLocaleString()}</span>
        <span>Active: Level {result.searchCriteria.levelsUsed.active} ({result.searchCriteria.totalCandidatesEvaluated.active} evaluated)</span>
        <span>Closed: Level {result.searchCriteria.levelsUsed.closed} ({result.searchCriteria.totalCandidatesEvaluated.closed} evaluated)</span>
        <span>Range: {result.searchCriteria.sqftRangeUsed}</span>
      </div>
    </div>
  );
}
