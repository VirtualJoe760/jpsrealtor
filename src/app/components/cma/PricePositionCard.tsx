"use client";

// src/app/components/cma/PricePositionCard.tsx
//
// Compares the subject property against the closed-sale median (what
// people actually paid) and the active median (what's currently competing)
// on two dimensions: total list price and price-per-sqft.
//
// Frames every position positively:
//   above market  → "Premium"   (commands quality positioning)
//   within ±5%    → "At market" (aligned with comps)
//   below market  → "Advantage" (priced for value vs the field)
//
// Both sides are good — premium signals quality, advantage signals value.
// The narrator can quote whichever frame matches the audience.

import { CMAResult } from "@/lib/cma/types";
import { useTheme } from "@/app/contexts/ThemeContext";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

const THRESHOLD = 0.05; // ±5% defines "at market"

type Position = "premium" | "at-market" | "advantage";

interface Reading {
  position: Position;
  variancePct: number; // signed: positive = above, negative = below
  deltaAbsolute: number;
  benchmark: number;
  benchmarkLabel: string;
  hasData: boolean;
}

function classify(variance: number): Position {
  if (variance >= THRESHOLD) return "premium";
  if (variance <= -THRESHOLD) return "advantage";
  return "at-market";
}

function readPrice(
  subjectValue: number,
  benchmark: number,
  benchmarkLabel: string
): Reading {
  if (!subjectValue || !benchmark) {
    return {
      position: "at-market",
      variancePct: 0,
      deltaAbsolute: 0,
      benchmark: 0,
      benchmarkLabel,
      hasData: false,
    };
  }
  const variance = (subjectValue - benchmark) / benchmark;
  return {
    position: classify(variance),
    variancePct: variance,
    deltaAbsolute: subjectValue - benchmark,
    benchmark,
    benchmarkLabel,
    hasData: true,
  };
}

const fmtMoney = (n: number) => {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n).toLocaleString()}`;
};

const fmtPct = (p: number) => `${(p * 100).toFixed(1)}%`;

const POSITION_META: Record<
  Position,
  { label: string; tone: string; bgLight: string; bgDark: string; icon: any; tagline: string }
> = {
  premium: {
    label: "Premium",
    tone: "text-amber-700",
    bgLight: "bg-amber-50 border-amber-200",
    bgDark: "bg-amber-500/10 border-amber-500/30",
    icon: TrendingUp,
    tagline: "Positioned above the market — commands a premium.",
  },
  "at-market": {
    label: "At market",
    tone: "text-slate-700",
    bgLight: "bg-slate-50 border-slate-200",
    bgDark: "bg-slate-500/10 border-slate-500/30",
    icon: Minus,
    tagline: "Aligned with the market — fair pricing for the comps.",
  },
  advantage: {
    label: "Price advantage",
    tone: "text-emerald-700",
    bgLight: "bg-emerald-50 border-emerald-200",
    bgDark: "bg-emerald-500/10 border-emerald-500/30",
    icon: TrendingDown,
    tagline: "Priced below the market — value advantage over the field.",
  },
};

function ReadingRow({
  label,
  reading,
  isLight,
  formatValue = fmtMoney,
}: {
  label: string;
  reading: Reading;
  isLight: boolean;
  formatValue?: (n: number) => string;
}) {
  if (!reading.hasData) {
    return (
      <div className="flex items-center justify-between text-xs">
        <span className={isLight ? "text-gray-500" : "text-neutral-400"}>{label}</span>
        <span className={isLight ? "text-gray-400" : "text-neutral-500"}>
          insufficient comp data
        </span>
      </div>
    );
  }
  const meta = POSITION_META[reading.position];
  const Icon = meta.icon;
  const sign = reading.variancePct > 0 ? "+" : reading.variancePct < 0 ? "−" : "";
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <div className="min-w-0 flex-1">
        <div
          className={`text-xs uppercase tracking-wide ${
            isLight ? "text-gray-500" : "text-neutral-400"
          }`}
        >
          {label}
        </div>
        <div className={`text-xs ${isLight ? "text-gray-600" : "text-neutral-300"}`}>
          {reading.benchmarkLabel} {formatValue(reading.benchmark)}
        </div>
      </div>
      <div
        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold ${meta.tone} ${
          isLight ? meta.bgLight : meta.bgDark
        } border`}
      >
        <Icon className="w-3.5 h-3.5" />
        {sign}
        {fmtMoney(Math.abs(reading.deltaAbsolute))} ({sign}
        {fmtPct(Math.abs(reading.variancePct))})
      </div>
    </div>
  );
}

