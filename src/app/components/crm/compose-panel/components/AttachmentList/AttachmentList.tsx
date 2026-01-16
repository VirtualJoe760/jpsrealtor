// AttachmentList component - List of email attachments

import { Paperclip, X } from 'lucide-react';
import { formatFileSize } from '../../utils';

interface AttachmentListProps {
  isLight: boolean;
  attachments: File[];
  onRemove: (index: number) => void;
}

export function AttachmentList({ isLight, attachments, onRemove }: AttachmentListProps) {
  if (attachments.length === 0) return null;

  const borderClass = isLight ? 'border-slate-200' : 'border-gray-700';
  const itemBgClass = isLight ? 'bg-slate-100' : 'bg-gray-700';

  return (
    <div className={`px-4 py-2 border-t ${borderClass}`}>
      <div className="flex flex-wrap gap-2">
        {attachments.map((file, i) => (
          <div
            key={i}
            className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${itemBgClass}`}
          >
            <Paperclip className="w-3 h-3" />
            <span className="truncate max-w-[150px]">{file.name}</span>
            <span className="text-xs opacity-70">({formatFileSize(file.size)})</span>
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="hover:bg-red-100 rounded-full p-0.5 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
