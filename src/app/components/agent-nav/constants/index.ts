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
} from 'lucide-react';
import type { NavItem } from '../types';

/**
 * Base Navigation Items
 * Returns nav items with conditional visibility based on user role
 */
export const getNavItems = (isTeamLeader: boolean = false): NavItem[] => [
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
    show: true,
  },
  {
    href: '/agent/messages',
    label: 'Messages',
    icon: MessageSquare,
    exact: false,
    show: true,
  },
  {
    href: '/agent/campaigns',
    label: 'Campaigns',
    icon: Megaphone,
    exact: false,
    show: true,
  },
  {
    href: '/agent/cms',
    label: 'CMS',
    icon: FileText,
    exact: false,
    show: true,
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
