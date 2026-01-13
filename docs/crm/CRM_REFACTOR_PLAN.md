# CRM Code Refactor Plan
**Created**: January 13, 2026
**Status**: Planning Phase
**Goal**: Reduce large file sizes (>700 lines) to improve maintainability and code organization

---

## 📊 Executive Summary

This refactor plan addresses **5 files over 700 lines** in the CRM codebase, with a total reduction target of **4,500+ lines** spread across modular, maintainable files.

### Files Requiring Refactoring

| File | Current Lines | Target Lines | Reduction | Priority |
|------|--------------|--------------|-----------|----------|
| ContactViewPanel.tsx | 1,780 | ~350 | **-80%** | 🔴 Critical |
| EmailInbox.tsx | 1,562 | ~350 | **-78%** | 🔴 Critical |
| ContactsTab.tsx | 1,416 | ~350 | **-75%** | 🔴 Critical |
| cms/new/page.tsx | 1,002 | ~300 | **-70%** | 🟡 High |
| cms/edit/[slugId]/page.tsx | 935 | ~300 | **-68%** | 🟡 High |

---

## 🎯 Refactor Principles

1. **Single Responsibility**: Each file/component has one clear purpose
2. **Reusability**: Extract shared components and utilities
3. **Type Safety**: Maintain strict TypeScript throughout
4. **No Breaking Changes**: All existing functionality preserved
5. **Incremental Approach**: Can be done in phases with testing between each
6. **Mobile Optimization**: Maintain responsive design patterns

---

## 📁 Phase 1: ContactViewPanel.tsx (1,780 lines → ~350 lines)

### Current State Analysis
- **Main Issues**: Monolithic component managing contact view, editing, notes, properties, and map
- **Dependencies**: MapLibre, property carousel, image upload
- **State Management**: 15+ useState hooks, complex edit mode logic

### Refactor Strategy

#### 1.1 Extract Type Definitions (~50 lines)
**Create**: `src/app/components/crm/contact-view/types.ts`
```typescript
export interface Contact { ... }
export interface ContactViewPanelProps { ... }
export interface PropertyImage { ... }
export interface Note { ... }
```

#### 1.2 Extract Hooks (~200 lines saved)
**Create**: `src/app/components/crm/contact-view/hooks/`
- `useContactEdit.ts` (~100 lines) - Edit mode, field updates, save logic
- `useContactNotes.ts` (~80 lines) - Notes CRUD operations
- `useContactProperties.ts` (~70 lines) - Property image management
- `useContactSync.ts` (~50 lines) - Real-time updates, optimistic UI

#### 1.3 Extract UI Components (~800 lines saved)
**Create**: `src/app/components/crm/contact-view/`
- `ContactHeader.tsx` (~120 lines) - Photo, name, quick actions
- `ContactInfoSection.tsx` (~150 lines) - Basic contact info display/edit
- `ContactAddressSection.tsx` (~100 lines) - Address display/edit with map
- `ContactBusinessSection.tsx` (~80 lines) - Organization, job title
- `ContactNotesSection.tsx` (~150 lines) - Notes list and editor
- `ContactPropertiesSection.tsx` (~120 lines) - Property images carousel
- `ContactMapView.tsx` (~100 lines) - MapLibre map component
- `ContactEditActions.tsx` (~60 lines) - Edit mode buttons
- `ContactViewActions.tsx` (~80 lines) - View mode quick actions

#### 1.4 Extract Utilities (~100 lines saved)
**Create**: `src/app/components/crm/contact-view/utils/`
- `contactUtils.ts` - Format helpers, validation
- `geocodingUtils.ts` - Address geocoding logic
- `photoUploadUtils.ts` - Image upload/processing

#### 1.5 Refactored Structure
```typescript
// src/app/components/crm/ContactViewPanel.tsx (~350 lines)
'use client';

import { useContactEdit, useContactNotes, useContactProperties } from './contact-view/hooks';
import { ContactHeader, ContactInfoSection, ContactAddressSection, ... } from './contact-view';

export default function ContactViewPanel(props) {
  // Orchestration only - delegates to hooks and components
  const editState = useContactEdit(props.contact);
  const notesState = useContactNotes(props.contact._id);
  const propertiesState = useContactProperties(props.contact._id);

  return (
    <Panel {...layout}>
      <ContactHeader contact={editState.contact} onEdit={editState.toggleEdit} />
      <ContactInfoSection {...editState} />
      <ContactAddressSection {...editState} />
      <ContactBusinessSection {...editState} />
      <ContactNotesSection {...notesState} />
      <ContactPropertiesSection {...propertiesState} />
    </Panel>
  );
}
```

