// LinkModal component - Link insertion modal

import { X } from 'lucide-react';

interface LinkModalProps {
  isLight: boolean;
  isOpen: boolean;
  url: string;
  text: string;
  onClose: () => void;
  onUrlChange: (url: string) => void;
  onTextChange: (text: string) => void;
  onInsert: () => void;
}

export function LinkModal({
  isLight,
  isOpen,
  url,
  text,
  onClose,
  onUrlChange,
  onTextChange,
  onInsert,
}: LinkModalProps) {
  if (!isOpen) return null;

  const bgClass = isLight ? 'bg-white' : 'bg-gray-800';
  const borderClass = isLight ? 'border-slate-200' : 'border-gray-700';
  const textClass = isLight ? 'text-slate-900' : 'text-white';
  const labelClass = isLight ? 'text-slate-700' : 'text-gray-300';
  const helperClass = isLight ? 'text-slate-500' : 'text-gray-400';
  const inputClass = isLight
    ? 'bg-white border-slate-300 text-slate-900 focus:border-blue-500 focus:ring-blue-500/20'
    : 'bg-gray-800 border-gray-700 text-gray-100 focus:border-emerald-500 focus:ring-emerald-500/20';
  const buttonSecondaryClass = isLight
    ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
    : 'bg-gray-700 text-gray-300 hover:bg-gray-600';
  const buttonPrimaryClass = isLight
    ? 'bg-blue-600 text-white hover:bg-blue-700'
    : 'bg-emerald-600 text-white hover:bg-emerald-700';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60]">
      <div className={`w-full max-w-md rounded-xl shadow-2xl ${bgClass}`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${borderClass}`}>
          <h3 className={`text-lg font-semibold ${textClass}`}>Insert Link</h3>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${isLight ? 'hover:bg-slate-100 text-slate-600' : 'hover:bg-gray-700 text-gray-400'}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-2 ${labelClass}`}>
              Link Text (optional)
            </label>
            <input
              type="text"
              value={text}
              onChange={(e) => onTextChange(e.target.value)}
              className={`w-full px-4 py-2 rounded-lg border transition-all ${inputClass}`}
              placeholder="Click here"
            />
            <p className={`text-xs mt-1 ${helperClass}`}>
              Leave blank to use selected text or URL as link text
            </p>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${labelClass}`}>
              URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => onUrlChange(e.target.value)}
              className={`w-full px-4 py-2 rounded-lg border transition-all ${inputClass}`}
              placeholder="https://example.com"
              autoFocus
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${buttonSecondaryClass}`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onInsert}
              disabled={!url}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                !url ? 'opacity-50 cursor-not-allowed' : ''
              } ${buttonPrimaryClass}`}
            >
              Insert Link
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
