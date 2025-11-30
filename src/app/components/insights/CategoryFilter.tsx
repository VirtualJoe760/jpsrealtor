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
  const { bgSecondary, border, textPrimary, textSecondary, currentTheme } =
    useThemeClasses();
  const isLight = currentTheme === "lightgradient";

  const categories = [
    {
      id: null,
      label: "All Categories",
      icon: FolderOpen,
      count:
        categoryCounts.articles +
        categoryCounts["market-insights"] +
        categoryCounts["real-estate-tips"],
      description: "View all articles",
    },
    {
      id: "articles",
      label: "Articles",
      icon: FileText,
      count: categoryCounts.articles,
      description: "General real estate articles",
    },
    {
      id: "market-insights",
      label: "Market Insights",
      icon: TrendingUp,
      count: categoryCounts["market-insights"],
      description: "Market trends and analysis",
    },
    {
      id: "real-estate-tips",
      label: "Real Estate Tips",
      icon: Lightbulb,
      count: categoryCounts["real-estate-tips"],
      description: "Practical tips and advice",
    },
  ];

  return (
    <div className="space-y-3">
      {categories.map((category) => {
        const Icon = category.icon;
        const isSelected = selectedCategory === category.id;

        return (
          <button
            key={category.id || "all"}
            onClick={() => onCategorySelect(category.id)}
            className={`w-full p-4 rounded-xl transition-all text-left ${
              isSelected
                ? isLight
                  ? "bg-blue-600 text-white shadow-lg ring-2 ring-blue-300"
                  : "bg-emerald-600 text-white shadow-lg ring-2 ring-emerald-400/30"
                : `${bgSecondary} ${border} border hover:shadow-md ${
                    isLight ? "hover:bg-blue-50" : "hover:bg-gray-800"
                  }`
            }`}
          >
            <div className="flex items-center gap-3">
              {/* Icon */}
              <div
                className={`p-3 rounded-lg ${
                  isSelected
                    ? "bg-white/20"
                    : isLight
                    ? "bg-blue-100 text-blue-600"
                    : "bg-emerald-900/30 text-emerald-400"
                }`}
              >
                <Icon className="w-6 h-6" />
              </div>

              {/* Content */}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h3
                    className={`font-bold ${
                      isSelected
                        ? "text-white"
                        : isLight
                        ? "text-gray-900"
                        : "text-gray-100"
                    }`}
                  >
                    {category.label}
                  </h3>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-sm font-semibold ${
                      isSelected
                        ? "bg-white/30 text-white"
                        : isLight
                        ? "bg-blue-100 text-blue-700"
                        : "bg-emerald-900/30 text-emerald-400"
                    }`}
                  >
                    {category.count}
                  </span>
                </div>
                <p
                  className={`text-sm ${
                    isSelected
                      ? "text-white/90"
                      : isLight
                      ? "text-gray-600"
                      : "text-gray-400"
                  }`}
                >
                  {category.description}
                </p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
