// utils/index.ts - Utility functions for AgentNav

import type { NavItem } from '../types';

/**
 * Check if a nav item is active
 * @param pathname - Current pathname
 * @param href - Nav item href
 * @param exact - Whether to match exactly or use startsWith
 */
export function isNavItemActive(
  pathname: string,
  href: string,
  exact: boolean
): boolean {
  if (exact) {
    return pathname === href;
  }
  return pathname.startsWith(href);
}

/**
 * Filter visible nav items
 * Filters out items where show is false
 */
export function getVisibleNavItems(navItems: NavItem[]): NavItem[] {
  return navItems.filter((item) => item.show);
}

/**
 * Get button style classes based on theme
 */
export function getButtonClasses(isLight: boolean): string {
  return isLight
    ? 'text-blue-600 hover:bg-blue-50 hover:shadow-lg hover:shadow-blue-500/50'
    : 'text-emerald-400 hover:bg-emerald-900/30 hover:shadow-lg hover:shadow-emerald-500/50';
}

/**
 * Get active nav item classes
 */
export function getActiveNavClasses(isLight: boolean): string {
  return isLight
    ? 'border-blue-600 text-blue-600 font-semibold'
    : 'border-emerald-500 text-emerald-400 font-semibold';
}

/**
 * Get inactive nav item classes
 */
export function getInactiveNavClasses(
  isLight: boolean,
  textSecondary: string
): string {
  const hoverClasses = isLight
    ? 'hover:text-gray-900 hover:border-gray-300'
    : 'hover:text-white hover:border-gray-700';

  return `border-transparent ${textSecondary} ${hoverClasses}`;
}

/**
 * Get mobile active nav item classes
 */
export function getMobileActiveNavClasses(isLight: boolean): string {
  return isLight
    ? 'bg-blue-50 text-blue-600 font-semibold'
    : 'bg-emerald-900/30 text-emerald-400 font-semibold';
}

/**
 * Get mobile inactive nav item classes
 */
export function getMobileInactiveNavClasses(
  isLight: boolean,
  textSecondary: string
): string {
  const hoverClasses = isLight ? 'hover:bg-gray-50' : 'hover:bg-gray-800/50';
  return `${textSecondary} ${hoverClasses}`;
}