#### 1.6 Testing Checklist
- [ ] Panel open/close animations work
- [ ] Edit mode toggle works
- [ ] All fields save correctly
- [ ] Photo upload works
- [ ] Notes CRUD works
- [ ] Property images load
- [ ] Map renders correctly with marker
- [ ] Mobile responsive layout works
- [ ] Keyboard shortcuts work (if any)
- [ ] Optimistic UI updates work

---

## 📧 Phase 2: EmailInbox.tsx (1,562 lines → ~350 lines)

### Current State Analysis
- **Main Issues**: Combines email list, filtering, sorting, tagging, and compose panel
- **Dependencies**: ComposePanel component, contact metadata
- **State Management**: 20+ useState hooks for emails, filters, selections, tags

### Refactor Strategy

#### 2.1 Extract Type Definitions (~40 lines)
**Create**: `src/app/components/crm/email-inbox/types.ts`
```typescript
export interface Email { ... }
export interface EmailMetadata { ... }
export type FolderType = 'inbox' | 'sent';
export type SentSubfolder = 'all' | 'transactional' | 'marketing';
```

#### 2.2 Extract Hooks (~400 lines saved)
**Create**: `src/app/components/crm/email-inbox/hooks/`
- `useEmails.ts` (~150 lines) - Fetch emails, pagination, refresh
- `useEmailMetadata.ts` (~100 lines) - Metadata CRUD (read, favorite, archive, tags)
- `useEmailFilters.ts` (~80 lines) - Search, sort, filter logic
- `useEmailBulkActions.ts` (~70 lines) - Bulk selection, bulk operations

#### 2.3 Extract UI Components (~600 lines saved)
**Create**: `src/app/components/crm/email-inbox/`
- `EmailFolderSidebar.tsx` (~80 lines) - Folder navigation
- `EmailFilterBar.tsx` (~120 lines) - Search, sort, filter controls
- `EmailList.tsx` (~100 lines) - Email list container
- `EmailListItem.tsx` (~150 lines) - Individual email preview card
- `EmailDetailView.tsx` (~200 lines) - Expanded email view
- `EmailBulkActionsBar.tsx` (~80 lines) - Bulk action buttons
- `EmailTagManager.tsx` (~120 lines) - Tag modal and management
- `EmailSentSubfolders.tsx` (~60 lines) - Sent subfolder tabs

#### 2.4 Extract Utilities (~120 lines saved)
**Create**: `src/app/components/crm/email-inbox/utils/`
- `emailFormatUtils.ts` - Date formatting, truncation
- `emailFilterUtils.ts` - Filter/sort algorithms
- `emailTagUtils.ts` - Tag operations

#### 2.5 Refactored Structure
```typescript
// src/app/components/crm/EmailInbox.tsx (~350 lines)
'use client';

import { useEmails, useEmailMetadata, useEmailFilters, useEmailBulkActions } from './email-inbox/hooks';
import { EmailFolderSidebar, EmailFilterBar, EmailList, ... } from './email-inbox';

export default function EmailInbox({ isLight }) {
  const { emails, loading, refreshEmails } = useEmails();
  const metadata = useEmailMetadata(emails);
  const filters = useEmailFilters();
  const bulkActions = useEmailBulkActions();

  return (
    <div className="flex h-full">
      <EmailFolderSidebar {...filters.folderState} />
      <div className="flex-1">
        <EmailFilterBar {...filters} />
        {bulkActions.hasSelection && <EmailBulkActionsBar {...bulkActions} />}
        <EmailList emails={filters.filteredEmails} metadata={metadata} />
      </div>
    </div>
  );
}
```

#### 2.6 Testing Checklist
- [ ] Email list loads correctly
- [ ] Search functionality works
- [ ] Sort by date/sender/subject works
- [ ] Filters work (unread, favorites, attachments)
- [ ] Tag management works
- [ ] Bulk actions work (mark read, archive, delete)
- [ ] Folder navigation works (inbox, sent, subfolders)
- [ ] Email expand/collapse works
- [ ] Reply and forward work
- [ ] Compose panel opens correctly
- [ ] Contact metadata loads and displays
- [ ] Pagination/infinite scroll works

---

