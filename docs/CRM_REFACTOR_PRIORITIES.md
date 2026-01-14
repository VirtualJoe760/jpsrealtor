# CRM Ecosystem - Refactoring Priority Report

**Status:** Analysis Complete
**Last Updated:** 2026-01-13
**Scope:** 7 Major Components Analyzed

---

## Executive Summary

The CRM ecosystem contains **7 major components** totaling **8,836 lines of code**. Three components are critically large and require immediate refactoring:

- **ContactViewPanel.tsx**: 1,780 lines (24 hooks)
- **EmailInbox.tsx**: 1,562 lines (27 hooks)
- **ContactsTab.tsx**: 1,416 lines (16 hooks) - **REFACTOR IN PROGRESS**

The remaining components are also candidates for improvement but are less urgent:
- **ColumnMapper.tsx**: 944 lines (3 hooks)
- **ContactSyncModal.tsx**: 783 lines (7 hooks)
- **ComposePanel.tsx**: 730 lines (18 hooks)
- **ContactDetailPanel.tsx**: 621 lines (6 hooks)

---

## Component Analysis Matrix

| Component | Lines | Hooks | Priority | Complexity | Impact | Status |
|-----------|-------|-------|----------|------------|--------|--------|
| **ContactViewPanel.tsx** | 1,780 | 24 | 🔴 CRITICAL | Very High | High | Not Started |
| **EmailInbox.tsx** | 1,562 | 27 | 🔴 CRITICAL | Very High | High | Not Started |
| **ContactsTab.tsx** | 1,416 | 16 | 🟡 HIGH | High | High | ✅ Phase 1-3 Complete |
| **ColumnMapper.tsx** | 944 | 3 | 🟢 MEDIUM | Medium | Medium | Not Started |
| **ContactSyncModal.tsx** | 783 | 7 | 🟢 MEDIUM | Medium | High | Not Started |
| **ComposePanel.tsx** | 730 | 18 | 🟡 HIGH | High | Medium | Not Started |
| **ContactDetailPanel.tsx** | 621 | 6 | 🟢 LOW | Low | Low | Not Started |

**Total Lines of Code:** 8,836
**Average Component Size:** 1,262 lines
**Target Size (Healthy):** ~300 lines per component
**Refactoring Needed:** ~77% reduction

---

## Priority Tier Breakdown

### 🔴 Tier 1: CRITICAL (Immediate Refactoring Required)

#### 1. ContactViewPanel.tsx - 1,780 lines
**File:** `src/app/components/crm/ContactViewPanel.tsx`

**Issues Identified:**
- ❌ **24 React hooks** (useState: ~18, useEffect: ~6)
- ❌ **Multiple responsibilities**: Notes, status, photos, contact info editing, comparables, maps
- ❌ **Complex drag-to-close implementation** (~60 lines of event handling)
- ❌ **Embedded business logic** (address parsing, coordinate extraction, market data fetching)
- ❌ **State management chaos** (16+ state variables)
- ❌ **No separation between UI and logic**

**State Variables Found:**
```typescript
// Tab state
const [activeTab, setActiveTab] = useState<'details' | 'comparables' | 'notes'>('details');

// Layout state
const [layout, setLayout] = useState({ width: 900, left: 0 });

// Comparables state
const [comparables, setComparables] = useState<any[]>([]);
const [loadingComparables, setLoadingComparables] = useState(false);

// Notes state (6 variables!)
const [notes, setNotes] = useState<any[]>([]);
const [newNoteContent, setNewNoteContent] = useState('');
const [showNewNoteForm, setShowNewNoteForm] = useState(false);
const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);
const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
const [editNoteContent, setEditNoteContent] = useState('');
const [savingNote, setSavingNote] = useState(false);

// Status state
const [currentStatus, setCurrentStatus] = useState('uncontacted');
const [isEditingStatus, setIsEditingStatus] = useState(false);
const [updatingStatus, setUpdatingStatus] = useState(false);

// Photo state
const [currentPhoto, setCurrentPhoto] = useState('');
const [uploadingPhoto, setUploadingPhoto] = useState(false);

// Contact editing state
const [isEditingContactInfo, setIsEditingContactInfo] = useState(false);
const [editedPhones, setEditedPhones] = useState([]);
const [editedEmails, setEditedEmails] = useState([]);
const [savingContactInfo, setSavingContactInfo] = useState(false);
```

