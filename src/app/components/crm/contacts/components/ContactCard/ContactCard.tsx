// ContactCard - Card view display for a single contact

import React from 'react';
import { Mail, Phone, MapPin, Tag, Calendar, MessageSquare } from 'lucide-react';
import { Contact, ContactStatus } from '../../types';
import { getContactDisplayName, formatPhoneNumber, getDaysSinceImport, hasEmail, hasPhone, hasAddress } from '../../utils';
import { getCardClassName, getStatusConfig } from '../../constants/styles';
import { ContactAvatar } from './ContactAvatar';

interface ContactCardProps {
  contact: Contact;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onClick: (contact: Contact) => void;
  isLight: boolean;
}

export function ContactCard({
  contact,
  isSelected,
  onSelect,
  onClick,
  isLight,
}: ContactCardProps) {
  const displayName = getContactDisplayName(contact);
  const statusConfig = getStatusConfig(contact.status as ContactStatus);
  const daysSince = getDaysSinceImport(contact);

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(contact._id);
  };

  const handleCardClick = () => {
    onClick(contact);
  };

  const StatusIcon = statusConfig.icon;

  return (
    <div
      className={`${getCardClassName(isLight)} cursor-pointer group relative ${
        isSelected ? 'ring-2 ring-blue-500' : ''
      }`}
      onClick={handleCardClick}
    >
      {/* Selection Checkbox */}
      <div className="absolute top-4 left-4 z-10">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => {}}
          onClick={handleCheckboxClick}
          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
        />
      </div>

      {/* Avatar and Header */}
      <div className="flex items-start gap-4 mb-4">
        <ContactAvatar
          photo={contact.photo}
          firstName={contact.firstName}
          lastName={contact.lastName}
          size="lg"
          className="ml-8"
        />

        <div className="flex-1 min-w-0">
          <h3 className={`font-semibold text-lg truncate ${
            isLight ? 'text-gray-900' : 'text-white'
          }`}>
            {displayName}
          </h3>

          {contact.organization && (
            <p className={`text-sm truncate ${
              isLight ? 'text-gray-600' : 'text-gray-400'
            }`}>
              {contact.organization}
            </p>
          )}

          {/* Status Badge */}
          <div className="flex items-center gap-2 mt-2">
            <StatusIcon className={`w-4 h-4 ${
              isLight ? statusConfig.lightColor : statusConfig.darkColor
            }`} />
            <span className={`text-xs font-medium ${
              isLight ? statusConfig.lightColor : statusConfig.darkColor
            }`}>
              {statusConfig.label}
            </span>
          </div>
        </div>
      </div>

      {/* Contact Info */}
      <div className="space-y-2 mb-4">
        {hasPhone(contact) && (
          <div className="flex items-center gap-2">
            <Phone className={`w-4 h-4 flex-shrink-0 ${
              isLight ? 'text-gray-500' : 'text-gray-400'
            }`} />
            <span className={`text-sm truncate ${
              isLight ? 'text-gray-700' : 'text-gray-300'
            }`}>
              {formatPhoneNumber(contact.phone!)}
            </span>
          </div>
        )}

        {hasEmail(contact) && (
          <div className="flex items-center gap-2">
            <Mail className={`w-4 h-4 flex-shrink-0 ${
              isLight ? 'text-gray-500' : 'text-gray-400'
            }`} />
            <span className={`text-sm truncate ${
              isLight ? 'text-gray-700' : 'text-gray-300'
            }`}>
              {contact.email}
            </span>
          </div>
        )}

        {hasAddress(contact) && (
          <div className="flex items-center gap-2">
            <MapPin className={`w-4 h-4 flex-shrink-0 ${
              isLight ? 'text-gray-500' : 'text-gray-400'
            }`} />
            <span className={`text-sm truncate ${
              isLight ? 'text-gray-700' : 'text-gray-300'
            }`}>
              {contact.address?.city}, {contact.address?.state}
            </span>
          </div>
        )}
      </div>

      {/* Tags */}
      {contact.tags && contact.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {contact.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                isLight
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-blue-900/30 text-blue-400'
              }`}
            >
              <Tag className="w-3 h-3" />
              {tag}
            </span>
          ))}
          {contact.tags.length > 3 && (
            <span className={`text-xs ${
              isLight ? 'text-gray-500' : 'text-gray-400'
            }`}>
              +{contact.tags.length - 3} more
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t">
        <div className="flex items-center gap-1 text-xs">
          <Calendar className={`w-3 h-3 ${
            isLight ? 'text-gray-400' : 'text-gray-500'
          }`} />
          <span className={isLight ? 'text-gray-500' : 'text-gray-400'}>
            {daysSince} {daysSince === 1 ? 'day' : 'days'} ago
          </span>
        </div>

        {contact.noteHistory && contact.noteHistory.length > 0 && (
          <div className="flex items-center gap-1 text-xs">
            <MessageSquare className={`w-3 h-3 ${
              isLight ? 'text-gray-400' : 'text-gray-500'
            }`} />
            <span className={isLight ? 'text-gray-500' : 'text-gray-400'}>
              {contact.noteHistory.length} {contact.noteHistory.length === 1 ? 'note' : 'notes'}
            </span>
          </div>
        )}
      </div>

      {/* Hover Effect Indicator */}
      <div className={`absolute inset-0 rounded-xl pointer-events-none transition-opacity ${
        isLight
          ? 'bg-blue-500/5 opacity-0 group-hover:opacity-100'
          : 'bg-emerald-500/5 opacity-0 group-hover:opacity-100'
      }`} />
    </div>
  );
}
