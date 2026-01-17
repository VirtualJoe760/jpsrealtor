// components/ArticleFilters.tsx - Search and Category Filters

import React from 'react';
import { Search } from 'lucide-react';
import { CATEGORY_OPTIONS } from '../constants';

interface ArticleFiltersProps {
  searchTerm: string;
  filterCategory: string;
  onSearchChange: (term: string) => void;
  onCategoryChange: (category: string) => void;
  textPrimary: string;
  textMuted: string;
  bgSecondary: string;
  border: string;
  isLight: boolean;
}

export function ArticleFilters({
  searchTerm,
  filterCategory,
  onSearchChange,
  onCategoryChange,
  textPrimary,
  textMuted,
  bgSecondary,
  border,
  isLight,
}: ArticleFiltersProps) {
  return (
    <div className="mb-6 flex-shrink-0">
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Input */}
        <div className="flex-1">
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${textMuted}`} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search articles..."
              className={`w-full pl-10 pr-4 py-3 ${bgSecondary} ${border} rounded-lg ${textPrimary} placeholder-gray-400 focus:outline-none focus:${isLight ? 'border-blue-500' : 'border-emerald-500'}`}
            />
          </div>
        </div>

        {/* Category Filter */}
        <select
          value={filterCategory}
          onChange={(e) => onCategoryChange(e.target.value)}
          className={`px-4 py-3 ${bgSecondary} ${border} rounded-lg ${textPrimary} focus:outline-none focus:${isLight ? 'border-blue-500' : 'border-emerald-500'}`}
        >
          {CATEGORY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
