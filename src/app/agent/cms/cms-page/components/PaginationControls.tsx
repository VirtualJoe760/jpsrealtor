// components/PaginationControls.tsx - Pagination Controls

import React from 'react';

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  onPrevious: () => void;
  onNext: () => void;
  textPrimary: string;
  textSecondary: string;
  isLight: boolean;
}

export function PaginationControls({
  page,
  totalPages,
  onPrevious,
  onNext,
  textPrimary,
  textSecondary,
  isLight,
}: PaginationControlsProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <button
        onClick={onPrevious}
        disabled={page === 1}
        className={`px-4 py-2 ${textPrimary} rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isLight ? 'bg-gray-200 hover:bg-gray-300 border border-gray-300' : 'bg-gray-800 hover:bg-gray-700 border border-gray-700'}`}
      >
        Previous
      </button>
      <span className={`${textSecondary}`}>
        Page {page} of {totalPages}
      </span>
      <button
        onClick={onNext}
        disabled={page === totalPages}
        className={`px-4 py-2 ${textPrimary} rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isLight ? 'bg-gray-200 hover:bg-gray-300 border border-gray-300' : 'bg-gray-800 hover:bg-gray-700 border border-gray-700'}`}
      >
        Next
      </button>
    </div>
  );
}
