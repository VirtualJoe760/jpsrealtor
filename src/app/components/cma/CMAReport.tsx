"use client";

import { useState, useEffect, useRef } from "react";
import { CMAResult, cmaCompsToMapListings } from "@/lib/cma/types";
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

// ─── Scroll-reveal wrapper ───
function RevealSection({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      } ${className}`}
    >
      {children}
    </div>
  );
}

interface CMAReportProps {
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

  const sectionClass = `rounded-2xl p-5 md:p-6 backdrop-blur-xl shadow-xl ${
    isLight
      ? "bg-white/80 border border-gray-200"
      : "bg-black/40 border border-neutral-800/50"
  }`;

  const sectionTitle = `text-lg md:text-xl font-bold flex items-center gap-2 mb-4 ${
    isLight ? "text-gray-900" : "text-white"
  }`;

  const bar = (color: string) => (
    <div className={`w-1 h-5 rounded-full bg-gradient-to-b ${color}`} />
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <RevealSection>
        <div className="text-center mb-1">
          <h2 className={`text-2xl md:text-3xl font-bold ${isLight ? "text-gray-900" : "text-white"}`}>
            Comparative Market Analysis
          </h2>
          <p className={`text-xs mt-1 ${isLight ? "text-gray-400" : "text-neutral-500"}`}>
            {result.tier.charAt(0).toUpperCase() + result.tier.slice(1)} Tier · {result.activeComps.length} active · {result.closedComps.length} closed
          </p>
        </div>
      </RevealSection>

      {/* Subject + Narrative — side by side on desktop */}
      <RevealSection>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <CMASubjectCard subject={result.subject} tier={result.tier} />
          </div>
          <div className="flex flex-col justify-between">
            <CMANarrative result={result} />
          </div>
        </div>
      </RevealSection>

      {/* Active Comps */}
      {result.activeComps.length > 0 && (
        <RevealSection>
          <div className={sectionClass}>
            <h3 className={sectionTitle}>
              {bar("from-emerald-400 to-green-400")}
              Active Properties ({result.activeComps.length})
            </h3>
            <CMACompTable
              title="Active Comparables"
              comps={result.activeComps}
              stats={result.stats.active}
              isClosed={false}
            />
          </div>
        </RevealSection>
      )}

      {/* Closed Comps */}
      {result.closedComps.length > 0 && (
        <RevealSection>
          <div className={sectionClass}>
            <h3 className={sectionTitle}>
              {bar("from-blue-400 to-cyan-400")}
              Closed Properties ({result.closedComps.length})
            </h3>
            <CMACompTable
              title="Closed Comparables"
              comps={result.closedComps}
              stats={result.stats.closed}
              isClosed={true}
            />
          </div>
        </RevealSection>
      )}

      {/* Charts — 2x2 grid */}
      {allComps.length >= 2 && (
        <RevealSection>
          <div className={sectionClass}>
            <h3 className={sectionTitle}>
              {bar("from-purple-400 to-indigo-400")}
              Market Analysis
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <h4 className={`text-xs font-semibold mb-2 ${isLight ? "text-gray-500" : "text-neutral-400"}`}>
                  List vs Sale $/SqFt
                </h4>
                <PricePerSqftBar subject={result.subject} closedComps={result.closedComps} />
              </div>
              <div>
                <h4 className={`text-xs font-semibold mb-2 ${isLight ? "text-gray-500" : "text-neutral-400"}`}>
                  Sale Price Trend
                </h4>
                <PriceTrendLine closedComps={result.closedComps} />
              </div>
              <div>
                <h4 className={`text-xs font-semibold mb-2 ${isLight ? "text-gray-500" : "text-neutral-400"}`}>
                  Days on Market
                </h4>
                <DaysOnMarketBar comps={allComps} />
              </div>
              <div>
                <h4 className={`text-xs font-semibold mb-2 ${isLight ? "text-gray-500" : "text-neutral-400"}`}>
                  Sale vs List Price
                </h4>
                <SalePriceRatioPie closedComps={result.closedComps} />
              </div>
            </div>
          </div>
        </RevealSection>
      )}

      {/* Map */}
      {mapListings.length > 1 && (
        <RevealSection>
          <div className={sectionClass}>
            <h3 className={sectionTitle}>
              {bar("from-cyan-400 to-teal-400")}
              Comparable Properties Map
            </h3>
            <ListingsMap
              listings={mapListings}
              height="350px"
              center={{
                latitude: result.subject.latitude,
                longitude: result.subject.longitude,
              }}
              zoom={14}
              selectedListingKey={result.subject.listingKey}
            />
          </div>
        </RevealSection>
      )}
    </div>
  );
}
