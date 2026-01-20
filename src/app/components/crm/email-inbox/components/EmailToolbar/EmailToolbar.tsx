// EmailToolbar component - Top toolbar with search, filters, sort, and bulk actions

import React from 'react';
import { Search, Filter, SortAsc, SortDesc, RefreshCw, Archive, Trash2, Check, X } from 'lucide-react';
import type { EmailFilterType, EmailSortBy } from '../../types';
import { SortOrder } from '../../types';

export interface EmailToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filterType: EmailFilterType;
  onFilterChange: (filter: EmailFilterType) => void;
  sortBy: EmailSortBy;
  sortOrder: SortOrder;
  onSortChange: (sortBy: EmailSortBy, sortOrder: SortOrder) => void;
  onRefresh: () => void;
  showBulkActions: boolean;
  selectedCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onBulkArchive: () => void;
  onBulkDelete: () => void;
  isLight: boolean;
}

export function EmailToolbar({
  searchQuery,
  onSearchChange,
  filterType,
  onFilterChange,
  sortBy,
  sortOrder,
  onSortChange,
  onRefresh,
  showBulkActions,
  selectedCount,
  onSelectAll,
  onDeselectAll,
  onBulkArchive,
  onBulkDelete,
  isLight,
}: EmailToolbarProps) {
  const bgClass = isLight ? 'bg-white' : 'bg-gray-900';
  const textClass = isLight ? 'text-gray-900' : 'text-white';
  const mutedClass = isLight ? 'text-gray-600' : 'text-gray-400';
  const borderClass = isLight ? 'border-gray-200' : 'border-gray-700';
  const inputBgClass = isLight ? 'bg-gray-50' : 'bg-gray-800';
  const buttonBgClass = isLight
    ? 'bg-gray-100 hover:bg-gray-200'
    : 'bg-gray-800 hover:bg-gray-700';

  return (
    <div className={`${bgClass} border-b ${borderClass} p-4`}>
      {showBulkActions ? (
        // Bulk Actions Bar
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className={`${textClass} font-medium`}>
              {selectedCount} selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={onSelectAll}
                className={`${buttonBgClass} ${textClass} px-3 py-1.5 rounded text-sm flex items-center gap-2`}
              >
                <Check size={14} />
                Select All
              </button>
              <button
                onClick={onDeselectAll}
                className={`${buttonBgClass} ${textClass} px-3 py-1.5 rounded text-sm flex items-center gap-2`}
              >
                <X size={14} />
                Deselect All
              </button>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onBulkArchive}
              className={`${buttonBgClass} ${textClass} px-3 py-1.5 rounded text-sm flex items-center gap-2`}
            >
              <Archive size={14} />
              Archive
            </button>
            <button
              onClick={onBulkDelete}
              className={`${isLight ? 'bg-red-100 hover:bg-red-200 text-red-700' : 'bg-red-900 hover:bg-red-800 text-red-300'} px-3 py-1.5 rounded text-sm flex items-center gap-2`}
            >
              <Trash2 size={14} />
              Delete
            </button>
          </div>
        </div>
      ) : (
        // Normal Toolbar
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="flex-1 max-w-md relative">
            <Search size={16} className={`${mutedClass} absolute left-3 top-1/2 -translate-y-1/2`} />
            <input
              type="text"
              placeholder="Search emails..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className={`${inputBgClass} ${textClass} w-full pl-10 pr-4 py-2 rounded border ${borderClass} focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
          </div>

          {/* Filter */}
          <select
            value={filterType}
            onChange={(e) => onFilterChange(e.target.value as EmailFilterType)}
            className={`${buttonBgClass} ${textClass} px-3 py-2 rounded border ${borderClass} focus:outline-none focus:ring-2 focus:ring-blue-500`}
          >
            <option value="all">All</option>
            <option value="unread">Unread</option>
            <option value="favorites">Favorites</option>
            <option value="attachments">With Attachments</option>
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as EmailSortBy, sortOrder)}
            className={`${buttonBgClass} ${textClass} px-3 py-2 rounded border ${borderClass} focus:outline-none focus:ring-2 focus:ring-blue-500`}
          >
            <option value="date">Date</option>
            <option value="sender">Sender</option>
            <option value="subject">Subject</option>
          </select>

          {/* Sort Order */}
          <button
            onClick={() => onSortChange(sortBy, sortOrder === SortOrder.ASC ? SortOrder.DESC : SortOrder.ASC)}
            className={`${buttonBgClass} ${textClass} p-2 rounded`}
            aria-label="Toggle sort order"
          >
            {sortOrder === SortOrder.ASC ? <SortAsc size={16} /> : <SortDesc size={16} />}
          </button>

          {/* Refresh */}
          <button
            onClick={onRefresh}
            className={`${buttonBgClass} ${textClass} p-2 rounded`}
            aria-label="Refresh emails"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
