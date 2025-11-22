"use client";

import { useThemeClasses } from "@/app/contexts/ThemeContext";

export default function EmailInput() {
  const { textPrimary, currentTheme } = useThemeClasses();
  const isLight = currentTheme === "lightgradient";

  return (
    <div className="sm:col-span-2">
      <label htmlFor="email" className={`block text-sm/6 font-semibold ${textPrimary}`}>
        Email
      </label>
      <input
        id="email"
        name="email"
        type="email"
        className={`mt-2.5 block w-full rounded-md px-3.5 py-2 text-base outline outline-1 ${textPrimary} ${
          isLight
            ? "bg-white border-gray-300 outline-gray-300 placeholder-gray-400 focus:outline-indigo-500"
            : "bg-gray-800 border-gray-700 outline-gray-700 placeholder-gray-500 focus:outline-indigo-500"
        }`}
        required
      />
    </div>
  );
}
