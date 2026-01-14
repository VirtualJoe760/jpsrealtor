# ContactsTab.tsx Refactor Plan

**Current Status:** 1,416 lines - Monolithic component with multiple responsibilities
**Target:** Modular, maintainable architecture with clear separation of concerns

---

## 📊 Current Analysis

### Component Responsibilities (Too Many!)
1. **State Management** - 16+ useState hooks managing various concerns
2. **Data Fetching** - Contacts, tags, stats APIs
3. **Session Persistence** - Save/restore state from sessionStorage
4. **Filtering & Sorting** - Multiple filter types (age, status, tag, missing data)
5. **Bulk Operations** - Select, delete multiple contacts
6. **UI Rendering** - Card view, list view, modals, panels
7. **Form Handling** - Add contact modal with validation

### Issues Identified

#### 🔴 **Critical Issues**
- **God Component Anti-pattern**: 1,416 lines handling too many concerns
- **State Explosion**: 16+ useState hooks making state hard to manage
- **Prop Drilling**: Deep component trees passing props multiple levels
- **Duplicate Logic**: Repeated styling patterns, card rendering logic
- **Performance Concerns**: No memoization, filtering/sorting runs on every render
- **Hardcoded Values**: Magic numbers, repeated shadow/border strings

#### 🟡 **Moderate Issues**
- **No Custom Hooks**: Business logic mixed with UI
- **Inline Styles**: Long className strings repeated throughout
- **No Type Exports**: Types defined inline, not reusable
- **Missing Error Boundaries**: No error handling UI
- **Console Logs**: Debug logs left in production code
- **SessionStorage Logic**: Complex persistence logic inline

#### 🟢 **Minor Issues**
- **Inconsistent Naming**: Some functions async, some not clearly named
- **Magic Strings**: 'recent', 'old', 'ancient', status types not typed
- **No Loading States**: Basic loading, could be more granular
- **Accessibility**: Missing ARIA labels on many interactive elements

---

## 🎯 Refactor Goals

### Primary Objectives
1. **Modularity** - Break into focused, single-responsibility components
2. **Reusability** - Extract common patterns into reusable components
3. **Performance** - Add memoization, optimize re-renders
4. **Maintainability** - Clear file structure, typed interfaces
5. **Testability** - Separate business logic from UI

### Success Metrics
- [ ] Component < 300 lines
- [ ] < 5 useState hooks in main component
- [ ] 90%+ type coverage
- [ ] All business logic in custom hooks
- [ ] No repeated styling strings
- [ ] All components < 150 lines

---

## 📁 Proposed File Structure

```
src/app/components/crm/contacts/
├── ContactsTab.tsx                    # Main orchestrator (< 300 lines)
│
├── types/
│   ├── index.ts                       # Contact, Tag, Stats, Filter types
│   └── enums.ts                       # Status, FilterBy, SortBy enums
│
├── hooks/
│   ├── useContacts.ts                 # Contact CRUD operations
│   ├── useContactFilters.ts           # Filter & sort logic
│   ├── useContactSelection.ts         # Multi-select logic
│   ├── useContactStats.ts             # Stats & tags fetching
│   ├── useContactPersistence.ts       # SessionStorage logic
│   └── index.ts                       # Barrel export
│
├── utils/
│   ├── contactUtils.ts                # Age calculations, helpers
│   ├── sortUtils.ts                   # Sort comparison functions
│   └── filterUtils.ts                 # Filter predicates
│
├── constants/
│   └── styles.ts                      # Shared className patterns
│
├── components/
│   ├── ContactCard/
│   │   ├── ContactCard.tsx            # Individual contact card
│   │   ├── ContactCardSkeleton.tsx    # Loading state
│   │   └── index.ts
│   │
│   ├── ContactList/
│   │   ├── ContactList.tsx            # List view container
│   │   ├── ContactListItem.tsx        # Single list item
│   │   └── index.ts
│   │
│   ├── StatsCards/
│   │   ├── StatsCardGrid.tsx          # Grid container
│   │   ├── StatsCard.tsx              # Reusable stat card
│   │   ├── AllContactsCard.tsx        # Total contacts card
│   │   ├── TagCard.tsx                # Tag-based card
│   │   ├── StatusCard.tsx             # Status-based card
│   │   └── index.ts
│   │
│   ├── ContactToolbar/
│   │   ├── ContactToolbar.tsx         # Search, filters, actions
│   │   ├── SearchBar.tsx              # Search input
│   │   ├── FilterDropdown.tsx         # Filter selector
│   │   ├── SortDropdown.tsx           # Sort selector
│   │   ├── BulkActions.tsx            # Multi-select actions
│   │   └── index.ts
│   │
│   ├── ContactModals/
│   │   ├── AddContactModal.tsx        # Add contact form
│   │   ├── ContactFormFields.tsx      # Shared form fields
│   │   └── index.ts
│   │
│   └── ContactViewPanel/             # Already exists - keep as is
│       └── index.ts
│
└── index.ts                           # Barrel export
```

