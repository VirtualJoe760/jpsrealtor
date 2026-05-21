# Mobile Contacts Page Optimization - Implementation Plan

## Problem Statement

Current mobile contacts page has several UX issues:
1. **Data overflow** - Contact info extends beyond viewport
2. **No fixed layout** - Header scrolls with content
3. **Poor visual hierarchy** - Background lacks depth
4. **Sorting area cluttered** - Filters/controls poorly organized
5. **Select All placement** - Checkbox location not intuitive
6. **Mobile nav overlap** - Bottom bar covers last items
7. **Information overload** - Too much data for mobile viewport

## Goals

1. ✅ **Fixed header/toolbar** - Only list scrolls
2. ✅ **Translucent blur background** - Frosted glass effect
3. ✅ **Select All in header row** - Aligned with column headers
4. ✅ **Mobile-optimized list items** - Compact, prioritized data
5. ✅ **Crossfade data display** - Rotating info (phone/email/status/tags)
6. ✅ **No bottom bar overlap** - Proper padding
7. ✅ **Better toolbar layout** - Cleaner mobile organization

---

## Implementation Plan

### Phase 1: Page Container & Layout Structure

#### File: `src/app/agent/contacts/page.tsx`

**Changes:**
- Add `h-screen overflow-hidden flex flex-col` to main container
- Ensure header is fixed at top
- Contact list takes remaining height with overflow

**Code:**
```tsx
export default function AgentContactsPage() {
  return (
    <div className="h-screen overflow-hidden flex flex-col md:p-4 md:p-8">
      <div className="max-w-7xl mx-auto w-full h-full flex flex-col pt-16 md:pt-0">
        {/* AgentNav - Fixed */}
        <div className="flex-shrink-0">
          <AgentNav />
        </div>

        {/* Header - Fixed */}
        <div className="flex-shrink-0 mb-4 sm:mb-6 px-4 md:px-0">
          <h1>Contacts</h1>
          <p>Manage your contact database</p>
        </div>

        {/* ContactsTab - Takes remaining height, handles scrolling internally */}
        <div className="flex-1 overflow-hidden">
          <ContactsTab isLight={isLight} />
        </div>
      </div>
    </div>
  );
}
```

---

### Phase 2: ContactsTab Layout Updates

#### File: `src/app/components/crm/ContactsTab.tsx`

**Changes:**
- Update container to `flex flex-col h-full overflow-hidden`
- Toolbar stays fixed at top
- List view gets remaining height with `overflow-y-auto pb-24 md:pb-4`

**Code:**
```tsx
return (
  <div className="flex flex-col h-full overflow-hidden">
    {/* Toolbar - Fixed at top */}
    <div className="flex-shrink-0 px-4 md:px-0 mb-4">
      <ContactToolbar {...props} />
    </div>

    {/* Stats Cards or Contact List - Scrollable */}
    <div className="flex-1 overflow-y-auto px-4 md:px-0">
      {viewMode === ViewMode.CARD && <StatsCardGrid {...} />}
      {viewMode === ViewMode.LIST && (
        <div className="pb-24 md:pb-4"> {/* Bottom padding for mobile nav */}
          <ContactList {...props} />
        </div>
      )}
    </div>

    {/* Modals */}
  </div>
);
```

---

### Phase 3: ContactList - Blur Background & Header Updates

#### File: `src/app/components/crm/contacts/components/ContactCard/ContactList.tsx`

**Changes:**
1. Add translucent blur background to list container
2. Move "Select All" checkbox into header row (inline with column headers)
3. Hide most columns on mobile, show on desktop

**Code:**
```tsx
// List View
return (
  <div className={`rounded-lg overflow-hidden backdrop-blur-md ${
    isLight
      ? 'bg-white/70 border border-gray-200/50'
      : 'bg-gray-900/70 border border-gray-700/50'
  }`}>
    {/* List Header */}
    <div className={`flex items-center gap-2 md:gap-4 px-4 py-3 border-b font-medium text-sm ${
      isLight ? 'bg-gray-50/80 border-gray-200/50 text-gray-700' : 'bg-gray-900/80 border-gray-700/50 text-gray-300'
    }`}>
      {/* Select All Checkbox - MOVED HERE */}
      <input
        type="checkbox"
        checked={areAllSelected}
        onChange={onSelectAll}
        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer flex-shrink-0"
      />

      <div className="w-8" /> {/* Avatar column */}
      <div className="flex-1 md:w-48">Name</div>
      <div className="hidden md:block md:w-32">Status</div>
      <div className="hidden md:block md:flex-1">Contact Info</div>
      <div className="hidden md:block md:w-40">Tags</div>
      <div className="hidden md:block md:w-24">Imported</div>
    </div>

    {/* List Items */}
    {contacts.map((contact) => (
      <ContactListItem {...} />
    ))}
  </div>
);
```

**Props Update:**
```tsx
interface ContactListProps {
  // ... existing props
  areAllSelected: boolean;
  onSelectAll: () => void;
}
```

---

### Phase 4: Mobile-Optimized ContactListItem

#### File: `src/app/components/crm/contacts/components/ContactCard/ContactListItem.tsx`

**Changes:**
1. **Mobile layout** (<768px): Compact 2-column layout
   - Left: Checkbox + Avatar + Name
   - Right: Crossfading info (phone/email/status/tags) - cycles every 3s
2. **Desktop layout** (≥768px): Current full layout
3. Add rotating data display with smooth transitions

