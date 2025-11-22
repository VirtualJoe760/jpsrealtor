// src\app\insights\page.tsx
"use client";

import React from "react";
import { motion } from "framer-motion";
import InsightsCategories from "@/components/InsightsCategories";
import { BookOpen, TrendingUp, Sparkles } from "lucide-react";
import { useThemeClasses } from "@/app/contexts/ThemeContext";

const InsightsPage = () => {
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
          className="mb-12 text-center"
        >
          <div className={`flex items-center justify-center gap-2 mb-4 ${textSecondary}`}>
            <BookOpen className="w-5 h-5" />
            <span className="text-sm uppercase tracking-wider">Expert Knowledge</span>
          </div>
          <h1 className={`text-4xl md:text-6xl font-bold mb-6 drop-shadow-2xl ${textPrimary}`}>
            Real Estate Insights
          </h1>
          <p className={`text-xl max-w-3xl mx-auto leading-relaxed ${textSecondary}`}>
            Discover expert advice, market insights, and tips for buying, selling, and investing in Coachella Valley real estate.
          </p>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12"
        >
          <div className={`${cardBg} ${cardBorder} border rounded-xl p-6 ${shadow}`}>
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8 text-emerald-400" />
              <Sparkles className={`w-5 h-5 ${isLight ? 'text-gray-300' : 'text-gray-600'}`} />
            </div>
            <h3 className={`text-2xl font-bold mb-1 ${textPrimary}`}>Market Trends</h3>
            <p className={`text-sm ${textSecondary}`}>Stay ahead with latest insights</p>
          </div>

          <div className={`${cardBg} ${cardBorder} border rounded-xl p-6 ${shadow}`}>
            <div className="flex items-center justify-between mb-2">
              <BookOpen className="w-8 h-8 text-blue-400" />
              <Sparkles className={`w-5 h-5 ${isLight ? 'text-gray-300' : 'text-gray-600'}`} />
            </div>
            <h3 className={`text-2xl font-bold mb-1 ${textPrimary}`}>Expert Guides</h3>
            <p className={`text-sm ${textSecondary}`}>Learn from industry professionals</p>
          </div>

          <div className={`${cardBg} ${cardBorder} border rounded-xl p-6 ${shadow}`}>
            <div className="flex items-center justify-between mb-2">
              <Sparkles className="w-8 h-8 text-purple-400" />
              <Sparkles className={`w-5 h-5 ${isLight ? 'text-gray-300' : 'text-gray-600'}`} />
            </div>
            <h3 className={`text-2xl font-bold mb-1 ${textPrimary}`}>Local Knowledge</h3>
            <p className={`text-sm ${textSecondary}`}>Coachella Valley expertise</p>
          </div>
        </motion.div>

        {/* Insights Categories Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <InsightsCategories />
        </motion.div>
      </div>
    </div>
  );
};

export default InsightsPage;