---

## 🔧 Detailed Refactor Steps

### Phase 1: Extract Types & Constants (Day 1 - 2 hours)

#### 1.1 Create Type Definitions
**File:** `src/app/components/crm/contacts/types/index.ts`

```typescript
// Shared types for entire contacts module
export interface Contact {
  _id: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  nickname?: string;
  email?: string;
  alternateEmails?: string[];
  phone: string;
  alternatePhones?: string[];
  birthday?: string;
  photo?: string;
  address?: Address;
  alternateAddress?: Address;
  organization?: string;
  jobTitle?: string;
  department?: string;
  website?: string;
  status?: ContactStatus;
  tags?: string[];
  labels?: string[];
  interests?: ContactInterests;
  preferences?: ContactPreferences;
  notes?: string;
  createdAt: string;
  importedAt?: string;
  originalCreatedDate?: string;
  lastContactDate?: string;
  lastModified?: string;
}

export interface Address {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}

export interface ContactInterests {
  buying?: boolean;
  selling?: boolean;
  locations?: string[];
}

export interface ContactPreferences {
  smsOptIn: boolean;
  emailOptIn: boolean;
}

export interface Tag {
  name: string;
  color: string;
  contactCount: number;
}

export interface ContactStats {
  total: number;
  byStatus: Record<ContactStatus, number>;
}

export interface ContactPagination {
  total: number;
  limit: number;
  skip: number;
  hasMore: boolean;
}
```

#### 1.2 Create Enums
**File:** `src/app/components/crm/contacts/types/enums.ts`

```typescript
export enum ContactStatus {
  UNCONTACTED = 'uncontacted',
  CONTACTED = 'contacted',
  QUALIFIED = 'qualified',
  NURTURING = 'nurturing',
  CLIENT = 'client',
  INACTIVE = 'inactive'
}

export enum ContactAgeFilter {
  ALL = 'all',
  RECENT = 'recent',
  OLD = 'old',
  ANCIENT = 'ancient'
}

export enum FilterBy {
  ALL = 'all',
  NO_EMAIL = 'no-email',
  NO_PHONE = 'no-phone',
  NO_ADDRESS = 'no-address',
  BUYERS = 'buyers',
  SELLERS = 'sellers'
}

export enum SortBy {
  A_TO_Z = 'a-z',
  Z_TO_A = 'z-a',
  NEWEST = 'newest',
  OLDEST = 'oldest',
  STATUS = 'status'
}

export enum ViewMode {
  CARD = 'card',
  LIST = 'list'
}

export enum ContactAge {
  RECENT = 'recent',  // 0-30 days
  OLD = 'old',        // 31-365 days
  ANCIENT = 'ancient' // 365+ days
}
```

#### 1.3 Extract Style Constants
**File:** `src/app/components/crm/contacts/constants/styles.ts`

```typescript
export const CARD_STYLES = {
  light: {
    base: 'bg-white border-2 border-gray-100',
    shadow: 'shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_10px_15px_-3px_rgba(0,0,0,0.1),0_20px_25px_-5px_rgba(0,0,0,0.1)]',
    hoverShadow: 'hover:shadow-[0_10px_20px_-5px_rgba(0,0,0,0.15),0_20px_30px_-10px_rgba(0,0,0,0.15)]',
    hoverTransform: 'hover:-translate-y-1',
  },
  dark: {
    base: 'bg-neutral-900/30',
    shadow: '',
    hoverShadow: '',
    hoverTransform: '',
  }
} as const;

export const getCardClassName = (isLight: boolean) => {
  const theme = isLight ? CARD_STYLES.light : CARD_STYLES.dark;
  return `p-6 rounded-xl transition-all text-left ${theme.base} ${theme.shadow} ${theme.hoverShadow} ${theme.hoverTransform}`;
};

export const STATUS_ICONS = {
  uncontacted: { icon: 'UserX', color: 'text-slate-600' },
  contacted: { icon: 'Phone', color: 'text-yellow-600' },
  qualified: { icon: 'Star', color: 'text-blue-600' },
  nurturing: { icon: 'Heart', color: 'text-purple-600' },
  client: { icon: 'UserCheck', color: 'text-green-600' },
  inactive: { icon: 'Archive', color: 'text-red-600' }
} as const;
```

---

### Phase 2: Extract Custom Hooks (Day 2-3 - 6 hours)