## 👥 Phase 3: ContactsTab.tsx (1,416 lines → ~350 lines)

### Current State Analysis
- **Main Issues**: Combines contact list, search, filters, bulk actions, sync modal, view panel
- **Dependencies**: ContactSyncModal, ContactViewPanel, router
- **State Management**: 15+ useState hooks, complex filtering logic

### Refactor Strategy

#### 3.1 Extract Type Definitions (~50 lines)
**Create**: `src/app/components/crm/contacts-tab/types.ts`
```typescript
export interface Contact { ... }
export interface Tag { ... }
export interface ContactStats { ... }
export interface ContactFilters { ... }
```

#### 3.2 Extract Hooks (~350 lines saved)
**Create**: `src/app/components/crm/contacts-tab/hooks/`
- `useContacts.ts` (~150 lines) - Fetch contacts, pagination, CRUD
- `useContactFilters.ts` (~100 lines) - Search, sort, filter, tag logic
- `useContactBulkActions.ts` (~80 lines) - Bulk selection, bulk delete
- `useContactStats.ts` (~50 lines) - Stats calculation and display

#### 3.3 Extract UI Components (~550 lines saved)
**Create**: `src/app/components/crm/contacts-tab/`
- `ContactsHeader.tsx` (~80 lines) - Stats carousel, add button
- `ContactsFilterBar.tsx` (~150 lines) - Search, sort, filter, view mode controls
- `ContactsGrid.tsx` (~100 lines) - Card view grid layout
- `ContactsList.tsx` (~100 lines) - List view table layout
- `ContactCard.tsx` (~120 lines) - Individual contact card (card view)
- `ContactListItem.tsx` (~100 lines) - Individual contact row (list view)
- `ContactsBulkActionsBar.tsx` (~80 lines) - Bulk action buttons
- `ContactsTagFilter.tsx` (~70 lines) - Tag filter sidebar

#### 3.4 Extract Utilities (~100 lines saved)
**Create**: `src/app/components/crm/contacts-tab/utils/`
- `contactFilterUtils.ts` - Filter/sort algorithms
- `contactFormatUtils.ts` - Display formatting
- `contactExportUtils.ts` - Export to CSV logic

#### 3.5 Refactored Structure
```typescript
// src/app/components/crm/ContactsTab.tsx (~350 lines)
'use client';

import { useContacts, useContactFilters, useContactBulkActions, useContactStats } from './contacts-tab/hooks';
import { ContactsHeader, ContactsFilterBar, ContactsGrid, ContactsList, ... } from './contacts-tab';

export default function ContactsTab({ isLight }) {
  const { contacts, loading, fetchContacts, deleteContact } = useContacts();
  const filters = useContactFilters(contacts);
  const bulkActions = useContactBulkActions(deleteContact);
  const stats = useContactStats(contacts);

  return (
    <>
      <ContactsHeader stats={stats} onAdd={() => setShowAddModal(true)} />
      <ContactsFilterBar {...filters} />
      {bulkActions.hasSelection && <ContactsBulkActionsBar {...bulkActions} />}
      {filters.viewMode === 'card' ? (
        <ContactsGrid contacts={filters.filteredContacts} />
      ) : (
        <ContactsList contacts={filters.filteredContacts} />
      )}
    </>
  );
}
```

#### 3.6 Testing Checklist
- [ ] Contact list loads and displays correctly
- [ ] Search works across all fields
- [ ] Sort options work (A-Z, recent, oldest, etc.)
- [ ] Filters work (no email, no phone, buyers, sellers, etc.)
- [ ] Tag filtering works
- [ ] Status filtering works
- [ ] View mode toggle (card/list) works
- [ ] Card view displays correctly
- [ ] List view displays correctly
- [ ] Pagination/load more works
- [ ] Bulk selection works
- [ ] Bulk delete works
- [ ] Add contact modal opens
- [ ] Sync modal opens and works
- [ ] Contact view panel opens when clicking contact
- [ ] Stats carousel displays correctly
- [ ] Mobile responsive layout works
- [ ] State persistence (sessionStorage) works

---

## 📝 Phase 4: cms/new/page.tsx (1,002 lines → ~300 lines)

### Current State Analysis
- **Main Issues**: Large CMS creation page with editor, preview, and publish logic
- **Dependencies**: TipTap editor, image upload, slug generation
- **State Management**: Complex form state, validation, draft/publish logic

### Refactor Strategy

