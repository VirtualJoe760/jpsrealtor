// EmailDetail component - Expanded email content view

import React from 'react';
import { Mail, Reply, Forward, Archive, Trash2, Tag, Clock } from 'lucide-react';
import type { Email, EmailMetadata } from '../../types';
import { getSenderName, getSenderEmail, formatEmailDate } from '../../utils';
import { EmailAttachments } from '../EmailAttachments';

export interface EmailDetailProps {
  email: Email;
  metadata?: EmailMetadata;
  content: string;
  loading: boolean;
  onReply: () => void;
  onReplyAll: () => void;
  onForward: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onTag: () => void;
  isLight: boolean;
}

export function EmailDetail({
  email,
  metadata,
  content,
  loading,
  onReply,
  onReplyAll,
  onForward,
  onArchive,
  onDelete,
  onTag,
  isLight,
}: EmailDetailProps) {
  const senderName = getSenderName(email, metadata);
  const senderEmail = getSenderEmail(email);
  const formattedDate = formatEmailDate(email.created_at);

  const bgClass = isLight ? 'bg-gray-50' : 'bg-gray-800';
  const textClass = isLight ? 'text-gray-900' : 'text-white';
  const mutedClass = isLight ? 'text-gray-600' : 'text-gray-400';
  const borderClass = isLight ? 'border-gray-200' : 'border-gray-700';

  return (
    <div className={`${bgClass} border-b ${borderClass} p-6`}>
      {/* Email Header */}
      <div className="mb-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className={`${textClass} text-lg font-semibold mb-1`}>
              {email.subject}
            </h3>
            <div className="flex items-center gap-2">
              <p className={`${mutedClass} text-sm`}>
                <span className="font-medium">{senderName}</span>
                {' <'}
                {senderEmail}
                {'>'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock size={14} className={mutedClass} />
            <span className={mutedClass}>{formattedDate}</span>
          </div>
        </div>

        {/* Tags Display */}
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

      {/* Action Buttons */}
      <div className={`flex gap-2 mb-4 pb-4 border-b ${borderClass}`}>
        <button
          onClick={onReply}
          className={`flex items-center gap-2 px-3 py-1.5 rounded ${
            isLight
              ? 'bg-white hover:bg-gray-100 text-gray-700'
              : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
          } transition-colors text-sm`}
        >
          <Reply size={14} />
          Reply
        </button>
        <button
          onClick={onReplyAll}
          className={`flex items-center gap-2 px-3 py-1.5 rounded ${
            isLight
              ? 'bg-white hover:bg-gray-100 text-gray-700'
              : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
          } transition-colors text-sm`}
        >
          <Mail size={14} />
          Reply All
        </button>
        <button
          onClick={onForward}
          className={`flex items-center gap-2 px-3 py-1.5 rounded ${
            isLight
              ? 'bg-white hover:bg-gray-100 text-gray-700'
              : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
          } transition-colors text-sm`}
        >
          <Forward size={14} />
          Forward
        </button>
        <div className="flex-1" />
        <button
          onClick={onTag}
          className={`flex items-center gap-2 px-3 py-1.5 rounded ${
            isLight
              ? 'bg-white hover:bg-gray-100 text-gray-700'
              : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
          } transition-colors text-sm`}
        >
          <Tag size={14} />
        </button>
        <button
          onClick={onArchive}
          className={`flex items-center gap-2 px-3 py-1.5 rounded ${
            isLight
              ? 'bg-white hover:bg-gray-100 text-gray-700'
              : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
          } transition-colors text-sm`}
        >
          <Archive size={14} />
        </button>
        <button
          onClick={onDelete}
          className={`flex items-center gap-2 px-3 py-1.5 rounded ${
            isLight
              ? 'bg-white hover:bg-red-50 text-red-600'
              : 'bg-gray-700 hover:bg-red-900 text-red-400'
          } transition-colors text-sm`}
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Email Content */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      ) : (
        <>
          <div
            className={`${textClass} prose prose-sm max-w-none`}
            dangerouslySetInnerHTML={{ __html: content }}
          />

          {/* Attachments */}
          {email.attachments && email.attachments.length > 0 && (
            <div className="mt-6">
              <EmailAttachments attachments={email.attachments} isLight={isLight} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
