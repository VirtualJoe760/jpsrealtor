"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useThemeClasses } from "@/app/contexts/ThemeContext";

interface CityData {
  name: string;
  slug: string;
  listings: number;
  population?: number;
}

interface CountyData {
  name: string;
  slug: string;
  listings: number;
  cities: CityData[];
  description?: string;
}

interface CountyCityGridProps {
  county: CountyData;
}

export default function CountyCityGrid({ county }: CountyCityGridProps) {
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

  // Pagination state
  const CITIES_PER_PAGE = 12; // 3 rows x 4 columns
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(county.cities.length / CITIES_PER_PAGE);
  const startIndex = (currentPage - 1) * CITIES_PER_PAGE;
  const endIndex = startIndex + CITIES_PER_PAGE;
  const currentCities = county.cities.slice(startIndex, endIndex);

  return (
    <div className="min-h-screen pt-20 md:pt-12 px-4">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto mb-8">
        {/* Back to Neighborhoods Button */}
        <Link
          href="/neighborhoods"
          className={`inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-lg transition-all ${
            isLight
              ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
          }`}
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back to All Regions</span>
        </Link>

        {/* Title and Description */}
        <div className="mb-6">
          <h1 className={`text-4xl md:text-5xl font-bold ${textPrimary} mb-4`}>
            {county.name}
          </h1>
          {county.description && (
            <p className={`text-lg ${textSecondary} leading-relaxed`}>
              {county.description}
            </p>
          )}
        </div>

        {/* Stats */}
        <div className={`flex items-center gap-6 ${textMuted} text-sm`}>
          <div>
            <span className="font-semibold">{county.listings.toLocaleString()}</span> active listings
          </div>
          <div>
            <span className="font-semibold">{county.cities.length}</span> cities
          </div>
        </div>
      </div>

      {/* Cities Grid */}
      <section className="max-w-7xl mx-auto">
        <div className={`${cardBg} ${cardBorder} border rounded-2xl ${shadow} p-6 md:p-8 mb-8`}>
          <h2 className={`text-3xl font-bold ${textPrimary} mb-4`}>
            Explore Cities in {county.name}
          </h2>
          <p className={`${textSecondary} mb-8`}>
            Click on any city to view homes, neighborhoods, and community information.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {currentCities.map((city) => (
              <Link
                key={city.slug}
                href={`/neighborhoods/${city.slug}`}
                className={`group ${cardBg} ${cardBorder} border rounded-lg p-6 hover:shadow-xl transition-all duration-200 ${
                  isLight ? 'hover:border-blue-400 hover:bg-blue-50' : 'hover:border-blue-500 hover:bg-gray-700'
                }`}
              >
                <h3 className={`text-xl font-semibold ${textPrimary} mb-2`}>
                  {city.name}
                </h3>
                {city.population && city.population > 0 ? (
                  <>
                    <p className={`text-sm ${textMuted} mb-1 flex items-center gap-1`}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      Population: {city.population.toLocaleString()}
                    </p>
                    <p className={`text-sm ${textMuted} mb-1 flex items-center gap-1`}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                      View Properties →
                    </p>
                  </>
                ) : (
                  <p className={`text-sm ${textMuted} mb-2`}>
                    {city.listings.toLocaleString()} active listings
                  </p>
                )}
                {city.population && city.population > 0 && (
                  <div className={`mt-4 text-sm font-medium ${isLight ? 'text-blue-600 group-hover:text-blue-700' : 'text-blue-400 group-hover:text-blue-300'} group-hover:underline`}>
                    View Properties
                  </div>
                )}
                {(!city.population || city.population === 0) && (
                  <div className={`mt-4 text-sm font-medium ${isLight ? 'text-blue-600 group-hover:text-blue-700' : 'text-blue-400 group-hover:text-blue-300'} group-hover:underline`}>
                    View Properties →
                  </div>
                )}
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              {/* Previous Button */}
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className={`px-4 py-2 rounded-lg border ${cardBorder} ${cardBg} ${textPrimary} transition-all duration-200 ${
                  currentPage === 1
                    ? 'opacity-50 cursor-not-allowed'
                    : isLight
                    ? 'hover:bg-gray-100'
                    : 'hover:bg-gray-700'
                }`}
              >
                ← Previous
              </button>

              {/* Page Numbers */}
              <div className="flex items-center gap-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-10 h-10 rounded-lg border ${cardBorder} transition-all duration-200 ${
                      currentPage === page
                        ? isLight
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-blue-500 text-white border-blue-500'
                        : `${cardBg} ${textPrimary} ${isLight ? 'hover:bg-gray-100' : 'hover:bg-gray-700'}`
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>

              {/* Next Button */}
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className={`px-4 py-2 rounded-lg border ${cardBorder} ${cardBg} ${textPrimary} transition-all duration-200 ${
                  currentPage === totalPages
                    ? 'opacity-50 cursor-not-allowed'
                    : isLight
                    ? 'hover:bg-gray-100'
                    : 'hover:bg-gray-700'
                }`}
              >
                Next →
              </button>
            </div>
          )}
        </div>

        {/* Back to Neighborhoods */}
        <div className="text-center mt-8">
          <Link
            href="/neighborhoods"
            className={`inline-block ${cardBg} ${cardBorder} border ${textPrimary} px-6 py-3 rounded-lg hover:shadow-lg transition-all duration-200 ${
              isLight ? 'hover:bg-gray-50' : 'hover:bg-gray-700'
            }`}
          >
            ← Back to All Neighborhoods
          </Link>
        </div>
      </section>
    </div>
  );
}
