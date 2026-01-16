// RecipientFields component - To/Cc/Bcc recipient fields

import { X } from 'lucide-react';
import ContactAutocomplete from '../../../ContactAutocomplete';

interface RecipientFieldsProps {
  isLight: boolean;
  to: string;
  cc: string;
  bcc: string;
  showCc: boolean;
  showBcc: boolean;
  onToChange: (to: string) => void;
  onCcChange: (cc: string) => void;
  onBccChange: (bcc: string) => void;
  onShowCc: () => void;
  onShowBcc: () => void;
  onHideCc: () => void;
  onHideBcc: () => void;
}

export function RecipientFields({
  isLight,
  to,
  cc,
  bcc,
  showCc,
  showBcc,
  onToChange,
  onCcChange,
  onBccChange,
  onShowCc,
  onShowBcc,
  onHideCc,
  onHideBcc,
}: RecipientFieldsProps) {
  const borderClass = isLight ? 'border-slate-200' : 'border-gray-700';
  const labelClass = isLight ? 'text-slate-600' : 'text-gray-400';
  const buttonClass = isLight
    ? 'text-blue-600 hover:bg-blue-600'
    : 'text-emerald-400 hover:bg-emerald-400';
  const closeButtonClass = isLight
    ? 'text-slate-400 hover:bg-slate-400'
    : 'text-gray-500 hover:bg-gray-500';

  return (
    <>
      {/* To Field */}
      <div className={`px-4 py-2 border-b ${borderClass}`}>
        <div className="flex items-center gap-2">
          <label className={`text-sm font-medium w-16 ${labelClass}`}>To</label>
          <ContactAutocomplete
            value={to}
            onChange={onToChange}
            placeholder="Recipients"
            isLight={isLight}
            required
            multiple
          />
        </div>
      </div>

      {/* CC/BCC Toggle and Fields */}
      <div className={`px-4 py-2 border-b ${borderClass}`}>
        <div className="flex items-start gap-2">
          {/* Toggle Buttons */}
          <div className="w-16 flex items-center gap-1 pt-1">
            {!showCc && (
              <button
                type="button"
                onClick={onShowCc}
                className={`text-xs px-2 py-0.5 rounded hover:bg-opacity-20 transition-all ${buttonClass}`}
              >
                Cc
              </button>
            )}
            {!showBcc && (
              <button
                type="button"
                onClick={onShowBcc}
                className={`text-xs px-2 py-0.5 rounded hover:bg-opacity-20 transition-all ${buttonClass}`}
              >
                Bcc
              </button>
            )}
          </div>

          {/* Cc/Bcc Fields */}
          <div className="flex-1 flex flex-col gap-2">
            {showCc && (
              <div className="flex items-center gap-2">
                <label className={`text-sm font-medium w-8 ${labelClass}`}>Cc</label>
                <ContactAutocomplete
                  value={cc}
                  onChange={onCcChange}
                  placeholder="Carbon copy recipients (comma separated)"
                  isLight={isLight}
                  multiple
                />
                <button
                  type="button"
                  onClick={onHideCc}
                  className={`text-sm hover:bg-opacity-10 p-1 rounded ${closeButtonClass}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            {showBcc && (
              <div className="flex items-center gap-2">
                <label className={`text-sm font-medium w-8 ${labelClass}`}>Bcc</label>
                <ContactAutocomplete
                  value={bcc}
                  onChange={onBccChange}
                  placeholder="Blind carbon copy recipients (comma separated)"
                  isLight={isLight}
                  multiple
                />
                <button
                  type="button"
                  onClick={onHideBcc}
                  className={`text-sm hover:bg-opacity-10 p-1 rounded ${closeButtonClass}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
