"use client";

import React, { useState } from "react";
import { useTheme } from "@/app/contexts/ThemeContext";

type Confidence = "high" | "medium" | "low" | "insufficient";

interface Quality {
  confidence: Confidence;
  hasEnoughClosed: boolean;
  hasEnoughActive: boolean;
  notes: string[];
}

interface CmaStats {
  quality: Quality;
  closed: { count: number; [key: string]: unknown };
  [key: string]: unknown;
}

const CONFIDENCE_CONFIG: Record<
  Confidence,
  { label: string; lightBg: string; darkBg: string; text: string }
> = {
  high: {
    label: "High Confidence",
    lightBg: "bg-green-100 border-green-300",
    darkBg: "bg-green-900/30 border-green-700/40",
    text: "text-green-700 dark:text-green-400",
  },
  medium: {
    label: "Medium Confidence",
    lightBg: "bg-yellow-100 border-yellow-300",
    darkBg: "bg-yellow-900/30 border-yellow-700/40",
    text: "text-yellow-700 dark:text-yellow-400",
  },
  low: {
    label: "Low Confidence",
    lightBg: "bg-orange-100 border-orange-300",
    darkBg: "bg-orange-900/30 border-orange-700/40",
    text: "text-orange-700 dark:text-orange-400",
  },
  insufficient: {
    label: "Insufficient Data",
    lightBg: "bg-red-100 border-red-300",
    darkBg: "bg-red-900/30 border-red-700/40",
    text: "text-red-700 dark:text-red-400",
  },
};

export default function CmaQualityBadge({
  cmaStats,
}: {
  cmaStats: CmaStats;
}) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";
  const [showNotes, setShowNotes] = useState(false);

  const { quality, closed } = cmaStats;
  const config = CONFIDENCE_CONFIG[quality.confidence];

  return (
    <div className="relative inline-block">
      <button
        type="button"
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border cursor-default ${
          isLight ? config.lightBg : config.darkBg
        } ${isLight ? config.text.split(" ")[0] : config.text.split(" ")[1]?.replace("dark:", "") || config.text.split(" ")[0]}`}
        onMouseEnter={() => setShowNotes(true)}
        onMouseLeave={() => setShowNotes(false)}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            quality.confidence === "high"
              ? "bg-green-500"
              : quality.confidence === "medium"
                ? "bg-yellow-500"
                : quality.confidence === "low"
                  ? "bg-orange-500"
                  : "bg-red-500"
          }`}
        />
        {config.label}
        <span
          className={`ml-1 ${isLight ? "text-gray-500" : "text-gray-400"}`}
        >
          · Based on {closed.count} closed sale{closed.count !== 1 ? "s" : ""}
        </span>
      </button>

      {showNotes && quality.notes.length > 0 && (
        <div
          className={`absolute z-50 top-full mt-1 left-0 w-64 rounded-lg border p-3 text-xs shadow-lg ${
            isLight
              ? "bg-white border-gray-200 text-gray-700"
              : "bg-gray-900 border-gray-700 text-gray-300"
          }`}
        >
          <p className="font-medium mb-1">Notes</p>
          <ul className="space-y-1">
            {quality.notes.map((note, i) => (
              <li key={i} className="flex gap-1.5">
                <span className="text-gray-400">·</span>
                {note}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
