// components/PaginationControls.tsx - Enhanced Pagination Controls

import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  totalArticles?: number;
  onPrevious: () => void;
  onNext: () => void;
  onPageChange?: (page: number) => void;
  textPrimary: string;
  textSecondary: string;
  isLight: boolean;
}

export function PaginationControls({
  page,
  totalPages,
  totalArticles,
  onPrevious,
  onNext,
  onPageChange,
  textPrimary,
  textSecondary,
  isLight,
}: PaginationControlsProps) {
  if (totalPages <= 1) return null;

  // Generate page numbers to display (show current page and 2 pages on each side)
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxPagesToShow = 5;

    if (totalPages <= maxPagesToShow) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      // Calculate range around current page
      let startPage = Math.max(2, page - 1);
      let endPage = Math.min(totalPages - 1, page + 1);

      // Add ellipsis if needed
      if (startPage > 2) {
        pages.push('...');
      }

      // Add pages around current
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }

      // Add ellipsis if needed
      if (endPage < totalPages - 1) {
        pages.push('...');
      }

      // Always show last page
      pages.push(totalPages);
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  const buttonBaseClass = `px-3 py-2 rounded-lg transition-all font-medium ${
    isLight
      ? 'hover:bg-gray-200 border border-gray-300'
      : 'hover:bg-gray-700 border border-gray-700'
  }`;

  const activeButtonClass = isLight
    ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
    : 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700';

  const iconButtonClass = `p-2 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
    isLight
      ? 'hover:bg-gray-200 border border-gray-300'
      : 'hover:bg-gray-700 border border-gray-700'
  }`;

  return (
    <div className="flex flex-col items-center gap-4 mt-8 mb-4">
      {/* Total articles count */}
      {totalArticles !== undefined && (
        <div className={`text-sm ${textSecondary}`}>
          Showing {Math.min(page * 10, totalArticles)} of {totalArticles} articles
        </div>
      )}

      {/* Pagination controls */}
      <div className="flex items-center gap-2">
        {/* First page button */}
        {onPageChange && (
          <button
            onClick={() => onPageChange(1)}
            disabled={page === 1}
            className={iconButtonClass}
            title="First page"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
        )}

        {/* Previous button */}
        <button
          onClick={onPrevious}
          disabled={page === 1}
          className={iconButtonClass}
          title="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Page number buttons */}
        <div className="flex items-center gap-1">
          {pageNumbers.map((pageNum, index) => {
            if (pageNum === '...') {
              return (
                <span key={`ellipsis-${index}`} className={`px-2 ${textSecondary}`}>
                  ...
                </span>
              );
            }

            const pageNumber = pageNum as number;
            const isActive = pageNumber === page;

            return (
              <button
                key={pageNumber}
                onClick={() => onPageChange ? onPageChange(pageNumber) : null}
                disabled={!onPageChange}
                className={`${buttonBaseClass} ${isActive ? activeButtonClass : textPrimary} min-w-[40px]`}
              >
                {pageNumber}
              </button>
            );
          })}
        </div>

        {/* Next button */}
        <button
          onClick={onNext}
          disabled={page === totalPages}
          className={iconButtonClass}
          title="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Last page button */}
        {onPageChange && (
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={page === totalPages}
            className={iconButtonClass}
            title="Last page"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Page info text */}
      <div className={`text-sm ${textSecondary} opacity-70`}>
        Page {page} of {totalPages}
      </div>
    </div>
  );
}