**Refactoring Plan:**

**Phase 1: Extract Custom Hooks**
- `useContactNotes()` - Notes CRUD operations (7 state variables → 1 hook)
- `useContactStatus()` - Status management (3 state variables → 1 hook)
- `useContactPhoto()` - Photo upload/management (2 state variables → 1 hook)
- `useContactInfoEditor()` - Phone/email editing (4 state variables → 1 hook)
- `useComparables()` - Market data fetching (2 state variables → 1 hook)
- `usePanelLayout()` - Responsive panel sizing (1 state variable → 1 hook)
- `useDragToClose()` - Drag gesture handling (extract to custom hook)

**Phase 2: Extract UI Components**
- `ContactDetailsTab.tsx` - Contact information display
- `ComparablesTab.tsx` - Market activity/comparables
- `NotesTab.tsx` - Notes section with CRUD
- `ContactStatusEditor.tsx` - Status change dropdown
- `ContactPhotoUploader.tsx` - Photo upload widget
- `ContactInfoEditor.tsx` - Phone/email inline editor
- `TabNavigation.tsx` - Tab switcher component

**Phase 3: Extract Utilities**
- `contactUtils.ts` - Address parsing, coordinate extraction
- `formatUtils.ts` - Date formatting, display name generation
- `validationUtils.ts` - Phone/email validation

**Estimated Impact:**
- 1,780 lines → ~250 lines main component
- 18 state variables → 3-4 state variables
- 24 hooks → 8-10 custom hooks
- Better testability, reusability, maintainability

---

#### 2. EmailInbox.tsx - 1,562 lines
**File:** `src/app/components/crm/EmailInbox.tsx`

**Issues Identified:**
- ❌ **27 React hooks** (highest in codebase!)
- ❌ **Complex state management**: emails, metadata, folders, subfolders, filters, selection
- ❌ **Multiple data sources**: Email API + metadata API
- ❌ **Bulk operations logic** embedded in component
- ❌ **No separation of concerns**
- ❌ **Inline email rendering logic**

**State Variables Found:**
```typescript
// Email data
const [emails, setEmails] = useState<Email[]>([]);
const [emailMetadata, setEmailMetadata] = useState<Record<string, EmailMetadata>>({});
const [expandedEmailId, setExpandedEmailId] = useState<string | null>(null);
const [expandedEmailContent, setExpandedEmailContent] = useState<Record<string, EmailContent>>({});

// Loading states
const [loading, setLoading] = useState(true);
const [loadingEmail, setLoadingEmail] = useState<string | null>(null);
const [error, setError] = useState<string | null>(null);

// Folder/filter state
const [activeFolder, setActiveFolder] = useState<'inbox' | 'sent'>('inbox');
const [sentSubfolder, setSentSubfolder] = useState('all');
const [limit, setLimit] = useState(50);

// Selection state
const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
const [showBulkActions, setShowBulkActions] = useState(false);

// UI state
const [searchQuery, setSearchQuery] = useState('');
const [sortBy, setSortBy] = useState<'date' | 'sender'>('date');
const [showFilters, setShowFilters] = useState(false);
```

**Refactoring Plan:**

**Phase 1: Extract Custom Hooks**
- `useEmails()` - Email fetching and pagination
- `useEmailMetadata()` - Metadata fetching and updates
- `useEmailExpansion()` - Expand/collapse and content loading
- `useEmailSelection()` - Bulk selection logic
- `useEmailFilters()` - Search, sort, folder filtering
- `useEmailFolders()` - Folder/subfolder navigation

**Phase 2: Extract UI Components**
- `EmailList.tsx` - Email list view
- `EmailItem.tsx` - Individual email card
- `EmailDetailView.tsx` - Expanded email content
- `EmailFolderTabs.tsx` - Inbox/Sent tabs
- `SentSubfolderNav.tsx` - Sent email subfolders
- `EmailToolbar.tsx` - Search, filters, sort, bulk actions
- `BulkActionsBar.tsx` - Bulk operation buttons