#### 4.1 Extract Hooks (~250 lines saved)
**Create**: `src/app/agent/cms/new/hooks/`
- `useCMSForm.ts` (~150 lines) - Form state, validation, save
- `useCMSEditor.ts` (~100 lines) - TipTap editor integration

#### 4.2 Extract UI Components (~350 lines saved)
**Create**: `src/app/agent/cms/new/components/`
- `CMSHeader.tsx` (~80 lines) - Title, save/publish buttons
- `CMSMetadataForm.tsx` (~150 lines) - Title, slug, excerpt, SEO fields
- `CMSEditorPanel.tsx` (~120 lines) - TipTap editor wrapper
- `CMSPreviewPanel.tsx` (~100 lines) - Live preview
- `CMSImageUpload.tsx` (~80 lines) - Featured image upload

#### 4.3 Extract Utilities (~100 lines saved)
**Create**: `src/app/agent/cms/new/utils/`
- `slugUtils.ts` - Slug generation and validation
- `validationUtils.ts` - Form validation logic
- `draftUtils.ts` - Auto-save draft logic

#### 4.4 Refactored Structure (~300 lines)
```typescript
// src/app/agent/cms/new/page.tsx (~300 lines)
'use client';

import { useCMSForm, useCMSEditor } from './hooks';
import { CMSHeader, CMSMetadataForm, CMSEditorPanel, CMSPreviewPanel } from './components';

export default function NewCMSPage() {
  const form = useCMSForm();
  const editor = useCMSEditor(form.content);

  return (
    <>
      <CMSHeader {...form} />
      <div className="grid grid-cols-2">
        <div>
          <CMSMetadataForm {...form} />
          <CMSEditorPanel editor={editor} />
        </div>
        <CMSPreviewPanel content={form.content} />
      </div>
    </>
  );
}
```

---

## 📝 Phase 5: cms/edit/[slugId]/page.tsx (935 lines → ~300 lines)

### Current State Analysis
- **Main Issues**: Similar to cms/new but with edit/update logic
- **Dependencies**: Same as cms/new plus fetch existing content

### Refactor Strategy

#### 5.1 Share Components with cms/new
- Reuse hooks and components from Phase 4
- Only create edit-specific hooks/components

#### 5.2 Extract Edit-Specific Hooks (~150 lines saved)
**Create**: `src/app/agent/cms/edit/hooks/`
- `useCMSEdit.ts` (~150 lines) - Fetch existing, update logic

#### 5.3 Refactored Structure (~300 lines)
```typescript
// src/app/agent/cms/edit/[slugId]/page.tsx (~300 lines)
'use client';

import { useCMSEdit } from './hooks/useCMSEdit';
import { useCMSEditor } from '../../new/hooks';
import { CMSHeader, CMSMetadataForm, CMSEditorPanel, CMSPreviewPanel } from '../../new/components';

export default function EditCMSPage({ params }) {
  const edit = useCMSEdit(params.slugId);
  const editor = useCMSEditor(edit.content);

  return (
    <>
      <CMSHeader {...edit} isEdit />
      <div className="grid grid-cols-2">
        <div>
          <CMSMetadataForm {...edit} />
          <CMSEditorPanel editor={editor} />
        </div>
        <CMSPreviewPanel content={edit.content} />
      </div>
    </>
  );
}
```

---

## 🗂️ Final File Structure

