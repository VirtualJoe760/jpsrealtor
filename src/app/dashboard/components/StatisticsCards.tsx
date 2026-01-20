// src/app/dashboard/components/StatisticsCards.tsx
"use client";

import { motion } from "framer-motion";
import { Heart, MapPin, Building2 } from "lucide-react";
import { Analytics } from "../utils/types";

interface StatisticsCardsProps {
  analytics: Analytics;
  isLight: boolean;
  cardBg: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
}

export default function StatisticsCards({
  analytics,
  isLight,
  cardBg,
  textPrimary,
  textSecondary,
  textTertiary,
}: StatisticsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {/* Total Favorites */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className={`${cardBg} border rounded-xl p-6 shadow-lg`}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className={`${textSecondary} text-sm mb-1`}>Total Favorites</p>
            <p className={`text-3xl font-bold ${textPrimary}`}>{analytics.totalLikes}</p>
          </div>
          <div
            className={`w-12 h-12 ${
              isLight ? "bg-red-50" : "bg-red-500/10"
            } rounded-lg flex items-center justify-center`}
          >
            <Heart className="w-6 h-6 text-red-400" />
          </div>
        </div>
      </motion.div>

      {/* Top City */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className={`${cardBg} border rounded-xl p-6 shadow-lg`}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className={`${textSecondary} text-sm mb-1`}>Top City</p>
            <p className={`text-2xl font-bold ${textPrimary}`}>
              {analytics.topCities[0]?.name || "N/A"}
            </p>
            <p className={`${textTertiary} text-xs`}>
              {analytics.topCities[0]?.count || 0} properties
            </p>
          </div>
          <div
            className={`w-12 h-12 ${
              isLight ? "bg-blue-50" : "bg-blue-500/10"
            } rounded-lg flex items-center justify-center`}
          >
            <MapPin className="w-6 h-6 text-blue-400" />
          </div>
        </div>
      </motion.div>

      {/* Top Subdivision */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className={`${cardBg} border rounded-xl p-6 shadow-lg`}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className={`${textSecondary} text-sm mb-1`}>Top Subdivision</p>
            <p className={`text-xl font-bold ${textPrimary} truncate max-w-[150px]`}>
              {analytics.topSubdivisions[0]?.name || "N/A"}
            </p>
            <p className={`${textTertiary} text-xs`}>
              {analytics.topSubdivisions[0]?.count || 0} properties
            </p>
          </div>
          <div
            className={`w-12 h-12 ${
              isLight ? "bg-green-50" : "bg-green-500/10"
            } rounded-lg flex items-center justify-center`}
          >
            <Building2 className="w-6 h-6 text-green-400" />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