**Phase 3: Extract Services**
- `emailService.ts` - API calls (fetch emails, fetch content, update metadata)
- `emailFormatters.ts` - Date formatting, preview generation, sender extraction
- `emailFilters.ts` - Filter and sort logic

**Estimated Impact:**
- 1,562 lines → ~300 lines main component
- 16+ state variables → 4-5 state variables
- 27 hooks → 6-8 custom hooks
- Clear separation of concerns

---

### 🟡 Tier 2: HIGH (Should Refactor Soon)

#### 3. ContactsTab.tsx - 1,416 lines ✅ REFACTOR IN PROGRESS
**File:** `src/app/components/crm/ContactsTab.tsx`

**Status:** Phase 1-3 Complete (Types, Hooks, UI Components)

**Completed:**
- ✅ Types & enums extracted
- ✅ 5 custom hooks created
- ✅ Utility functions extracted
- ✅ StatsCards components created
- ✅ ContactToolbar created

**Remaining Work:**
- ⏳ Phase 4: ContactCard components
- ⏳ Phase 5: Integration and cleanup
- ⏳ Phase 6: Testing and documentation

**Progress:** ~60% Complete
**Reference:** See `docs/CONTACTSTAB_REFACTOR_PLAN.md` and `docs/CONTACTSTAB_REFACTOR_PROGRESS.md`

---

#### 4. ComposePanel.tsx - 730 lines
**File:** `src/app/components/crm/ComposePanel.tsx`

**Issues Identified:**
- ❌ **18 React hooks**
- ❌ **Rich text editor embedded** in component
- ❌ **Template system logic** mixed with UI
- ❌ **AI generation modal** embedded
- ❌ **File attachment handling** embedded
- ❌ **Reply/Forward logic** embedded

**State Variables Found:**
```typescript
// Email fields
const [to, setTo] = useState('');
const [cc, setCc] = useState('');
const [bcc, setBcc] = useState('');
const [subject, setSubject] = useState('');
const [message, setMessage] = useState('');

// UI state
const [showCc, setShowCc] = useState(false);
const [showBcc, setShowBcc] = useState(false);
const [isMinimized, setIsMinimized] = useState(false);
const [isMaximized, setIsMaximized] = useState(false);

// Attachments
const [attachments, setAttachments] = useState<File[]>([]);

// Send state
const [sending, setSending] = useState(false);
const [error, setError] = useState<string | null>(null);
const [success, setSuccess] = useState(false);

// Link modal
const [showLinkModal, setShowLinkModal] = useState(false);
const [linkUrl, setLinkUrl] = useState('');
const [linkText, setLinkText] = useState('');

// Templates
const [showTemplates, setShowTemplates] = useState(false);

// Formatting
const [currentFont, setCurrentFont] = useState('Arial');
const [currentFontSize, setCurrentFontSize] = useState('14px');
const [currentColor, setCurrentColor] = useState('#000000');

// AI
const [showAIModal, setShowAIModal] = useState(false);
const [aiPrompt, setAiPrompt] = useState('');
const [aiGenerating, setAiGenerating] = useState(false);
```

**Refactoring Plan:**

**Phase 1: Extract Custom Hooks**
- `useEmailCompose()` - Email field state (to, cc, bcc, subject, message)
- `useEmailAttachments()` - File attachment handling
- `useEmailTemplates()` - Template selection and application
- `useRichTextEditor()` - Rich text formatting state
- `useAIEmailGeneration()` - AI generation modal and logic

**Phase 2: Extract UI Components**
- `RichTextEditor.tsx` - Reusable rich text editor with toolbar
- `EmailTemplateSelector.tsx` - Template picker modal
- `AIEmailGenerator.tsx` - AI prompt modal
- `AttachmentList.tsx` - File attachment display
- `EmailRecipientFields.tsx` - To/CC/BCC inputs
- `LinkInsertModal.tsx` - Link insertion dialog

**Phase 3: Extract Constants**
- `emailTemplates.ts` - All email templates
- `editorCommands.ts` - Rich text formatting commands

