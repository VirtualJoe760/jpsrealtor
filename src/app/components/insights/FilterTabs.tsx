"use client";

import { motion } from "framer-motion";
import { Sparkles, FolderOpen, Tag, Search } from "lucide-react";
import { useThemeClasses } from "@/app/contexts/ThemeContext";

interface FilterTabsProps {
  activeTab: "ai-suggestions" | "categories" | "topics";
  onTabChange: (tab: "ai-suggestions" | "categories" | "topics") => void;
  aiSuggestionsCount?: number;
  children?: React.ReactNode;
}

export default function FilterTabs({
  activeTab,
  onTabChange,
  aiSuggestionsCount,
  children,
}: FilterTabsProps) {
  const { border, textSecondary, currentTheme } =
    useThemeClasses();
  const isLight = currentTheme === "lightgradient";

  const tabs = [
    {
      id: "ai-suggestions" as const,
      label: "AI Suggestions",
      mobileLabel: "Search",
      icon: Sparkles,
      mobileIcon: Search,
    },
    {
      id: "categories" as const,
      label: "Categories",
      mobileLabel: "Categories",
      icon: FolderOpen,
      mobileIcon: FolderOpen,
    },
    {
      id: "topics" as const,
      label: "Topics",
      mobileLabel: "Topics",
      icon: Tag,
      mobileIcon: Tag,
    },
  ];

  return (
    <div className="w-full">
      {/* Tab Navigation - Admin Style */}
      <div className={`flex items-center gap-2 border-b ${border} overflow-x-auto`}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const MobileIcon = tab.mobileIcon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-all whitespace-nowrap ${
                isActive
                  ? isLight
                    ? "border-blue-600 text-blue-600 font-semibold"
                    : "border-emerald-500 text-emerald-400 font-semibold"
                  : `border-transparent ${textSecondary} ${
                      isLight ? "hover:text-gray-900 hover:border-gray-300" : "hover:text-white hover:border-gray-700"
                    }`
              }`}
            >
              <Icon className="hidden md:block w-4 h-4" />
              <MobileIcon className="md:hidden w-4 h-4" />
              <span className="hidden md:inline text-sm md:text-base">{tab.label}</span>
              <span className="md:hidden text-sm">{tab.mobileLabel}</span>
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
