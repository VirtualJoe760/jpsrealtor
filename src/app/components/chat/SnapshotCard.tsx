"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Home, DollarSign, Ruler, Clock } from "lucide-react";
import { useTheme } from "@/app/contexts/ThemeContext";
import type { SnapshotMeta } from "@/lib/chat-search/types";

function formatPrice(value?: number): string | null {
  if (!value || value <= 0) return null;
  if (value >= 1_000_000) {
    const m = value / 1_000_000;
    return `$${m % 1 === 0 ? m.toFixed(0) : m.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")}M`;
  }
  if (value >= 1_000) {
    const k = value / 1_000;
    return `$${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1).replace(/\.0$/, "")}K`;
  }
  return `$${value.toLocaleString()}`;
}

function typeLabel(type: string): string {
  if (type === "city") return "City";
  if (type === "subdivision") return "Subdivision";
  if (type === "county") return "County";
  if (type === "region") return "Region";
  return type.charAt(0).toUpperCase() + type.slice(1);
}

interface StatTileProps {
  icon: React.ElementType;
  label: string;
  value: string;
  isLight: boolean;
}

function StatTile({ icon: Icon, label, value, isLight }: StatTileProps) {
  return (
    <div
      className={`rounded-xl px-3 py-2.5 flex flex-col gap-1 ${
        isLight
          ? "bg-white/80 border border-gray-200"
          : "bg-white/5 border border-white/10"
      }`}
    >
      <div className="flex items-center gap-1.5">
        <Icon
          className={`w-3.5 h-3.5 ${isLight ? "text-blue-600" : "text-emerald-300"}`}
        />
        <span
          className={`text-[10px] font-medium uppercase tracking-wider ${
            isLight ? "text-gray-500" : "text-gray-400"
          }`}
        >
          {label}
        </span>
      </div>
      <span
        className={`text-base font-semibold leading-tight ${
          isLight ? "text-gray-900" : "text-white"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

export default function SnapshotCard({ meta }: { meta: SnapshotMeta }) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  const tiles: StatTileProps[] = [];
  const stats = meta.stats;
  if (stats) {
    tiles.push({
      icon: Home,
      label: "Active",
      value: stats.activeListings.toLocaleString(),
      isLight,
    });
    const median = formatPrice(stats.medianPrice);
    if (median) {
      tiles.push({ icon: DollarSign, label: "Median", value: median, isLight });
    }
    if (typeof stats.avgPricePerSqft === "number" && stats.avgPricePerSqft > 0) {
      tiles.push({
        icon: Ruler,
        label: "$/SqFt",
        value: `$${stats.avgPricePerSqft.toLocaleString()}`,
        isLight,
      });
    }
    if (typeof stats.avgDom === "number" && stats.avgDom >= 0) {
      tiles.push({
        icon: Clock,
        label: "Avg DOM",
        value: `${stats.avgDom}d`,
        isLight,
      });
    }
  }

  return (
    <div
      className={`overflow-hidden rounded-2xl mb-3 ${
        isLight
          ? "bg-white border border-gray-200 shadow-sm"
          : "bg-white/5 border border-white/10"
      }`}
    >
      {meta.heroPhoto ? (
        <div className="relative w-full aspect-[16/9] bg-neutral-900">
          <Image
            src={meta.heroPhoto}
            alt={`${meta.name} ${typeLabel(meta.type).toLowerCase()}`}
            fill
            sizes="(max-width: 768px) 100vw, 600px"
            className="object-cover"
            unoptimized
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-4">
            <div className="flex items-center gap-2 text-white">
              <h3 className="text-lg font-semibold leading-tight">{meta.name}</h3>
              <span className="text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-sm">
                {typeLabel(meta.type)}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="px-4 pt-4">
          <div className="flex items-center gap-2">
            <h3
              className={`text-lg font-semibold leading-tight ${
                isLight ? "text-gray-900" : "text-white"
              }`}
            >
              {meta.name}
            </h3>
            <span
              className={`text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded-full ${
                isLight ? "bg-gray-100 text-gray-600" : "bg-white/10 text-gray-300"
              }`}
            >
              {typeLabel(meta.type)}
            </span>
          </div>
        </div>
      )}

      {tiles.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-3 pt-3">
          {tiles.map((t) => (
            <StatTile key={t.label} {...t} />
          ))}
        </div>
      )}

      {meta.pageLink && (
        <div className="px-3 py-3">
          <Link
            href={meta.pageLink.url}
            className={`flex items-center justify-center gap-2 w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
              isLight
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-emerald-500/20 text-emerald-200 border border-emerald-500/40 hover:bg-emerald-500/30"
            }`}
          >
            View full {meta.pageLink.label}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
