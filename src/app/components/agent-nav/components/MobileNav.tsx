// components/MobileNav.tsx - Mobile slide-out menu

import React from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import type { NavItem } from '../types';
import { MOBILE_MENU_VARIANTS } from '../constants';
import { isNavItemActive, getMobileActiveNavClasses, getMobileInactiveNavClasses } from '../utils';

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  navItems: NavItem[];
  pathname: string;
  isLight: boolean;
  textPrimary: string;
  textSecondary: string;
  cardBg: string;
  border: string;
}

export function MobileNav({
  isOpen,
  onClose,
  navItems,
  pathname,
  isLight,
  textPrimary,
  textSecondary,
  cardBg,
  border,
}: MobileNavProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            {...MOBILE_MENU_VARIANTS.backdrop}
            className="md:hidden fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />

          {/* Menu */}
          <motion.div
            {...MOBILE_MENU_VARIANTS.menu}
            className={`md:hidden fixed top-0 right-0 bottom-0 w-64 ${cardBg} shadow-2xl z-50 overflow-y-auto`}
          >
            {/* Menu Header */}
            <div className={`flex items-center justify-between p-4 border-b ${border}`}>
              <h3 className={`text-lg font-semibold ${textPrimary}`}>Menu</h3>
              <button
                onClick={onClose}
                className={`p-2 rounded-lg transition-colors ${
                  isLight ? 'hover:bg-gray-100' : 'hover:bg-gray-800'
                }`}
                aria-label="Close menu"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Navigation Links */}
            <div className="pt-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isNavItemActive(pathname, item.href, item.exact);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={`flex items-center gap-3 px-4 py-3 border-b ${border} last:border-b-0 transition-colors ${
                      active
                        ? getMobileActiveNavClasses(isLight)
                        : getMobileInactiveNavClasses(isLight, textSecondary)
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
