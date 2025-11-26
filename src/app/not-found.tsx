// src/app/not-found.tsx
// Custom 404 page for Next.js
"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Home, Map, MapPin, MessageSquare, Search } from "lucide-react";
import { useThemeClasses } from "@/app/contexts/ThemeContext";

export default function NotFound() {
  const {
    currentTheme,
    cardBg,
    cardBorder,
    textPrimary,
    textSecondary,
    shadow,
  } = useThemeClasses();
  const isLight = currentTheme === "lightgradient";

  const navigationItems = [
    { label: "Go Home", href: "/", icon: Home, color: "blue" },
    { label: "Browse Listings", href: "/map", icon: Search, color: "emerald" },
    { label: "Neighborhoods", href: "/neighborhoods", icon: MapPin, color: "purple" },
    { label: "Chat", href: "/", icon: MessageSquare, color: "amber" },
  ];

  const getIconBgColor = (color: string) => {
    const colors: Record<string, string> = {
      blue: isLight ? "bg-blue-50" : "bg-blue-500/10",
      emerald: isLight ? "bg-emerald-50" : "bg-emerald-500/10",
      purple: isLight ? "bg-purple-50" : "bg-purple-500/10",
      amber: isLight ? "bg-amber-50" : "bg-amber-500/10",
    };
    return colors[color] || colors.blue;
  };

  const getIconColor = (color: string) => {
    const colors: Record<string, string> = {
      blue: "text-blue-400",
      emerald: "text-emerald-400",
      purple: "text-purple-400",
      amber: "text-amber-400",
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="min-h-screen py-12 px-4 flex items-center justify-center">
      <div className="max-w-3xl mx-auto w-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-8 text-center"
        >
          <h1
            className={`text-8xl md:text-9xl font-bold text-transparent bg-clip-text mb-4 ${
              isLight
                ? "bg-gradient-to-r from-blue-500 via-blue-600 to-emerald-500"
                : "bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500"
            }`}
          >
            404
          </h1>
          <h2 className={`text-2xl md:text-4xl font-bold ${textPrimary} mb-2`}>
            Page Not Found
          </h2>
          <p className={`${textSecondary} text-sm md:text-base`}>
            Looks like this property has been moved or doesn't exist. Let's get you back on track.
          </p>
        </motion.div>

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {navigationItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
              >
                <Link
                  href={item.href}
                  className={`${cardBg} ${cardBorder} border rounded-xl p-6 ${shadow} block hover:scale-[1.02] transition-transform duration-300`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 ${getIconBgColor(item.color)} rounded-lg flex items-center justify-center`}
                    >
                      <Icon className={`w-6 h-6 ${getIconColor(item.color)}`} />
                    </div>
                    <span className={`text-lg font-semibold ${textPrimary}`}>
                      {item.label}
                    </span>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>

        {/* Help Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className={`${cardBg} ${cardBorder} border rounded-2xl p-6 ${shadow}`}
        >
          <h3 className={`text-xl font-semibold ${textPrimary} mb-3`}>
            Need Help?
          </h3>
          <p className={`${textSecondary} mb-4`}>
            If you think this page should exist or if you need assistance finding a specific property or neighborhood, please contact me directly.
          </p>
          <div className="flex flex-wrap gap-4 text-sm">
            <a
              href="tel:+1234567890"
              className={`${
                isLight
                  ? "text-blue-600 hover:text-blue-700"
                  : "text-blue-400 hover:text-blue-300"
              } hover:underline`}
            >
              Call
            </a>
            <a
              href="mailto:joey@example.com"
              className={`${
                isLight
                  ? "text-blue-600 hover:text-blue-700"
                  : "text-blue-400 hover:text-blue-300"
              } hover:underline`}
            >
              Email
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
