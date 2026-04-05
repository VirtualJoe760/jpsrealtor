"use client";

import { CMASubject, CMATier } from "@/lib/cma/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { useTheme } from "@/app/contexts/ThemeContext";
import CMAConfidenceBadge from "./CMAConfidenceBadge";

const TIER_LABELS: Record<CMATier, { label: string; color: string }> = {
  affordable: { label: "Affordable", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  residential: { label: "Residential", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  luxury: { label: "Luxury", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
};

function fmt(n: number): string {
  return n.toLocaleString();
}

function fmtPrice(n: number): string {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(n % 100000 === 0 ? 1 : 2)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

export default function CMASubjectCard({
  subject,
  tier,
}: {
  subject: CMASubject;
  tier: CMATier;
}) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";
  const tierInfo = TIER_LABELS[tier];

  const stats = [
    { label: "Beds", value: subject.bedsTotal },
    { label: "Baths", value: subject.bathsTotal },
    { label: "Sqft", value: fmt(subject.livingArea) },
    { label: "Lot", value: subject.lotSize > 43560 ? `${(subject.lotSize / 43560).toFixed(2)} ac` : `${fmt(subject.lotSize)} sqft` },
    { label: "Year", value: subject.yearBuilt },
    { label: "$/Sqft", value: `$${subject.pricePerSqft}` },
  ];

  const features = [
    { label: "Pool", resolved: subject.resolved.pool },
    { label: "Spa", resolved: subject.resolved.spa },
    { label: "Golf", resolved: subject.resolved.golf },
    { label: "Gated", resolved: subject.resolved.gatedCommunity },
  ];

  return (
    <Card className={`${isLight ? "bg-white/80 border-gray-300" : "bg-black/40 border-neutral-800/50"} backdrop-blur-xl`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className={`text-xl md:text-2xl ${isLight ? "text-gray-900" : "text-white"}`}>
              {subject.address}
            </CardTitle>
            <p className={`text-sm mt-1 ${isLight ? "text-gray-500" : "text-neutral-400"}`}>
              {subject.subdivisionName && <span>{subject.subdivisionName} · </span>}
              {subject.city} · {subject.propertySubType}
              {subject.landType === "Lease" && <span className="text-amber-400"> · Lease Land</span>}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <div className={`text-2xl md:text-3xl font-extrabold ${isLight ? "text-blue-600" : "text-emerald-400"}`}>
              {fmtPrice(subject.listPrice)}
            </div>
            <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${tierInfo.color}`}>
              {tierInfo.label} Tier
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Quick stats */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className={`rounded-lg p-2 text-center ${isLight ? "bg-gray-50 border border-gray-200" : "bg-neutral-900/40 border border-neutral-700/30"}`}
            >
              <div className={`text-xs ${isLight ? "text-gray-500" : "text-neutral-500"}`}>{s.label}</div>
              <div className={`text-sm font-bold ${isLight ? "text-gray-900" : "text-white"}`}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Features with confidence */}
        <div className="flex flex-wrap gap-2">
          {features.map((f) => {
            const val = f.resolved.value;
            if (val === null) return null;
            return (
              <div
                key={f.label}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                  val
                    ? isLight ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    : isLight ? "bg-gray-100 border-gray-200 text-gray-500" : "bg-neutral-800 border-neutral-700 text-neutral-500"
                }`}
              >
                {f.label}: {val ? "Yes" : "No"}
                <CMAConfidenceBadge level={f.resolved.level} compact />
              </div>
            );
          })}
          {subject.view && (
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
              isLight ? "bg-indigo-50 border-indigo-200 text-indigo-700" : "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
            }`}>
              View: {subject.view}
              <CMAConfidenceBadge level={subject.resolved.view.level} compact />
            </div>
          )}
          {subject.garageSpaces > 0 && (
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
              isLight ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-blue-500/10 border-blue-500/20 text-blue-400"
            }`}>
              Garage: {subject.garageSpaces}-car
              <CMAConfidenceBadge level={subject.resolved.garage.level} compact />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
