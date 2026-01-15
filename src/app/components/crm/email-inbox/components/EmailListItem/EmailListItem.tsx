// EmailListItem component - Single email in the list

import React from 'react';
import { Star, Paperclip, Check } from 'lucide-react';
import type { Email, EmailMetadata } from '../../types';
import { getSenderName, formatEmailDate, getEmailPreview, hasAttachments } from '../../utils';

export interface EmailListItemProps {
  email: Email;
  metadata?: EmailMetadata;
  isExpanded: boolean;
  isSelected: boolean;
  onToggleExpand: () => void;
  onToggleSelect: () => void;
  onToggleFavorite: () => void;
  isLight: boolean;
}

export function EmailListItem({
  email,
  metadata,
  isExpanded,
  isSelected,
  onToggleExpand,
  onToggleSelect,
  onToggleFavorite,
  isLight,
}: EmailListItemProps) {
  const senderName = getSenderName(email, metadata);
  const preview = getEmailPreview(email);
  const formattedDate = formatEmailDate(email.created_at);
  const isRead = metadata?.isRead || false;
  const isFavorite = metadata?.isFavorite || false;
  const showAttachment = hasAttachments(email);

  const bgClass = isExpanded
    ? isLight
      ? 'bg-blue-50'
      : 'bg-gray-800'
    : isLight
    ? 'bg-white hover:bg-gray-50'
    : 'bg-gray-900 hover:bg-gray-800';

  const textClass = isLight ? 'text-gray-900' : 'text-white';
  const mutedClass = isLight ? 'text-gray-600' : 'text-gray-400';

  return (
    <div
      className={`${bgClass} border-b ${
        isLight ? 'border-gray-200' : 'border-gray-700'
      } transition-colors cursor-pointer`}
    >
      <div className="flex items-start p-4 gap-3">
        {/* Selection Checkbox */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect();
          }}
          className={`flex-shrink-0 w-5 h-5 rounded border ${
            isSelected
              ? 'bg-blue-600 border-blue-600'
              : isLight
              ? 'border-gray-300 hover:border-gray-400'
              : 'border-gray-600 hover:border-gray-500'
          } flex items-center justify-center`}
        >
          {isSelected && <Check size={14} className="text-white" />}
        </button>

        {/* Email Content */}
        <div className="flex-1 min-w-0" onClick={onToggleExpand}>
          <div className="flex items-start justify-between gap-4 mb-1">
            <div className="flex-1 min-w-0">
              <p
                className={`${textClass} ${
                  !isRead ? 'font-semibold' : 'font-normal'
                } truncate`}
              >
                {senderName}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={`${mutedClass} text-sm`}>{formattedDate}</span>
              {showAttachment && (
                <Paperclip size={16} className={mutedClass} />
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite();
                }}
                className="hover:scale-110 transition-transform"
              >
                <Star
                  size={16}
                  className={isFavorite ? 'fill-yellow-400 text-yellow-400' : mutedClass}
                />
              </button>
            </div>
          </div>

          <p
            className={`${textClass} ${
              !isRead ? 'font-medium' : 'font-normal'
            } text-sm truncate mb-1`}
          >
            {email.subject}
          </p>

          <p className={`${mutedClass} text-sm truncate`}>{preview}</p>

          {metadata?.tags && metadata.tags.length > 0 && (
            <div className="flex gap-1 mt-2 flex-wrap">
              {metadata.tags.map((tag) => (
                <span
                  key={tag}
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    isLight
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-blue-900 text-blue-300'
                  }`}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
