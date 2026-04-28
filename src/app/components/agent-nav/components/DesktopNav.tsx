// components/DesktopNav.tsx - Desktop horizontal navigation

import React from 'react';
import Link from 'next/link';
import type { NavItem } from '../types';
import { isNavItemActive, getActiveNavClasses, getInactiveNavClasses } from '../utils';
import { CreditsBadge } from './CreditsBadge';

interface DesktopNavProps {
  navItems: NavItem[];
  pathname: string;
  isLight: boolean;
  textSecondary: string;
  border: string;
}

export function DesktopNav({ navItems, pathname, isLight, textSecondary, border }: DesktopNavProps) {
  return (
    <div className={`hidden md:flex items-center border-b ${border}`}>
      <div className="flex items-center gap-2 flex-1 overflow-x-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isNavItemActive(pathname, item.href, item.exact);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-all whitespace-nowrap ${
                active
                  ? getActiveNavClasses(isLight)
                  : getInactiveNavClasses(isLight, textSecondary)
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
      <div className="flex-shrink-0 ml-2 pb-1">
        <CreditsBadge isLight={isLight} />
      </div>
    </div>
  );
}
