// ContactListItem - List view display for a single contact

import React from 'react';
import { Mail, Phone, MapPin, Tag, Calendar } from 'lucide-react';
import { Contact, ContactStatus } from '../../types';
import { getContactDisplayName, formatPhoneNumber, getDaysSinceImport, hasEmail, hasPhone } from '../../utils';
import { getStatusConfig } from '../../constants/styles';
import { ContactAvatar } from './ContactAvatar';

interface ContactListItemProps {
  contact: Contact;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onClick: (contact: Contact) => void;
  isLight: boolean;
}

export function ContactListItem({
  contact,
  isSelected,
  onSelect,
  onClick,
  isLight,
}: ContactListItemProps) {
  const displayName = getContactDisplayName(contact);
  const statusConfig = getStatusConfig(contact.status as ContactStatus);
  const daysSince = getDaysSinceImport(contact);

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(contact._id);
  };

  const handleRowClick = () => {
    onClick(contact);
  };

  const StatusIcon = statusConfig.icon;

  return (
    <div
      className={`flex items-center gap-4 px-4 py-3 border-b cursor-pointer transition-colors ${
        isLight
          ? 'border-gray-200 hover:bg-gray-50'
          : 'border-gray-700 hover:bg-gray-800'
      } ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
      onClick={handleRowClick}
    >
      {/* Selection Checkbox */}
      <input
        type="checkbox"
        checked={isSelected}
        onChange={() => {}}
        onClick={handleCheckboxClick}
        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer flex-shrink-0"
      />

      {/* Avatar */}
      <ContactAvatar
        photo={contact.photo}
        firstName={contact.firstName}
        lastName={contact.lastName}
        size="sm"
      />

      {/* Name & Organization - Fixed width */}
      <div className="w-48 min-w-0">
        <p className={`font-medium truncate ${
          isLight ? 'text-gray-900' : 'text-white'
        }`}>
          {displayName}
        </p>
        {contact.organization && (
          <p className={`text-sm truncate ${
            isLight ? 'text-gray-500' : 'text-gray-400'
          }`}>
            {contact.organization}
          </p>
        )}
      </div>

      {/* Status - Fixed width */}
      <div className="w-32 flex items-center gap-2 flex-shrink-0">
        <StatusIcon className={`w-4 h-4 ${
          isLight ? statusConfig.lightColor : statusConfig.darkColor
        }`} />
        <span className={`text-sm ${
          isLight ? statusConfig.lightColor : statusConfig.darkColor
        }`}>
          {statusConfig.label}
        </span>
      </div>

      {/* Contact Info - Flexible */}
      <div className="flex-1 flex items-center gap-6 min-w-0">
        {hasPhone(contact) && (
          <div className="flex items-center gap-2 min-w-0">
            <Phone className={`w-4 h-4 flex-shrink-0 ${
              isLight ? 'text-gray-400' : 'text-gray-500'
            }`} />
            <span className={`text-sm truncate ${
              isLight ? 'text-gray-700' : 'text-gray-300'
            }`}>
              {formatPhoneNumber(contact.phone!)}
            </span>
          </div>
        )}

        {hasEmail(contact) && (
          <div className="flex items-center gap-2 min-w-0">
            <Mail className={`w-4 h-4 flex-shrink-0 ${
              isLight ? 'text-gray-400' : 'text-gray-500'
            }`} />
            <span className={`text-sm truncate ${
              isLight ? 'text-gray-700' : 'text-gray-300'
            }`}>
              {contact.email}
            </span>
          </div>
        )}

        {contact.address?.city && (
          <div className="flex items-center gap-2 min-w-0">
            <MapPin className={`w-4 h-4 flex-shrink-0 ${
              isLight ? 'text-gray-400' : 'text-gray-500'
            }`} />
            <span className={`text-sm truncate ${
              isLight ? 'text-gray-700' : 'text-gray-300'
            }`}>
              {contact.address.city}, {contact.address.state}
            </span>
          </div>
        )}
      </div>

      {/* Tags - Fixed width */}
      <div className="w-40 flex items-center gap-1.5 flex-shrink-0">
        {contact.tags && contact.tags.length > 0 && (
          <>
            {contact.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                  isLight
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-blue-900/30 text-blue-400'
                }`}
              >
                <Tag className="w-3 h-3" />
                {tag}
              </span>
            ))}
            {contact.tags.length > 2 && (
              <span className={`text-xs ${
                isLight ? 'text-gray-500' : 'text-gray-400'
              }`}>
                +{contact.tags.length - 2}
              </span>
            )}
          </>
        )}
      </div>

      {/* Days Since Import - Fixed width */}
      <div className="w-24 flex items-center gap-1 text-xs flex-shrink-0">
        <Calendar className={`w-3 h-3 ${
          isLight ? 'text-gray-400' : 'text-gray-500'
        }`} />
        <span className={isLight ? 'text-gray-500' : 'text-gray-400'}>
          {daysSince}d ago
        </span>
      </div>
    </div>
  );
}
