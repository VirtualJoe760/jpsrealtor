"use client";

import React, { useEffect, useState, useRef } from "react";
import { useTheme } from "@/app/contexts/ThemeContext";
import CmaMarketSnapshot from "./CmaMarketSnapshot";
import CmaMarketNarrative from "./CmaMarketNarrative";
import CmaQualityBadge from "./CmaQualityBadge";
import CmaActiveVsClosed from "./CmaActiveVsClosed";
import CmaSubTypeBreakdown from "./CmaSubTypeBreakdown";
import CmaPriceMetrics from "./CmaPriceMetrics";
import CmaSalesTimeline from "./CmaSalesTimeline";
import CmaCompsTable from "./CmaCompsTable";
import ChartErrorBoundary from "../ChartErrorBoundary";

interface SubdivisionCmaSectionProps {
  slug: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */

function SectionLabel({ label, isLight }: { label: string; isLight: boolean }) {
  return (
    <h3
      className={`text-xs font-semibold uppercase tracking-wider mb-2 ${
        isLight ? "text-gray-500" : "text-gray-500"
      }`}
    >
      {label}
    </h3>
  );
}

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-gray-300/20 ${className ?? "h-40 w-full"}`}
    />
  );
}

export default function SubdivisionCmaSection({ slug }: SubdivisionCmaSectionProps) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  const [cmaStats, setCmaStats] = useState<any>(null);
  const [salesHistory, setSalesHistory] = useState<any[]>([]);
  const [city, setCity] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  // Lazy-load: only fetch CMA when section scrolls into view
  // This prevents the slow CMA generation from affecting Core Web Vitals (LCP/CLS)
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' } // Start loading 200px before it's visible
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    let cancelled = false;

    async function fetchCma() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/cma/subdivision/${slug}`);
        if (!res.ok) throw new Error(`Failed to load CMA data (${res.status})`);
        const data = await res.json();
        if (!cancelled) {
          setCmaStats(data.cmaStats ?? data);
          setSalesHistory(data.salesHistory || []);
          setCity(data.city || "");
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message ?? "Failed to load data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchCma();
    return () => {
      cancelled = true;
    };
  }, [slug, isVisible]);

  // Placeholder before visible (reserves space, prevents CLS)
  if (!isVisible || loading) {
    return (
      <div ref={sectionRef} className="space-y-4" style={{ contentVisibility: 'auto', containIntrinsicSize: '0 600px' }}>
        <SkeletonBlock className="h-8 w-60" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-20" />
          ))}
        </div>
        <SkeletonBlock className="h-72" />
        <SkeletonBlock className="h-64" />
      </div>
    );
  }

  // Error or insufficient data
  if (error || !cmaStats) {
    return (
      <div
        className={`rounded-xl p-8 text-center text-sm ${
          isLight ? "bg-gray-50 text-gray-500" : "bg-neutral-900/40 text-neutral-500"
        }`}
      >
        {error ?? "Market analysis data is not available for this community."}
      </div>
    );
  }

  // Insufficient confidence check
  if (
    cmaStats.quality &&
    cmaStats.quality.confidence === "insufficient"
  ) {
    return (
      <div
        className={`rounded-xl p-8 text-center text-sm ${
          isLight ? "bg-gray-50 text-gray-500" : "bg-neutral-900/40 text-neutral-500"
        }`}
      >
        Not enough recent sales data to generate a reliable market analysis for this
        community.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Heading */}
      <div className="flex items-center gap-3 flex-wrap">
        <h2
          className={`text-lg font-bold ${
            isLight ? "text-gray-900" : "text-white"
          }`}
        >
          Market Analysis
        </h2>
        {cmaStats.quality && <CmaQualityBadge cmaStats={cmaStats} />}
      </div>

      {/* Snapshot stat cards */}
      <section>
        <SectionLabel label="Market Snapshot" isLight={isLight} />
        <CmaMarketSnapshot cmaStats={cmaStats} />
      </section>

      {/* Market Narrative */}
      <section>
        <CmaMarketNarrative slug={slug} />
      </section>

      {/* Active vs Closed */}
      {cmaStats.active && cmaStats.closed && (
        <section>
          <SectionLabel label="Active vs Closed" isLight={isLight} />
          <CmaActiveVsClosed active={cmaStats.active} closed={cmaStats.closed} />
        </section>
      )}

      {/* SubType Breakdown */}
      {cmaStats.bySubType && cmaStats.bySubType.length > 0 && (
        <section>
          <SectionLabel label="Property Type Breakdown" isLight={isLight} />
          <CmaSubTypeBreakdown bySubType={cmaStats.bySubType} />
        </section>
      )}

      {/* Price Metrics */}
      {cmaStats.active && cmaStats.closed && (
        <section>
          <SectionLabel label="Price Spread" isLight={isLight} />
          <CmaPriceMetrics active={cmaStats.active} closed={cmaStats.closed} />
        </section>
      )}

      {/* Sales Timeline Chart */}
      {salesHistory.length >= 2 && (
        <section>
          <SectionLabel label="Sales Timeline" isLight={isLight} />
          <ChartErrorBoundary>
            <CmaSalesTimeline topComps={salesHistory} />
          </ChartErrorBoundary>
        </section>
      )}

      {/* Past Sales */}
      {salesHistory.length > 0 && (
        <section>
          <SectionLabel label={`Past Sales (${salesHistory.length})`} isLight={isLight} />
          <CmaCompsTable topComps={salesHistory} city={city} />
        </section>
      )}
    </div>
  );
}
