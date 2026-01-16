// AIModal component - AI email generation modal

import { X, Type, RefreshCw } from 'lucide-react';

interface AIModalProps {
  isLight: boolean;
  isOpen: boolean;
  prompt: string;
  isGenerating: boolean;
  error: string | null;
  suggestions: string[];
  onClose: () => void;
  onPromptChange: (prompt: string) => void;
  onGenerate: () => void;
  onUseSuggestion: (suggestion: string) => void;
}

export function AIModal({
  isLight,
  isOpen,
  prompt,
  isGenerating,
  error,
  suggestions,
  onClose,
  onPromptChange,
  onGenerate,
  onUseSuggestion,
}: AIModalProps) {
  if (!isOpen) return null;

  const bgClass = isLight ? 'bg-white' : 'bg-gray-800';
  const borderClass = isLight ? 'border-slate-200' : 'border-gray-700';
  const textClass = isLight ? 'text-slate-900' : 'text-white';
  const labelClass = isLight ? 'text-slate-700' : 'text-gray-300';
  const inputClass = isLight
    ? 'bg-white border-slate-300 text-slate-900 focus:border-purple-500 focus:ring-purple-500/20'
    : 'bg-gray-900 border-gray-700 text-gray-100 focus:border-purple-500 focus:ring-purple-500/20';
  const buttonSecondaryClass = isLight
    ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
    : 'bg-gray-700 text-gray-300 hover:bg-gray-600';
  const suggestionClass = isLight
    ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200'
    : 'bg-purple-900/30 text-purple-300 hover:bg-purple-900/50 border-purple-700';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className={`w-full max-w-lg rounded-xl shadow-2xl ${bgClass}`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${borderClass}`}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center">
              <Type className="w-5 h-5 text-white" />
            </div>
            <h3 className={`text-lg font-semibold ${textClass}`}>AI Generate Email</h3>
          </div>
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
              Describe the email you want to write
            </label>
            <textarea
              value={prompt}
              onChange={(e) => onPromptChange(e.target.value)}
              className={`w-full h-32 px-4 py-3 rounded-lg border transition-all resize-none ${inputClass}`}
              placeholder="Example: Write a professional follow-up email to a client about their property inquiry..."
              autoFocus
            />
          </div>

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div>
              <label className={`block text-xs font-medium mb-2 ${labelClass}`}>
                Quick suggestions:
              </label>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => onUseSuggestion(suggestion)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${suggestionClass}`}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${buttonSecondaryClass}`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onGenerate}
              disabled={!prompt.trim() || isGenerating}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all ${
                !prompt.trim() || isGenerating ? 'opacity-50 cursor-not-allowed' : ''
              } bg-purple-600 text-white hover:bg-purple-700`}
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Type className="w-4 h-4" />
                  Generate
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
