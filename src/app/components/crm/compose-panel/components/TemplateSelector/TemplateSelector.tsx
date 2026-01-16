// TemplateSelector component - Template dropdown selector

import { FileText } from 'lucide-react';
import type { EmailTemplate } from '../../types';

interface TemplateSelectorProps {
  isLight: boolean;
  isOpen: boolean;
  templates: EmailTemplate[];
  onToggle: () => void;
  onSelectTemplate: (template: EmailTemplate) => void;
}

export function TemplateSelector({
  isLight,
  isOpen,
  templates,
  onToggle,
  onSelectTemplate,
}: TemplateSelectorProps) {
  const buttonClass = isLight
    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
    : 'bg-emerald-900/30 text-emerald-400 hover:bg-emerald-900/50';
  const dropdownBgClass = isLight ? 'bg-white border-slate-200' : 'bg-gray-800 border-gray-700';
  const itemClass = isLight
    ? 'hover:bg-slate-100 text-slate-900'
    : 'hover:bg-gray-700 text-gray-100';

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className={`flex items-center gap-1 px-3 py-1 rounded text-xs font-medium transition-all ${buttonClass}`}
        title="Insert Template"
      >
        <FileText className="w-3 h-3" />
        Templates
      </button>

      {/* Template Dropdown */}
      {isOpen && (
        <div
          className={`absolute right-0 top-full mt-1 w-64 rounded-lg shadow-xl border z-10 ${dropdownBgClass}`}
        >
          {templates.map((template, i) => (
            <button
              key={template.id}
              type="button"
              onClick={() => onSelectTemplate(template)}
              className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                i === 0 ? 'rounded-t-lg' : ''
              } ${i === templates.length - 1 ? 'rounded-b-lg' : ''} ${itemClass}`}
            >
              {template.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