export default function PricePositionCard({ result }: { result: CMAResult }) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  const subject = result.subject;
  const closed = result.stats.closed;
  const active = result.stats.active;

  // ----- Total list price readings -----
  // Closed median is the "what people actually pay" anchor (most reliable).
  // Active median is "what's currently competing" — the user's real
  // competitors if they're listing.
  const priceVsClosed = readPrice(
    subject.listPrice,
    closed?.medianPrice ?? 0,
    "vs closed median"
  );
  const priceVsActive = readPrice(
    subject.listPrice,
    active?.medianPrice ?? 0,
    "vs active median"
  );

  // ----- $/sqft readings -----
  // Stats only carries avgPricePerSqft (no median variant), so use that.
  const ppsfVsClosed = readPrice(
    subject.pricePerSqft,
    closed?.avgPricePerSqft ?? 0,
    "vs closed avg $/sqft"
  );
  const ppsfVsActive = readPrice(
    subject.pricePerSqft,
    active?.avgPricePerSqft ?? 0,
    "vs active avg $/sqft"
  );

  // ----- Headline position -----
  // Closed median takes priority since closed sales are the truer signal.
  // If closed data is missing, fall back to active.
  const headlineReading = priceVsClosed.hasData
    ? priceVsClosed
    : priceVsActive;
  const headline = POSITION_META[headlineReading.position];
  const HeadlineIcon = headline.icon;

  // Hide the card entirely if there's no benchmark data at all.
  if (!priceVsClosed.hasData && !priceVsActive.hasData) {
    return null;
  }

  return (
    <div
      className={`rounded-2xl p-5 md:p-6 backdrop-blur-xl shadow-xl ${
        isLight
          ? "bg-white/80 border border-gray-200"
          : "bg-black/40 border border-neutral-800/50"
      }`}
    >
      {/* Headline badge + tagline */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3
            className={`text-lg md:text-xl font-bold mb-1 ${
              isLight ? "text-gray-900" : "text-white"
            }`}
          >
            Price Position
          </h3>
          <p className={`text-sm ${isLight ? "text-gray-600" : "text-neutral-300"}`}>
            {headline.tagline}
          </p>
        </div>
        <div
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold border ${headline.tone} ${
            isLight ? headline.bgLight : headline.bgDark
          }`}
        >
          <HeadlineIcon className="w-4 h-4" />
          {headline.label}
        </div>
      </div>

      {/* Subject reference */}
      <div
        className={`text-xs flex items-baseline gap-3 mb-4 pb-3 border-b ${
          isLight ? "border-gray-200 text-gray-600" : "border-neutral-800 text-neutral-400"
        }`}
      >
        <span>
          Subject listed at{" "}
          <strong className={isLight ? "text-gray-900" : "text-white"}>
            {fmtMoney(subject.listPrice)}
          </strong>
        </span>
        {subject.pricePerSqft > 0 && (
          <span>
            ·{" "}
            <strong className={isLight ? "text-gray-900" : "text-white"}>
              ${Math.round(subject.pricePerSqft).toLocaleString()}/sqft
            </strong>
          </span>
        )}
      </div>

      {/* Two-column reading grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
        <div className="space-y-3">
          <div className={`text-xs font-semibold uppercase tracking-wider ${isLight ? "text-gray-500" : "text-neutral-400"}`}>
            Total list price
          </div>
          <ReadingRow label="Closed comps" reading={priceVsClosed} isLight={isLight} />
          <ReadingRow label="Active comps" reading={priceVsActive} isLight={isLight} />
        </div>
        <div className="space-y-3">
          <div className={`text-xs font-semibold uppercase tracking-wider ${isLight ? "text-gray-500" : "text-neutral-400"}`}>
            Price per sqft
          </div>
          <ReadingRow
            label="Closed comps"
            reading={ppsfVsClosed}
            isLight={isLight}
            formatValue={(n) => `$${Math.round(n).toLocaleString()}`}
          />
          <ReadingRow
            label="Active comps"
            reading={ppsfVsActive}
            isLight={isLight}
            formatValue={(n) => `$${Math.round(n).toLocaleString()}`}
          />
        </div>
      </div>
    </div>
  );
}
