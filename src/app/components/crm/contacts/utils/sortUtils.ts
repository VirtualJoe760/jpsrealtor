// Contact sorting utility functions

import { Contact, SortBy, ContactStatus } from '../types';

/**
 * Priority order for status sorting
 */
const STATUS_PRIORITY: Record<string, number> = {
  [ContactStatus.UNCONTACTED]: 0,
  [ContactStatus.CONTACTED]: 1,
  [ContactStatus.QUALIFIED]: 2,
  [ContactStatus.NURTURING]: 3,
  [ContactStatus.CLIENT]: 4,
  [ContactStatus.INACTIVE]: 5,
};

/**
 * Sort contacts based on sort criteria
 */
export function sortContacts(contacts: Contact[], sortBy: SortBy): Contact[] {
  const sorted = [...contacts];

  switch (sortBy) {
    case SortBy.STATUS:
      return sorted.sort((a, b) => {
        const aPriority = STATUS_PRIORITY[a.status || ContactStatus.UNCONTACTED] ?? 99;
        const bPriority = STATUS_PRIORITY[b.status || ContactStatus.UNCONTACTED] ?? 99;
        return aPriority - bPriority;
      });

    case SortBy.A_TO_Z:
      return sorted.sort((a, b) => {
        const aName = `${a.firstName} ${a.lastName}`.toLowerCase();
        const bName = `${b.firstName} ${b.lastName}`.toLowerCase();
        return aName.localeCompare(bName);
      });

    case SortBy.Z_TO_A:
      return sorted.sort((a, b) => {
        const aName = `${a.firstName} ${a.lastName}`.toLowerCase();
        const bName = `${b.firstName} ${b.lastName}`.toLowerCase();
        return bName.localeCompare(aName);
      });

    case SortBy.OLDEST:
      return sorted.sort((a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

    case SortBy.NEWEST:
    default:
      return sorted.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  }
}

/**
 * Get sort comparison function for a specific sort type
 */
export function getSortComparator(sortBy: SortBy): (a: Contact, b: Contact) => number {
  switch (sortBy) {
    case SortBy.STATUS:
      return (a, b) => {
        const aPriority = STATUS_PRIORITY[a.status || ContactStatus.UNCONTACTED] ?? 99;
        const bPriority = STATUS_PRIORITY[b.status || ContactStatus.UNCONTACTED] ?? 99;
        return aPriority - bPriority;
      };

    case SortBy.A_TO_Z:
      return (a, b) => {
        const aName = `${a.firstName} ${a.lastName}`.toLowerCase();
        const bName = `${b.firstName} ${b.lastName}`.toLowerCase();
        return aName.localeCompare(bName);
      };

    case SortBy.Z_TO_A:
      return (a, b) => {
        const aName = `${a.firstName} ${a.lastName}`.toLowerCase();
        const bName = `${b.firstName} ${b.lastName}`.toLowerCase();
        return bName.localeCompare(aName);
      };

    case SortBy.OLDEST:
      return (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();

    case SortBy.NEWEST:
    default:
      return (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  }
}
