# ContactViewPanel.tsx - Detailed Refactor Plan

**Component:** `src/app/components/crm/ContactViewPanel.tsx`
**Current Size:** 1,780 lines
**Current Hooks:** 24 React hooks
**Target Size:** ~250 lines
**Priority:** 🔴 CRITICAL
**Estimated Time:** 3-4 weeks

---

## Current State Analysis

### Problems Identified

1. **24 React Hooks** - Excessive state management
2. **Multiple Responsibilities** - Notes, status, photos, editing, comparables, maps, drag handling
3. **~18 useState Variables** - Too much local state
4. **~6 useEffect Hooks** - Complex side effects
5. **No Separation of Concerns** - UI and business logic mixed
6. **300+ Lines of Event Handling** - Drag-to-close implementation
7. **Embedded API Calls** - Comparables fetching inline
8. **Complex Data Transformation** - Address parsing, coordinate extraction

### State Variables Breakdown

```typescript
// Tab Navigation (1 variable)
const [activeTab, setActiveTab] = useState<'details' | 'comparables' | 'notes'>('details');

// Layout Management (1 variable)
const [layout, setLayout] = useState({ width: 900, left: 0 });

// Comparables Feature (2 variables)
const [comparables, setComparables] = useState<any[]>([]);
const [loadingComparables, setLoadingComparables] = useState(false);

// Notes Feature (7 variables!)
const [notes, setNotes] = useState<any[]>([]);
const [newNoteContent, setNewNoteContent] = useState('');
const [showNewNoteForm, setShowNewNoteForm] = useState(false);
const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);
const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
const [editNoteContent, setEditNoteContent] = useState('');
const [savingNote, setSavingNote] = useState(false);

// Status Management (3 variables)
const [currentStatus, setCurrentStatus] = useState('uncontacted');
const [isEditingStatus, setIsEditingStatus] = useState(false);
const [updatingStatus, setUpdatingStatus] = useState(false);

// Photo Upload (2 variables)
const [currentPhoto, setCurrentPhoto] = useState('');
const [uploadingPhoto, setUploadingPhoto] = useState(false);

// Contact Info Editing (4 variables)
const [isEditingContactInfo, setIsEditingContactInfo] = useState(false);
const [editedPhones, setEditedPhones] = useState([]);
const [editedEmails, setEditedEmails] = useState([]);
const [savingContactInfo, setSavingContactInfo] = useState(false);
```

**Total: 20+ state variables across 7 distinct features**

---

## Refactoring Strategy

### Phase 1: Types & Interfaces (Day 1)

Create type definitions for all data structures.

**Files to Create:**
```
src/app/components/crm/contact-view/
├── types/
│   ├── index.ts           # Main types export
│   ├── enums.ts          # Tab enum
│   └── interfaces.ts     # Contact, Note, Comparable interfaces
```

**Types to Define:**

```typescript
// enums.ts
export enum ContactViewTab {
  DETAILS = 'details',
  COMPARABLES = 'comparables',
  NOTES = 'notes'
}

// interfaces.ts
export interface ContactNote {
  _id: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  author?: string;
}

export interface ContactComparable {
  _id: string;
  address: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  status: string;
  listDate: string;
  soldDate?: string;
  distance: number;
}

export interface ContactPanelLayout {
  width: number;
  left: number;
}

export interface ContactPhone {
  number: string;
  label: string;
  isPrimary: boolean;
}

export interface ContactEmail {
  address: string;
  label: string;
  isPrimary: boolean;
}
```

---

### Phase 2: Utility Functions (Day 1-2)

Extract pure functions for data manipulation.

**Files to Create:**
```
src/app/components/crm/contact-view/
└── utils/
    ├── index.ts              # Barrel export
    ├── addressUtils.ts       # Address parsing
    ├── coordinateUtils.ts    # Coordinate extraction
    ├── layoutUtils.ts        # Panel width calculations
    └── formatters.ts         # Date, price formatting
```

**Utilities:**

