// Contact filtering utility functions

import { Contact, FilterBy, ContactAge } from '../types';
import { getContactAgeCategory, hasEmail, hasPhone, hasAddress } from './contactUtils';

/**
 * Filter a single contact based on filter criteria
 */
export function filterContact(
  contact: Contact,
  filterBy: FilterBy,
  ageFilter: ContactAge | 'all'
): boolean {
  // Age filter
  if (ageFilter !== 'all' && getContactAgeCategory(contact) !== ageFilter) {
    return false;
  }

  // Data completeness filters
  switch (filterBy) {
    case FilterBy.NO_EMAIL:
      return !hasEmail(contact);

    case FilterBy.NO_PHONE:
      return !hasPhone(contact);

    case FilterBy.NO_ADDRESS:
      return !hasAddress(contact);

    case FilterBy.BUYERS:
      return contact.interests?.buying === true;

    case FilterBy.SELLERS:
      return contact.interests?.selling === true;

    case FilterBy.ALL:
    default:
      return true;
  }
}

/**
 * Filter an array of contacts
 */
export function filterContacts(
  contacts: Contact[],
  filterBy: FilterBy,
  ageFilter: ContactAge | 'all'
): Contact[] {
  return contacts.filter(contact => filterContact(contact, filterBy, ageFilter));
}
