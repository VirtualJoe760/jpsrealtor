// EmailListItem component - Enhanced with profile photos and unread styling

import React from 'react';
import { Star, Paperclip, Check, User } from 'lucide-react';
import Image from 'next/image';
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

  // Enhanced background with unread styling
  const bgClass = isExpanded
    ? isLight
      ? 'bg-slate-50'
      : 'bg-gray-700/30'
    : isSelected
    ? isLight
      ? 'bg-blue-100/50'
      : 'bg-emerald-900/30'
    : !isRead
    ? isLight
      ? 'bg-blue-50/30 hover:bg-slate-50'
      : 'bg-emerald-900/10 hover:bg-gray-700/50'
    : isLight
    ? 'hover:bg-slate-50'
    : 'hover:bg-gray-700/50';

  const textClass = isLight ? 'text-slate-900' : 'text-white';
  const mutedClass = isLight ? 'text-slate-600' : 'text-gray-400';
  const borderClass = isLight ? 'border-slate-200' : 'border-gray-700';

  return (
    <div
      className={`${bgClass} border-t ${borderClass} transition-all cursor-pointer`}
    >
      {/* Desktop View */}
      <div className="hidden md:flex w-full px-6 py-4 items-center gap-4">
        {/* Checkbox */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect();
          }}
          className="flex-shrink-0"
        >
          <div
            className={`w-4 h-4 rounded border flex items-center justify-center ${
              isSelected
                ? 'bg-blue-600 border-blue-600'
                : isLight
                ? 'border-slate-300 hover:border-slate-400'
                : 'border-gray-600 hover:border-gray-500'
            }`}
          >
            {isSelected && <Check size={12} className="text-white" />}
          </div>
        </button>

        {/* Star/Favorite */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          className="flex-shrink-0"
        >
          <Star
            className={`w-4 h-4 transition-all ${
              isFavorite
                ? 'fill-yellow-400 text-yellow-400'
                : isLight
                  ? 'text-slate-400 hover:text-yellow-500'
                  : 'text-gray-500 hover:text-yellow-400'
            }`}
          />
        </button>

        {/* Profile Photo */}
        <div className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden ${
          isLight ? 'bg-slate-200' : 'bg-gray-700'
        }`}>
          {metadata?.cachedSenderPhoto ? (
            <Image
              src={metadata.cachedSenderPhoto}
              alt={metadata.cachedSenderName || 'Sender'}
              width={36}
              height={36}
              className="object-cover"
            />
          ) : (
            <User className={`w-5 h-5 ${isLight ? 'text-slate-500' : 'text-gray-400'}`} />
          )}
        </div>

        {/* Email Content */}
        <div className="flex-1 min-w-0" onClick={onToggleExpand}>
          {/* Sender Name */}
          <div className="flex items-start justify-between gap-4 mb-1">
            <p
              className={`${textClass} ${
                !isRead ? 'font-semibold' : 'font-normal'
              } truncate flex-1`}
            >
              {senderName}
            </p>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={`${mutedClass} text-sm whitespace-nowrap`}>{formattedDate}</span>
              {showAttachment && (
                <Paperclip size={14} className={mutedClass} />
              )}
            </div>
          </div>

          {/* Subject */}
          <p
            className={`${textClass} ${
              !isRead ? 'font-semibold' : 'font-normal'
            } text-sm truncate mb-1`}
          >
            {email.subject}
          </p>

          {/* Preview */}
          <p className={`${mutedClass} text-sm truncate`}>{preview}</p>

          {/* Tags */}
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

      {/* Mobile View */}
      <div className="md:hidden px-4 py-3">
        <div className="flex items-start gap-3">
          {/* Checkbox */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect();
            }}
            className="flex-shrink-0 mt-1"
          >
            <div
              className={`w-4 h-4 rounded border flex items-center justify-center ${
                isSelected
                  ? 'bg-blue-600 border-blue-600'
                  : isLight
                  ? 'border-slate-300'
                  : 'border-gray-600'
              }`}
            >
              {isSelected && <Check size={12} className="text-white" />}
            </div>
          </button>

          {/* Profile Photo */}
          <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden ${
            isLight ? 'bg-slate-200' : 'bg-gray-700'
          }`}>
            {metadata?.cachedSenderPhoto ? (
              <Image
                src={metadata.cachedSenderPhoto}
                alt={metadata.cachedSenderName || 'Sender'}
                width={40}
                height={40}
                className="object-cover"
              />
            ) : (
              <User className={`w-5 h-5 ${isLight ? 'text-slate-500' : 'text-gray-400'}`} />
            )}
          </div>

          {/* Email Content */}
          <div className="flex-1 min-w-0" onClick={onToggleExpand}>
            <div className="flex items-start justify-between gap-2 mb-1">
              <p className={`${textClass} ${!isRead ? 'font-semibold' : 'font-normal'} text-sm truncate flex-1`}>
                {senderName}
              </p>
              <span className={`${mutedClass} text-xs whitespace-nowrap`}>{formattedDate}</span>
            </div>

            <p className={`${textClass} ${!isRead ? 'font-semibold' : 'font-normal'} text-sm truncate mb-1`}>
              {email.subject}
            </p>

            <p className={`${mutedClass} text-xs truncate`}>{preview}</p>

            {/* Icons Row */}
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite();
                }}
              >
                <Star
                  size={14}
                  className={isFavorite ? 'fill-yellow-400 text-yellow-400' : mutedClass}
                />
              </button>
              {showAttachment && <Paperclip size={14} className={mutedClass} />}
              {metadata?.tags && metadata.tags.length > 0 && (
                <span className={`text-xs ${mutedClass}`}>
                  {metadata.tags.length} {metadata.tags.length === 1 ? 'tag' : 'tags'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
