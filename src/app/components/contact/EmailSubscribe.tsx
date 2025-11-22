"use client";

import { useThemeClasses } from "@/app/contexts/ThemeContext";

interface EmailSubscribeProps {
  label: string;
  isChecked: boolean;
  onChange: (checked: boolean) => void;
}

export default function EmailSubscribe({ label, isChecked, onChange }: EmailSubscribeProps) {
  const { textSecondary, currentTheme } = useThemeClasses();
  const isLight = currentTheme === "lightgradient";

  return (
    <div className="flex items-center">
      <input
        type="checkbox"
        id="email-opt-in"
        name="emailOptIn"
        checked={isChecked}
        onChange={(e) => onChange(e.target.checked)}
        className={`h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 ${
          isLight ? "border-gray-300" : "border-gray-600"
        }`}
        required
      />
      <label htmlFor="email-opt-in" className={`ml-2 text-sm ${textSecondary}`}>
        {label}
      </label>
    </div>
  );
}
