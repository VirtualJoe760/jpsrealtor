// EmailAttachments component - Display email attachments

import React from 'react';
import { Paperclip, Download } from 'lucide-react';
import type { EmailAttachment } from '../../types';
import { formatAttachmentSize } from '../../utils';

export interface EmailAttachmentsProps {
  attachments: EmailAttachment[];
  isLight: boolean;
}

export function EmailAttachments({ attachments, isLight }: EmailAttachmentsProps) {
  const bgClass = isLight ? 'bg-gray-100' : 'bg-gray-700';
  const textClass = isLight ? 'text-gray-900' : 'text-white';
  const mutedClass = isLight ? 'text-gray-600' : 'text-gray-400';
  const hoverClass = isLight ? 'hover:bg-gray-200' : 'hover:bg-gray-600';

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Paperclip size={16} className={mutedClass} />
        <h4 className={`${textClass} font-medium text-sm`}>
          Attachments ({attachments.length})
        </h4>
      </div>

      <div className="space-y-2">
        {attachments.map((attachment, index) => (
          <div
            key={index}
            className={`${bgClass} ${hoverClass} rounded p-3 flex items-center justify-between transition-colors`}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Paperclip size={16} className={mutedClass} />
              <div className="flex-1 min-w-0">
                <p className={`${textClass} text-sm truncate`}>
                  {attachment.filename}
                </p>
                <p className={`${mutedClass} text-xs`}>
                  {attachment.content_type} • {formatAttachmentSize(attachment.size)}
                </p>
              </div>
            </div>
            <button
              className={`${mutedClass} hover:text-blue-500 transition-colors flex-shrink-0`}
              aria-label="Download attachment"
            >
              <Download size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
