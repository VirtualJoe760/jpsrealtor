// EmailDetail component - Portal full-screen on mobile, inline on desktop

import React from 'react';
import { createPortal } from 'react-dom';
import { Mail, Reply, Forward, Archive, Trash2, Tag, Clock, ArrowLeft, User } from 'lucide-react';
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
  onClose?: () => void;
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
  onClose,
  isLight,
}: EmailDetailProps) {
  const senderName = getSenderName(email, metadata);
  const senderEmail = getSenderEmail(email);
  const formattedDate = formatEmailDate(email.created_at);

  const textClass = isLight ? 'text-gray-900' : 'text-gray-100';
  const mutedClass = isLight ? 'text-gray-600' : 'text-gray-300';
  const borderClass = isLight ? 'border-gray-200' : 'border-gray-700';
  const bgPage = isLight ? 'bg-white' : 'bg-gray-900';
  const bgInline = isLight ? 'bg-gray-50' : 'bg-gray-800/50';
  const actionBtnClass = isLight
    ? 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200'
    : 'bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700';

  const senderBlock = (
    <div className="flex items-start gap-3 mb-4">
      <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center ${
        isLight ? 'bg-slate-100' : 'bg-gray-700'
      }`}>
        <User size={18} className={isLight ? 'text-slate-400' : 'text-gray-400'} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`${textClass} font-semibold text-sm`}>{senderName}</p>
        <p className={`${mutedClass} text-xs truncate`}>{senderEmail}</p>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <Clock size={12} className={mutedClass} />
        <span className={`${mutedClass} text-xs whitespace-nowrap`}>{formattedDate}</span>
      </div>
    </div>
  );

  const tagsBlock = metadata?.tags && metadata.tags.length > 0 ? (
    <div className="flex gap-1 mb-4 flex-wrap">
      {metadata.tags.map((tag) => (
        <span
          key={tag}
          className={`text-xs px-2 py-0.5 rounded-full ${
            isLight ? 'bg-blue-100 text-blue-700' : 'bg-blue-900 text-blue-300'
          }`}
        >
          {tag}
        </span>
      ))}
    </div>
  ) : null;

  const bodyBlock = loading ? (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
    </div>
  ) : (
    <>
      <div
        className={`prose prose-sm max-w-none ${isLight ? 'prose-gray' : 'prose-invert'}`}
        style={{
          ...(isLight ? {} : { color: '#e5e7eb' }),
          wordBreak: 'break-word',
          overflowWrap: 'anywhere',
          maxWidth: '100%',
        }}
      >
        <div
          style={{ overflow: 'hidden', maxWidth: '100%' }}
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </div>
      {email.attachments && email.attachments.length > 0 && (
        <div className="mt-6">
          <EmailAttachments attachments={email.attachments} isLight={isLight} />
        </div>
      )}
    </>
  );

  const actionButtons = (
    <div className="flex flex-wrap gap-2">
      <button onClick={onReply} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${actionBtnClass}`}>
        <Reply size={14} /> Reply
      </button>
      <button onClick={onReplyAll} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${actionBtnClass}`}>
        <Mail size={14} /> Reply All
      </button>
      <button onClick={onForward} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${actionBtnClass}`}>
        <Forward size={14} /> Forward
      </button>
      <div className="hidden md:block flex-1" />
      <button onClick={onTag} className={`flex items-center justify-center p-1.5 rounded-lg text-sm transition-colors ${actionBtnClass}`}>
        <Tag size={14} />
      </button>
      <button onClick={onArchive} className={`flex items-center justify-center p-1.5 rounded-lg text-sm transition-colors ${actionBtnClass}`}>
        <Archive size={14} />
      </button>
      <button
        onClick={onDelete}
        className={`flex items-center justify-center p-1.5 rounded-lg text-sm transition-colors ${
          isLight
            ? 'bg-white hover:bg-red-50 text-red-600 border border-gray-200'
            : 'bg-gray-800 hover:bg-red-900/50 text-red-400 border border-gray-700'
        }`}
      >
        <Trash2 size={14} />
      </button>
    </div>
  );

  // ===== MOBILE: Portal to document.body =====
  const mobileOverlay = typeof document !== 'undefined' ? createPortal(
    <div className={`md:hidden fixed inset-0 z-[100] ${bgPage} flex flex-col`}
      style={{ top: 0, left: 0, right: 0, bottom: 0, position: 'fixed' }}
    >
      {/* Top bar */}
      <div className={`flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b ${borderClass} safe-area-top`}>
        <button
          onClick={onClose}
          className={`p-1.5 rounded-lg transition-colors ${
            isLight ? 'hover:bg-gray-100 text-gray-700' : 'hover:bg-gray-800 text-gray-300'
          }`}
        >
          <ArrowLeft size={20} />
        </button>
        <h2 className={`${textClass} font-semibold text-sm flex-1 truncate`}>
          {email.subject}
        </h2>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="p-4">
          {senderBlock}
          {tagsBlock}
          {bodyBlock}
        </div>
      </div>

      {/* Sticky bottom action bar */}
      <div className={`flex-shrink-0 px-4 py-3 border-t ${borderClass} ${bgPage} safe-area-bottom`}>
        {actionButtons}
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      {/* Mobile: portaled overlay */}
      {mobileOverlay}

      {/* Desktop: inline expansion */}
      <div className={`hidden md:block ${bgInline} border-b ${borderClass} p-6`}>
        {senderBlock}
        {tagsBlock}
        {bodyBlock}
        <div className={`mt-4 pt-4 border-t ${borderClass}`}>
          {actionButtons}
        </div>
      </div>
    </>
  );
}
