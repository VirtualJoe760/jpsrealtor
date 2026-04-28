"use client";

import React from "react";
import Link from "next/link";
import { ChevronLeft, Building2 } from "lucide-react";
import { useThemeClasses } from "@/app/contexts/ThemeContext";

interface CountyData {
  name: string;
  slug: string;
  listings: number;
  cities: { name: string; slug: string; listings: number }[];
}

interface RegionData {
  name: string;
  slug: string;
  listings: number;
  counties: CountyData[];
}

export default function RegionCountyGrid({ region }: { region: RegionData }) {
  const {
    cardBg,
    cardBorder,
    textPrimary,
    textSecondary,
    textMuted,
    shadow,
    currentTheme,
  } = useThemeClasses();
  const isLight = currentTheme === "lightgradient";

  return (
    <div className="min-h-screen pt-20 md:pt-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Back */}
        <Link
          href="/neighborhoods"
          className={`inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-lg transition-all ${
            isLight
              ? "bg-gray-100 hover:bg-gray-200 text-gray-700"
              : "bg-gray-800 hover:bg-gray-700 text-gray-300"
          }`}
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back to All Regions</span>
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className={`text-4xl md:text-5xl font-bold ${textPrimary} mb-3`}>
            {region.name}
          </h1>
          <div className={`flex items-center gap-6 ${textMuted} text-sm`}>
            <div>
              <span className="font-semibold">
                {region.listings.toLocaleString()}
              </span>{" "}
              active listings
            </div>
            <div>
              <span className="font-semibold">{region.counties.length}</span>{" "}
              counties
            </div>
          </div>
        </div>

        {/* Counties Grid */}
        <div
          className={`${cardBg} ${cardBorder} border rounded-2xl ${shadow} p-6 md:p-8 mb-8`}
        >
          <h2 className={`text-3xl font-bold ${textPrimary} mb-4`}>
            Counties in {region.name}
          </h2>
          <p className={`${textSecondary} mb-8`}>
            Select a county to explore its cities and neighborhoods.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {region.counties.map((county) => (
              <Link
                key={county.slug}
                href={`/neighborhoods/${county.slug}`}
                className={`group ${cardBg} ${cardBorder} border rounded-xl p-6 hover:shadow-xl transition-all duration-200 ${
                  isLight
                    ? "hover:border-blue-400 hover:bg-blue-50"
                    : "hover:border-blue-500 hover:bg-gray-700"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`p-2.5 rounded-lg flex-shrink-0 ${
                      isLight ? "bg-blue-100" : "bg-blue-900/30"
                    }`}
                  >
                    <Building2
                      className={`w-6 h-6 ${
                        isLight ? "text-blue-600" : "text-blue-400"
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3
                      className={`text-xl font-semibold ${textPrimary} mb-1`}
                    >
                      {county.name}
                    </h3>
                    <p className={`text-sm ${textMuted} mb-2`}>
                      {county.listings.toLocaleString()} active listings
                    </p>
                    <p className={`text-sm ${textMuted}`}>
                      {county.cities.length}{" "}
                      {county.cities.length === 1 ? "city" : "cities"}
                    </p>
                    <div
                      className={`mt-3 text-sm font-medium ${
                        isLight
                          ? "text-blue-600 group-hover:text-blue-700"
                          : "text-blue-400 group-hover:text-blue-300"
                      } group-hover:underline`}
                    >
                      Explore Cities →
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
