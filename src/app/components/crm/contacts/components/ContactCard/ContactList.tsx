// ContactList - Container component for rendering contact list

import React from 'react';
import { Contact, ViewMode } from '../../types';
import { ContactCard } from './ContactCard';
import { ContactListItem } from './ContactListItem';
import { ContactCardSkeleton } from './ContactCardSkeleton';

interface ContactListProps {
  contacts: Contact[];
  viewMode: ViewMode;
  isLight: boolean;
  loading?: boolean;
  selectedContactIds: Set<string>;
  onSelectContact: (id: string) => void;
  onContactClick: (contact: Contact) => void;
  loadingCount?: number;
}

export function ContactList({
  contacts,
  viewMode,
  isLight,
  loading = false,
  selectedContactIds,
  onSelectContact,
  onContactClick,
  loadingCount = 6,
}: ContactListProps) {
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {contacts.map((contact) => (
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
    );
  }

  // List View
  return (
    <div className={`rounded-lg overflow-hidden ${
      isLight ? 'bg-white border border-gray-200' : 'bg-gray-800 border border-gray-700'
    }`}>
      {/* List Header */}
      <div className={`flex items-center gap-4 px-4 py-3 border-b font-medium text-sm ${
        isLight ? 'bg-gray-50 border-gray-200 text-gray-700' : 'bg-gray-900 border-gray-700 text-gray-300'
      }`}>
        <div className="w-4" /> {/* Checkbox column */}
        <div className="w-8" /> {/* Avatar column */}
        <div className="w-48">Name</div>
        <div className="w-32">Status</div>
        <div className="flex-1">Contact Info</div>
        <div className="w-40">Tags</div>
        <div className="w-24">Imported</div>
      </div>

      {/* List Items */}
      {contacts.map((contact) => (
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
  );
}
