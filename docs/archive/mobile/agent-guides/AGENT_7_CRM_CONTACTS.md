# Agent 7: CRM & Contacts

**Runs:** Parallel (after Agents 1-3 complete)
**Estimated Time:** 3-4 weeks

---

## Mission

Build the contact management system for React Native — contact list, detail views, add/edit forms, tag/label management, bulk actions, statistics, and import review. This is the agent's core daily tool.

---

## Component Inventory (40-50 components)

### Contact List & Cards

| Component | File | Complexity | Notes |
|---|---|---|---|
| **ContactsTab.tsx** | Main contacts container | HIGH | State management for filtering, sorting, searching. Orchestrates all sub-components. |
| **ContactList.tsx** | List container | MEDIUM | Pagination (50/page). Convert to FlatList with `onEndReached` for infinite scroll. |
| **ContactCard.tsx** | Card view item | LOW | Avatar, name, org, status, quick actions. Standard card layout. |
| **ContactListItem.tsx** | List view item | LOW | Compact row with avatar + name + status. |
| **ContactCardSkeleton.tsx** | Loading state | LOW | Shimmer placeholder. |
| **ContactAvatar.tsx** | Avatar | LOW | Initials or photo. Use base Avatar component from Agent 1. |

### Contact Detail

| Component | Complexity | Notes |
|---|---|---|
| **ContactViewPanel.tsx** | HIGH | Right panel on web → full screen on mobile. Notes, activity, property images, contact info. ScrollView with sections. |
| **ContactDetailPanel.tsx** | MEDIUM | Import review panel with drag-to-close. Convert to bottom sheet or full screen. |
| **ContactBottomPanel.tsx** | LOW | Quick actions bar. |

### Contact Forms

| Component | Complexity | Notes |
|---|---|---|
| **AddContactModal.tsx** | MEDIUM | Form with name, phone, email, address, tags. Convert modal to full screen with KeyboardAvoidingView. |
| **ContactAutocomplete.tsx** | MEDIUM | Search contacts with debouncing. TextInput + FlatList dropdown. |
| **ContactEditModal.tsx** | LOW | Quick edit from messages context. |
| **ContactsModal.tsx** | MEDIUM | Contact picker with search. |

### Tag/Label Management

| Component | Complexity | Notes |
|---|---|---|
| **LabelManagement.tsx** | MEDIUM | Create/edit/archive labels with 18-color picker. Full screen form. |
| **LabelSelector.tsx** | MEDIUM | Multi-select labels for a contact. Checkable list. |
| **LabelCampaignCard.tsx** | LOW | Label info card with campaign CTA. |
| **LabelCampaignGrid.tsx** | LOW | Grid of label cards. FlatList with numColumns. |
| **LabelAnalyticsDashboard.tsx** | MEDIUM | Label performance stats. |

### Toolbar & Filters

| Component | Complexity | Notes |
|---|---|---|
| **ContactToolbar.tsx** | HIGH | Search, view toggle (card/list), sort dropdown, filter dropdown, bulk action buttons, tag filter. Convert to compact mobile toolbar with bottom sheet for filters. |

### Stats Cards

| Component | Complexity | Notes |
|---|---|---|
| **StatsCardGrid.tsx** | LOW | Stats summary (total, by status). Horizontal ScrollView. |
| **StatusCard.tsx** | LOW | Single status count. |
| **TagCard.tsx** | LOW | Tag count. |

### Import Components (Web-Only Recommendation)

These are complex import/CSV workflows. **Recommend keeping web-only**, but basic review can work on mobile:

| Component | Mobile? | Notes |
|---|---|---|
| **ImportAnalysisDashboard.tsx** | No | Data quality analysis — desktop only |
| **ImportConfigPanel.tsx** | No | Column mapping — desktop only |
| **ImportProgress.tsx** | Yes (simplified) | Progress indicator — simple on mobile |
| **PreviewData.tsx** | No | Data preview table — desktop only |
| **ColumnMapper.tsx** | No | Column mapping UI — desktop only |
| **ContactReviewList.tsx** | Yes | Review imported contacts — simple list |
| **ContactReviewSwipe.tsx** | Yes | Swipe to approve/reject — natural mobile pattern |

### Email/Communication Components

These are owned by Agent 6 (Chat & Messaging). Agent 7 provides the contact data integration:

| Component | Owner | Notes |
|---|---|---|
| **EmailInbox.tsx** | Agent 6 | Full inbox |
| **EmailComposer.tsx** | Agent 6 | Compose |
| **MessagingTab.tsx** | Agent 6 | SMS tab |
| **ComposePanel.tsx** | Agent 6 | Email compose |

### Other CRM Components

| Component | Complexity | Notes |
|---|---|---|
| **DropCowboyCampaign.tsx** | MEDIUM | Voicemail campaign from contacts. Shared with Agent 8. |
| **ContactSyncModal.tsx** | LOW | Sync options (Google, CSV, Outlook). Show options, link to web for actual import. |
| **CRMSettings.tsx** | LOW | CRM config panel. |
| **ContactPropertyCarousel.tsx** | MEDIUM | Swiper → horizontal FlatList of property images. |
| **PropertyMap.tsx** | MEDIUM | Contact's property on map. Use react-native-maps (Agent 5). |
| **AIEmailModal.tsx** | LOW | AI email generation — uses API. |