```
src/
├── app/
│   ├── agent/
│   │   ├── cms/
│   │   │   ├── new/
│   │   │   │   ├── page.tsx                 (~300 lines) ⬇️ 70% reduction
│   │   │   │   ├── hooks/
│   │   │   │   │   ├── useCMSForm.ts        (~150 lines)
│   │   │   │   │   └── useCMSEditor.ts      (~100 lines)
│   │   │   │   ├── components/
│   │   │   │   │   ├── CMSHeader.tsx        (~80 lines)
│   │   │   │   │   ├── CMSMetadataForm.tsx  (~150 lines)
│   │   │   │   │   ├── CMSEditorPanel.tsx   (~120 lines)
│   │   │   │   │   ├── CMSPreviewPanel.tsx  (~100 lines)
│   │   │   │   │   └── CMSImageUpload.tsx   (~80 lines)
│   │   │   │   └── utils/
│   │   │   │       ├── slugUtils.ts         (~40 lines)
│   │   │   │       ├── validationUtils.ts   (~30 lines)
│   │   │   │       └── draftUtils.ts        (~30 lines)
│   │   │   └── edit/
│   │   │       └── [slugId]/
│   │   │           ├── page.tsx             (~300 lines) ⬇️ 68% reduction
│   │   │           └── hooks/
│   │   │               └── useCMSEdit.ts    (~150 lines)
│   │   │
│   │   └── messages/ (Already refactored - see REFACTOR_COMPLETE.md)
│   │
│   └── components/
│       └── crm/
│           ├── ContactViewPanel.tsx         (~350 lines) ⬇️ 80% reduction
│           ├── EmailInbox.tsx               (~350 lines) ⬇️ 78% reduction
│           ├── ContactsTab.tsx              (~350 lines) ⬇️ 75% reduction
│           │
│           ├── contact-view/
│           │   ├── types.ts                 (~50 lines)
│           │   ├── hooks/
│           │   │   ├── useContactEdit.ts    (~100 lines)
│           │   │   ├── useContactNotes.ts   (~80 lines)
│           │   │   ├── useContactProperties.ts (~70 lines)
│           │   │   └── useContactSync.ts    (~50 lines)
│           │   ├── ContactHeader.tsx        (~120 lines)
│           │   ├── ContactInfoSection.tsx   (~150 lines)
│           │   ├── ContactAddressSection.tsx (~100 lines)
│           │   ├── ContactBusinessSection.tsx (~80 lines)
│           │   ├── ContactNotesSection.tsx  (~150 lines)
│           │   ├── ContactPropertiesSection.tsx (~120 lines)
│           │   ├── ContactMapView.tsx       (~100 lines)
│           │   ├── ContactEditActions.tsx   (~60 lines)
│           │   ├── ContactViewActions.tsx   (~80 lines)
│           │   └── utils/
│           │       ├── contactUtils.ts      (~40 lines)
│           │       ├── geocodingUtils.ts    (~30 lines)
│           │       └── photoUploadUtils.ts  (~30 lines)
│           │
│           ├── email-inbox/
│           │   ├── types.ts                 (~40 lines)
│           │   ├── hooks/
│           │   │   ├── useEmails.ts         (~150 lines)
│           │   │   ├── useEmailMetadata.ts  (~100 lines)
│           │   │   ├── useEmailFilters.ts   (~80 lines)
│           │   │   └── useEmailBulkActions.ts (~70 lines)
│           │   ├── EmailFolderSidebar.tsx   (~80 lines)
│           │   ├── EmailFilterBar.tsx       (~120 lines)
│           │   ├── EmailList.tsx            (~100 lines)
│           │   ├── EmailListItem.tsx        (~150 lines)
│           │   ├── EmailDetailView.tsx      (~200 lines)
│           │   ├── EmailBulkActionsBar.tsx  (~80 lines)
│           │   ├── EmailTagManager.tsx      (~120 lines)
│           │   ├── EmailSentSubfolders.tsx  (~60 lines)
│           │   └── utils/
│           │       ├── emailFormatUtils.ts  (~40 lines)
│           │       ├── emailFilterUtils.ts  (~40 lines)
│           │       └── emailTagUtils.ts     (~40 lines)
│           │
│           └── contacts-tab/
│               ├── types.ts                 (~50 lines)
│               ├── hooks/
│               │   ├── useContacts.ts       (~150 lines)
│               │   ├── useContactFilters.ts (~100 lines)
│               │   ├── useContactBulkActions.ts (~80 lines)
│               │   └── useContactStats.ts   (~50 lines)
│               ├── ContactsHeader.tsx       (~80 lines)
│               ├── ContactsFilterBar.tsx    (~150 lines)
│               ├── ContactsGrid.tsx         (~100 lines)
│               ├── ContactsList.tsx         (~100 lines)
│               ├── ContactCard.tsx          (~120 lines)
│               ├── ContactListItem.tsx      (~100 lines)
│               ├── ContactsBulkActionsBar.tsx (~80 lines)
│               ├── ContactsTagFilter.tsx    (~70 lines)
│               └── utils/
│                   ├── contactFilterUtils.ts (~40 lines)
│                   ├── contactFormatUtils.ts (~30 lines)
│                   └── contactExportUtils.ts (~30 lines)
```

---

## 📋 Implementation Order (Recommended)

### Priority 1: ContactViewPanel.tsx (Most Complex)
**Estimated Time**: 2-3 days
1. Week 1: Extract types, hooks, utilities
2. Week 1: Extract small components (header, actions)
3. Week 2: Extract medium components (info sections)
4. Week 2: Extract large components (map, properties)
5. Week 2: Refactor main file and test

