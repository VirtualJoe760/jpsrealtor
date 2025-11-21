// src\app\insights\page.tsx
"use client";

import React from "react";
import { motion } from "framer-motion";
import InsightsCategories from "@/components/InsightsCategories";
import { BookOpen, TrendingUp, Sparkles } from "lucide-react";

const InsightsPage = () => {
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
          <div className="flex items-center justify-center gap-2 text-gray-400 mb-4">
            <BookOpen className="w-5 h-5" />
            <span className="text-sm uppercase tracking-wider">Expert Knowledge</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 drop-shadow-2xl">
            Real Estate Insights
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
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
          <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8 text-emerald-400" />
              <Sparkles className="w-5 h-5 text-gray-600" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-1">Market Trends</h3>
            <p className="text-gray-400 text-sm">Stay ahead with latest insights</p>
          </div>

          <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <BookOpen className="w-8 h-8 text-blue-400" />
              <Sparkles className="w-5 h-5 text-gray-600" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-1">Expert Guides</h3>
            <p className="text-gray-400 text-sm">Learn from industry professionals</p>
          </div>

          <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <Sparkles className="w-8 h-8 text-purple-400" />
              <Sparkles className="w-5 h-5 text-gray-600" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-1">Local Knowledge</h3>
            <p className="text-gray-400 text-sm">Coachella Valley expertise</p>
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
