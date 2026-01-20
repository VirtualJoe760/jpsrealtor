// src/app/dashboard/components/SwipeInsights.tsx
"use client";

import { motion } from "framer-motion";
import { TrendingUp, MapPin, Building2, Home } from "lucide-react";
import { Analytics } from "../utils/types";

interface SwipeInsightsProps {
  analytics: Analytics;
  cardBg: string;
  cardBorder: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  shadow: string;
}

export default function SwipeInsights({
  analytics,
  cardBg,
  cardBorder,
  textPrimary,
  textSecondary,
  textTertiary,
  shadow,
}: SwipeInsightsProps) {
  if (!analytics || (analytics.topCities.length === 0 && analytics.topSubdivisions.length === 0)) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.5 }}
      className={`${cardBg} ${cardBorder} border rounded-2xl p-6 ${shadow} mb-8`}
    >
      <h2 className={`text-2xl font-bold ${textPrimary} mb-6 flex items-center`}>
        <TrendingUp className="w-6 h-6 mr-2 text-blue-400" />
        Your Swipe Insights
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Top Cities */}
        <div>
          <h3 className={`text-lg font-semibold ${textPrimary} mb-3 flex items-center`}>
            <MapPin className="w-5 h-5 mr-2 text-blue-400" />
            Top Cities
          </h3>
          <div className="space-y-2">
            {analytics.topCities.slice(0, 5).map((city, idx) => (
              <div key={city.name} className="flex items-center justify-between">
                <span className={`${textSecondary} text-sm`}>
                  {idx + 1}. {city.name}
                </span>
                <span className={`${textTertiary} text-sm`}>{city.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Subdivisions */}
        <div>
          <h3 className={`text-lg font-semibold ${textPrimary} mb-3 flex items-center`}>
            <Building2 className="w-5 h-5 mr-2 text-green-400" />
            Top Subdivisions
          </h3>
          <div className="space-y-2">
            {analytics.topSubdivisions.slice(0, 5).map((sub, idx) => (
              <div key={sub.name} className="flex items-center justify-between">
                <span className={`${textSecondary} text-sm truncate max-w-[180px]`}>
                  {idx + 1}. {sub.name}
                </span>
                <span className={`${textTertiary} text-sm`}>{sub.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Property SubTypes */}
        <div>
          <h3 className={`text-lg font-semibold ${textPrimary} mb-3 flex items-center`}>
            <Home className="w-5 h-5 mr-2 text-purple-400" />
            Property SubTypes
          </h3>
          <div className="space-y-2">
            {analytics.topPropertySubTypes.map((type, idx) => (
              <div key={type.type} className="flex items-center justify-between">
                <span className={`${textSecondary} text-sm`}>
                  {idx + 1}. {type.type}
                </span>
                <span className={`${textTertiary} text-sm`}>{type.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