---

## Hooks to Port (12 hooks)

### Contact Hooks (`src/app/components/crm/contacts/hooks/`)

| Hook | Changes Needed |
|---|---|
| **useContacts** | Replace web fetch pattern. Loads ALL contacts (up to 9999). Consider pagination/infinite scroll for mobile to avoid memory issues. |
| **useContactFilters** | Pure state management — works as-is. Remove URL sync if any. |
| **useContactSelection** | Pure Set-based state — works as-is. |
| **useContactStats** | Pure fetch — works as-is. |
| **useContactPersistence** | Replace `sessionStorage` → `AsyncStorage`. |
| **useRestoreContactState** | Replace `sessionStorage` → `AsyncStorage`. |

### Email Hooks (`src/app/components/crm/email-inbox/hooks/`)

These are Agent 6's responsibility, but Agent 7 should be aware:

| Hook | Owner |
|---|---|
| **useEmails** | Agent 6 |
| **useEmailFolder** | Agent 6 |
| **useEmailBulkActions** | Agent 6 |
| **useEmailSearch** | Agent 6 |
| **useEmailMetadata** | Agent 6 |

---

## Key Conversion Challenges

### 1. Contact List Performance

Web loads all contacts at once (up to 9999) and filters client-side. On mobile:

**Option A: Keep client-side filtering** (if contact count < 1000)
- Load all on mount
- Filter/sort in memory
- FlatList handles rendering performance

**Option B: Server-side pagination** (if > 1000 contacts)
- Infinite scroll with `onEndReached`
- Server-side search/filter via API
- More API calls but less memory

**Recommendation:** Start with Option A (matches current behavior), add Option B if performance suffers.

### 2. ContactViewPanel → Full Screen

Web shows a right panel alongside the list. Mobile options:

**Option A: Push navigation**
- Tap contact → navigate to ContactDetailScreen
- Full screen with back button
- Most natural mobile pattern

**Option B: Bottom sheet**
- Tap contact → slide up bottom sheet
- Can peek at list behind
- Good for quick view, bad for detailed editing

**Recommendation:** Option A for detail view, Option B for quick preview.

### 3. Toolbar Complexity

The web toolbar has: search, view toggle, sort, filter, bulk actions, tag filter — all in one bar. On mobile:

```
┌─────────────────────────────────┐
│ [🔍 Search contacts...      ] │  ← Always visible
│ [Sort ▼] [Filter ▼] [≡/▦]   │  ← Compact row
│ [tag1] [tag2] [tag3] →        │  ← Horizontal scroll (if tags selected)
└─────────────────────────────────┘
```

- Sort dropdown → bottom sheet with options
- Filter dropdown → bottom sheet with checkboxes
- Bulk actions → long-press to enter selection mode → FAB with actions

### 4. Bulk Actions (Multi-Select)

Web: checkboxes on each contact. Mobile:

1. **Long-press** any contact to enter selection mode
2. Header changes to show: `✕ 3 selected` + action buttons
3. Tap contacts to toggle selection
4. Actions: Delete, Tag, Export
5. Tap ✕ or back to exit selection mode

### 5. Add Contact Form

Web modal → Full screen form with:
- `KeyboardAvoidingView` wrapping ScrollView
- Sectioned form (Personal, Contact Info, Address, Tags)
- Phone input with auto-formatting (`formatPhone` from shared)
- Address input with autocomplete
- Tag multi-select

### 6. Label Color Picker

Web has 18-color palette in a grid. Mobile:
- 3x6 grid of color circles
- Selected color gets checkmark overlay
- Simple and touch-friendly

---

## Navigation Structure

```
CRMStack (in AgentTabs)
├── ContactList (with toolbar, filters, search)
├── ContactDetail (params: { contactId })
│   ├── Tab: Info
│   ├── Tab: Activity
│   ├── Tab: Notes
│   └── Tab: Properties
├── AddContact
├── EditContact (params: { contactId })
├── LabelManagement
├── LabelDetail (params: { labelId })
└── ImportReview (params: { batchId })
```

---

## API Endpoints Used

### Contact CRUD
| Endpoint | Method | Purpose |
|---|---|---|
| `/api/crm/contacts` | GET | List contacts (search, status, tag, pagination) |
| `/api/crm/contacts` | POST | Create contact |
| `/api/crm/contacts/[id]` | GET | Single contact |
| `/api/crm/contacts/[id]` | PUT | Update contact |
| `/api/crm/contacts/[id]` | DELETE | Delete contact |

### Tags & Labels
| Endpoint | Method | Purpose |
|---|---|---|
| `/api/crm/labels` | GET | List labels with counts |
| `/api/crm/labels` | POST | Create label |
| `/api/crm/labels/[id]` | PUT | Update label |
| `/api/crm/labels/[id]` | DELETE | Archive label |
| `/api/crm/labels/[id]/create-campaign` | POST | Create campaign from label |
| `/api/crm/contacts/tags` | GET | Legacy tag counts |