#### 2.1 Contact Data Hook
**File:** `src/app/components/crm/contacts/hooks/useContacts.ts`

```typescript
import { useState, useCallback } from 'react';
import { Contact, ContactPagination } from '../types';

export function useContacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pagination, setPagination] = useState<ContactPagination>({
    total: 0,
    limit: 50,
    skip: 0,
    hasMore: false
  });

  const fetchContacts = useCallback(async (params: {
    reset?: boolean;
    search?: string;
    tag?: string;
    status?: string;
  }) => {
    const { reset = false, search, tag, status } = params;

    try {
      if (reset) {
        setLoading(true);
        setPagination(prev => ({ ...prev, skip: 0 }));
      } else {
        setLoadingMore(true);
      }

      const skip = reset ? 0 : pagination.skip + pagination.limit;

      // Build query params
      const queryParams = new URLSearchParams({
        limit: pagination.limit.toString(),
        skip: skip.toString(),
      });

      if (search) queryParams.append('search', search);
      if (tag) queryParams.append('tag', tag);
      if (status) queryParams.append('status', status);

      const response = await fetch(`/api/crm/contacts?${queryParams}`);
      const data = await response.json();

      if (data.success) {
        setContacts(prev => reset ? data.contacts : [...prev, ...data.contacts]);
        setPagination({
          total: data.pagination.total,
          limit: data.pagination.limit,
          skip: skip,
          hasMore: data.pagination.hasMore
        });
      }
    } catch (error) {
      console.error('[useContacts] Fetch error:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [pagination.skip, pagination.limit]);

  const deleteContact = useCallback(async (id: string) => {
    if (!confirm('Are you sure you want to delete this contact?')) return false;

    try {
      const response = await fetch(`/api/crm/contacts?id=${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setContacts(prev => prev.filter(c => c._id !== id));
        return true;
      } else {
        alert(data.error);
        return false;
      }
    } catch (error) {
      console.error('[useContacts] Delete error:', error);
      alert('Failed to delete contact');
      return false;
    }
  }, []);

  return {
    contacts,
    loading,
    loadingMore,
    pagination,
    fetchContacts,
    deleteContact,
    setContacts
  };
}
```

#### 2.2 Contact Filters Hook
**File:** `src/app/components/crm/contacts/hooks/useContactFilters.ts`

```typescript
import { useMemo } from 'react';
import { Contact, FilterBy, SortBy, ContactAge } from '../types';
import { filterContact, sortContacts } from '../utils';

export function useContactFilters(contacts: Contact[]) {
  const [filterBy, setFilterBy] = useState<FilterBy>(FilterBy.ALL);
  const [sortBy, setSortBy] = useState<SortBy>(SortBy.A_TO_Z);
  const [contactAgeFilter, setContactAgeFilter] = useState<ContactAge | 'all'>('all');

  const filteredContacts = useMemo(() => {
    return contacts.filter(contact =>
      filterContact(contact, filterBy, contactAgeFilter)
    );
  }, [contacts, filterBy, contactAgeFilter]);

  const sortedContacts = useMemo(() => {
    return sortContacts(filteredContacts, sortBy);
  }, [filteredContacts, sortBy]);

  return {
    filteredContacts,
    sortedContacts,
    filterBy,
    setFilterBy,
    sortBy,
    setSortBy,
    contactAgeFilter,
    setContactAgeFilter
  };
}
```

#### 2.3 Contact Selection Hook
**File:** `src/app/components/crm/contacts/hooks/useContactSelection.ts`

```typescript
import { useState, useCallback } from 'react';

