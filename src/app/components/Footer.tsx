"use client";

import Link from 'next/link';
import { useThemeClasses } from '@/app/contexts/ThemeContext';

export default function Footer() {
  const { textSecondary, currentTheme } = useThemeClasses();
  const isLight = currentTheme === "lightgradient";

  return (
    <footer className="w-full py-4 px-6">
      <div className="flex items-center justify-center gap-4 text-xs">
        <Link
          href="/privacy-policy"
          className={`${textSecondary} ${isLight ? 'hover:text-blue-600' : 'hover:text-gray-300'} transition-colors`}
        >
          Privacy Policy
        </Link>
        <span className={textSecondary}>|</span>
        <Link
          href="/terms-of-service"
          className={`${textSecondary} ${isLight ? 'hover:text-blue-600' : 'hover:text-gray-300'} transition-colors`}
        >
          Terms of Service
        </Link>
      </div>
    </footer>
  );
}