**Estimated Impact:**
- 730 lines → ~200 lines main component
- 18 hooks → 5-6 custom hooks
- Better reusability (RichTextEditor can be used elsewhere)

---

### 🟢 Tier 3: MEDIUM (Can Wait)

#### 5. ColumnMapper.tsx - 944 lines
**File:** `src/app/components/crm/ColumnMapper.tsx`

**Issues Identified:**
- ⚠️ **944 lines** but only **3 hooks** (good!)
- ⚠️ **Large constant array** (TARGET_FIELDS - 86 items)
- ⚠️ **Complex contact data cleaning logic** embedded
- ⚠️ **Name splitting logic** could be extracted

**State Variables:**
```typescript
const [editingField, setEditingField] = useState<string | null>(null);
const [viewMode, setViewMode] = useState<'preview' | 'list'>('preview');
const [searchQuery, setSearchQuery] = useState('');
```

**Refactoring Plan:**

**Phase 1: Extract Constants**
- `contactFields.ts` - TARGET_FIELDS constant
- `fieldCategories.ts` - Categorize fields (contact, address, property, etc.)

**Phase 2: Extract Utilities**
- `contactDataCleaner.ts` - Contact data cleaning logic
- `nameSplitter.ts` - Smart name splitting logic
- `fieldMatcher.ts` - CSV column to field matching

**Phase 3: Extract Components**
- `FieldMappingRow.tsx` - Single mapping row
- `FieldSelector.tsx` - Field dropdown selector
- `MappingPreview.tsx` - Preview section

**Estimated Impact:**
- 944 lines → ~300 lines main component
- Better organization
- Reusable utilities

**Priority:** Medium (less urgent due to low hook count)

---

#### 6. ContactSyncModal.tsx - 783 lines
**File:** `src/app/components/crm/ContactSyncModal.tsx`

**Issues Identified:**
- ⚠️ **Multi-step wizard** logic embedded
- ⚠️ **Import progress polling** mixed with component
- ⚠️ **File upload handling** embedded
- ⚠️ **7 hooks** but manageable

**State Variables:**
```typescript
// Wizard
const [currentStep, setCurrentStep] = useState<WizardStep>('upload');
const [quickImport, setQuickImport] = useState(false);

// File
const [uploadedFile, setUploadedFile] = useState<File | null>(null);
const [selectedProvider, setSelectedProvider] = useState<Provider>(null);
const [contactLabel, setContactLabel] = useState<string>('');

// Preview
const [previewData, setPreviewData] = useState<PreviewDataProps | null>(null);
const [detectedProvider, setDetectedProvider] = useState<string | null>(null);
const [recommendations, setRecommendations] = useState<string[]>([]);

// Mapping
const [mappings, setMappings] = useState<ColumnMapping[]>([]);

// Review
const [reviewContacts, setReviewContacts] = useState<ReviewContact[]>([]);
const [reviewDecisions, setReviewDecisions] = useState<Map<number, 'keep' | 'skip'>>(new Map());
const [editedContacts, setEditedContacts] = useState<Map<number, any>>(new Map());

// Import
const [importProgress, setImportProgress] = useState<ImportProgressData | null>(null);
const [batchId, setBatchId] = useState<string | null>(null);
const [processing, setProcessing] = useState(false);
```

**Refactoring Plan:**

**Phase 1: Extract Custom Hooks**
- `useWizardSteps()` - Wizard navigation
- `useFileUpload()` - File selection and upload
- `useImportProgress()` - Polling and progress tracking
- `useContactReview()` - Review decisions and editing

**Phase 2: Extract Wizard Step Components**
- `UploadStep.tsx` - File upload step
- `MappingStep.tsx` - Column mapping step
- `ReviewStep.tsx` - Contact review step
- `ImportingStep.tsx` - Progress display step
- `ResultsStep.tsx` - Import results step

**Phase 3: Extract Services**
- `importService.ts` - API calls for import
- `providerDetection.ts` - CSV provider detection

**Estimated Impact:**
- 783 lines → ~250 lines main component
- Clear wizard step separation
- Better testability

