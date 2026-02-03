// ContactList - Container component for rendering contact list

import React, { useState, useMemo } from 'react';
import { Contact, ViewMode } from '../../types';
import { ContactCard } from './ContactCard';
import { ContactListItem } from './ContactListItem';
import { ContactCardSkeleton } from './ContactCardSkeleton';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ContactListProps {
  contacts: Contact[];
  viewMode: ViewMode;
  isLight: boolean;
  loading?: boolean;
  selectedContactIds: Set<string>;
  onSelectContact: (id: string) => void;
  onContactClick: (contact: Contact) => void;
  loadingCount?: number;
  areAllSelected: boolean;
  onSelectAll: () => void;
}

const ITEMS_PER_PAGE = 50;

export function ContactList({
  contacts,
  viewMode,
  isLight,
  loading = false,
  selectedContactIds,
  onSelectContact,
  onContactClick,
  loadingCount = 6,
  areAllSelected,
  onSelectAll,
}: ContactListProps) {
  const [currentPage, setCurrentPage] = useState(1);

  // Calculate pagination
  const totalPages = Math.ceil(contacts.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedContacts = useMemo(() =>
    contacts.slice(startIndex, endIndex),
    [contacts, startIndex, endIndex]
  );

  // Reset to page 1 when contacts change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [contacts.length]);
  // Show loading skeletons
  if (loading && contacts.length === 0) {
    return (
      <div className={viewMode === ViewMode.CARD ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' : 'space-y-0'}>
        {Array.from({ length: loadingCount }).map((_, index) => (
          <ContactCardSkeleton
            key={`skeleton-${index}`}
            isLight={isLight}
            viewMode={viewMode === ViewMode.CARD ? 'card' : 'list'}
          />
        ))}
      </div>
    );
  }

  // No contacts message
  if (contacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className={`text-center ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
          <p className="text-lg font-medium mb-2">No contacts found</p>
          <p className="text-sm">Try adjusting your filters or import contacts to get started</p>
        </div>
      </div>
    );
  }

  // Card View
  if (viewMode === ViewMode.CARD) {
    return (
      <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {paginatedContacts.map((contact) => (
            <ContactCard
              key={contact._id}
              contact={contact}
              isSelected={selectedContactIds.has(contact._id)}
              onSelect={onSelectContact}
              onClick={onContactClick}
              isLight={isLight}
            />
          ))}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className={`flex items-center justify-between mt-6 px-4 py-3 rounded-lg ${
            isLight ? 'bg-white/70' : 'bg-gray-900/70'
          }`}>
            <div className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
              Showing {startIndex + 1}-{Math.min(endIndex, contacts.length)} of {contacts.length}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className={`p-2 rounded transition-colors ${
                  currentPage === 1
                    ? 'opacity-50 cursor-not-allowed'
                    : isLight
                      ? 'hover:bg-gray-200'
                      : 'hover:bg-gray-700'
                } ${isLight ? 'text-gray-700' : 'text-gray-300'}`}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className={`px-4 py-2 rounded ${
                isLight ? 'bg-gray-100 text-gray-700' : 'bg-gray-800 text-gray-300'
              }`}>
                Page {currentPage} of {totalPages}
              </div>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className={`p-2 rounded transition-colors ${
                  currentPage === totalPages
                    ? 'opacity-50 cursor-not-allowed'
                    : isLight
                      ? 'hover:bg-gray-200'
                      : 'hover:bg-gray-700'
                } ${isLight ? 'text-gray-700' : 'text-gray-300'}`}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // List View
  return (
    <div className="relative flex flex-col h-full pb-12">
      {/* List Container with fixed header */}
      <div className={`flex flex-col rounded-lg overflow-hidden flex-1 ${
        isLight
          ? 'bg-white/30 shadow-lg border border-gray-200/20'
          : 'bg-neutral-900/30 shadow-lg border border-gray-700/20'
      }`}>
        {/* List Header - FIXED, does not scroll */}
        <div className={`flex-shrink-0 flex items-center gap-2 md:gap-4 px-3 py-2 border-b font-medium text-xs ${
          isLight ? 'bg-gray-50/20 border-gray-200/30 text-gray-700' : 'bg-gray-900/20 border-gray-700/30 text-gray-300'
        }`}>
          {/* Select All Checkbox */}
          <input
            type="checkbox"
            checked={areAllSelected}
            onChange={onSelectAll}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer flex-shrink-0"
          />

          <div className="w-8" /> {/* Avatar column */}
          <div className="flex-1 md:w-48">Name</div>
          <div className="hidden md:block md:w-32">Status</div>
          <div className="hidden md:block md:flex-1">Contact Info</div>
          <div className="hidden md:block md:w-40">Tags</div>
          <div className="hidden md:block md:w-24">Imported</div>

          {/* Label Dropdown - Mobile visible */}
          <div className="md:hidden flex items-center gap-2 flex-shrink-0">
            <span className={`text-xs ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>Label</span>
            <select
              className={`text-xs px-2 py-1 rounded border ${
                isLight
                  ? 'bg-white border-gray-300 text-gray-900'
                  : 'bg-gray-800 border-gray-700 text-white'
              } focus:outline-none`}
            >
              <option>All</option>
              <option>Phone</option>
              <option>Email</option>
              <option>Status</option>
              <option>Tags</option>
            </select>
          </div>
        </div>

        {/* Scrollable List Items - ONLY THIS SCROLLS */}
        <div className="overflow-y-auto scrollbar-hide max-h-[calc(100vh-380px)]">
          {paginatedContacts.map((contact) => (
            <ContactListItem
              key={contact._id}
              contact={contact}
              isSelected={selectedContactIds.has(contact._id)}
              onSelect={onSelectContact}
              onClick={onContactClick}
              isLight={isLight}
            />
          ))}
        </div>
      </div>

      {/* Pagination Controls - ALWAYS visible */}
      <div className="flex-shrink-0 flex items-center justify-center mt-8 mb-16 md:mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1 || totalPages <= 1}
            className={`p-1.5 transition-all ${
              currentPage === 1 || totalPages <= 1
                ? 'opacity-30 cursor-not-allowed'
                : 'opacity-70 hover:opacity-100'
            } ${isLight ? 'text-gray-700' : 'text-gray-300'}`}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className={`text-xs font-medium ${
            isLight ? 'text-gray-600' : 'text-gray-400'
          }`}>
            {currentPage} / {totalPages}
          </div>

          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages || totalPages <= 1}
            className={`p-1.5 transition-all ${
              currentPage === totalPages || totalPages <= 1
                ? 'opacity-30 cursor-not-allowed'
                : 'opacity-70 hover:opacity-100'
            } ${isLight ? 'text-gray-700' : 'text-gray-300'}`}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
