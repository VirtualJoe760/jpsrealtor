"use client";

import { FolderOpen, FileText, TrendingUp, Lightbulb } from "lucide-react";
import { useThemeClasses } from "@/app/contexts/ThemeContext";

interface CategoryFilterProps {
  selectedCategory: string | null;
  onCategorySelect: (category: string | null) => void;
  categoryCounts?: {
    articles: number;
    "market-insights": number;
    "real-estate-tips": number;
  };
}

export default function CategoryFilter({
  selectedCategory,
  onCategorySelect,
  categoryCounts = {
    articles: 0,
    "market-insights": 0,
    "real-estate-tips": 0,
  },
}: CategoryFilterProps) {
  const { border, textPrimary, textSecondary, currentTheme } =
    useThemeClasses();
  const isLight = currentTheme === "lightgradient";

  const categories = [
    {
      id: null,
      label: "All",
      icon: FolderOpen,
    },
    {
      id: "articles",
      label: "Articles",
      icon: FileText,
    },
    {
      id: "market-insights",
      label: "Insights",
      icon: TrendingUp,
    },
    {
      id: "real-estate-tips",
      label: "Tips",
      icon: Lightbulb,
    },
  ];

  return (
    <div className="flex items-center justify-evenly flex-wrap pb-6">
      {categories.map((category) => {
        const Icon = category.icon;
        const isSelected = selectedCategory === category.id;

        return (
          <button
            key={category.id || "all"}
            onClick={() => onCategorySelect(category.id)}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all whitespace-nowrap ${
              isSelected
                ? isLight
                  ? "bg-blue-600 text-white shadow-lg hover:bg-blue-700"
                  : "bg-emerald-600 text-white shadow-lg hover:bg-emerald-700"
                : isLight
                ? "bg-white/60 backdrop-blur-sm text-slate-700 border border-slate-300 hover:bg-white/80 hover:border-blue-400 hover:text-blue-600"
                : "bg-gray-800/60 backdrop-blur-sm text-gray-300 border border-gray-700 hover:bg-gray-700/80 hover:border-emerald-500 hover:text-emerald-400"
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-base">{category.label}</span>
          </button>
        );
      })}
    </div>
  );
}
