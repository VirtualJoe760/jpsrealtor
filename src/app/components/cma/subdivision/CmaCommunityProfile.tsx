"use client";

import React from "react";
import { useTheme } from "@/app/contexts/ThemeContext";

interface Profile {
  sampleSize: number;
  dominantSubType: string;
  poolCommunity: boolean | null;
  spaCommunity: boolean | null;
  viewCommunity: boolean | null;
  gatedCommunity: boolean | null;
  seniorCommunity: boolean | null;
  typicalGarage: number;
  typicalBeds: number;
  typicalBaths: number;
  typicalSqftRange: { p25: number; median: number; p75: number };
  typicalYearBuiltRange: { p25: number; median: number; p75: number };
}

interface CmaStats {
  profile: Profile;
  [key: string]: unknown;
}

function fmtNum(n: number): string {
  return n.toLocaleString();
}

const AMENITIES: {
  key: keyof Pick<
    Profile,
    | "poolCommunity"
    | "spaCommunity"
    | "viewCommunity"
    | "gatedCommunity"
    | "seniorCommunity"
  >;
  label: string;
}[] = [
  { key: "poolCommunity", label: "Pool" },
  { key: "spaCommunity", label: "Spa" },
  { key: "viewCommunity", label: "Views" },
  { key: "gatedCommunity", label: "Gated" },
  { key: "seniorCommunity", label: "55+" },
];

export default function CmaCommunityProfile({
  cmaStats,
}: {
  cmaStats: CmaStats;
}) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";
  const { profile } = cmaStats;

  const cardClass = isLight
    ? "bg-white/70 border border-gray-200 shadow-sm"
    : "bg-white/5 border border-white/10";

  const labelClass = isLight ? "text-gray-500" : "text-gray-400";
  const valueClass = isLight ? "text-gray-900" : "text-white";
  const mutedClass = isLight ? "text-gray-400" : "text-gray-500";

  return (
    <div className={`rounded-xl p-5 space-y-5 ${cardClass}`}>
      {/* Dominant property type */}
      <div className="flex items-center gap-2">
        <span
          className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
            isLight
              ? "bg-blue-100 text-blue-700 border border-blue-200"
              : "bg-blue-900/30 text-blue-400 border border-blue-700/40"
          }`}
        >
          {profile.dominantSubType}
        </span>
        <span className={`text-xs ${labelClass}`}>dominant property type</span>
      </div>

      {/* Typical beds / baths / garage */}
      <div className="flex items-center gap-6">
        {[
          { label: "Beds", value: profile.typicalBeds },
          { label: "Baths", value: profile.typicalBaths },
          { label: "Garage", value: profile.typicalGarage },
        ].map(({ label, value }) => (
          <div key={label} className="flex flex-col items-center">
            <span className={`text-lg font-semibold ${valueClass}`}>
              {value}
            </span>
            <span className={`text-xs ${labelClass}`}>{label}</span>
          </div>
        ))}
      </div>

      {/* Sqft range */}
      <div>
        <p className={`text-xs font-medium mb-1 ${labelClass}`}>
          Living Area
        </p>
        <p className={`text-sm ${valueClass}`}>
          {fmtNum(profile.typicalSqftRange.p25)} –{" "}
          {fmtNum(profile.typicalSqftRange.p75)} sqft
          <span className={`ml-1 text-xs ${mutedClass}`}>
            (median {fmtNum(profile.typicalSqftRange.median)})
          </span>
        </p>
      </div>

      {/* Year built range */}
      <div>
        <p className={`text-xs font-medium mb-1 ${labelClass}`}>Year Built</p>
        <p className={`text-sm ${valueClass}`}>
          Built {profile.typicalYearBuiltRange.p25} –{" "}
          {profile.typicalYearBuiltRange.p75}
        </p>
      </div>

      {/* Amenity badges */}
      <div>
        <p className={`text-xs font-medium mb-2 ${labelClass}`}>
          Community Amenities
        </p>
        <div className="flex flex-wrap gap-2">
          {AMENITIES.map(({ key, label }) => {
            const val = profile[key];
            let chipClass: string;

            if (val === true) {
              chipClass = isLight
                ? "bg-green-100 text-green-700 border-green-300"
                : "bg-green-900/30 text-green-400 border-green-700/40";
            } else if (val === false) {
              chipClass = isLight
                ? "bg-red-50 text-red-400 border-red-200"
                : "bg-red-900/20 text-red-400/60 border-red-800/30";
            } else {
              chipClass = isLight
                ? "bg-gray-100 text-gray-400 border-gray-200"
                : "bg-gray-800/40 text-gray-500 border-gray-700/40";
            }

            return (
              <span
                key={key}
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${chipClass}`}
              >
                {val === true ? "✓" : val === false ? "✗" : "—"} {label}
              </span>
            );
          })}
        </div>
      </div>

      {/* Sample size */}
      <p className={`text-xs pt-1 border-t ${mutedClass} ${isLight ? "border-gray-200" : "border-white/10"}`}>
        Based on {profile.sampleSize} comparable propert
        {profile.sampleSize !== 1 ? "ies" : "y"}
      </p>
    </div>
  );
}
