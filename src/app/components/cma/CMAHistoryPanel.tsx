'use client';

// src/app/components/cma/CMAHistoryPanel.tsx
// Panel showing saved CMA history

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import CMAPreviewCard from './CMAPreviewCard';
import { getAllSavedCMAs, deleteCMA, type SavedCMA } from '@/app/utils/cma/saveCMA';

export interface CMAHistoryPanelProps {
  onSelect: (cma: SavedCMA) => void;
  selectedId?: string;
  limit?: number;
}

export default function CMAHistoryPanel({
  onSelect,
  selectedId,
  limit,
}: CMAHistoryPanelProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [savedCMAs, setSavedCMAs] = useState<SavedCMA[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved CMAs
  useEffect(() => {
    loadSavedCMAs();
  }, []);

  const loadSavedCMAs = () => {
    setIsLoading(true);
    try {
      const allCMAs = getAllSavedCMAs();
      const limitedCMAs = limit ? allCMAs.slice(0, limit) : allCMAs;
      setSavedCMAs(limitedCMAs);
    } catch (error) {
      console.error('Failed to load saved CMAs:', error);
      setSavedCMAs([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    try {
      deleteCMA(id);
      setSavedCMAs((prev) => prev.filter((cma) => cma.id !== id));
      console.log('✅ CMA deleted:', id);
    } catch (error) {
      console.error('Failed to delete CMA:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (savedCMAs.length === 0) {
    return (
      <div className="p-8 text-center">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
          No saved CMAs
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Generate your first CMA to get started
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          Saved CMAs ({savedCMAs.length})
        </h3>
        <button
          onClick={loadSavedCMAs}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          Refresh
        </button>
      </div>

      {/* CMA List */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {savedCMAs.map((cma) => (
            <CMAPreviewCard
              key={cma.id}
              cma={cma}
              onClick={() => onSelect(cma)}
              onDelete={() => handleDelete(cma.id)}
              isSelected={selectedId === cma.id}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
