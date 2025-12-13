// src/app/components/chat/SourceBubble.tsx
// Source citation bubble component for chat responses

"use client";

import { useState } from "react";
import { Globe, FileText, Database, BarChart3 } from "lucide-react";
import { useTheme, useThemeClasses } from "@/app/contexts/ThemeContext";
import AnalyticsFormulaModal from "./AnalyticsFormulaModal";

export type SourceType =
  | { type: "web"; url: string; domain: string }
  | { type: "mls"; name: string; abbreviation: string }
  | { type: "article"; category: string; slug: string; title: string }
  | { type: "analytics"; metric: string };

export interface SourceBubbleProps {
  source: SourceType;
}

export default function SourceBubble({ source }: SourceBubbleProps) {
  const { currentTheme } = useTheme();
  const { textPrimary, textSecondary } = useThemeClasses();
  const isLight = currentTheme === "lightgradient";
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);

  const handleClick = () => {
    if (source.type === "web") {
      window.open(source.url, "_blank", "noopener,noreferrer");
    } else if (source.type === "article") {
      window.open(`/insights/${source.category}/${source.slug}`, "_blank", "noopener,noreferrer");
    } else if (source.type === "analytics") {
      setShowAnalyticsModal(true);
    }
    // MLS sources don't have a click action
  };

  const getIcon = () => {
    switch (source.type) {
      case "web":
        return <Globe className="w-3.5 h-3.5" />;
      case "mls":
        return <Database className="w-3.5 h-3.5" />;
      case "article":
        return <FileText className="w-3.5 h-3.5" />;
      case "analytics":
        return <BarChart3 className="w-3.5 h-3.5" />;
    }
  };

  const getLabel = () => {
    switch (source.type) {
      case "web":
        return source.domain;
      case "mls":
        return source.abbreviation;
      case "article":
        return source.category.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
      case "analytics":
        return "chatRealty AI Analytics";
    }
  };

  const isClickable = source.type !== "mls";

  return (
    <>
      <button
        onClick={isClickable ? handleClick : undefined}
        disabled={!isClickable}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
          isClickable ? "cursor-pointer" : "cursor-default"
        } ${
          isLight
            ? isClickable
              ? "bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200"
              : "bg-gray-100 text-gray-600 border border-gray-200"
            : isClickable
              ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
              : "bg-gray-800 text-gray-400 border border-gray-700"
        }`}
      >
        {getIcon()}
        <span>{getLabel()}</span>
      </button>

      {/* Analytics Formula Modal */}
      {source.type === "analytics" && showAnalyticsModal && (
        <AnalyticsFormulaModal
          metric={source.metric}
          onClose={() => setShowAnalyticsModal(false)}
        />
      )}
    </>
  );
}

/**
 * SourceBubbles component - Displays multiple source citations
 */
export function SourceBubbles({ sources }: { sources: SourceType[] }) {
  const { textMuted } = useThemeClasses();

  if (!sources || sources.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 mt-3">
      <span className={`text-xs ${textMuted}`}>Sources:</span>
      {sources.map((source, index) => (
        <SourceBubble key={index} source={source} />
      ))}
    </div>
  );
}
