"use client";

import { ConfidenceLevel } from "@/lib/cma/types";

const BADGE_MAP: Record<ConfidenceLevel, { icon: string; label: string; color: string }> = {
  confirmed: { icon: "✓", label: "Confirmed", color: "text-emerald-500" },
  "inferred-remarks": { icon: "✓~", label: "From remarks", color: "text-blue-400" },
  "inferred-subdivision": { icon: "~", label: "From subdivision data", color: "text-amber-400" },
  "inferred-neighbor": { icon: "~", label: "From nearby homes", color: "text-amber-500" },
  unknown: { icon: "?", label: "Unknown", color: "text-gray-500" },
};

export default function CMAConfidenceBadge({
  level,
  compact = false,
}: {
  level: ConfidenceLevel;
  compact?: boolean;
}) {
  const badge = BADGE_MAP[level];

  return (
    <span
      className={`inline-flex items-center gap-0.5 font-mono text-xs ${badge.color}`}
      title={badge.label}
    >
      {badge.icon}
      {!compact && <span className="text-[10px] opacity-70">{badge.label}</span>}
    </span>
  );
}