**Priority:** Medium (important feature but not critically large)

---

### 🟢 Tier 4: LOW (Minimal Refactoring Needed)

#### 7. ContactDetailPanel.tsx - 621 lines
**File:** `src/app/components/crm/ContactDetailPanel.tsx`

**Issues Identified:**
- ✅ Only **6 hooks** (healthy!)
- ✅ Relatively focused responsibility
- ⚠️ Drag-to-close logic could be extracted
- ⚠️ Could extract map component logic

**State Variables:**
```typescript
const [isEditing, setIsEditing] = useState(false);
const [editedData, setEditedData] = useState(contact.data);
```

**Refactoring Plan:**

**Minor Improvements:**
- Extract `useDragToClose()` hook (reusable across panels)
- Extract `useContactEditing()` hook for edit mode
- Extract `ContactInfoDisplay.tsx` component
- Extract `ContactMapView.tsx` component

**Estimated Impact:**
- 621 lines → ~400 lines
- Modest improvement

**Priority:** Low (already relatively clean)

---

## Refactoring Roadmap

### Recommended Order

```
Phase 1: Complete ContactsTab (2-3 weeks)
  ├── Finish Phase 4: ContactCard components
  ├── Phase 5: Integration
  └── Phase 6: Testing & documentation

Phase 2: Refactor ContactViewPanel (3-4 weeks)
  ├── Most complex component (24 hooks)
  ├── High impact on UX
  └── Apply learnings from ContactsTab refactor

Phase 3: Refactor EmailInbox (3-4 weeks)
  ├── Second most complex (27 hooks)
  ├── Critical business feature
  └── Reuse patterns from previous refactors

Phase 4: Refactor ComposePanel (2 weeks)
  ├── Extract RichTextEditor (reusable!)
  ├── Extract templates
  └── Clean AI integration

Phase 5: Minor Refactors (2 weeks)
  ├── ColumnMapper
  ├── ContactSyncModal
  └── ContactDetailPanel
```

**Total Estimated Time:** 12-15 weeks (3-4 months)

---

## Shared Patterns & Opportunities

### Reusable Hooks to Extract

These hooks appear in multiple components and should be extracted to a shared location:

1. **`useDragToClose()`** - Used in:
   - ContactViewPanel.tsx
   - ContactDetailPanel.tsx
   - Potentially other modals

2. **`useKeyboardShortcuts()`** - Escape key handling appears in:
   - ContactViewPanel.tsx
   - ContactDetailPanel.tsx
   - ContactSyncModal.tsx

3. **`useInfiniteScroll()`** - Pagination logic in:
   - ContactsTab.tsx (already extracted in useContacts)
   - EmailInbox.tsx (needs extraction)

4. **`useBulkSelection()`** - Multi-select logic in:
   - ContactsTab.tsx (already extracted as useContactSelection)
   - EmailInbox.tsx (embedded, needs extraction)

### Reusable Components to Extract

1. **`RichTextEditor.tsx`**
   - Currently embedded in ComposePanel
   - Could be used for email templates, notes, etc.

2. **`FileUploader.tsx`**
   - Used in ContactSyncModal
   - Could be used for attachments, imports, etc.

3. **`SearchBar.tsx`**
   - Pattern repeated in ContactsTab, EmailInbox, ColumnMapper
   - Should be a shared component

4. **`FilterDropdown.tsx`**
   - Pattern repeated across multiple components
   - Should be standardized

---

## Success Metrics

### Code Quality Metrics

**Before Refactoring:**
- Average component size: 1,262 lines
- Total hooks per component: 14.4 average
- Code duplication: High
- Test coverage: Low
- Type safety: Medium

**After Refactoring (Target):**
- Average component size: ~300 lines (76% reduction)
- Total hooks per component: ~5 average (65% reduction)
- Code duplication: Minimal
- Test coverage: >70%
- Type safety: High

### Developer Experience Metrics

**Goals:**
- ✅ Find and fix bugs faster (isolated components)
- ✅ Add new features easier (clear separation)
- ✅ Onboard new developers faster (self-documenting code)
- ✅ Test components in isolation
- ✅ Reuse components across features