```typescript
// addressUtils.ts
export function getFullAddress(contact: Contact): string {
  if (!contact.address) return '';
  return [
    contact.address.street,
    contact.address.city,
    contact.address.state,
    contact.address.zip
  ]
    .filter(Boolean)
    .join(', ');
}

// coordinateUtils.ts
export function extractCoordinates(contact: any): { lat?: number; lng?: number } {
  const lat = parseFloat(contact.latitude || contact.lat);
  const lng = parseFloat(contact.longitude || contact.long || contact.lng);

  return {
    lat: !isNaN(lat) ? lat : undefined,
    lng: !isNaN(lng) ? lng : undefined
  };
}

export function hasValidCoordinates(contact: any): boolean {
  const { lat, lng } = extractCoordinates(contact);
  return lat !== undefined && lng !== undefined;
}

// layoutUtils.ts
export function getOptimalPanelWidth(): number {
  if (typeof window === 'undefined') return 900;

  const width = window.innerWidth;
  if (width < 640) return width; // Full width on mobile
  if (width < 1024) return Math.min(width - 32, 600); // Tablet
  return Math.min(width - 64, 900); // Desktop
}

export function calculatePanelPosition(width: number): number {
  if (typeof window === 'undefined') return 0;

  const screenWidth = window.innerWidth;
  if (screenWidth < 640) return 0; // No centering on mobile
  return (screenWidth - width) / 2; // Center on larger screens
}

// formatters.ts
export function formatDate(dateString?: string): string {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(price);
}

export function isRentalListing(comp: any): boolean {
  const status = (comp.standardStatus || comp.status || '').toLowerCase();
  return status.includes('lease') || status.includes('rent');
}
```

---

### Phase 3: Custom Hooks (Day 2-5)

Extract state management into focused custom hooks.

**Files to Create:**
```
src/app/components/crm/contact-view/
└── hooks/
    ├── index.ts                    # Barrel export
    ├── useContactNotes.ts          # Notes CRUD (7 states → 1 hook)
    ├── useContactStatus.ts         # Status management (3 states → 1 hook)
    ├── useContactPhoto.ts          # Photo upload (2 states → 1 hook)
    ├── useContactInfoEditor.ts     # Phone/email editing (4 states → 1 hook)
    ├── useComparables.ts           # Market data (2 states → 1 hook)
    ├── usePanelLayout.ts           # Responsive sizing (1 state → 1 hook)
    ├── useDragToClose.ts           # Drag gesture (extract to shared)
    └── useTabNavigation.ts         # Tab state (1 state → 1 hook)
```

#### Hook 1: useContactNotes.ts

**Purpose:** Manage all notes-related state and operations