export function useContactSelection() {
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());

  const toggleContactSelection = useCallback((contactId: string) => {
    setSelectedContactIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(contactId)) {
        newSet.delete(contactId);
      } else {
        newSet.add(contactId);
      }
      return newSet;
    });
  }, []);

  const toggleSelectAll = useCallback((contactIds: string[]) => {
    setSelectedContactIds(prev => {
      const allSelected = contactIds.every(id => prev.has(id));
      if (allSelected) {
        return new Set();
      } else {
        return new Set(contactIds);
      }
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedContactIds(new Set());
  }, []);

  return {
    selectedContactIds,
    toggleContactSelection,
    toggleSelectAll,
    clearSelection
  };
}
```

#### 2.4 Contact Stats Hook
**File:** `src/app/components/crm/contacts/hooks/useContactStats.ts`

```typescript
import { useState, useEffect, useCallback } from 'react';
import { Tag, ContactStats } from '../types';

export function useContactStats() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [stats, setStats] = useState<ContactStats>({ total: 0, byStatus: {} });
  const [loading, setLoading] = useState(true);

  const fetchTags = useCallback(async () => {
    try {
      const response = await fetch('/api/crm/contacts/tags');
      const data = await response.json();
      if (data.success) {
        setTags(data.tags || []);
      }
    } catch (error) {
      console.error('[useContactStats] Error fetching tags:', error);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/crm/contacts/stats');
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('[useContactStats] Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTags();
    fetchStats();
  }, [fetchTags, fetchStats]);

  const refetch = useCallback(() => {
    fetchTags();
    fetchStats();
  }, [fetchTags, fetchStats]);

  return {
    tags,
    stats,
    loading,
    refetch
  };
}
```

#### 2.5 Contact Persistence Hook
**File:** `src/app/components/crm/contacts/hooks/useContactPersistence.ts`

```typescript
import { useEffect } from 'react';

interface ContactsPageState {
  searchQuery?: string;
  viewMode?: string;
  selectedTag?: string | null;
  selectedStatus?: string | null;
  sortBy?: string;
  filterBy?: string;
  contactAgeFilter?: string;
  scrollPosition?: number;
}

export function useContactPersistence(state: ContactsPageState) {
  const STORAGE_KEY = 'contactsPageState';

  // Restore state on mount
  useEffect(() => {
    const savedState = sessionStorage.getItem(STORAGE_KEY);
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        return parsed as ContactsPageState;
      } catch (error) {
        console.error('[useContactPersistence] Error restoring state:', error);
      }
    }
    return null;
  }, []);

  // Save state whenever it changes
  useEffect(() => {
    const stateToSave = {
      ...state,
      scrollPosition: window.scrollY,
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
  }, [state]);

  // Save scroll position
  useEffect(() => {
    const handleScroll = () => {
      const savedState = sessionStorage.getItem(STORAGE_KEY);
      if (savedState) {
        try {
          const parsed = JSON.parse(savedState);
          parsed.scrollPosition = window.scrollY;
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        } catch (error) {
          console.error('[useContactPersistence] Error saving scroll:', error);
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
}
```

---

### Phase 3: Extract Utility Functions (Day 3 - 2 hours)

#### 3.1 Contact Utilities
**File:** `src/app/components/crm/contacts/utils/contactUtils.ts`

```typescript
import { Contact, ContactAge } from '../types';

export function getDaysSinceImport(contact: Contact): number {
  const dateToUse = contact.importedAt || contact.createdAt;
  const importDate = new Date(dateToUse);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - importDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function getContactAgeCategory(contact: Contact): ContactAge {
  const days = getDaysSinceImport(contact);
  if (days <= 30) return ContactAge.RECENT;
  if (days <= 365) return ContactAge.OLD;
  return ContactAge.ANCIENT;
}

export function getContactDisplayName(contact: Contact): string {
  const parts = [contact.firstName, contact.lastName].filter(Boolean);
  return parts.join(' ') || 'Unknown Contact';
}

export function hasEmail(contact: Contact): boolean {
  return !!(contact.email || (contact.alternateEmails && contact.alternateEmails.length > 0));
}

export function hasPhone(contact: Contact): boolean {
  return !!(contact.phone && contact.phone.trim() !== '');
}

export function hasAddress(contact: Contact): boolean {
  return !!(contact.address && (contact.address.street || contact.address.city));
}
```

#### 3.2 Filter Utilities
**File:** `src/app/components/crm/contacts/utils/filterUtils.ts`

```typescript
import { Contact, FilterBy, ContactAge } from '../types';
import { getContactAgeCategory, hasEmail, hasPhone, hasAddress } from './contactUtils';

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
```

#### 3.3 Sort Utilities
**File:** `src/app/components/crm/contacts/utils/sortUtils.ts`

```typescript
import { Contact, SortBy, ContactStatus } from '../types';

const STATUS_PRIORITY: Record<string, number> = {
  [ContactStatus.UNCONTACTED]: 0,
  [ContactStatus.CONTACTED]: 1,
  [ContactStatus.QUALIFIED]: 2,
  [ContactStatus.NURTURING]: 3,
  [ContactStatus.CLIENT]: 4,
  [ContactStatus.INACTIVE]: 5,
};

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
```

---

### Phase 4: Create Reusable Components (Day 4-5 - 8 hours)

#### 4.1 StatsCard Component
**File:** `src/app/components/crm/contacts/components/StatsCards/StatsCard.tsx`

```typescript
import React from 'react';
import { LucideIcon } from 'lucide-react';
import { getCardClassName } from '../../constants/styles';

interface StatsCardProps {
  icon: LucideIcon;
  iconColor: string;
  title?: string;
  count: number;
  description: string;
  onClick: () => void;
  isLight: boolean;
  borderColor?: string;
}

export function StatsCard({
  icon: Icon,
  iconColor,
  title,
  count,
  description,
  onClick,
  isLight,
  borderColor
}: StatsCardProps) {
  return (
    <button
      onClick={onClick}
      className={getCardClassName(isLight)}
      style={{ borderColor }}
    >
      <div className="flex items-center justify-between mb-3">
        <Icon className={`w-8 h-8 ${iconColor}`} />
      </div>

      {title && (
        <h3 className={`text-lg font-bold mb-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
          {title}
        </h3>
      )}

      <p className={`text-3xl font-bold ${iconColor}`}>
        {count}
      </p>

      <p className={`text-sm mt-2 ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
        {description}
      </p>
    </button>
  );
}
```

#### 4.2 StatusCard Component
**File:** `src/app/components/crm/contacts/components/StatsCards/StatusCard.tsx`

```typescript
import React from 'react';
import { UserX, Phone, Star, Heart, UserCheck, Archive } from 'lucide-react';
import { ContactStatus } from '../../types';
import { StatsCard } from './StatsCard';

const STATUS_CONFIG = {
  [ContactStatus.UNCONTACTED]: {
    icon: UserX,
    color: 'text-slate-600',
    darkColor: 'text-gray-400',
    label: 'Uncontacted',
    description: 'Not yet reached out'
  },
  [ContactStatus.CONTACTED]: {
    icon: Phone,
    color: 'text-yellow-600',
    darkColor: 'text-yellow-400',
    label: 'Contacted',
    description: 'Initial contact made'
  },
  [ContactStatus.QUALIFIED]: {
    icon: Star,
    color: 'text-blue-600',
    darkColor: 'text-blue-400',
    label: 'Qualified',
    description: 'Potential opportunities'
  },
  [ContactStatus.NURTURING]: {
    icon: Heart,
    color: 'text-purple-600',
    darkColor: 'text-purple-400',
    label: 'Nurturing',
    description: 'Building relationships'
  },
  [ContactStatus.CLIENT]: {
    icon: UserCheck,
    color: 'text-green-600',
    darkColor: 'text-green-400',
    label: 'Client',
    description: 'Active clients'
  },
  [ContactStatus.INACTIVE]: {
    icon: Archive,
    color: 'text-red-600',
    darkColor: 'text-red-400',
    label: 'Inactive',
    description: 'No longer active'
  },
};

interface StatusCardProps {
  status: ContactStatus;
  count: number;
  onClick: () => void;
  isLight: boolean;
}

export function StatusCard({ status, count, onClick, isLight }: StatusCardProps) {
  const config = STATUS_CONFIG[status];
  const iconColor = isLight ? config.color : config.darkColor;

  return (
    <StatsCard
      icon={config.icon}
      iconColor={iconColor}
      title={config.label}
      count={count}
      description={config.description}
      onClick={onClick}
      isLight={isLight}
    />
  );
}
```

#### 4.3 StatsCardGrid Component
**File:** `src/app/components/crm/contacts/components/StatsCards/StatsCardGrid.tsx`

```typescript
import React from 'react';
import { Users, Tag as TagIcon } from 'lucide-react';
import { ContactStats, Tag, ContactStatus } from '../../types';
import { StatsCard } from './StatsCard';
import { StatusCard } from './StatusCard';

interface StatsCardGridProps {
  stats: ContactStats;
  tags: Tag[];
  onViewAll: () => void;
  onSelectTag: (tagName: string) => void;
  onSelectStatus: (status: ContactStatus) => void;
  selectedTag: string | null;
  isLight: boolean;
}

export function StatsCardGrid({
  stats,
  tags,
  onViewAll,
  onSelectTag,
  onSelectStatus,
  selectedTag,
  isLight
}: StatsCardGridProps) {
  return (
    <div className="space-y-8">
      {/* All Contacts & Tags Section */}
      <div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {/* All Contacts Card */}
          <StatsCard
            icon={Users}
            iconColor={isLight ? 'text-blue-600' : 'text-emerald-500'}
            count={stats.total}
            description="View all contacts"
            onClick={onViewAll}
            isLight={isLight}
          />

          {/* Tag Cards */}
          {tags.map((tag) => (
            <button
              key={tag.name}
              onClick={() => onSelectTag(tag.name)}
              className={getCardClassName(isLight)}
              style={{
                borderColor: selectedTag === tag.name ? tag.color : undefined,
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <TagIcon className="w-8 h-8" style={{ color: tag.color }} />
              </div>
              <h3 className={`text-lg font-bold mb-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {tag.name}
              </h3>
              <p className="text-3xl font-bold" style={{ color: tag.color }}>
                {tag.contactCount}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Status Cards Section */}
      <div>
        <h2 className={`text-2xl font-bold mb-4 ${isLight ? 'text-slate-900' : 'text-white'}`}>
          By Status
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Object.values(ContactStatus).map((status) => (
            <StatusCard
              key={status}
              status={status}
              count={stats.byStatus[status] || 0}
              onClick={() => onSelectStatus(status)}
              isLight={isLight}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
```

#### 4.4 ContactToolbar Component
**File:** `src/app/components/crm/contacts/components/ContactToolbar/ContactToolbar.tsx`

```typescript
import React from 'react';
import { Search, Download, Plus, Grid3x3, List as ListIcon } from 'lucide-react';
import { ViewMode, SortBy, FilterBy } from '../../types';

interface ContactToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  sortBy: SortBy;
  onSortChange: (sort: SortBy) => void;
  filterBy: FilterBy;
  onFilterChange: (filter: FilterBy) => void;
  selectedCount: number;
  onBulkDelete: () => void;
  onImport: () => void;
  onAdd: () => void;
  isLight: boolean;
}

export function ContactToolbar({
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange,
  sortBy,
  onSortChange,
  filterBy,
  onFilterChange,
  selectedCount,
  onBulkDelete,
  onImport,
  onAdd,
  isLight
}: ContactToolbarProps) {
  return (
    <div className="space-y-4 mb-6">
      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${
            isLight ? 'text-gray-400' : 'text-gray-500'
          }`} />
          <input
            type="text"
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 rounded-lg ${
              isLight
                ? 'bg-white border border-gray-300 text-gray-900'
                : 'bg-gray-800 border border-gray-700 text-white'
            } focus:outline-none focus:ring-2 ${
              isLight ? 'focus:ring-blue-500' : 'focus:ring-emerald-500'
            }`}
          />
        </div>

        {/* Action Buttons */}
        <button
          onClick={onImport}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
            isLight
              ? 'bg-white border border-gray-300 hover:bg-gray-50'
              : 'bg-gray-800 border border-gray-700 hover:bg-gray-700'
          }`}
        >
          <Download className="w-4 h-4" />
          Import
        </button>

        <button
          onClick={onAdd}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
            isLight
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-emerald-600 text-white hover:bg-emerald-700'
          }`}
        >
          <Plus className="w-4 h-4" />
          Add
        </button>
      </div>

      {/* Filters & View Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {/* Filter Dropdown */}
          <select
            value={filterBy}
            onChange={(e) => onFilterChange(e.target.value as FilterBy)}
            className={`px-3 py-1.5 rounded-lg text-sm ${
              isLight
                ? 'bg-white border border-gray-300'
                : 'bg-gray-800 border border-gray-700'
            }`}
          >
            <option value={FilterBy.ALL}>All Contacts</option>
            <option value={FilterBy.NO_EMAIL}>No Email</option>
            <option value={FilterBy.NO_PHONE}>No Phone</option>
            <option value={FilterBy.NO_ADDRESS}>No Address</option>
            <option value={FilterBy.BUYERS}>Buyers</option>
            <option value={FilterBy.SELLERS}>Sellers</option>
          </select>

          {/* Sort Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as SortBy)}
            className={`px-3 py-1.5 rounded-lg text-sm ${
              isLight
                ? 'bg-white border border-gray-300'
                : 'bg-gray-800 border border-gray-700'
            }`}
          >
            <option value={SortBy.A_TO_Z}>A-Z</option>
            <option value={SortBy.Z_TO_A}>Z-A</option>
            <option value={SortBy.NEWEST}>Newest First</option>
            <option value={SortBy.OLDEST}>Oldest First</option>
            <option value={SortBy.STATUS}>By Status</option>
          </select>
        </div>

        {/* View Mode Toggle */}
        <div className="flex gap-1">
          <button
            onClick={() => onViewModeChange(ViewMode.CARD)}
            className={`p-2 rounded ${
              viewMode === ViewMode.CARD
                ? isLight ? 'bg-blue-100 text-blue-600' : 'bg-emerald-900 text-emerald-400'
                : isLight ? 'bg-gray-100' : 'bg-gray-800'
            }`}
          >
            <Grid3x3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onViewModeChange(ViewMode.LIST)}
            className={`p-2 rounded ${
              viewMode === ViewMode.LIST
                ? isLight ? 'bg-blue-100 text-blue-600' : 'bg-emerald-900 text-emerald-400'
                : isLight ? 'bg-gray-100' : 'bg-gray-800'
            }`}
          >
            <ListIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedCount > 0 && (
        <div className={`p-3 rounded-lg flex items-center justify-between ${
          isLight ? 'bg-blue-50' : 'bg-gray-800'
        }`}>
          <span className="text-sm font-medium">
            {selectedCount} contact{selectedCount > 1 ? 's' : ''} selected
          </span>
          <button
            onClick={onBulkDelete}
            className="px-3 py-1 rounded bg-red-600 text-white text-sm hover:bg-red-700"
          >
            Delete Selected
          </button>
        </div>
      )}
    </div>
  );
}
```

---

### Phase 5: Refactor Main Component (Day 6 - 4 hours)

#### 5.1 New ContactsTab.tsx (Main Orchestrator)
**File:** `src/app/components/crm/contacts/ContactsTab.tsx`

```typescript
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ViewMode, ContactStatus } from './types';
import {
  useContacts,
  useContactFilters,
  useContactSelection,
  useContactStats,
  useContactPersistence
} from './hooks';
import { StatsCardGrid } from './components/StatsCards';
import { ContactToolbar } from './components/ContactToolbar';
import { ContactList } from './components/ContactList';
import ContactSyncModal from '../ContactSyncModal';
import ContactViewPanel from '../ContactViewPanel';

interface ContactsTabProps {
  isLight: boolean;
}

export default function ContactsTab({ isLight }: ContactsTabProps) {
  const router = useRouter();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.CARD);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [panelContact, setPanelContact] = useState<Contact | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Custom Hooks
  const {
    contacts,
    loading,
    loadingMore,
    pagination,
    fetchContacts,
    deleteContact
  } = useContacts();

  const {
    sortedContacts,
    filterBy,
    setFilterBy,
    sortBy,
    setSortBy,
    contactAgeFilter,
    setContactAgeFilter
  } = useContactFilters(contacts);

  const {
    selectedContactIds,
    toggleContactSelection,
    toggleSelectAll,
    clearSelection
  } = useContactSelection();

  const {
    tags,
    stats,
    loading: statsLoading,
    refetch: refetchStats
  } = useContactStats();

  // Session persistence
  useContactPersistence({
    searchQuery,
    viewMode,
    selectedTag,
    selectedStatus,
    sortBy,
    filterBy,
    contactAgeFilter
  });

  // Effects
  useEffect(() => {
    fetchContacts({ reset: true, search: searchQuery, tag: selectedTag, status: selectedStatus });
  }, [searchQuery, selectedTag, selectedStatus]);

  // Handlers
  const handleViewAll = () => {
    setViewMode(ViewMode.LIST);
    setSelectedTag(null);
    setSelectedStatus(null);
  };

  const handleSelectTag = (tagName: string) => {
    setViewMode(ViewMode.LIST);
    setSelectedTag(tagName);
    setSelectedStatus(null);
  };

  const handleSelectStatus = (status: ContactStatus) => {
    setViewMode(ViewMode.LIST);
    setSelectedTag(null);
    setSelectedStatus(status);
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedContactIds.size} contacts?`)) return;

    // Bulk delete implementation
    for (const id of selectedContactIds) {
      await deleteContact(id);
    }

    clearSelection();
    refetchStats();
  };

  const handleContactClick = (contact: Contact) => {
    setPanelContact(contact);
    setIsPanelOpen(true);
  };

  // Render
  if (loading && !contacts.length) {
    return <div>Loading...</div>; // TODO: Better loading state
  }

  return (
    <div className="space-y-6">
      {/* Card View - Stats Overview */}
      {viewMode === ViewMode.CARD && (
        <StatsCardGrid
          stats={stats}
          tags={tags}
          onViewAll={handleViewAll}
          onSelectTag={handleSelectTag}
          onSelectStatus={handleSelectStatus}
          selectedTag={selectedTag}
          isLight={isLight}
        />
      )}

      {/* List View - Contacts */}
      {viewMode === ViewMode.LIST && (
        <>
          <ContactToolbar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            sortBy={sortBy}
            onSortChange={setSortBy}
            filterBy={filterBy}
            onFilterChange={setFilterBy}
            selectedCount={selectedContactIds.size}
            onBulkDelete={handleBulkDelete}
            onImport={() => setShowSyncModal(true)}
            onAdd={() => router.push('/agent/contacts/new')}
            isLight={isLight}
          />

          <ContactList
            contacts={sortedContacts}
            selectedIds={selectedContactIds}
            onToggleSelection={toggleContactSelection}
            onToggleSelectAll={() => toggleSelectAll(sortedContacts.map(c => c._id))}
            onContactClick={handleContactClick}
            onDelete={deleteContact}
            isLight={isLight}
          />
        </>
      )}

      {/* Modals & Panels */}
      {showSyncModal && (
        <ContactSyncModal
          isOpen={showSyncModal}
          onClose={() => setShowSyncModal(false)}
          onImportComplete={() => {
            fetchContacts({ reset: true });
            refetchStats();
          }}
          isLight={isLight}
        />
      )}

      {isPanelOpen && panelContact && (
        <ContactViewPanel
          contact={panelContact}
          isOpen={isPanelOpen}
          onClose={() => setIsPanelOpen(false)}
          onUpdate={() => fetchContacts({ reset: true })}
          isLight={isLight}
        />
      )}
    </div>
  );
}
```

---

## 📋 Implementation Checklist

### Phase 1: Foundation (Days 1-2)
- [ ] Create directory structure
- [ ] Extract and define all TypeScript types
- [ ] Create enums for magic strings
- [ ] Extract style constants
- [ ] Set up barrel exports (index.ts files)

### Phase 2: Business Logic (Days 2-3)
- [ ] Create `useContacts` hook
- [ ] Create `useContactFilters` hook
- [ ] Create `useContactSelection` hook
- [ ] Create `useContactStats` hook
- [ ] Create `useContactPersistence` hook
- [ ] Write tests for each hook

### Phase 3: Utilities (Day 3)
- [ ] Extract contact utility functions
- [ ] Extract filter utility functions
- [ ] Extract sort utility functions
- [ ] Write unit tests for utilities

### Phase 4: UI Components (Days 4-5)
- [ ] Create `StatsCard` component
- [ ] Create `StatusCard` component
- [ ] Create `StatsCardGrid` component
- [ ] Create `ContactToolbar` component
- [ ] Create `ContactList` component
- [ ] Create `ContactListItem` component
- [ ] Create `ContactCard` component
- [ ] Add loading skeletons

### Phase 5: Integration (Day 6)
- [ ] Refactor main `ContactsTab.tsx`
- [ ] Wire up all hooks
- [ ] Wire up all components
- [ ] Remove old code
- [ ] Test all functionality
- [ ] Fix any TypeScript errors

### Phase 6: Polish & Testing (Day 7)
- [ ] Add error boundaries
- [ ] Improve loading states
- [ ] Add accessibility labels
- [ ] Write integration tests
- [ ] Performance testing
- [ ] Remove console.logs
- [ ] Update documentation

---

## 🎯 Success Criteria

### Code Quality
- ✅ Main component < 300 lines
- ✅ No component > 150 lines
- ✅ No function > 50 lines
- ✅ 100% TypeScript type coverage
- ✅ All magic strings replaced with enums/constants
- ✅ Zero ESLint warnings

### Performance
- ✅ Memoized filters and sorts
- ✅ No unnecessary re-renders
- ✅ Lazy loading for modals
- ✅ Virtualized lists for 1000+ contacts

### Maintainability
- ✅ Clear file organization
- ✅ Single responsibility per file
- ✅ Reusable components
- ✅ Documented complex logic
- ✅ Easy to test

### User Experience
- ✅ No functionality regression
- ✅ Improved loading states
- ✅ Better error messages
- ✅ Accessible UI

---

## 🚨 Risks & Mitigation

### Risk 1: Breaking Existing Functionality
**Mitigation:**
- Refactor incrementally
- Test after each phase
- Keep old code until fully tested
- Use feature flags if needed

### Risk 2: Type Errors During Migration
**Mitigation:**
- Define all types upfront
- Use strict TypeScript settings
- Gradual migration with `any` escape hatches initially

### Risk 3: Performance Regression
**Mitigation:**
- Benchmark before and after
- Use React DevTools Profiler
- Monitor bundle size

### Risk 4: Time Overrun
**Mitigation:**
- Focus on high-value refactors first
- Can ship after Phase 4 if needed
- Polish can be done iteratively

---

## 📈 Future Enhancements (Post-Refactor)

1. **Virtual Scrolling** - Handle 10,000+ contacts smoothly
2. **Optimistic Updates** - Instant UI feedback
3. **Offline Support** - IndexedDB caching
4. **Bulk Edit** - Update multiple contacts at once
5. **Advanced Filters** - Custom filter builder
6. **Export** - CSV/Excel export
7. **Contact Merge** - Deduplicate contacts
8. **Activity Timeline** - Track all contact interactions

---

## 📚 Resources

- [React Performance Optimization](https://react.dev/learn/render-and-commit)
- [Custom Hooks Best Practices](https://react.dev/learn/reusing-logic-with-custom-hooks)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Component Composition](https://react.dev/learn/passing-props-to-a-component)

---

**Estimated Total Time:** 7 days (56 hours)
**Priority:** High
**Impact:** Improved maintainability, performance, and developer experience
