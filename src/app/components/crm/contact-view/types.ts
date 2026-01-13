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
  phones?: PhoneEntry[];
  emails?: EmailEntry[];
  birthday?: string;
  photo?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  alternateAddress?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  organization?: string;
  jobTitle?: string;
  department?: string;
  website?: string;
  status?: string;
  tags?: string[];
  labels?: string[];
  notes?: string;
  noteHistory?: Note[];
  createdAt: string;
  importedAt?: string;
  lastContactDate?: string;
  [key: string]: any; // Allow additional fields
}

export interface PhoneEntry {
  number: string;
  label: string;
  isPrimary: boolean;
}

export interface EmailEntry {
  address: string;
  label: string;
  isPrimary: boolean;
}

export interface Note {
  _id: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Comparable {
  address: string;
  latitude: number;
  longitude: number;
  closePrice: number;
  closeDate: string;
  bedsTotal: number;
  bathroomsTotalDecimal?: number;
  bathroomsFull?: number;
  livingArea: number;
  yearBuilt?: number;
  distance: number;
  standardStatus?: string;
  status?: string;
}

export interface ContactViewPanelProps {
  contact: Contact;
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onMessage: () => void;
  isLight: boolean;
}

export interface LayoutState {
  width: number;
  left: number;
}
