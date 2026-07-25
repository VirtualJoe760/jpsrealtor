"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useThemeClasses } from '@/app/contexts/ThemeContext';

export default function Footer() {
  const pathname = usePathname();
  const { textSecondary, currentTheme } = useThemeClasses();
  const isLight = currentTheme === "lightgradient";

  if (pathname !== '/') return null;

  // Bottom padding clears the fixed mobile bottom nav (sm:hidden, ~85px
  // measured, plus the device safe area) so the legal links aren't tucked
  // behind it. Desktop has no bottom bar, so sm: resets to normal spacing.
  return (
    <footer className="w-full px-6 pt-4 pb-[calc(7rem+env(safe-area-inset-bottom,0px))] sm:pb-4">
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
