'use client';

// src/app/components/cma/CMAFiltersPanel.tsx
// Filters panel for CMA generation

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { MapFilters } from '@/app/utils/mls/filterListingsServerSide';

export interface CMAFiltersProps {
  filters: Partial<MapFilters>;
  onChange: (filters: Partial<MapFilters>) => void;
  onReset: () => void;
}

export default function CMAFiltersPanel({
  filters,
  onChange,
  onReset,
}: CMAFiltersProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Local state
  const [beds, setBeds] = useState<number | undefined>(filters.beds);
  const [baths, setBaths] = useState<number | undefined>(filters.baths);
  const [minSqft, setMinSqft] = useState<number | undefined>(filters.minSqft);
  const [maxSqft, setMaxSqft] = useState<number | undefined>(filters.maxSqft);
  const [minPrice, setMinPrice] = useState<number | undefined>(filters.minPrice);
  const [maxPrice, setMaxPrice] = useState<number | undefined>(filters.maxPrice);
  const [minYear, setMinYear] = useState<number | undefined>(filters.minYear);
  const [maxYear, setMaxYear] = useState<number | undefined>(filters.maxYear);

  // Collapsible sections
  const [openSections, setOpenSections] = useState({
    basic: true,
    property: false,
  });

  // Sync with prop changes
  useEffect(() => {
    setBeds(filters.beds);
    setBaths(filters.baths);
    setMinSqft(filters.minSqft);
    setMaxSqft(filters.maxSqft);
    setMinPrice(filters.minPrice);
    setMaxPrice(filters.maxPrice);
    setMinYear(filters.minYear);
    setMaxYear(filters.maxYear);
  }, [filters]);

  const handleApply = () => {
    onChange({
      beds,
      baths,
      minSqft,
      maxSqft,
      minPrice,
      maxPrice,
      minYear,
      maxYear,
    });
  };

  const handleReset = () => {
    setBeds(undefined);
    setBaths(undefined);
    setMinSqft(undefined);
    setMaxSqft(undefined);
    setMinPrice(undefined);
    setMaxPrice(undefined);
    setMinYear(undefined);
    setMaxYear(undefined);
    onReset();
  };

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Theme-aware classes
  const sectionBg = isDark ? 'bg-gray-800' : 'bg-white';
  const sectionBorder = isDark ? 'border-gray-700' : 'border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-600';
  const inputBg = isDark ? 'bg-gray-900' : 'bg-gray-50';
  const inputBorder = isDark ? 'border-gray-700' : 'border-gray-300';
  const buttonActive = isDark
    ? 'bg-emerald-500 text-black'
    : 'bg-blue-500 text-white';
  const buttonInactive = isDark
    ? 'bg-gray-800 text-white hover:bg-gray-700'
    : 'bg-gray-100 text-gray-700 hover:bg-gray-200';

  const SectionHeader = ({
    title,
    section,
  }: {
    title: string;
    section: keyof typeof openSections;
  }) => (
    <button
      onClick={() => toggleSection(section)}
      className={`
        w-full flex items-center justify-between p-3 rounded-lg
        ${sectionBg} border ${sectionBorder}
        hover:bg-gray-100 dark:hover:bg-gray-700
        transition-colors
      `}
    >
      <span className={`font-semibold ${textPrimary}`}>{title}</span>
      {openSections[section] ? (
        <ChevronUp className="w-5 h-5" />
      ) : (
        <ChevronDown className="w-5 h-5" />
      )}
    </button>
  );

  return (
    <div className="space-y-4">
      {/* Basic Filters */}
      <div>
        <SectionHeader title="Basic Filters" section="basic" />
        <AnimatePresence>
          {openSections.basic && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="p-4 space-y-4">
                {/* Beds & Baths */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      className={`block text-sm font-medium mb-2 ${textSecondary}`}
                    >
                      Bedrooms
                    </label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((num) => (
                        <button
                          key={num}
                          onClick={() =>
                            setBeds(beds === num ? undefined : num)
                          }
                          className={`
                            flex-1 px-2 py-1.5 rounded text-sm font-medium transition-colors
                            ${
                              beds === num
                                ? buttonActive
                                : buttonInactive
                            }
                          `}
                        >
                          {num}+
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label
                      className={`block text-sm font-medium mb-2 ${textSecondary}`}
                    >
                      Bathrooms
                    </label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4].map((num) => (
                        <button
                          key={num}
                          onClick={() =>
                            setBaths(baths === num ? undefined : num)
                          }
                          className={`
                            flex-1 px-2 py-1.5 rounded text-sm font-medium transition-colors
                            ${
                              baths === num
                                ? buttonActive
                                : buttonInactive
                            }
                          `}
                        >
                          {num}+
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Price Range */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${textSecondary}`}
                  >
                    Price Range
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      value={minPrice || ''}
                      onChange={(e) =>
                        setMinPrice(
                          e.target.value ? parseInt(e.target.value) : undefined
                        )
                      }
                      placeholder="Min"
                      className={`
                        px-3 py-2 rounded border ${inputBorder} ${inputBg}
                        ${textPrimary} text-sm
                        focus:outline-none focus:ring-2 focus:ring-blue-500
                      `}
                    />
                    <input
                      type="number"
                      value={maxPrice || ''}
                      onChange={(e) =>
                        setMaxPrice(
                          e.target.value ? parseInt(e.target.value) : undefined
                        )
                      }
                      placeholder="Max"
                      className={`
                        px-3 py-2 rounded border ${inputBorder} ${inputBg}
                        ${textPrimary} text-sm
                        focus:outline-none focus:ring-2 focus:ring-blue-500
                      `}
                    />
                  </div>
                </div>

                {/* Square Footage */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${textSecondary}`}
                  >
                    Square Footage
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      value={minSqft || ''}
                      onChange={(e) =>
                        setMinSqft(
                          e.target.value ? parseInt(e.target.value) : undefined
                        )
                      }
                      placeholder="Min Sqft"
                      className={`
                        px-3 py-2 rounded border ${inputBorder} ${inputBg}
                        ${textPrimary} text-sm
                        focus:outline-none focus:ring-2 focus:ring-blue-500
                      `}
                    />
                    <input
                      type="number"
                      value={maxSqft || ''}
                      onChange={(e) =>
                        setMaxSqft(
                          e.target.value ? parseInt(e.target.value) : undefined
                        )
                      }
                      placeholder="Max Sqft"
                      className={`
                        px-3 py-2 rounded border ${inputBorder} ${inputBg}
                        ${textPrimary} text-sm
                        focus:outline-none focus:ring-2 focus:ring-blue-500
                      `}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Property Details */}
      <div>
        <SectionHeader title="Property Details" section="property" />
        <AnimatePresence>
          {openSections.property && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="p-4 space-y-4">
                {/* Year Built */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${textSecondary}`}
                  >
                    Year Built
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      value={minYear || ''}
                      onChange={(e) =>
                        setMinYear(
                          e.target.value ? parseInt(e.target.value) : undefined
                        )
                      }
                      placeholder="Min Year"
                      className={`
                        px-3 py-2 rounded border ${inputBorder} ${inputBg}
                        ${textPrimary} text-sm
                        focus:outline-none focus:ring-2 focus:ring-blue-500
                      `}
                    />
                    <input
                      type="number"
                      value={maxYear || ''}
                      onChange={(e) =>
                        setMaxYear(
                          e.target.value ? parseInt(e.target.value) : undefined
                        )
                      }
                      placeholder="Max Year"
                      className={`
                        px-3 py-2 rounded border ${inputBorder} ${inputBg}
                        ${textPrimary} text-sm
                        focus:outline-none focus:ring-2 focus:ring-blue-500
                      `}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={handleReset}
          className={`
            flex-1 px-4 py-2 rounded font-medium text-sm
            ${buttonInactive}
          `}
        >
          Reset
        </button>
        <button
          onClick={handleApply}
          className={`
            flex-1 px-4 py-2 rounded font-medium text-sm
            ${buttonActive}
          `}
        >
          Apply Filters
        </button>
      </div>
    </div>
  );
}
