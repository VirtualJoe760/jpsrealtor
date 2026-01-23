// EmailToolbar component - Enhanced toolbar with all original features restored

import React from 'react';
import { Search, Filter, SortAsc, SortDesc, RefreshCw, Archive, Trash2, Check, X, Plus, Mail, MailOpen, Tags } from 'lucide-react';
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
  filterType,
  onFilterChange,
  sortBy,
  sortOrder,
  onSortChange,
  onRefresh,
  onCompose,
  showBulkActions,
  selectedCount,
  onSelectAll,
  onDeselectAll,
  onBulkArchive,
  onBulkDelete,
  onBulkMarkRead,
  filterTags = [],
  onToggleFilterTag,
  availableTags = ['urgent', 'follow-up', 'lead', 'client', 'important', 'waiting', 'review'],
  isLight,
  loading = false,
}: EmailToolbarProps) {
  const [showTagDropdown, setShowTagDropdown] = React.useState(false);

  const bgClass = isLight ? 'bg-white/30' : 'bg-neutral-900/30';
  const textClass = isLight ? 'text-slate-900' : 'text-white';
  const mutedClass = isLight ? 'text-slate-600' : 'text-gray-400';
  const borderClass = isLight ? 'border-slate-300' : 'border-gray-600';
  const inputBgClass = isLight ? 'bg-white' : 'bg-gray-900';
  const buttonBgClass = isLight
    ? 'bg-white hover:bg-slate-100'
    : 'bg-gray-900 hover:bg-gray-700';
  const primaryBtnClass = isLight
    ? 'bg-blue-600 text-white hover:bg-blue-700'
    : 'bg-emerald-600 text-white hover:bg-emerald-700';

  return (
    <div className="flex-shrink-0">
      {showBulkActions ? (
        // Bulk Actions Bar
        <div className={`flex flex-wrap items-center justify-between gap-2 p-4 rounded-lg mb-4 px-4 md:px-0 ${bgClass}`}>
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
        // Normal Toolbar
        <div className={`flex flex-wrap items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-lg flex-shrink-0 px-4 md:px-0 mb-4 ${bgClass}`}>
          {/* Search */}
          <div className="w-full sm:flex-1 sm:min-w-[200px]">
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${mutedClass}`} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search emails..."
                className={`w-full pl-10 pr-4 py-2 rounded-lg border transition-all text-sm sm:text-base ${
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

          {/* Sort */}
          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as EmailSortBy, sortOrder)}
              className={`px-2 sm:px-3 py-2 rounded-lg border text-xs sm:text-sm ${
                isLight
                  ? 'bg-white border-slate-300 text-slate-900'
                  : 'bg-gray-900 border-gray-600 text-gray-100'
              }`}
            >
              <option value="date">Date</option>
              <option value="sender">Sender</option>
              <option value="subject">Subject</option>
            </select>
            <button
              onClick={() => onSortChange(sortBy, sortOrder === SortOrder.ASC ? SortOrder.DESC : SortOrder.ASC)}
              className={`p-2 rounded-lg transition-all border ${
                isLight
                  ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                  : 'bg-gray-900 border-gray-600 text-gray-300 hover:bg-gray-700'
              }`}
              title={sortOrder === SortOrder.ASC ? 'Ascending' : 'Descending'}
            >
              {sortOrder === SortOrder.ASC ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
            </button>
          </div>

          {/* Filter */}
          <select
            value={filterType}
            onChange={(e) => onFilterChange(e.target.value as EmailFilterType)}
            className={`px-2 sm:px-3 py-2 rounded-lg border text-xs sm:text-sm ${
              isLight
                ? 'bg-white border-slate-300 text-slate-900'
                : 'bg-gray-900 border-gray-600 text-gray-100'
            }`}
          >
            <option value="all">All Emails</option>
            <option value="unread">Unread</option>
            <option value="favorites">Favorites</option>
            <option value="attachments">Has Attachments</option>
          </select>

          {/* Tag Filters - Hide on very small screens */}
          {onToggleFilterTag && (
            <div className="hidden sm:flex items-center gap-2">
              <Filter className={`w-4 h-4 ${mutedClass}`} />
              <div className="flex flex-wrap gap-1">
                {availableTags.slice(0, 4).map((tag) => {
                  const isActive = filterTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      onClick={() => onToggleFilterTag(tag)}
                      className={`px-2 py-1 rounded-full text-xs font-medium transition-all ${
                        isActive
                          ? isLight
                            ? 'bg-blue-600 text-white'
                            : 'bg-emerald-600 text-white'
                          : isLight
                            ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <button
            onClick={onCompose}
            className={`flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-lg font-medium transition-all text-sm ${primaryBtnClass}`}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Compose</span>
          </button>
          <button
            onClick={onRefresh}
            disabled={loading}
            className={`flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-lg transition-all text-sm border ${
              isLight
                ? 'text-slate-700 hover:bg-slate-100 border-slate-300'
                : 'text-gray-300 hover:bg-gray-700 border-gray-600'
            } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      )}
    </div>
  );
}