---

## Architecture Principles

Apply these principles across all refactors:

### 1. Single Responsibility Principle
Each component/hook should have ONE clear purpose.

### 2. Separation of Concerns
- **UI Components**: Presentation only
- **Custom Hooks**: Business logic + state
- **Utilities**: Pure functions, no side effects
- **Services**: API calls, external interactions

### 3. Composition Over Inheritance
Build complex UIs from simple, composable components.

### 4. Type Safety First
- Use TypeScript enums instead of magic strings
- Define clear interfaces
- No `any` types without justification

### 5. Performance Optimization
- Use `useMemo` for expensive computations
- Use `useCallback` for stable function references
- Implement virtualization for long lists
- Lazy load heavy components

### 6. Testability
- Pure functions for all utilities
- Isolated hooks for testing
- Mock-friendly service layer

---

## Next Steps

1. **Review this analysis** with the team
2. **Prioritize components** based on business needs
3. **Complete ContactsTab refactor** (already 60% done)
4. **Start ContactViewPanel refactor** (highest priority)
5. **Create refactor plans** for EmailInbox and ComposePanel
6. **Extract shared hooks and components** as opportunities arise

---

## Appendix: File Structure (Proposed)

```
src/app/components/crm/
│
├── contacts/
│   ├── types/
│   ├── hooks/
│   ├── utils/
│   ├── components/
│   └── ContactsTab.tsx ✅ (refactored)
│
├── contact-view/
│   ├── types/
│   ├── hooks/
│   │   ├── useContactNotes.ts
│   │   ├── useContactStatus.ts
│   │   ├── useContactPhoto.ts
│   │   ├── useContactInfoEditor.ts
│   │   ├── useComparables.ts
│   │   └── usePanelLayout.ts
│   ├── components/
│   │   ├── ContactDetailsTab.tsx
│   │   ├── ComparablesTab.tsx
│   │   ├── NotesTab.tsx
│   │   ├── ContactStatusEditor.tsx
│   │   ├── ContactPhotoUploader.tsx
│   │   └── ContactInfoEditor.tsx
│   └── ContactViewPanel.tsx (main)
│
├── email/
│   ├── inbox/
│   │   ├── types/
│   │   ├── hooks/
│   │   │   ├── useEmails.ts
│   │   │   ├── useEmailMetadata.ts
│   │   │   ├── useEmailExpansion.ts
│   │   │   ├── useEmailSelection.ts
│   │   │   └── useEmailFilters.ts
│   │   ├── components/
│   │   │   ├── EmailList.tsx
│   │   │   ├── EmailItem.tsx
│   │   │   ├── EmailDetailView.tsx
│   │   │   └── EmailToolbar.tsx
│   │   └── EmailInbox.tsx (main)
│   │
│   └── compose/
│       ├── hooks/
│       │   ├── useEmailCompose.ts
│       │   ├── useRichTextEditor.ts
│       │   └── useEmailTemplates.ts
│       ├── components/
│       │   ├── RichTextEditor.tsx
│       │   ├── EmailTemplateSelector.tsx
│       │   └── AIEmailGenerator.tsx
│       └── ComposePanel.tsx (main)
│
├── import/
│   ├── hooks/
│   ├── components/
│   │   ├── UploadStep.tsx
│   │   ├── MappingStep.tsx
│   │   ├── ReviewStep.tsx
│   │   └── ResultsStep.tsx
│   ├── ColumnMapper.tsx
│   └── ContactSyncModal.tsx
│
└── shared/
    ├── hooks/
    │   ├── useDragToClose.ts
    │   ├── useKeyboardShortcuts.ts
    │   └── useBulkSelection.ts
    ├── components/
    │   ├── SearchBar.tsx
    │   ├── FilterDropdown.tsx
    │   └── FileUploader.tsx
    └── utils/
        ├── formatters.ts
        └── validators.ts
```

---

**Document Prepared By:** Claude Code
**Analysis Scope:** 7 Components, 8,836 Lines of Code
**Recommendations:** 3 Critical, 2 High, 2 Medium, 1 Low Priority
