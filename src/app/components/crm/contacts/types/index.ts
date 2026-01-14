// Shared types for contacts module

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
  status?: string;
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

export interface Tag {
  name: string;
  color: string;
  contactCount: number;
}

export interface ContactStats {
  total: number;
  byStatus: Record<string, number>;
}

export interface ContactPagination {
  total: number;
  limit: number;
  skip: number;
  hasMore: boolean;
}

export interface ContactsPageState {
  searchQuery?: string;
  viewMode?: string;
  selectedTag?: string | null;
  selectedStatus?: string | null;
  sortBy?: string;
  filterBy?: string;
  contactAgeFilter?: string;
  scrollPosition?: number;
}

// Re-export enums
export * from './enums';
