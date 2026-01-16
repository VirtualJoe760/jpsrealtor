// RichTextToolbar component - Rich text formatting toolbar

import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link as LinkIcon,
  Paperclip,
  Type,
  Palette,
} from 'lucide-react';
import { DEFAULT_FONTS, FONT_SIZES } from '../../constants';
import { EditorCommand } from '../../types';

interface RichTextToolbarProps {
  isLight: boolean;
  currentFont: string;
  currentFontSize: string;
  currentColor: string;
  onFontChange: (font: string) => void;
  onFontSizeChange: (size: string) => void;
  onColorChange: (color: string) => void;
  onBold: () => void;
  onItalic: () => void;
  onUnderline: () => void;
  onAlignLeft: () => void;
  onAlignCenter: () => void;
  onAlignRight: () => void;
  onInsertLink: () => void;
  onAttach: () => void;
  onAI: () => void;
  onSend?: () => void;
  sending?: boolean;
}

export function RichTextToolbar({
  isLight,
  currentFont,
  currentFontSize,
  currentColor,
  onFontChange,
  onFontSizeChange,
  onColorChange,
  onBold,
  onItalic,
  onUnderline,
  onAlignLeft,
  onAlignCenter,
  onAlignRight,
  onInsertLink,
  onAttach,
  onAI,
  onSend,
  sending = false,
}: RichTextToolbarProps) {
  const bgClass = isLight ? 'border-slate-200 bg-slate-50' : 'border-gray-700 bg-gray-900';
  const buttonClass = isLight ? 'text-slate-700 hover:bg-slate-200' : 'text-gray-300 hover:bg-gray-700';
  const dividerClass = isLight ? 'bg-slate-300' : 'bg-gray-600';
  const selectClass = isLight ? 'bg-white border-slate-300' : 'bg-gray-800 border-gray-600';

  return (
    <div className={`flex flex-wrap items-center gap-1 px-3 sm:px-4 py-2 border-b ${bgClass}`}>
      <div className="flex items-center gap-1 flex-wrap w-full sm:w-auto">
        {/* Font Family */}
        <select
          value={currentFont}
          onChange={(e) => onFontChange(e.target.value)}
          className={`px-2 py-1 rounded text-xs border flex-shrink-0 ${selectClass}`}
          title="Font"
        >
          {DEFAULT_FONTS.map((font) => (
            <option key={font} value={font}>
              {font}
            </option>
          ))}
        </select>

        {/* Font Size */}
        <select
          value={currentFontSize}
          onChange={(e) => onFontSizeChange(e.target.value)}
          className={`px-2 py-1 rounded text-xs border flex-shrink-0 ${selectClass}`}
          title="Font Size"
        >
          {FONT_SIZES.map((size) => (
            <option key={size.value} value={size.value}>
              {size.label}
            </option>
          ))}
        </select>

        {/* Text Color */}
        <label
          className={`flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-200 dark:hover:bg-gray-700 cursor-pointer flex-shrink-0`}
          title="Text Color"
        >
          <Palette className="w-4 h-4" />
          <input
            type="color"
            value={currentColor}
            onChange={(e) => onColorChange(e.target.value)}
            className="w-0 h-0 invisible"
          />
        </label>

        <div className={`w-px h-6 mx-1 flex-shrink-0 ${dividerClass}`} />

        {/* Bold, Italic, Underline */}
        <button
          type="button"
          onClick={onBold}
          className={`p-2 rounded flex-shrink-0 ${buttonClass}`}
          title="Bold"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onItalic}
          className={`p-2 rounded flex-shrink-0 ${buttonClass}`}
          title="Italic"
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onUnderline}
          className={`p-2 rounded flex-shrink-0 ${buttonClass}`}
          title="Underline"
        >
          <Underline className="w-4 h-4" />
        </button>

        <div className={`w-px h-6 mx-1 flex-shrink-0 ${dividerClass}`} />

        {/* Alignment */}
        <button
          type="button"
          onClick={onAlignLeft}
          className={`p-2 rounded flex-shrink-0 ${buttonClass}`}
          title="Align Left"
        >
          <AlignLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onAlignCenter}
          className={`p-2 rounded flex-shrink-0 ${buttonClass}`}
          title="Align Center"
        >
          <AlignCenter className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onAlignRight}
          className={`p-2 rounded flex-shrink-0 ${buttonClass}`}
          title="Align Right"
        >
          <AlignRight className="w-4 h-4" />
        </button>

        <div className={`w-px h-6 mx-1 flex-shrink-0 ${dividerClass}`} />

        {/* Link */}
        <button
          type="button"
          onClick={onInsertLink}
          className={`p-2 rounded flex-shrink-0 ${buttonClass}`}
          title="Insert Link"
        >
          <LinkIcon className="w-4 h-4" />
        </button>

        {/* Attach */}
        <button
          type="button"
          onClick={onAttach}
          className={`p-2 rounded flex-shrink-0 ${buttonClass}`}
          title="Attach File"
        >
          <Paperclip className="w-4 h-4" />
        </button>

        <div className={`w-px h-6 mx-1 flex-shrink-0 ${dividerClass}`} />

        {/* AI Button */}
        <button
          type="button"
          onClick={onAI}
          className="flex items-center gap-1 px-3 py-1 rounded font-medium text-xs transition-all flex-shrink-0 bg-purple-600 text-white hover:bg-purple-700"
          title="AI Generate"
        >
          <Type className="w-4 h-4" />
          AI
        </button>

        {/* Mobile Send Button */}
        {onSend && (
          <button
            type="button"
            onClick={onSend}
            disabled={sending}
            className={`md:hidden flex items-center gap-1 px-4 py-1.5 rounded-lg font-medium text-xs transition-all flex-shrink-0 ml-auto ${
              sending ? 'opacity-50 cursor-not-allowed' : ''
            } ${isLight ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        )}
      </div>
    </div>
  );
}
