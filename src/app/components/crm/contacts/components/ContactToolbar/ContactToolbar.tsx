// ContactToolbar component - Search, filters, sorting, and actions

import React from 'react';
import { Search, Download, Plus, Grid3x3, List as ListIcon, Trash2 } from 'lucide-react';
import { ViewMode, SortBy, FilterBy, ContactAge, Tag } from '../../types';

interface ContactToolbarProps {
  // Search
  searchQuery: string;
  onSearchChange: (query: string) => void;

  // View mode
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;

  // Sorting
  sortBy: SortBy;
  onSortChange: (sort: SortBy) => void;

  // Filtering
  filterBy: FilterBy;
  onFilterChange: (filter: FilterBy) => void;

  // Bulk actions
  selectedCount: number;
  onBulkDelete: () => void;

  // Select all
  totalContacts: number;
  areAllSelected: boolean;
  onSelectAll: () => void;

  // Actions
  onImport: () => void;
  onAdd: () => void;

  // Tags
  tags?: Tag[];
  selectedTag?: string | null;
  onTagChange?: (tag: string | null) => void;

  // Theme
  isLight: boolean;
}

export function ContactToolbar({
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange,
  sortBy,
  onSortChange,
  filterBy,
  onFilterChange,
  selectedCount,
  onBulkDelete,
  totalContacts,
  areAllSelected,
  onSelectAll,
  onImport,
  onAdd,
  tags = [],
  selectedTag,
  onTagChange,
  isLight
}: ContactToolbarProps) {
  return (
    <div className="space-y-2 mb-4">
      {/* Search Bar and Action Buttons */}
      <div className="flex gap-2">
        <div className="flex-1 relative p-px">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${
            isLight ? 'text-gray-400' : 'text-gray-500'
          }`} />
          <input
            type="text"
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className={`w-full pl-9 pr-3 py-2 rounded-lg text-sm ${
              isLight
                ? 'bg-white/40 border border-gray-200/30 text-gray-900'
                : 'bg-neutral-900/30 text-white border border-gray-700/20'
            } placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-0 ${
              isLight ? 'focus:ring-blue-500' : 'focus:ring-emerald-500'
            }`}
          />
        </div>

        {/* Action Buttons */}
        <button
          onClick={onImport}
          className={`px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors ${
            isLight
              ? 'bg-white/40 border border-gray-200/30 hover:bg-white/50 text-gray-700'
              : 'bg-neutral-900/30 border border-gray-700/20 hover:bg-neutral-900/40 text-gray-300'
          }`}
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline text-sm">Import</span>
        </button>

        <button
          onClick={onAdd}
          className={`px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors shadow-md ${
            isLight
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-emerald-600 text-white hover:bg-emerald-700'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline text-sm">Add</span>
        </button>
      </div>

      {/* Filters, Sort, and View Toggle */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-2 flex-1 min-w-0">
          {/* Tag Filter Dropdown */}
          <select
            value={selectedTag || 'all'}
            onChange={(e) => onTagChange?.(e.target.value === 'all' ? null : e.target.value)}
            className={`flex-1 min-w-0 px-2.5 py-1.5 rounded-lg text-sm transition-colors ${
              isLight
                ? 'bg-white/40 border border-gray-200/30 text-gray-900 hover:bg-white/50'
                : 'bg-neutral-900/30 border border-gray-700/20 text-white hover:bg-neutral-900/40'
            } focus:outline-none focus:ring-2 ${
              isLight ? 'focus:ring-blue-500' : 'focus:ring-emerald-500'
            }`}
          >
            <option value="all">All Contacts</option>
            {tags.map((tag) => (
              <option key={tag.name} value={tag.name}>
                {tag.name} ({tag.contactCount})
              </option>
            ))}
          </select>

          {/* Sort Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as SortBy)}
            className={`flex-1 min-w-0 px-2.5 py-1.5 rounded-lg text-sm transition-colors ${
              isLight
                ? 'bg-white/40 border border-gray-200/30 text-gray-900 hover:bg-white/50'
                : 'bg-neutral-900/30 border border-gray-700/20 text-white hover:bg-neutral-900/40'
            } focus:outline-none focus:ring-2 ${
              isLight ? 'focus:ring-blue-500' : 'focus:ring-emerald-500'
            }`}
          >
            <option value={SortBy.A_TO_Z}>A-Z</option>
            <option value={SortBy.Z_TO_A}>Z-A</option>
            <option value={SortBy.NEWEST}>Newest First</option>
            <option value={SortBy.OLDEST}>Oldest First</option>
            <option value={SortBy.STATUS}>By Status</option>
          </select>
        </div>

        {/* View Mode Toggle - Always visible */}
        <div className={`flex gap-0.5 p-0.5 rounded-lg flex-shrink-0 ${
          isLight ? 'bg-white/40 border border-gray-200/30' : 'bg-neutral-900/30 border border-gray-700/20'
        }`}>
          <button
            onClick={() => onViewModeChange(ViewMode.CARD)}
            className={`p-1.5 rounded transition-colors ${
              viewMode === ViewMode.CARD
                ? isLight
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'bg-gray-700 text-emerald-400'
                : isLight
                  ? 'text-gray-600 hover:bg-gray-50'
                  : 'text-gray-400 hover:bg-gray-700'
            }`}
            title="Card view"
          >
            <Grid3x3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onViewModeChange(ViewMode.LIST)}
            className={`p-1.5 rounded transition-colors ${
              viewMode === ViewMode.LIST
                ? isLight
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'bg-gray-700 text-emerald-400'
                : isLight
                  ? 'text-gray-600 hover:bg-gray-50'
                  : 'text-gray-400 hover:bg-gray-700'
            }`}
            title="List view"
          >
            <ListIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedCount > 0 && (
        <div className={`p-2.5 rounded-lg flex items-center justify-between ${
          isLight ? 'bg-blue-50 border border-blue-200' : 'bg-gray-800 border border-gray-700'
        }`}>
          <span className={`text-sm font-medium ${
            isLight ? 'text-blue-900' : 'text-white'
          }`}>
            {selectedCount} contact{selectedCount !== 1 ? 's' : ''} selected
          </span>
          <button
            onClick={onBulkDelete}
            className="px-2.5 py-1.5 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700 transition-colors flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete Selected
          </button>
        </div>
      )}
    </div>
  );
}