```typescript
export function useContactNotes(contactId: string, initialNotes: ContactNote[] = []) {
  const [notes, setNotes] = useState<ContactNote[]>(initialNotes);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [showNewNoteForm, setShowNewNoteForm] = useState(false);
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteContent, setEditNoteContent] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const addNote = useCallback(async () => {
    if (!newNoteContent.trim()) return;

    setSavingNote(true);
    try {
      const response = await fetch(`/api/crm/contacts/${contactId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newNoteContent }),
      });

      const data = await response.json();
      if (data.success && data.note) {
        setNotes(prev => [data.note, ...prev]);
        setNewNoteContent('');
        setShowNewNoteForm(false);
      }
    } catch (error) {
      console.error('Failed to add note:', error);
    } finally {
      setSavingNote(false);
    }
  }, [contactId, newNoteContent]);

  const updateNote = useCallback(async (noteId: string, content: string) => {
    setSavingNote(true);
    try {
      const response = await fetch(`/api/crm/contacts/${contactId}/notes/${noteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      const data = await response.json();
      if (data.success && data.note) {
        setNotes(prev => prev.map(n => n._id === noteId ? data.note : n));
        setEditingNoteId(null);
        setEditNoteContent('');
      }
    } catch (error) {
      console.error('Failed to update note:', error);
    } finally {
      setSavingNote(false);
    }
  }, [contactId]);

  const deleteNote = useCallback(async (noteId: string) => {
    if (!confirm('Delete this note?')) return;

    try {
      await fetch(`/api/crm/contacts/${contactId}/notes/${noteId}`, {
        method: 'DELETE',
      });
      setNotes(prev => prev.filter(n => n._id !== noteId));
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  }, [contactId]);

  const toggleExpand = useCallback((noteId: string) => {
    setExpandedNoteId(prev => prev === noteId ? null : noteId);
  }, []);

  const startEditing = useCallback((noteId: string, content: string) => {
    setEditingNoteId(noteId);
    setEditNoteContent(content);
  }, []);

  const cancelEditing = useCallback(() => {
    setEditingNoteId(null);
    setEditNoteContent('');
  }, []);

  return {
    // State
    notes,
    newNoteContent,
    showNewNoteForm,
    expandedNoteId,
    editingNoteId,
    editNoteContent,
    savingNote,

    // Setters
    setNewNoteContent,
    setShowNewNoteForm,
    setEditNoteContent,

    // Actions
    addNote,
    updateNote,
    deleteNote,
    toggleExpand,
    startEditing,
    cancelEditing,
  };
}
```

#### Hook 2: useContactStatus.ts

```typescript
export function useContactStatus(contactId: string, initialStatus: string) {
  const [currentStatus, setCurrentStatus] = useState(initialStatus);
  const [isEditing, setIsEditing] = useState(false);
  const [updating, setUpdating] = useState(false);

  const updateStatus = useCallback(async (newStatus: string) => {
    setUpdating(true);
    try {
      const response = await fetch(`/api/crm/contacts/${contactId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();
      if (data.success) {
        setCurrentStatus(newStatus);
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setUpdating(false);
    }
  }, [contactId]);

  return {
    currentStatus,
    isEditing,
    updating,
    setIsEditing,
    updateStatus,
  };
}
```

#### Hook 3: useContactPhoto.ts

```typescript
export function useContactPhoto(contactId: string, initialPhoto: string) {
  const [currentPhoto, setCurrentPhoto] = useState(initialPhoto);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadPhoto = useCallback(async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);

      const response = await fetch(`/api/crm/contacts/${contactId}/photo`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.success && data.photoUrl) {
        setCurrentPhoto(data.photoUrl);
      }
    } catch (error) {
      console.error('Failed to upload photo:', error);
    } finally {
      setUploading(false);
    }
  }, [contactId]);

  const triggerFileInput = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return {
    currentPhoto,
    uploading,
    fileInputRef,
    uploadPhoto,
    triggerFileInput,
  };
}
```

#### Hook 4: useContactInfoEditor.ts

```typescript
export function useContactInfoEditor(
  contactId: string,
  initialPhones: ContactPhone[],
  initialEmails: ContactEmail[]
) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedPhones, setEditedPhones] = useState(initialPhones);
  const [editedEmails, setEditedEmails] = useState(initialEmails);
  const [saving, setSaving] = useState(false);

  const addPhone = useCallback(() => {
    setEditedPhones(prev => [...prev, { number: '', label: 'mobile', isPrimary: false }]);
  }, []);

  const removePhone = useCallback((index: number) => {
    setEditedPhones(prev => prev.filter((_, i) => i !== index));
  }, []);

  const updatePhone = useCallback((index: number, field: keyof ContactPhone, value: any) => {
    setEditedPhones(prev => prev.map((phone, i) =>
      i === index ? { ...phone, [field]: value } : phone
    ));
  }, []);

  const addEmail = useCallback(() => {
    setEditedEmails(prev => [...prev, { address: '', label: 'personal', isPrimary: false }]);
  }, []);

  const removeEmail = useCallback((index: number) => {
    setEditedEmails(prev => prev.filter((_, i) => i !== index));
  }, []);

  const updateEmail = useCallback((index: number, field: keyof ContactEmail, value: any) => {
    setEditedEmails(prev => prev.map((email, i) =>
      i === index ? { ...email, [field]: value } : email
    ));
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/crm/contacts/${contactId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phones: editedPhones.filter(p => p.number.trim()),
          emails: editedEmails.filter(e => e.address.trim()),
        }),
      });

      const data = await response.json();
      if (data.success) {
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Failed to save contact info:', error);
    } finally {
      setSaving(false);
    }
  }, [contactId, editedPhones, editedEmails]);

  const cancel = useCallback(() => {
    setEditedPhones(initialPhones);
    setEditedEmails(initialEmails);
    setIsEditing(false);
  }, [initialPhones, initialEmails]);

  return {
    isEditing,
    editedPhones,
    editedEmails,
    saving,
    setIsEditing,
    addPhone,
    removePhone,
    updatePhone,
    addEmail,
    removeEmail,
    updateEmail,
    save,
    cancel,
  };
}
```

#### Hook 5: useComparables.ts

```typescript
export function useComparables(
  contactId: string,
  latitude?: number,
  longitude?: number,
  isOpen: boolean = false
) {
  const [comparables, setComparables] = useState<ContactComparable[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
      setComparables([]);
      return;
    }

    const fetchComparables = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/crm/contacts/${contactId}/comparables?latitude=${latitude}&longitude=${longitude}&radius=0.5&limit=10`
        );
        const data = await response.json();

        if (data.success) {
          setComparables(data.comparables || []);
        }
      } catch (error) {
        console.error('Failed to fetch comparables:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchComparables();
  }, [isOpen, latitude, longitude, contactId]);

  return { comparables, loading };
}
```

#### Hook 6: usePanelLayout.ts

```typescript
export function usePanelLayout() {
  const [layout, setLayout] = useState<ContactPanelLayout>({
    width: typeof window !== 'undefined' ? getOptimalPanelWidth() : 900,
    left: 0,
  });

  useEffect(() => {
    const updateLayout = () => {
      const width = getOptimalPanelWidth();
      const left = calculatePanelPosition(width);
      setLayout({ width, left });
    };

    updateLayout();
    window.addEventListener('resize', updateLayout);
    return () => window.removeEventListener('resize', updateLayout);
  }, []);

  return layout;
}
```

#### Hook 7: useDragToClose.ts (Shared)

```typescript
// This should go in: src/app/components/crm/shared/hooks/useDragToClose.ts
export function useDragToClose(onClose: () => void, threshold: number = 150) {
  const panelRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = handleRef.current;
    const panel = panelRef.current;
    if (!handle || !panel) return;

    let startY = 0;
    let currentY = 0;
    let isDragging = false;

    const onDragStart = (e: MouseEvent | TouchEvent) => {
      isDragging = true;
      startY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      currentY = startY;
      panel.style.transition = 'none';
    };

    const onDragMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      currentY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const diff = currentY - startY;

      if (diff > 0) {
        panel.style.transform = `translateY(${diff}px)`;
      }
    };

    const onDragEnd = () => {
      if (!isDragging) return;
      isDragging = false;
      panel.style.transition = 'transform 0.3s ease-out';

      const diff = currentY - startY;
      if (diff > threshold) {
        onClose();
      } else {
        panel.style.transform = 'translateY(0)';
      }
    };

    handle.addEventListener('mousedown', onDragStart);
    handle.addEventListener('touchstart', onDragStart);
    document.addEventListener('mousemove', onDragMove);
    document.addEventListener('touchmove', onDragMove);
    document.addEventListener('mouseup', onDragEnd);
    document.addEventListener('touchend', onDragEnd);

    return () => {
      handle.removeEventListener('mousedown', onDragStart);
      handle.removeEventListener('touchstart', onDragStart);
      document.removeEventListener('mousemove', onDragMove);
      document.removeEventListener('touchmove', onDragMove);
      document.removeEventListener('mouseup', onDragEnd);
      document.removeEventListener('touchend', onDragEnd);
    };
  }, [onClose, threshold]);

  return { panelRef, handleRef };
}
```

#### Hook 8: useTabNavigation.ts

```typescript
export function useTabNavigation(defaultTab: ContactViewTab = ContactViewTab.DETAILS) {
  const [activeTab, setActiveTab] = useState<ContactViewTab>(defaultTab);

  return {
    activeTab,
    setActiveTab,
    isDetailsTab: activeTab === ContactViewTab.DETAILS,
    isComparablesTab: activeTab === ContactViewTab.COMPARABLES,
    isNotesTab: activeTab === ContactViewTab.NOTES,
  };
}
```

---

### Phase 4: UI Components (Day 6-10)

Break down the massive component into focused UI components.

**Files to Create:**
```
src/app/components/crm/contact-view/
└── components/
    ├── index.ts                      # Barrel export
    ├── tabs/
    │   ├── ContactDetailsTab.tsx     # Main details view
    │   ├── ComparablesTab.tsx        # Market activity
    │   ├── NotesTab.tsx              # Notes section
    │   └── TabNavigation.tsx         # Tab switcher
    ├── editors/
    │   ├── ContactStatusEditor.tsx   # Status dropdown
    │   ├── ContactPhotoUploader.tsx  # Photo widget
    │   └── ContactInfoEditor.tsx     # Phone/email editor
    ├── ContactHeader.tsx             # Panel header with close
    ├── ContactAvatar.tsx             # Avatar display
    └── PropertyMap.tsx               # Map component (already exists?)
```

#### Component: ContactHeader.tsx

```typescript
interface ContactHeaderProps {
  contact: Contact;
  currentPhoto: string;
  onClose: () => void;
  onPhotoClick: () => void;
  isLight: boolean;
  dragHandleRef: React.RefObject<HTMLDivElement>;
}

export function ContactHeader({
  contact,
  currentPhoto,
  onClose,
  onPhotoClick,
  isLight,
  dragHandleRef
}: ContactHeaderProps) {
  const displayName = [contact.firstName, contact.lastName]
    .filter(Boolean)
    .join(' ') || 'Unknown Contact';

  return (
    <div className={`sticky top-0 z-10 ${
      isLight ? 'bg-white border-b border-gray-200' : 'bg-gray-900 border-b border-gray-700'
    }`}>
      {/* Drag Handle */}
      <div
        ref={dragHandleRef}
        className="flex justify-center py-2 cursor-grab active:cursor-grabbing"
      >
        <div className={`w-12 h-1 rounded-full ${
          isLight ? 'bg-gray-300' : 'bg-gray-600'
        }`} />
      </div>

      {/* Header Content */}
      <div className="flex items-center gap-4 p-4">
        <ContactAvatar
          photo={currentPhoto}
          name={displayName}
          onClick={onPhotoClick}
          size="lg"
        />

        <div className="flex-1 min-w-0">
          <h2 className={`text-xl font-semibold truncate ${
            isLight ? 'text-gray-900' : 'text-white'
          }`}>
            {displayName}
          </h2>
          {contact.organization && (
            <p className={`text-sm truncate ${
              isLight ? 'text-gray-600' : 'text-gray-400'
            }`}>
              {contact.organization}
            </p>
          )}
        </div>

        <button
          onClick={onClose}
          className={`p-2 rounded-lg transition-colors ${
            isLight
              ? 'hover:bg-gray-100 text-gray-600'
              : 'hover:bg-gray-800 text-gray-400'
          }`}
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
```

#### Component: TabNavigation.tsx

```typescript
interface TabNavigationProps {
  activeTab: ContactViewTab;
  onTabChange: (tab: ContactViewTab) => void;
  notesCount: number;
  comparablesCount: number;
  isLight: boolean;
}

export function TabNavigation({
  activeTab,
  onTabChange,
  notesCount,
  comparablesCount,
  isLight
}: TabNavigationProps) {
  const tabs = [
    { id: ContactViewTab.DETAILS, label: 'Details', icon: User },
    { id: ContactViewTab.COMPARABLES, label: 'Market Activity', icon: TrendingUp, count: comparablesCount },
    { id: ContactViewTab.NOTES, label: 'Notes', icon: FileText, count: notesCount },
  ];

  return (
    <div className={`flex border-b ${
      isLight ? 'border-gray-200' : 'border-gray-700'
    }`}>
      {tabs.map(tab => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              isActive
                ? isLight
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-emerald-400 border-b-2 border-emerald-400'
                : isLight
                  ? 'text-gray-600 hover:text-gray-900'
                  : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Icon className="w-4 h-4" />
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                isActive
                  ? isLight
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-emerald-900 text-emerald-400'
                  : isLight
                    ? 'bg-gray-100 text-gray-600'
                    : 'bg-gray-800 text-gray-400'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
```

#### Component: ContactDetailsTab.tsx

```typescript
interface ContactDetailsTabProps {
  contact: Contact;
  currentStatus: string;
  isEditingStatus: boolean;
  updatingStatus: boolean;
  onStatusEdit: (editing: boolean) => void;
  onStatusUpdate: (status: string) => void;
  contactInfo: {
    phones: ContactPhone[];
    emails: ContactEmail[];
    isEditing: boolean;
    onEdit: () => void;
    onSave: () => void;
    onCancel: () => void;
  };
  isLight: boolean;
}

export function ContactDetailsTab({ ... }: ContactDetailsTabProps) {
  // Render contact details, status editor, contact info editor, address, map
  // This component focuses purely on presentation
}
```

#### Component: NotesTab.tsx

```typescript
interface NotesTabProps {
  notes: ContactNote[];
  newNoteContent: string;
  showNewNoteForm: boolean;
  expandedNoteId: string | null;
  editingNoteId: string | null;
  editNoteContent: string;
  savingNote: boolean;
  onNewNoteChange: (content: string) => void;
  onShowForm: (show: boolean) => void;
  onAddNote: () => void;
  onToggleExpand: (noteId: string) => void;
  onStartEdit: (noteId: string, content: string) => void;
  onUpdateNote: (noteId: string, content: string) => void;
  onCancelEdit: () => void;
  onDeleteNote: (noteId: string) => void;
  isLight: boolean;
}

export function NotesTab({ ... }: NotesTabProps) {
  // Render notes list, new note form, edit forms
}
```

#### Component: ComparablesTab.tsx

```typescript
interface ComparablesTabProps {
  comparables: ContactComparable[];
  loading: boolean;
  contactAddress: string;
  isLight: boolean;
}

export function ComparablesTab({ comparables, loading, contactAddress, isLight }: ComparablesTabProps) {
  if (loading) {
    return <LoadingSpinner />;
  }

  if (comparables.length === 0) {
    return (
      <EmptyState
        icon={TrendingUp}
        message="No recent market activity found nearby"
        isLight={isLight}
      />
    );
  }

  return (
    <div className="space-y-4 p-4">
      {comparables.map(comp => (
        <ComparableCard key={comp._id} comparable={comp} isLight={isLight} />
      ))}
    </div>
  );
}
```

---

### Phase 5: Integration (Day 11-12)

Refactor the main ContactViewPanel component to use the new architecture.

**New ContactViewPanel.tsx structure:**

```typescript
'use client';

import React from 'react';
import { Contact } from '@/types/contact';
import { ContactViewTab } from './types';
import {
  useContactNotes,
  useContactStatus,
  useContactPhoto,
  useContactInfoEditor,
  useComparables,
  usePanelLayout,
  useTabNavigation,
} from './hooks';
import { useDragToClose } from '../shared/hooks/useDragToClose';
import { extractCoordinates, getFullAddress } from './utils';
import {
  ContactHeader,
  TabNavigation,
  ContactDetailsTab,
  ComparablesTab,
  NotesTab,
} from './components';

interface ContactViewPanelProps {
  contact: Contact;
  isOpen: boolean;
  onClose: () => void;
  isLight: boolean;
}

export default function ContactViewPanel({
  contact,
  isOpen,
  onClose,
  isLight
}: ContactViewPanelProps) {
  // Custom hooks - Clean state management
  const { activeTab, setActiveTab } = useTabNavigation();
  const layout = usePanelLayout();
  const { panelRef, handleRef } = useDragToClose(onClose);

  const notesHook = useContactNotes(contact._id, contact.noteHistory);
  const statusHook = useContactStatus(contact._id, contact.status || 'uncontacted');
  const photoHook = useContactPhoto(contact._id, contact.photo || '');

  const contactInfoHook = useContactInfoEditor(
    contact._id,
    contact.phones || [],
    contact.emails || []
  );

  const { lat, lng } = extractCoordinates(contact);
  const comparablesHook = useComparables(contact._id, lat, lng, isOpen);

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={`fixed bottom-0 z-50 rounded-t-2xl shadow-2xl overflow-hidden ${
          isLight ? 'bg-white' : 'bg-gray-900'
        }`}
        style={{
          width: layout.width,
          left: layout.left,
          maxHeight: '90vh',
        }}
      >
        <div className="flex flex-col h-full">
          <ContactHeader
            contact={contact}
            currentPhoto={photoHook.currentPhoto}
            onClose={onClose}
            onPhotoClick={photoHook.triggerFileInput}
            isLight={isLight}
            dragHandleRef={handleRef}
          />

          <TabNavigation
            activeTab={activeTab}
            onTabChange={setActiveTab}
            notesCount={notesHook.notes.length}
            comparablesCount={comparablesHook.comparables.length}
            isLight={isLight}
          />

          <div className="flex-1 overflow-y-auto">
            {activeTab === ContactViewTab.DETAILS && (
              <ContactDetailsTab
                contact={contact}
                currentStatus={statusHook.currentStatus}
                isEditingStatus={statusHook.isEditing}
                updatingStatus={statusHook.updating}
                onStatusEdit={statusHook.setIsEditing}
                onStatusUpdate={statusHook.updateStatus}
                contactInfo={{
                  phones: contactInfoHook.editedPhones,
                  emails: contactInfoHook.editedEmails,
                  isEditing: contactInfoHook.isEditing,
                  onEdit: () => contactInfoHook.setIsEditing(true),
                  onSave: contactInfoHook.save,
                  onCancel: contactInfoHook.cancel,
                }}
                isLight={isLight}
              />
            )}

            {activeTab === ContactViewTab.COMPARABLES && (
              <ComparablesTab
                comparables={comparablesHook.comparables}
                loading={comparablesHook.loading}
                contactAddress={getFullAddress(contact)}
                isLight={isLight}
              />
            )}

            {activeTab === ContactViewTab.NOTES && (
              <NotesTab
                notes={notesHook.notes}
                newNoteContent={notesHook.newNoteContent}
                showNewNoteForm={notesHook.showNewNoteForm}
                expandedNoteId={notesHook.expandedNoteId}
                editingNoteId={notesHook.editingNoteId}
                editNoteContent={notesHook.editNoteContent}
                savingNote={notesHook.savingNote}
                onNewNoteChange={notesHook.setNewNoteContent}
                onShowForm={notesHook.setShowNewNoteForm}
                onAddNote={notesHook.addNote}
                onToggleExpand={notesHook.toggleExpand}
                onStartEdit={notesHook.startEditing}
                onUpdateNote={notesHook.updateNote}
                onCancelEdit={notesHook.cancelEditing}
                onDeleteNote={notesHook.deleteNote}
                isLight={isLight}
              />
            )}
          </div>

          {/* Hidden file input for photo upload */}
          <input
            ref={photoHook.fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) photoHook.uploadPhoto(file);
            }}
          />
        </div>
      </div>
    </>
  );
}
```

**Result:** ~250 lines instead of 1,780 lines!

---

### Phase 6: Testing & Documentation (Day 13-15)

1. **Test each hook in isolation**
2. **Test each component in Storybook or unit tests**
3. **Integration testing**
4. **Update documentation**
5. **Create migration guide**

---

## Success Metrics

### Before Refactor
- ❌ 1,780 lines
- ❌ 24 React hooks
- ❌ 20+ state variables
- ❌ Impossible to test in isolation
- ❌ High coupling between features
- ❌ Complex prop drilling

### After Refactor
- ✅ ~250 lines main component
- ✅ 8 custom hooks
- ✅ 3-4 state variables in main component
- ✅ All hooks testable in isolation
- ✅ Clear separation of concerns
- ✅ Reusable components and hooks

---

## File Structure Summary

```
src/app/components/crm/contact-view/
├── types/
│   ├── index.ts
│   ├── enums.ts
│   └── interfaces.ts
│
├── utils/
│   ├── index.ts
│   ├── addressUtils.ts
│   ├── coordinateUtils.ts
│   ├── layoutUtils.ts
│   └── formatters.ts
│
├── hooks/
│   ├── index.ts
│   ├── useContactNotes.ts
│   ├── useContactStatus.ts
│   ├── useContactPhoto.ts
│   ├── useContactInfoEditor.ts
│   ├── useComparables.ts
│   ├── usePanelLayout.ts
│   └── useTabNavigation.ts
│
├── components/
│   ├── index.ts
│   ├── tabs/
│   │   ├── ContactDetailsTab.tsx
│   │   ├── ComparablesTab.tsx
│   │   ├── NotesTab.tsx
│   │   └── TabNavigation.tsx
│   ├── editors/
│   │   ├── ContactStatusEditor.tsx
│   │   ├── ContactPhotoUploader.tsx
│   │   └── ContactInfoEditor.tsx
│   ├── ContactHeader.tsx
│   └── ContactAvatar.tsx
│
└── ContactViewPanel.tsx (main - ~250 lines)

src/app/components/crm/shared/
└── hooks/
    └── useDragToClose.ts (reusable!)
```

**Total New Files:** ~25 files
**Lines per File:** ~50-150 lines average
**Reusability:** High (hooks and components can be used elsewhere)

---

## Timeline

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| Phase 1: Types | 1 day | Type definitions |
| Phase 2: Utils | 1-2 days | Pure functions |
| Phase 3: Hooks | 3-4 days | 8 custom hooks |
| Phase 4: Components | 4-5 days | UI components |
| Phase 5: Integration | 1-2 days | Refactored main component |
| Phase 6: Testing | 2-3 days | Tests & docs |

**Total:** 12-17 days (3-4 weeks)

---

## Risk Mitigation

1. **Incremental approach** - Refactor one hook at a time
2. **Feature flag** - Keep old component available during transition
3. **Thorough testing** - Test each piece before integration
4. **Code review** - Review each phase before moving forward
5. **Rollback plan** - Keep git history clean for easy rollback
