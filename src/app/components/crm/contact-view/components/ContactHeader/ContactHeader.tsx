// ContactHeader - Avatar, name, status badge, action buttons
import React from 'react';
import { Contact } from '../../types';
import { getContactFullName, getContactInitials } from '../../utils';
import { CONTACT_STATUSES } from '../../constants';

interface ContactHeaderProps {
  contact: Contact;
  currentPhoto: string;
  currentStatus: string;
  isEditingStatus: boolean;
  onEditStatus: () => void;
  onPhotoClick: () => void;
}

export function ContactHeader({
  contact,
  currentPhoto,
  currentStatus,
  isEditingStatus,
  onEditStatus,
  onPhotoClick,
}: ContactHeaderProps) {
  const fullName = getContactFullName(contact);
  const initials = getContactInitials(contact);
  const statusInfo = CONTACT_STATUSES.find((s) => s.value === currentStatus);

  return (
    <div className="flex items-start gap-4 mb-6">
      {/* Avatar */}
      <button
        onClick={onPhotoClick}
        className="relative group flex-shrink-0"
        type="button"
      >
        {currentPhoto ? (
          <img
            src={currentPhoto}
            alt={fullName}
            className="w-20 h-20 rounded-full object-cover"
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
            {initials}
          </div>
        )}
        <div className="absolute inset-0 rounded-full bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center">
          <span className="text-white opacity-0 group-hover:opacity-100 text-sm">
            Change
          </span>
        </div>
      </button>

      {/* Name and Status */}
      <div className="flex-1 min-w-0">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white truncate">
          {fullName}
        </h2>

        {/* Status Badge */}
        <button
          onClick={onEditStatus}
          disabled={isEditingStatus}
          className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-50"
          style={{
            backgroundColor: statusInfo?.color.replace('bg-', '') || '#6b7280',
          }}
          type="button"
        >
          <span className="w-2 h-2 rounded-full bg-white"></span>
          {statusInfo?.label || 'Unknown'}
        </button>
      </div>
    </div>
  );
}
