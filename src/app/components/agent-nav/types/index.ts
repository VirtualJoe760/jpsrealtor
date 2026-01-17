// types/index.ts - Type definitions for AgentNav

import { LucideIcon } from 'lucide-react';

/**
 * Navigation Item Interface
 * Represents a single navigation menu item
 */
export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact: boolean;
  show: boolean;
}

/**
 * Mobile Menu State
 */
export interface MobileMenuState {
  isOpen: boolean;
  toggle: () => void;
  close: () => void;
}

/**
 * AgentNav Props
 */
export interface AgentNavProps {
  className?: string;
}