### Statistics
| Endpoint | Method | Purpose |
|---|---|---|
| `/api/crm/contacts/stats` | GET | Contact counts by status |

### Notes & Media
| Endpoint | Method | Purpose |
|---|---|---|
| `/api/crm/contacts/[id]/notes` | POST | Add note |
| `/api/crm/contacts/[id]/photo` | POST | Upload contact photo |
| `/api/crm/contacts/[id]/property-images` | POST | Upload property images |
| `/api/crm/contacts/[id]/comparables` | GET | Property comparables |

### Search
| Endpoint | Method | Purpose |
|---|---|---|
| `/api/contacts/search` | GET | Full-text search |
| `/api/contacts/find-by-email` | GET | Find by email |

### Enrichment
| Endpoint | Method | Purpose |
|---|---|---|
| `/api/crm/contacts/enrich` | POST | Property data enrichment |

---

## Types from Shared Package

### Contact Types (extracted by Agent 2)

```typescript
// From src/app/components/crm/contacts/types/
interface Contact {
  _id: string;
  userId: string;
  firstName: string;
  lastName: string;
  phone: string;          // Legacy
  email: string;          // Legacy
  phones: IPhone[];       // Structured
  emails: IEmail[];       // Structured
  address: Address;
  organization: string;
  jobTitle: string;
  tags: string[];
  labels: string[];       // Label IDs
  status: ContactStatus;
  interests: ContactInterests;
  preferences: ContactPreferences;
  noteHistory: Note[];
  lastContactDate: Date;
  createdAt: Date;
}

enum ContactStatus {
  UNCONTACTED = 'uncontacted',
  CONTACTED = 'contacted',
  QUALIFIED = 'qualified',
  NURTURING = 'nurturing',
  CLIENT = 'client',
  INACTIVE = 'inactive',
}

enum ContactAge {
  RECENT = 'recent',     // 0-30 days
  OLD = 'old',           // 31-365 days
  ANCIENT = 'ancient',   // 365+ days
}
```

### Utility Functions (from shared)

| Function | Source | Purpose |
|---|---|---|
| `getContactDisplayName` | contactUtils.ts | Full name formatting |
| `getContactInitials` | contactUtils.ts | Avatar initials |
| `formatPhoneNumber` | contactUtils.ts | Display format |
| `hasEmail`, `hasPhone`, `hasAddress` | contactUtils.ts | Data completeness |
| `getDaysSinceImport` | contactUtils.ts | Contact age |
| `getContactAgeCategory` | contactUtils.ts | Age bucket |
| `filterContacts` | filterUtils.ts | Client-side filtering |
| `sortContacts` | sortUtils.ts | Client-side sorting |
| `formatPhone`, `toE164US` | format-input.ts | Phone formatting |

---

## External Dependencies

| Library | Purpose | Replaces |
|---|---|---|
| `@gorhom/bottom-sheet` | Filter/sort panels | Headless UI dropdowns |
| `react-native-image-picker` | Contact photo upload | File input |
| `@react-native-async-storage/async-storage` | Contact state persistence | sessionStorage |
| `react-native-maps` | Property map (Agent 5) | Leaflet map |
| `react-native-fast-image` | Contact/property photos | next/image |

---

## Deliverables Checklist

- [ ] Contact list screen with search, sort, filter
- [ ] Card view and list view toggle
- [ ] Contact detail full screen with tabs (Info, Activity, Notes, Properties)
- [ ] Add contact form with validation
- [ ] Edit contact form
- [ ] Label management (create, edit, color picker, archive)
- [ ] Label selector (multi-select for contacts)
- [ ] Stats cards (total, by status)
- [ ] Bulk selection mode (long-press to enter)
- [ ] Bulk delete and bulk tag actions
- [ ] Contact search with debouncing
- [ ] Quick actions (call, text, email buttons)
- [ ] Notes: add and view history
- [ ] Contact photo upload
- [ ] Property images carousel
- [ ] Property map (mini react-native-maps)
- [ ] Contact enrichment trigger
- [ ] Import review (simplified swipe interface)
- [ ] Pull-to-refresh on contact list
- [ ] Infinite scroll or pagination
- [ ] Skeleton loading states
- [ ] All hooks ported (sessionStorage → AsyncStorage)

---

## Dependencies

| From | What We Need |
|---|---|
| Agent 1 | Base components (Avatar, Card, Badge, Tag, Modal, BottomSheet, SearchBar), navigation, theme |
| Agent 2 | Contact types, enums, formatting utilities, validation |
| Agent 3 | Pre-converted component files |
| Agent 5 | react-native-maps pattern for PropertyMap |
| Agent 6 | Messaging integration (tap phone → open SMS thread) |

| Agent | What They Need From Us |
|---|---|
| Agent 6 | Contact data for SMS (ContactsModal, contact lookup) |
| Agent 8 | ContactSelector component for campaign audience selection |
