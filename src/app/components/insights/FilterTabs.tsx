"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, FolderOpen, Calendar, Tag } from "lucide-react";
import { useThemeClasses } from "@/app/contexts/ThemeContext";

interface FilterTabsProps {
  activeTab: "ai-suggestions" | "categories" | "date" | "topics";
  onTabChange: (tab: "ai-suggestions" | "categories" | "date" | "topics") => void;
  aiSuggestionsCount?: number;
  children?: React.ReactNode;
}

export default function FilterTabs({
  activeTab,
  onTabChange,
  aiSuggestionsCount,
  children,
}: FilterTabsProps) {
  const { bgSecondary, border, textPrimary, textSecondary, currentTheme } =
    useThemeClasses();
  const isLight = currentTheme === "lightgradient";

  const tabs = [
    {
      id: "ai-suggestions" as const,
      label: "AI Suggestions",
      icon: Sparkles,
      badge: aiSuggestionsCount,
    },
    {
      id: "categories" as const,
      label: "Categories",
      icon: FolderOpen,
    },
    {
      id: "date" as const,
      label: "Date",
      icon: Calendar,
    },
    {
      id: "topics" as const,
      label: "Topics",
      icon: Tag,
    },
  ];

  return (
    <div className="w-full">
      {/* Tab Navigation */}
      <div
        className={`flex gap-2 p-2 ${bgSecondary} ${border} border rounded-xl overflow-x-auto`}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex items-center gap-2 px-4 md:px-6 py-3 rounded-lg font-semibold transition-all whitespace-nowrap ${
                isActive
                  ? isLight
                    ? "bg-blue-600 text-white"
                    : "bg-emerald-600 text-white"
                  : isLight
                  ? "bg-transparent text-gray-700 hover:bg-blue-50"
                  : "bg-transparent text-gray-300 hover:bg-gray-800"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.split(" ")[0]}</span>

              {/* Badge for AI suggestions count */}
              {tab.badge && tab.badge > 0 && (
                <span
                  className={`ml-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                    isActive
                      ? "bg-white text-blue-600"
                      : isLight
                      ? "bg-blue-100 text-blue-700"
                      : "bg-emerald-900/30 text-emerald-400"
                  }`}
                >
                  {tab.badge}
                </span>
              )}

              {/* Active indicator */}
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-1 bg-white rounded-t-full"
                  initial={false}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {children && (
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mt-4"
        >
          {children}
        </motion.div>
      )}
    </div>
  );
}
