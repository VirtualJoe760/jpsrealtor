"use client";

import { useEffect, useState } from "react";
import { useTheme } from "@/app/contexts/ThemeContext";
import { Sparkles, RefreshCw } from "lucide-react";

interface CmaMarketNarrativeProps {
  slug: string;
}

export default function CmaMarketNarrative({ slug }: CmaMarketNarrativeProps) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  const [narrative, setNarrative] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchNarrative = async () => {
    setIsLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/cma/subdivision/${slug}/narrative`);
      if (res.ok) {
        const data = await res.json();
        setNarrative(data.narrative);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNarrative();
  }, [slug]);

  if (error) return null;

  return (
    <div
      className={`rounded-xl p-5 md:p-6 ${
        isLight
          ? "bg-gradient-to-br from-blue-50/80 to-indigo-50/60 border border-blue-200/60"
          : "bg-gradient-to-br from-blue-950/30 to-indigo-950/20 border border-blue-800/40"
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles
            className={`w-4 h-4 ${
              isLight ? "text-blue-500" : "text-blue-400"
            }`}
          />
          <h4
            className={`text-sm font-semibold ${
              isLight ? "text-blue-800" : "text-blue-300"
            }`}
          >
            Market Insight
          </h4>
        </div>
        {!isLoading && (
          <button
            onClick={fetchNarrative}
            className={`p-1.5 rounded-lg transition-colors ${
              isLight
                ? "hover:bg-blue-100 text-blue-400"
                : "hover:bg-blue-900/30 text-blue-500"
            }`}
            title="Refresh analysis"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          <div
            className={`h-4 rounded-full w-full ${
              isLight ? "bg-blue-200/60" : "bg-blue-800/30"
            }`}
          />
          <div
            className={`h-4 rounded-full w-11/12 ${
              isLight ? "bg-blue-200/60" : "bg-blue-800/30"
            }`}
          />
          <div
            className={`h-4 rounded-full w-4/5 ${
              isLight ? "bg-blue-200/60" : "bg-blue-800/30"
            }`}
          />
          <div
            className={`h-4 rounded-full w-full mt-4 ${
              isLight ? "bg-blue-200/60" : "bg-blue-800/30"
            }`}
          />
          <div
            className={`h-4 rounded-full w-10/12 ${
              isLight ? "bg-blue-200/60" : "bg-blue-800/30"
            }`}
          />
        </div>
      ) : (
        <div
          className={`text-sm leading-relaxed space-y-3 ${
            isLight ? "text-gray-700" : "text-gray-300"
          }`}
        >
          {narrative.split("\n\n").map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      )}

      <p
        className={`text-[10px] mt-3 ${
          isLight ? "text-blue-400" : "text-blue-600"
        }`}
      >
        Market analysis powered by AI
      </p>
    </div>
  );
}
