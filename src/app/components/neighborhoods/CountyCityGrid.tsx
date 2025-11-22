"use client";

import React from "react";
import Link from "next/link";
import { County } from "@/app/constants/counties";
import { motion } from "framer-motion";
import { MapPin, Users, Building2 } from "lucide-react";
import { useThemeClasses } from "@/app/contexts/ThemeContext";

interface CountyCityGridProps {
  county: County;
}

export default function CountyCityGrid({ county }: CountyCityGridProps) {
  const { cardBg, cardBorder, textPrimary, textSecondary, textMuted, shadow, currentTheme } = useThemeClasses();
  const isLight = currentTheme === "lightgradient";

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-8"
        >
          <div className={`flex items-center gap-2 ${textMuted} mb-3`}>
            <MapPin className="w-4 h-4" />
            <span className="text-sm">Southern California</span>
          </div>
          <h1 className={`text-4xl md:text-5xl font-bold ${textPrimary} mb-4 drop-shadow-2xl`}>
            {county.name}
          </h1>
          <p className={`text-xl ${textSecondary} max-w-3xl leading-relaxed`}>
            {county.description}
          </p>
        </motion.div>

        {/* Cities Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className={`${cardBg} backdrop-blur-sm border ${cardBorder} rounded-2xl ${shadow} p-6 md:p-8 mb-8`}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              isLight ? 'bg-blue-100' : 'bg-blue-500/10'
            }`}>
              <Building2 className={`w-5 h-5 ${isLight ? 'text-blue-600' : 'text-blue-400'}`} />
            </div>
            <h2 className={`text-2xl md:text-3xl font-bold ${textPrimary}`}>
              Explore Cities in {county.name}
            </h2>
          </div>
          <p className={`${textSecondary} mb-8`}>
            Click on any city to view homes, neighborhoods, and community information.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {county.cities.map((city, index) => (
              <motion.div
                key={city.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 * index }}
              >
                <Link
                  href={`/neighborhoods/${city.id}`}
                  className={`group block backdrop-blur-sm border rounded-xl p-6 transition-all duration-200 ${shadow} ${
                    isLight
                      ? 'bg-white border-gray-300 hover:border-emerald-400 hover:shadow-lg'
                      : 'bg-gray-800/50 border-gray-700 hover:border-gray-600 hover:bg-gray-800/70 hover:shadow-2xl'
                  }`}
                >
                  <h3 className={`text-xl font-semibold ${textPrimary} mb-3 transition-colors ${
                    isLight ? 'group-hover:text-emerald-600' : 'group-hover:text-blue-400'
                  }`}>
                    {city.name}
                  </h3>
                  {city.population && (
                    <div className={`flex items-center gap-2 text-sm ${textMuted} mb-2`}>
                      <Users className="w-4 h-4" />
                      <span>Population: {city.population.toLocaleString()}</span>
                    </div>
                  )}
                  {city.description && (
                    <p className={`text-sm ${textMuted} line-clamp-2 mb-4`}>
                      {city.description}
                    </p>
                  )}
                  <div className={`flex items-center gap-2 ${textSecondary} text-sm font-medium transition-colors ${
                    isLight ? 'group-hover:text-emerald-600' : 'group-hover:text-blue-400'
                  }`}>
                    <MapPin className="w-4 h-4" />
                    <span>View Properties</span>
                    <span className="ml-auto">→</span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Back to Counties */}
        <div className="text-center">
          <Link
            href="/neighborhoods"
            className={`inline-flex items-center gap-2 backdrop-blur-sm border ${textPrimary} px-6 py-3 rounded-lg shadow-lg transition-all duration-200 ${
              isLight
                ? 'bg-white border-gray-300 hover:border-gray-400 hover:shadow-xl'
                : 'bg-gray-800/50 border-gray-700 hover:border-gray-600 hover:bg-gray-800/70 hover:shadow-2xl'
            }`}
          >
            <span>←</span>
            <span>Back to All Counties</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
