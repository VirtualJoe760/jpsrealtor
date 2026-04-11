// EmailToolbar component - Search bar + bulk actions only

import React from 'react';
import { Search, Archive, Trash2, X, Mail, MailOpen } from 'lucide-react';
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
  onCompose: () => void;
  showBulkActions: boolean;
  selectedCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onBulkArchive: () => void;
  onBulkDelete: () => void;
  onBulkMarkRead: (read: boolean) => void;
  filterTags?: string[];
  onToggleFilterTag?: (tag: string) => void;
  availableTags?: string[];
  isLight: boolean;
  loading?: boolean;
}

export function EmailToolbar({
  searchQuery,
  onSearchChange,
  showBulkActions,
  selectedCount,
  onDeselectAll,
  onBulkArchive,
  onBulkDelete,
  onBulkMarkRead,
  isLight,
}: EmailToolbarProps) {
  const bgClass = isLight ? 'bg-white/30' : 'bg-neutral-900/30';
  const mutedClass = isLight ? 'text-slate-600' : 'text-gray-400';
  const primaryBtnClass = isLight
    ? 'bg-blue-600 text-white hover:bg-blue-700'
    : 'bg-emerald-600 text-white hover:bg-emerald-700';

  return (
    <div className="flex-shrink-0">
      {showBulkActions ? (
        // Bulk Actions Bar
        <div className={`flex flex-wrap items-center justify-between gap-2 p-4 rounded-lg mb-4 mx-4 ${bgClass}`}>
          <span className={`text-sm font-medium ${isLight ? 'text-blue-900' : 'text-emerald-300'}`}>
            {selectedCount} email{selectedCount !== 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onBulkMarkRead(true)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${primaryBtnClass}`}
            >
              <MailOpen className="w-4 h-4" />
              Mark Read
            </button>
            <button
              onClick={() => onBulkMarkRead(false)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${
                isLight
                  ? 'bg-white border-blue-300 text-blue-700 hover:bg-blue-50'
                  : 'bg-gray-800 border-emerald-600 text-emerald-400 hover:bg-gray-700'
              }`}
            >
              <Mail className="w-4 h-4" />
              Mark Unread
            </button>
            <button
              onClick={onBulkArchive}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                isLight
                  ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <Archive className="w-4 h-4" />
              Archive
            </button>
            <button
              onClick={onBulkDelete}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                isLight
                  ? 'text-red-600 hover:bg-red-50'
                  : 'text-red-400 hover:bg-red-900/20'
              }`}
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
            <button
              onClick={onDeselectAll}
              className={`p-1.5 rounded-lg transition-all ${
                isLight
                  ? 'text-slate-600 hover:bg-slate-100'
                  : 'text-gray-400 hover:bg-gray-700'
              }`}
              title="Clear selection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        // Search bar only
        <div className="px-4 pt-3 pb-2">
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${mutedClass}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search emails..."
              className={`w-full pl-10 pr-10 py-2 rounded-lg border transition-all text-sm ${
                isLight
                  ? 'bg-white border-slate-300 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                  : 'bg-gray-900 border-gray-600 text-gray-100 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
              }`}
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className={`absolute right-3 top-1/2 -translate-y-1/2 ${
                  isLight ? 'text-slate-400 hover:text-slate-600' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
