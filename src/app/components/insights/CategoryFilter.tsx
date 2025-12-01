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
    <div className={`flex items-center gap-2 border-b ${border} overflow-x-auto`}>
      {categories.map((category) => {
        const Icon = category.icon;
        const isSelected = selectedCategory === category.id;

        return (
          <button
            key={category.id || "all"}
            onClick={() => onCategorySelect(category.id)}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-all whitespace-nowrap ${
              isSelected
                ? isLight
                  ? "border-blue-600 text-blue-600 font-semibold"
                  : "border-emerald-500 text-emerald-400 font-semibold"
                : `border-transparent ${textSecondary} ${
                    isLight ? "hover:text-gray-900 hover:border-gray-300" : "hover:text-white hover:border-gray-700"
                  }`
            }`}
          >
            <Icon className="w-4 h-4" />
            <span className="text-sm md:text-base">{category.label}</span>
          </button>
        );
      })}
    </div>
  );
}
