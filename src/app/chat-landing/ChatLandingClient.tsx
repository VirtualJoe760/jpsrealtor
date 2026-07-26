"use client";

import React from "react";
import Link from "next/link";
import { MessageSquare, Sparkles, Search, Home } from "lucide-react";
import { useTheme } from "@/app/contexts/ThemeContext";
import SpaticalBackground from "@/app/components/backgrounds/SpaticalBackground";

export default function ChatLandingPage() {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  return (
    <SpaticalBackground>
      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-20 relative z-10">
        {/* Logo / Brand */}
        <div className="mb-10 text-center">
          <h2
            className={`text-sm font-semibold tracking-[0.3em] uppercase ${
              isLight ? "text-blue-600" : "text-blue-400"
            }`}
          >
            ChatRealty.io
          </h2>
        </div>

        {/* Hero */}
        <div className="max-w-3xl mx-auto text-center">
          <h1
            className={`text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.1] ${
              isLight ? "text-slate-900" : "text-white"
            }`}
          >
            AI-Powered{" "}
            <span
              className={`${
                isLight
                  ? "bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent"
                  : "bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent"
              }`}
            >
              Real Estate Search
            </span>
          </h1>

          <p
            className={`mt-6 text-lg sm:text-xl leading-relaxed max-w-2xl mx-auto ${
              isLight ? "text-slate-600" : "text-gray-400"
            }`}
          >
            Find your dream home in the Coachella Valley. Describe what you want
            in plain English and let our AI search thousands of listings to find
            the perfect match.
          </p>
        </div>

        {/* CTA */}
        <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
          <Link
            href="/chap"
            className={`inline-flex items-center gap-3 px-8 py-4 rounded-xl text-base font-semibold shadow-lg transition-all hover:scale-[1.03] active:scale-[0.98] ${
              isLight
                ? "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/25"
                : "bg-blue-500 hover:bg-blue-400 text-white shadow-blue-500/20"
            }`}
          >
            <MessageSquare className="w-5 h-5" />
            Start Searching
          </Link>

          <Link
            href="/neighborhoods"
            className={`inline-flex items-center gap-2 px-6 py-4 rounded-xl text-base font-semibold transition-all border ${
              isLight
                ? "border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-slate-50"
                : "border-gray-700 text-gray-300 hover:border-gray-500 hover:bg-white/5"
            }`}
          >
            <Home className="w-5 h-5" />
            Browse Neighborhoods
          </Link>
        </div>

        {/* Feature Pills */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl w-full">
          {[
            {
              icon: <MessageSquare className="w-5 h-5" />,
              title: "Natural Language",
              desc: "Search like you talk — no forms or dropdowns needed.",
            },
            {
              icon: <Search className="w-5 h-5" />,
              title: "MLS Connected",
              desc: "Live data from the California Regional MLS.",
            },
            {
              icon: <Sparkles className="w-5 h-5" />,
              title: "Smart Matching",
              desc: "AI understands lifestyle preferences, not just bedrooms.",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className={`rounded-xl p-5 text-center border transition-colors ${
                isLight
                  ? "bg-white/60 backdrop-blur border-slate-200 hover:border-slate-300"
                  : "bg-white/5 backdrop-blur border-gray-800 hover:border-gray-700"
              }`}
            >
              <div
                className={`inline-flex items-center justify-center w-10 h-10 rounded-lg mb-3 ${
                  isLight
                    ? "bg-blue-100 text-blue-600"
                    : "bg-blue-500/20 text-blue-400"
                }`}
              >
                {feature.icon}
              </div>
              <h3
                className={`text-sm font-semibold mb-1 ${
                  isLight ? "text-slate-900" : "text-white"
                }`}
              >
                {feature.title}
              </h3>
              <p
                className={`text-xs leading-relaxed ${
                  isLight ? "text-slate-500" : "text-gray-500"
                }`}
              >
                {feature.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Subtle footer note */}
        <p
          className={`mt-16 text-xs ${
            isLight ? "text-slate-400" : "text-gray-600"
          }`}
        >
          Powered by chatRealty
        </p>
      </div>
    </SpaticalBackground>
  );
}
