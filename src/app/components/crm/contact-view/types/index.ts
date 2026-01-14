// Type definitions for ContactViewPanel

// Re-export Contact type from shared contacts module
export type { Contact } from '../../contacts/types';

// Export enums explicitly
export {
  ContactViewTab,
  ContactInfoField,
  ContactPhotoUploadStatus,
  NoteAction,
} from './enums';

// Layout state
export interface PanelLayout {
  width: number;
  dragStartX: number;
  isDragging: boolean;
}

// Contact note
export interface ContactNote {
  _id: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  author?: string;
}

// Contact phone
export interface ContactPhone {
  number: string;
  label: string;
  isPrimary: boolean;
}

// Contact email
export interface ContactEmail {
  address: string;
  label: string;
  isPrimary: boolean;
}

// Comparable property
export interface ContactComparable {
  _id: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  price: number;
  bedrooms?: number;
  bathrooms?: number;
  sqft?: number;
  yearBuilt?: number;
  listDate?: string;
  soldDate?: string;
  status?: string;
  photos?: string[];
}

// ContactViewPanel props
export interface ContactViewPanelProps {
  contact: Contact;
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onMessage: () => void;
  isLight: boolean;
}

// Panel state
export interface ContactViewPanelState {
  layout: PanelLayout;
  currentTab: string;
  comparables: ContactComparable[];
  loadingComparables: boolean;
  notes: ContactNote[];
  currentStatus: string;
  currentPhoto: string;
  isEditingStatus: boolean;
  isEditingContactInfo: boolean;
  editedPhones: ContactPhone[];
  editedEmails: ContactEmail[];
}
