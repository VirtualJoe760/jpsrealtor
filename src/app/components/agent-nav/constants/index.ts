// constants/index.ts - Constants for AgentNav

import {
  LayoutDashboard,
  Users,
  FileCheck,
  FileText,
  Megaphone,
  MessageSquare,
  Mail,
  UserCircle,
  CreditCard,
  Settings,
} from 'lucide-react';
import type { NavItem } from '../types';

/**
 * Base Navigation Items
 * Returns nav items with conditional visibility based on user role
 */
export const getNavItems = (
  isTeamLeader: boolean = false,
  tier: string = 'free',
  isAdmin: boolean = false,
): NavItem[] => {
  // Paid features (Email, Messages, Campaigns) are visible to admins and to
  // agents on any paid tier; hidden for free-tier agents. Subscription moved
  // into Settings → Billing (so its own tab is hidden).
  const showPaid = isAdmin || tier !== 'free';
  return [
    {
      href: '/agent/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      exact: true,
      show: true,
    },
    {
      href: '/agent/contacts',
      label: 'Contacts',
      icon: UserCircle,
      exact: false,
      show: true,
    },
    {
      href: '/agent/email',
      label: 'Email',
      icon: Mail,
      exact: false,
      show: showPaid,
    },
    {
      href: '/agent/messages',
      label: 'Messages',
      icon: MessageSquare,
      exact: false,
      show: showPaid,
    },
    {
      href: '/agent/campaigns',
      label: 'Campaigns',
      icon: Megaphone,
      exact: false,
      show: showPaid,
    },
    {
      href: '/agent/cms',
      label: 'CMS',
      icon: FileText,
      exact: false,
      show: true,
    },
    {
      href: '/agent/settings',
      label: 'Settings',
      icon: Settings,
      exact: false,
      show: true,
    },
    {
      href: '/agent/subscription',
      label: 'Subscription',
      icon: CreditCard,
      exact: false,
      show: false, // moved into Settings → Billing
    },
    {
      href: '/agent/applications',
      label: 'Applications',
      icon: FileCheck,
      exact: false,
      show: isTeamLeader, // Only show for team leaders
    },
    {
      href: '/agent/team',
      label: 'Team',
      icon: Users,
      exact: false,
      show: isTeamLeader, // Only show for team leaders
    },
  ];
};

/**
 * Animation Variants
 */
export const MOBILE_MENU_VARIANTS = {
  backdrop: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.2 },
  },
  menu: {
    initial: { x: '100%' },
    animate: { x: 0 },
    exit: { x: '100%' },
    transition: { type: 'spring', damping: 25, stiffness: 300 },
  },
};
