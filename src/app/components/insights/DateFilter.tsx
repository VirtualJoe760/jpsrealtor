"use client";

import { useState } from "react";
import { useThemeClasses } from "@/app/contexts/ThemeContext";

interface DateFilterProps {
  onFilterChange: (filter: { year?: number; month?: number }) => void;
  availableYears?: number[];
  availableMonths?: { year: number; month: number; count: number }[];
}

export default function DateFilter({
  onFilterChange,
  availableYears = [],
  availableMonths = [],
}: DateFilterProps) {
  const [selectedYear, setSelectedYear] = useState<number | undefined>(undefined);
  const [selectedMonth, setSelectedMonth] = useState<number | undefined>(undefined);
  const { bgSecondary, border, textPrimary, textSecondary, currentTheme } =
    useThemeClasses();
  const isLight = currentTheme === "lightgradient";

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const handleYearChange = (year: number | undefined) => {
    setSelectedYear(year);
    setSelectedMonth(undefined);
    onFilterChange({ year, month: undefined });
  };

  const handleMonthChange = (month: number | undefined) => {
    setSelectedMonth(month);
    onFilterChange({ year: selectedYear, month });
  };

  const handleQuickFilter = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    setSelectedYear(year);
    setSelectedMonth(month);
    onFilterChange({ year, month });
  };

  const clearFilters = () => {
    setSelectedYear(undefined);
    setSelectedMonth(undefined);
    onFilterChange({});
  };

  return (
    <div className="space-y-4">
      {/* Quick Filters */}
      <div>
        <p className={`text-sm font-semibold mb-2 ${textSecondary}`}>
          Quick Filters
        </p>
        <div className="flex flex-wrap gap-2">
          {[
            { label: "Last 30 days", days: 30 },
            { label: "Last 3 months", days: 90 },
            { label: "This year", days: 0 },
          ].map((filter) => (
            <button
              key={filter.label}
              onClick={() => {
                if (filter.days === 0) {
                  handleYearChange(new Date().getFullYear());
                } else {
                  handleQuickFilter(filter.days);
                }
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isLight
                  ? "bg-blue-100 hover:bg-blue-200 text-blue-700"
                  : "bg-emerald-900/30 hover:bg-emerald-900/50 text-emerald-400"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Year Selector */}
      <div>
        <p className={`text-sm font-semibold mb-2 ${textSecondary}`}>
          Select Year
        </p>
        <select
          value={selectedYear || ""}
          onChange={(e) => handleYearChange(e.target.value ? parseInt(e.target.value) : undefined)}
          className={`w-full px-4 py-3 rounded-lg ${bgSecondary} ${border} border ${textPrimary} outline-none transition-all ${
            isLight
              ? "focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              : "focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          }`}
        >
          <option value="">All Years</option>
          {availableYears.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>

      {/* Month Selector (shown when year is selected) */}
      {selectedYear && (
        <div>
          <p className={`text-sm font-semibold mb-2 ${textSecondary}`}>
            Select Month
          </p>
          <select
            value={selectedMonth || ""}
            onChange={(e) => handleMonthChange(e.target.value ? parseInt(e.target.value) : undefined)}
            className={`w-full px-4 py-3 rounded-lg ${bgSecondary} ${border} border ${textPrimary} outline-none transition-all ${
              isLight
                ? "focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                : "focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            }`}
          >
            <option value="">All Months</option>
            {months.map((month, idx) => {
              const monthData = availableMonths.find(
                (m) => m.year === selectedYear && m.month === idx + 1
              );
              return (
                <option key={idx} value={idx + 1}>
                  {month} {monthData ? `(${monthData.count})` : ""}
                </option>
              );
            })}
          </select>
        </div>
      )}

      {/* Active Filters Display */}
      {(selectedYear || selectedMonth) && (
        <div className="pt-2">
          <div className="flex items-center justify-between">
            <p className={`text-sm ${textSecondary}`}>
              {selectedMonth
                ? `${months[selectedMonth - 1]} ${selectedYear}`
                : selectedYear
                ? `All of ${selectedYear}`
                : "All time"}
            </p>
            <button
              onClick={clearFilters}
              className={`text-sm font-medium transition-colors ${
                isLight
                  ? "text-blue-600 hover:text-blue-700"
                  : "text-emerald-400 hover:text-emerald-300"
              }`}
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
