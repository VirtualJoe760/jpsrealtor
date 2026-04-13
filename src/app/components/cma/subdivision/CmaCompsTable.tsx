"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { useTheme } from "@/app/contexts/ThemeContext";

interface TopComp {
  address: string;
  slugAddress: string;
  closeDate: string;
  closePrice: number;
  originalListPrice: number;
  listPrice: number;
  salePpsf: number;
  saleToListRatio: number;
  livingArea: number;
  bedsTotal: number;
  bathsTotal: number;
  yearBuilt: number;
  garageSpaces: number;
  daysOnMarket: number;
  propertySubType: string;
}

interface CmaCompsTableProps {
  topComps: TopComp[];
  city?: string;
}

function fmtPrice(n: number): string {
  if (!n || isNaN(n)) return "--";
  return `$${n.toLocaleString()}`;
}

function fmtPpsf(n: number): string {
  if (!n || isNaN(n)) return "--";
  return `$${Math.round(n).toLocaleString()}`;
}

function fmtRatio(n: number): string {
  if (!n || isNaN(n)) return "--";
  return `${Math.round(n * 100)}%`;
}

function fmtDate(dateStr: string): string {
  if (!dateStr) return "--";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "--";
  }
}

/**
 * Build a Google Maps Static API satellite thumbnail URL for an address.
 * Uses the free embed approach — no API key needed for low-volume.
 * Falls back to a Maps Embed street-level image via the address.
 */
function getMapThumbnail(address: string, city?: string): string {
  const query = encodeURIComponent(`${address}${city ? `, ${city}` : ""}`);
  // Google Maps Static API — satellite view, 120x80, zoom 19
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (apiKey) {
    return `https://maps.googleapis.com/maps/api/staticmap?center=${query}&zoom=19&size=120x80&maptype=satellite&key=${apiKey}`;
  }
  // Fallback: use a placeholder with address initial
  return "";
}

const PAGE_SIZE = 5;

export default function CmaCompsTable({ topComps, city }: CmaCompsTableProps) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  if (!topComps || topComps.length === 0) {
    return (
      <div
        className={`rounded-xl p-6 text-center text-sm ${
          isLight
            ? "bg-gray-50 text-gray-500"
            : "bg-neutral-900/40 text-neutral-500"
        }`}
      >
        No past sales data available.
      </div>
    );
  }

  const visible = topComps.slice(0, visibleCount);
  const hasMore = visibleCount < topComps.length;

  return (
    <div className="space-y-3">
      {visible.map((comp, i) => {
        const thumbnail = getMapThumbnail(comp.address, city);

        return (
          <div
            key={comp.slugAddress + i}
            className={`rounded-xl border p-3 md:p-4 flex gap-3 md:gap-4 items-start transition-colors ${
              isLight
                ? "bg-white/70 border-gray-200 hover:bg-blue-50/40"
                : "bg-white/5 border-white/10 hover:bg-white/[0.07]"
            }`}
          >
            {/* Satellite Thumbnail */}
            <div
              className={`flex-shrink-0 w-[80px] h-[60px] md:w-[120px] md:h-[80px] rounded-lg overflow-hidden ${
                isLight ? "bg-gray-200" : "bg-gray-800"
              }`}
            >
              {thumbnail ? (
                <img
                  src={thumbnail}
                  alt={`Satellite view of ${comp.address}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span
                    className={`text-2xl font-bold ${
                      isLight ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    {comp.address.charAt(0)}
                  </span>
                </div>
              )}
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0">
              {/* Address + Date */}
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/mls-listings/${comp.slugAddress}`}
                  className={`text-sm font-semibold truncate hover:underline ${
                    isLight ? "text-gray-900" : "text-white"
                  }`}
                >
                  {comp.address}
                </Link>
                <span
                  className={`text-xs whitespace-nowrap flex-shrink-0 ${
                    isLight ? "text-gray-500" : "text-gray-400"
                  }`}
                >
                  {fmtDate(comp.closeDate)}
                </span>
              </div>

              {/* Price row */}
              <div className="flex items-baseline gap-3 mt-1">
                <span
                  className={`text-lg font-bold ${
                    isLight ? "text-gray-900" : "text-white"
                  }`}
                >
                  {fmtPrice(comp.closePrice)}
                </span>
                <span
                  className={`text-xs ${
                    isLight ? "text-gray-500" : "text-gray-400"
                  }`}
                >
                  Listed {fmtPrice(comp.listPrice)}
                </span>
              </div>

              {/* Stats chips */}
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
                {[
                  `${fmtPpsf(comp.salePpsf)}/sqft`,
                  `${fmtRatio(comp.saleToListRatio)} SP/LP`,
                  comp.livingArea
                    ? `${comp.livingArea.toLocaleString()} sqft`
                    : null,
                  `${comp.bedsTotal}bd/${comp.bathsTotal}ba`,
                  `${comp.daysOnMarket ?? "--"} DOM`,
                ]
                  .filter(Boolean)
                  .map((chip, ci) => (
                    <span
                      key={ci}
                      className={`text-xs ${
                        isLight ? "text-gray-500" : "text-gray-400"
                      }`}
                    >
                      {chip}
                    </span>
                  ))}
              </div>
            </div>
          </div>
        );
      })}

      {/* Show More */}
      {hasMore && (
        <button
          onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
          className={`w-full py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
            isLight
              ? "bg-gray-100 hover:bg-gray-200 text-gray-700"
              : "bg-white/5 hover:bg-white/10 text-gray-300"
          }`}
        >
          Show More ({topComps.length - visibleCount} remaining)
          <ChevronDown className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