### Priority 2: EmailInbox.tsx (High Usage)
**Estimated Time**: 2-3 days
1. Week 3: Extract types, hooks, utilities
2. Week 3: Extract components (sidebar, filter bar, list items)
3. Week 4: Extract complex components (detail view, tag manager)
4. Week 4: Refactor main file and test

### Priority 3: ContactsTab.tsx (Core Functionality)
**Estimated Time**: 2-3 days
1. Week 5: Extract types, hooks, utilities
2. Week 5: Extract components (header, filter bar, grid/list views)
3. Week 6: Refactor main file and test

### Priority 4: cms/new/page.tsx (Medium Priority)
**Estimated Time**: 1-2 days
1. Week 7: Extract hooks, components, utilities
2. Week 7: Test CMS creation flow

### Priority 5: cms/edit/page.tsx (Depends on Priority 4)
**Estimated Time**: 1 day
1. Week 8: Reuse components from cms/new
2. Week 8: Add edit-specific logic and test

**Total Estimated Time**: 8-10 weeks (working incrementally)

---

## ✅ Success Metrics

### Code Quality
- ✅ All files under 400 lines
- ✅ Average file size under 150 lines
- ✅ No duplicate code across components
- ✅ Clear separation of concerns
- ✅ Consistent naming conventions
- ✅ Full TypeScript type coverage

### Functionality
- ✅ All existing features work correctly
- ✅ No performance degradation
- ✅ Mobile responsiveness maintained
- ✅ All tests passing
- ✅ No TypeScript errors
- ✅ No console warnings

### Developer Experience
- ✅ Easier to find specific features
- ✅ Faster to make changes
- ✅ Easier to review PRs
- ✅ Easier to write tests
- ✅ Better code reusability
- ✅ Clearer component responsibilities

---

## ⚠️ Risks & Mitigation

### Risk 1: Breaking Existing Functionality
**Mitigation**:
- Test thoroughly after each phase
- Use feature flags if needed
- Keep old code commented initially
- Incremental rollout

### Risk 2: State Management Complexity
**Mitigation**:
- Document state flow clearly
- Use React DevTools for debugging
- Consider React Context for deeply nested state
- Add PropTypes or TypeScript strict mode

### Risk 3: Performance Regression
**Mitigation**:
- Use React.memo for expensive components
- Profile with React DevTools Profiler
- Lazy load heavy components
- Optimize re-renders with useMemo/useCallback

### Risk 4: Type Safety Issues
**Mitigation**:
- Run `tsc --noEmit` frequently
- Use strict TypeScript settings
- Define all types explicitly
- Avoid `any` types

---

## 🎉 Benefits After Completion

### Maintainability
- **76% average code reduction** in main files
- Components under 200 lines each
- Clear single responsibilities
- Easy to locate features

### Scalability
- Easy to add new features
- Reusable components across pages
- Consistent patterns
- Better team collaboration

### Performance
- Opportunity for code splitting
- Lazy loading of heavy components
- Optimized re-renders
- Smaller bundle sizes

### Testing
- Unit test individual components
- Mock dependencies easily
- Test hooks in isolation
- Better test coverage

### Developer Experience
- Faster onboarding for new developers
- Easier code reviews
- Less cognitive load
- Better IDE support

---

## 📚 Related Documentation

After refactor completion, update these docs:
- **CRM_OVERVIEW.md** - Update architecture diagrams
- **FRONTEND_ARCHITECTURE.md** - Document new component patterns
- **COMPONENT_LIBRARY.md** - Add new reusable components
- **TESTING_GUIDE.md** - Add testing examples for new structure
- All feature-specific docs (contacts, email, campaigns, etc.)

---

## 📝 Notes

- **Backward Compatibility**: All API routes remain unchanged
- **No Breaking Changes**: Refactor is purely structural
- **Incremental Approach**: Each phase can be a separate PR
- **Type Safety**: Maintain strict TypeScript throughout
- **Mobile First**: Keep responsive design patterns
- **Performance**: No degradation expected, potential improvements

---

**Next Steps**:
1. Review and approve this refactor plan
2. Create GitHub issues for each phase
3. Begin with Phase 1: ContactViewPanel.tsx
4. Test thoroughly after each phase
5. Update documentation as we progress
6. Celebrate when complete! 🎉
