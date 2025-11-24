'use client';

// src/app/components/cma/CMASidebar.tsx
// Sidebar combining search, filters, and history for CMA page

import { useState } from 'react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import CMASearchBar from './CMASearchBar';
import CMAFiltersPanel from './CMAFiltersPanel';
import CMAHistoryPanel from './CMAHistoryPanel';
import type { MapFilters } from '@/app/utils/mls/filterListingsServerSide';
import type { SavedCMA } from '@/app/utils/cma/saveCMA';

export interface CMASidebarProps {
  onSearch: (query: string) => void;
  onFilterChange: (filters: Partial<MapFilters>) => void;
  onCMASelect: (cma: SavedCMA) => void;
  onClearSearch: () => void;
  currentFilters: Partial<MapFilters>;
  selectedCMAId?: string;
}

type TabType = 'search' | 'history';

export default function CMASidebar({
  onSearch,
  onFilterChange,
  onCMASelect,
  onClearSearch,
  currentFilters,
  selectedCMAId,
}: CMASidebarProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [activeTab, setActiveTab] = useState<TabType>('search');

  const handleResetFilters = () => {
    onFilterChange({
      beds: undefined,
      baths: undefined,
      minSqft: undefined,
      maxSqft: undefined,
      minPrice: undefined,
      maxPrice: undefined,
      minYear: undefined,
      maxYear: undefined,
    });
  };

  // Theme-aware classes
  const sidebarBg = isDark ? 'bg-gray-900' : 'bg-white';
  const sidebarBorder = isDark ? 'border-gray-800' : 'border-gray-200';
  const tabBg = isDark ? 'bg-gray-800' : 'bg-gray-100';
  const tabActiveBg = isDark ? 'bg-emerald-500' : 'bg-blue-500';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';

  return (
    <div
      className={`
        flex flex-col h-full ${sidebarBg} border-r ${sidebarBorder}
      `}
    >
      {/* Tabs */}
      <div className={`p-4 border-b ${sidebarBorder}`}>
        <div className={`flex gap-2 p-1 rounded-lg ${tabBg}`}>
          <button
            onClick={() => setActiveTab('search')}
            className={`
              flex-1 px-4 py-2 rounded-md font-medium text-sm transition-colors
              ${
                activeTab === 'search'
                  ? `${tabActiveBg} text-white`
                  : `${textPrimary} hover:bg-gray-300 dark:hover:bg-gray-700`
              }
            `}
          >
            New CMA
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`
              flex-1 px-4 py-2 rounded-md font-medium text-sm transition-colors
              ${
                activeTab === 'history'
                  ? `${tabActiveBg} text-white`
                  : `${textPrimary} hover:bg-gray-300 dark:hover:bg-gray-700`
              }
            `}
          >
            History
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'search' ? (
            <motion.div
              key="search"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="p-4 space-y-6"
            >
              {/* Search Bar */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                  Search Property
                </h3>
                <CMASearchBar
                  onSearch={onSearch}
                  onClear={onClearSearch}
                />
              </div>

              {/* Filters */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                  Comparable Filters
                </h3>
                <CMAFiltersPanel
                  filters={currentFilters}
                  onChange={onFilterChange}
                  onReset={handleResetFilters}
                />
              </div>

              {/* Info Box */}
              <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900">
                <div className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                      How it works
                    </h4>
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      Search for a property by address to generate a Comparative Market Analysis. Use filters to refine comparable properties for more accurate valuations.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="history"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="p-4"
            >
              <CMAHistoryPanel
                onSelect={onCMASelect}
                selectedId={selectedCMAId}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Info */}
      <div className={`p-4 border-t ${sidebarBorder}`}>
        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
          <div className="flex items-center justify-between">
            <span>CMA Reports</span>
            <span className="font-semibold text-gray-900 dark:text-white">
              Auto-saved
            </span>
          </div>
          <div className="text-xs">
            Reports are saved locally and persist for 30 days
          </div>
        </div>
      </div>
    </div>
  );
}
