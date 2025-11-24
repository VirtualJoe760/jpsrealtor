'use client';

// src/app/components/cma/CMASearchBar.tsx
// Search bar for finding CMAs by address or property ID

import { useState, useCallback } from 'react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';

export interface CMASearchBarProps {
  onSearch: (query: string) => void;
  onClear: () => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export default function CMASearchBar({
  onSearch,
  onClear,
  placeholder = 'Search by address or property ID...',
  autoFocus = false,
}: CMASearchBarProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const handleSearch = useCallback(() => {
    if (query.trim()) {
      onSearch(query.trim());
    }
  }, [query, onSearch]);

  const handleClear = useCallback(() => {
    setQuery('');
    onClear();
  }, [onClear]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        handleSearch();
      } else if (e.key === 'Escape') {
        handleClear();
      }
    },
    [handleSearch, handleClear]
  );

  return (
    <div className="relative">
      <div
        className={`
          relative flex items-center rounded-lg border transition-all
          ${
            isFocused
              ? 'border-blue-500 ring-2 ring-blue-500/20'
              : 'border-gray-300 dark:border-gray-700'
          }
          bg-white dark:bg-gray-800
        `}
      >
        {/* Search Icon */}
        <div className="pl-3 pr-2">
          <svg
            className="w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* Input */}
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="
            flex-1 py-2 pr-2 bg-transparent
            text-gray-900 dark:text-white
            placeholder-gray-400 dark:placeholder-gray-500
            focus:outline-none
            text-sm
          "
        />

        {/* Clear Button */}
        <AnimatePresence>
          {query && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={handleClear}
              className="p-1 mr-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              aria-label="Clear search"
            >
              <svg
                className="w-4 h-4 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </motion.button>
          )}
        </AnimatePresence>

        {/* Search Button */}
        <button
          onClick={handleSearch}
          disabled={!query.trim()}
          className={`
            px-4 py-2 rounded-r-lg font-medium text-sm transition-colors
            ${
              query.trim()
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
            }
          `}
        >
          Search
        </button>
      </div>

      {/* Search Tips (shown when focused and empty) */}
      <AnimatePresence>
        {isFocused && !query && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="absolute left-0 right-0 mt-2 p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg z-10"
          >
            <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
              <div className="font-semibold mb-2">Search Tips:</div>
              <div>• Enter a street address (e.g., "123 Main St")</div>
              <div>• Enter a property ID (e.g., "SW22123456")</div>
              <div>• Enter a subdivision name</div>
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <kbd className="px-1.5 py-0.5 text-xs rounded bg-gray-100 dark:bg-gray-700">
                  Enter
                </kbd>{' '}
                to search •{' '}
                <kbd className="px-1.5 py-0.5 text-xs rounded bg-gray-100 dark:bg-gray-700">
                  Esc
                </kbd>{' '}
                to clear
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
