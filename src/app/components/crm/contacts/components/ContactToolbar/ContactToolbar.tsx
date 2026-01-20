// ContactToolbar component - Search, filters, sorting, and actions

import React from 'react';
import { Search, Download, Plus, Grid3x3, List as ListIcon, Trash2 } from 'lucide-react';
import { ViewMode, SortBy, FilterBy, ContactAge } from '../../types';

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
  contactAgeFilter: ContactAge | 'all';
  onContactAgeFilterChange: (filter: ContactAge | 'all') => void;

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
  contactAgeFilter,
  onContactAgeFilterChange,
  selectedCount,
  onBulkDelete,
  totalContacts,
  areAllSelected,
  onSelectAll,
  onImport,
  onAdd,
  isLight
}: ContactToolbarProps) {
  return (
    <div className="space-y-4 mb-6">
      {/* Search Bar and Action Buttons */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${
            isLight ? 'text-gray-400' : 'text-gray-500'
          }`} />
          <input
            type="text"
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className={`w-full pl-10 pr-4 py-2.5 rounded-lg ${
              isLight
                ? 'bg-white border border-gray-300 text-gray-900'
                : 'bg-gray-800 border border-gray-700 text-white'
            } placeholder-gray-500 focus:outline-none focus:ring-2 ${
              isLight ? 'focus:ring-blue-500' : 'focus:ring-emerald-500'
            }`}
          />
        </div>

        {/* Action Buttons */}
        <button
          onClick={onImport}
          className={`px-4 py-2.5 rounded-lg flex items-center gap-2 transition-colors ${
            isLight
              ? 'bg-white border border-gray-300 hover:bg-gray-50 text-gray-700'
              : 'bg-gray-800 border border-gray-700 hover:bg-gray-700 text-gray-300'
          }`}
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Import</span>
        </button>

        <button
          onClick={onAdd}
          className={`px-4 py-2.5 rounded-lg flex items-center gap-2 transition-colors ${
            isLight
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-emerald-600 text-white hover:bg-emerald-700'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add</span>
        </button>
      </div>

      {/* Filters, Sort, and View Toggle */}
      <div className="flex items-center justify-between gap-2">
        {/* Select All Checkbox - Only show in LIST view */}
        {viewMode === ViewMode.LIST && (
          <label className="flex items-center gap-2 cursor-pointer flex-shrink-0">
            <input
              type="checkbox"
              checked={areAllSelected}
              onChange={onSelectAll}
              className={`w-4 h-4 rounded border transition-colors ${
                isLight
                  ? 'border-gray-300 text-blue-600 focus:ring-blue-500'
                  : 'border-gray-600 text-emerald-600 focus:ring-emerald-500'
              }`}
            />
            <span className={`text-sm font-medium ${
              isLight ? 'text-gray-700' : 'text-gray-300'
            }`}>
              All ({totalContacts})
            </span>
          </label>
        )}

        <div className="flex gap-2 flex-1 min-w-0">
          {/* Filter Dropdown */}
          <select
            value={filterBy}
            onChange={(e) => onFilterChange(e.target.value as FilterBy)}
            className={`flex-1 min-w-0 px-3 py-2 rounded-lg text-sm transition-colors ${
              isLight
                ? 'bg-white border border-gray-300 text-gray-900 hover:bg-gray-50'
                : 'bg-gray-800 border border-gray-700 text-white hover:bg-gray-700'
            } focus:outline-none focus:ring-2 ${
              isLight ? 'focus:ring-blue-500' : 'focus:ring-emerald-500'
            }`}
          >
            <option value={FilterBy.ALL}>All Contacts</option>
            <option value={FilterBy.NO_EMAIL}>Missing Email</option>
            <option value={FilterBy.NO_PHONE}>Missing Phone</option>
            <option value={FilterBy.NO_ADDRESS}>Missing Address</option>
            <option value={FilterBy.BUYERS}>Buyers</option>
            <option value={FilterBy.SELLERS}>Sellers</option>
          </select>

          {/* Age Filter Dropdown - Only show in LIST view */}
          {viewMode === ViewMode.LIST && (
            <select
              value={contactAgeFilter}
              onChange={(e) => onContactAgeFilterChange(e.target.value as ContactAge | 'all')}
              className={`flex-1 min-w-0 px-3 py-2 rounded-lg text-sm transition-colors ${
                isLight
                  ? 'bg-white border border-gray-300 text-gray-900 hover:bg-gray-50'
                  : 'bg-gray-800 border border-gray-700 text-white hover:bg-gray-700'
              } focus:outline-none focus:ring-2 ${
                isLight ? 'focus:ring-blue-500' : 'focus:ring-emerald-500'
              }`}
            >
              <option value="all">All Ages</option>
              <option value="recent">Recent (0-30d)</option>
              <option value="old">Old (31-365d)</option>
              <option value="ancient">Ancient (1y+)</option>
            </select>
          )}

          {/* Sort Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as SortBy)}
            className={`flex-1 min-w-0 px-3 py-2 rounded-lg text-sm transition-colors ${
              isLight
                ? 'bg-white border border-gray-300 text-gray-900 hover:bg-gray-50'
                : 'bg-gray-800 border border-gray-700 text-white hover:bg-gray-700'
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
        <div className={`flex gap-1 p-1 rounded-lg flex-shrink-0 ${
          isLight ? 'bg-gray-100' : 'bg-gray-800'
        }`}>
          <button
            onClick={() => onViewModeChange(ViewMode.CARD)}
            className={`p-2 rounded transition-colors ${
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
            className={`p-2 rounded transition-colors ${
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
        <div className={`p-3 rounded-lg flex items-center justify-between ${
          isLight ? 'bg-blue-50 border border-blue-200' : 'bg-gray-800 border border-gray-700'
        }`}>
          <span className={`text-sm font-medium ${
            isLight ? 'text-blue-900' : 'text-white'
          }`}>
            {selectedCount} contact{selectedCount !== 1 ? 's' : ''} selected
          </span>
          <button
            onClick={onBulkDelete}
            className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700 transition-colors flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete Selected
          </button>
        </div>
      )}
    </div>
  );
}