**Code Structure:**
```tsx
export function ContactListItem({ contact, isSelected, onSelect, onClick, isLight }) {
  const [mobileDataIndex, setMobileDataIndex] = useState(0);

  // Prepare mobile data array (only available data)
  const mobileData = useMemo(() => {
    const data = [];
    if (hasPhone(contact)) data.push({ type: 'phone', icon: Phone, value: formatPhoneNumber(contact.phone!) });
    if (hasEmail(contact)) data.push({ type: 'email', icon: Mail, value: contact.email! });
    if (contact.status) data.push({ type: 'status', icon: statusConfig.icon, value: statusConfig.label, color: statusConfig.lightColor });
    if (contact.tags?.length) data.push({ type: 'tags', icon: Tag, value: contact.tags.slice(0, 2).join(', ') });
    return data;
  }, [contact]);

  // Auto-rotate mobile data every 3 seconds
  useEffect(() => {
    if (mobileData.length <= 1) return;
    const interval = setInterval(() => {
      setMobileDataIndex((prev) => (prev + 1) % mobileData.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [mobileData.length]);

  const currentMobileData = mobileData[mobileDataIndex];
  const Icon = currentMobileData?.icon;

  return (
    <div className={`flex items-center gap-2 md:gap-4 px-4 py-3 border-b cursor-pointer transition-colors ...`}>
      {/* Checkbox */}
      <input type="checkbox" checked={isSelected} onChange={...} />

      {/* Avatar */}
      <ContactAvatar {...} size="sm" />

      {/* Mobile: Compact Layout */}
      <div className="flex-1 flex items-center justify-between md:hidden">
        {/* Name */}
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{displayName}</p>
          {contact.organization && <p className="text-sm truncate">{contact.organization}</p>}
        </div>

        {/* Crossfading Data */}
        {currentMobileData && (
          <div className="flex items-center gap-2 text-sm opacity-0 animate-fade-in">
            <Icon className="w-4 h-4" />
            <span className="truncate max-w-[120px]">{currentMobileData.value}</span>
          </div>
        )}
      </div>

      {/* Desktop: Full Layout (hidden on mobile) */}
      <div className="hidden md:flex md:items-center md:gap-4 md:flex-1">
        <div className="w-48">{displayName}</div>
        <div className="w-32">{/* Status */}</div>
        <div className="flex-1">{/* Contact Info */}</div>
        <div className="w-40">{/* Tags */}</div>
        <div className="w-24">{/* Days Since */}</div>
      </div>
    </div>
  );
}
```

**CSS (Add to globals or component):**
```css
@keyframes fade-in {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in {
  animation: fade-in 0.5s ease-out forwards;
}
```

---

### Phase 5: ContactToolbar Mobile Optimization

#### File: `src/app/components/crm/contacts/components/ContactToolbar/ContactToolbar.tsx`

**Changes:**
1. Stack filters vertically on mobile
2. Make search bar full-width on mobile
3. Simplify button layout
4. Remove "Select All" UI (moved to ContactList header)

**Key Updates:**
```tsx
// Mobile-first layout
<div className="space-y-3">
  {/* Row 1: Search + View Toggle */}
  <div className="flex gap-2">
    <input className="flex-1" placeholder="Search contacts..." />
    <ViewToggleButtons />
  </div>

  {/* Row 2: Filters (horizontal scroll on mobile) */}
  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
    <SortDropdown />
    <FilterDropdown />
    <AgeFilterDropdown />
  </div>

  {/* Row 3: Actions */}
  <div className="flex gap-2 justify-between">
    <div className="flex gap-2">
      <ImportButton />
      <AddButton />
    </div>
    {hasSelection && <BulkActions />}
  </div>
</div>
```

---

## File Change Summary

| File | Changes | Priority |
|------|---------|----------|
| `src/app/agent/contacts/page.tsx` | Add `h-screen overflow-hidden flex flex-col` container | High |
| `src/app/components/crm/ContactsTab.tsx` | Update to `h-full overflow-hidden`, scrollable list area | High |
| `src/app/components/crm/contacts/components/ContactCard/ContactList.tsx` | Add blur background, move Select All to header, responsive columns | High |
| `src/app/components/crm/contacts/components/ContactCard/ContactListItem.tsx` | Create mobile-optimized layout with crossfading data | High |
| `src/app/components/crm/contacts/components/ContactToolbar/ContactToolbar.tsx` | Improve mobile layout, remove Select All UI | Medium |

---

## Testing Checklist

- [ ] **Mobile (< 768px)**
  - [ ] Header and toolbar stay fixed
  - [ ] Only contact list scrolls
  - [ ] Blur background visible
  - [ ] Select All checkbox in header row
  - [ ] List items show compact layout
  - [ ] Data crossfades every 3 seconds
  - [ ] Bottom padding prevents nav bar overlap
  - [ ] Search and filters work

- [ ] **Tablet (768px - 1024px)**
  - [ ] Transitions smoothly from mobile to desktop layout
  - [ ] All columns visible

- [ ] **Desktop (> 1024px)**
  - [ ] Full list view with all columns
  - [ ] No regressions from current functionality

---

## Implementation Order

1. **Start with page container** (`agent/contacts/page.tsx`) - Establishes layout foundation
2. **Update ContactsTab** - Handles scrolling zones
3. **Update ContactList** - Blur background + header changes
4. **Update ContactListItem** - Mobile-optimized view
5. **Update ContactToolbar** (optional enhancement)

---

## Notes

- **Crossfade timing**: 3 seconds per data item (adjustable via state if needed)
- **Blur fallback**: For browsers without backdrop-filter support, use solid background with slight transparency
- **Performance**: Crossfade animation uses CSS transitions (GPU-accelerated)
- **Accessibility**: Ensure crossfading data is accessible (consider ARIA live regions if needed)
