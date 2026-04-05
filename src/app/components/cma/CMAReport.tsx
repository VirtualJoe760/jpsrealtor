"use client";

import { useState, useEffect } from "react";
import { CMAResult } from "@/lib/cma/types";
import { cmaCompsToMapListings } from "@/lib/cma/engine";
import { useTheme } from "@/app/contexts/ThemeContext";
import CMASubjectCard from "./CMASubjectCard";
import CMACompTable from "./CMACompTable";
import CMANarrative from "./CMANarrative";
import ListingsMap from "@/app/components/map/ListingsMap";
import PricePerSqftBar from "./charts/PricePerSqftBar";
import PriceTrendLine from "./charts/PriceTrendLine";
import DaysOnMarketBar from "./charts/DaysOnMarketBar";
import SalePriceRatioPie from "./charts/SalePriceRatioPie";
import SqftComparisonBar from "./charts/SqftComparisonBar";

interface CMAReportProps {
  /** Pass a pre-generated result, OR provide a listingKey to fetch */
  result?: CMAResult;
  listingKey?: string;
}

export default function CMAReport({ result: preloadedResult, listingKey }: CMAReportProps) {
  const [result, setResult] = useState<CMAResult | null>(preloadedResult || null);
  const [loading, setLoading] = useState(!preloadedResult);
  const [error, setError] = useState<string | null>(null);
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  useEffect(() => {
    if (preloadedResult || !listingKey) return;

    setLoading(true);
    fetch("/api/cma/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingKey }),
    })
      .then(r => {
        if (!r.ok) throw new Error(`CMA generation failed: ${r.status}`);
        return r.json();
      })
      .then(data => {
        if (data.error) throw new Error(data.error);
        setResult(data);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [listingKey, preloadedResult]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex flex-col items-center gap-4">
          <div className={`animate-spin rounded-full h-10 w-10 border-b-2 ${isLight ? "border-blue-600" : "border-emerald-500"}`} />
          <p className={`text-sm ${isLight ? "text-gray-500" : "text-neutral-400"}`}>
            Generating Comparative Market Analysis...
          </p>
          <p className={`text-xs ${isLight ? "text-gray-400" : "text-neutral-500"}`}>
            Searching comparable properties, resolving attributes, scoring matches
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className={`rounded-xl p-6 text-center ${isLight ? "bg-red-50 text-red-700" : "bg-red-500/10 text-red-400"}`}>
          <p className="font-semibold mb-1">CMA Generation Failed</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!result) return null;

  const mapListings = cmaCompsToMapListings(result);
  const allComps = [...result.activeComps, ...result.closedComps];

  const sectionClass = `rounded-2xl p-6 md:p-8 backdrop-blur-xl shadow-2xl ${
    isLight
      ? "bg-white/80 border-2 border-gray-300"
      : "bg-black/40 border border-neutral-800/50"
  }`;

  const sectionTitle = `text-xl md:text-2xl font-bold flex items-center gap-2 mb-4 ${
    isLight ? "text-gray-900" : "text-white"
  }`;

  const accentBar = (color: string) => (
    <div className={`w-1 h-6 rounded-full bg-gradient-to-b ${color}`} />
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="text-center mb-2">
        <h1 className={`text-3xl md:text-4xl font-bold ${isLight ? "text-gray-900" : "text-white"}`}>
          Comparative Market Analysis
        </h1>
        <p className={`text-sm mt-1 ${isLight ? "text-gray-500" : "text-neutral-400"}`}>
          Residential CMA · {result.tier.charAt(0).toUpperCase() + result.tier.slice(1)} Tier
        </p>
      </div>

      {/* Subject Property */}
      <CMASubjectCard subject={result.subject} tier={result.tier} />

      {/* Narrative */}
      <CMANarrative result={result} />

      {/* Active Comps Table */}
      <div className={sectionClass}>
        <h2 className={sectionTitle}>
          {accentBar("from-emerald-400 to-green-400")}
          Active Properties
        </h2>
        <CMACompTable
          title="Active Comparables"
          comps={result.activeComps}
          stats={result.stats.active}
          isClosed={false}
        />
      </div>

      {/* Closed Comps Table */}
      <div className={sectionClass}>
        <h2 className={sectionTitle}>
          {accentBar("from-blue-400 to-cyan-400")}
          Closed Properties
        </h2>
        <CMACompTable
          title="Closed Comparables"
          comps={result.closedComps}
          stats={result.stats.closed}
          isClosed={true}
        />
      </div>

      {/* Charts Grid */}
      {allComps.length >= 2 && (
        <div className={sectionClass}>
          <h2 className={sectionTitle}>
            {accentBar("from-purple-400 to-indigo-400")}
            Market Analysis Charts
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Price per sqft comparison */}
            <div>
              <h3 className={`text-sm font-semibold mb-2 ${isLight ? "text-gray-700" : "text-neutral-300"}`}>
                List vs Sale Price per SqFt
              </h3>
              <PricePerSqftBar subject={result.subject} closedComps={result.closedComps} />
            </div>

            {/* Price trend */}
            <div>
              <h3 className={`text-sm font-semibold mb-2 ${isLight ? "text-gray-700" : "text-neutral-300"}`}>
                Closed Sale Prices Over Time
              </h3>
              <PriceTrendLine closedComps={result.closedComps} />
            </div>

            {/* Days on market */}
            <div>
              <h3 className={`text-sm font-semibold mb-2 ${isLight ? "text-gray-700" : "text-neutral-300"}`}>
                Days on Market
              </h3>
              <DaysOnMarketBar comps={allComps} />
            </div>

            {/* Sale price ratio */}
            <div>
              <h3 className={`text-sm font-semibold mb-2 ${isLight ? "text-gray-700" : "text-neutral-300"}`}>
                Sale Price vs List Price
              </h3>
              <SalePriceRatioPie closedComps={result.closedComps} />
            </div>

            {/* Sqft comparison */}
            <div className="md:col-span-2">
              <h3 className={`text-sm font-semibold mb-2 ${isLight ? "text-gray-700" : "text-neutral-300"}`}>
                Living Area Comparison
              </h3>
              <SqftComparisonBar subject={result.subject} comps={allComps} />
            </div>
          </div>
        </div>
      )}

      {/* Map */}
      {mapListings.length > 1 && (
        <div className={sectionClass}>
          <h2 className={sectionTitle}>
            {accentBar("from-cyan-400 to-teal-400")}
            Comparable Properties Map
          </h2>
          <ListingsMap
            listings={mapListings}
            height="400px"
            center={{
              latitude: result.subject.latitude,
              longitude: result.subject.longitude,
            }}
            zoom={14}
            selectedListingKey={result.subject.listingKey}
          />
        </div>
      )}
    </div>
  );
}
