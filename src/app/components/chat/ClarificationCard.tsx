"use client";

import { useTheme } from "@/app/contexts/ThemeContext";
import { HelpCircle } from "lucide-react";

interface ClarificationCardProps {
  question: string;
  options: string[];
  context?: string;
}

export default function ClarificationCard({ question, options, context }: ClarificationCardProps) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  const handleSelect = (option: string) => {
    const chatInput = document.querySelector('[data-chat-input]') as HTMLInputElement;
    if (chatInput) {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      nativeInputValueSetter?.call(chatInput, option);
      chatInput.dispatchEvent(new Event('input', { bubbles: true }));
      // Auto-submit
      setTimeout(() => {
        const form = chatInput.closest('form');
        if (form) {
          form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        }
      }, 50);
    }
  };

  // No options = open-ended question, just show the question text (AI's message handles it)
  if (options.length === 0) return null;

  return (
    <div className={`rounded-xl overflow-hidden ${
      isLight
        ? "bg-blue-50/50 border border-blue-200"
        : "bg-neutral-800/50 border border-neutral-700"
    }`}>
      {/* Context hint */}
      {context && (
        <div className={`px-4 pt-3 flex items-center gap-2 ${
          isLight ? "text-blue-500" : "text-emerald-500"
        }`}>
          <HelpCircle className="w-4 h-4 flex-shrink-0" />
          <span className="text-xs font-medium">{context}</span>
        </div>
      )}

      {/* Options as buttons */}
      <div className="p-3 flex flex-wrap gap-2">
        {options.map((option, i) => (
          <button
            key={i}
            onClick={() => handleSelect(option)}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              isLight
                ? "bg-white hover:bg-blue-100 text-gray-800 border border-gray-200 hover:border-blue-400 shadow-sm hover:shadow"
                : "bg-neutral-700 hover:bg-neutral-600 text-neutral-100 border border-neutral-600 hover:border-emerald-500/50"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
