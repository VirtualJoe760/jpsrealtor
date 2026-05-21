# CRM Mobile Refactor Plan

**Date**: January 10, 2026
**Status**: Planning Phase

---

## Executive Summary

Restructure the CRM section from a tab-based dashboard to separate, mobile-first pages with improved navigation flow and touch-friendly interactions.

---

## Current Structure Issues

### Navigation
- **Current**: `/agent/crm` with tabs for Contacts and Email Inbox
- **Problem**: Tab navigation not ideal for mobile (small touch targets, horizontal scrolling)
- **Impact**: Poor mobile UX, difficult navigation

### Messages Page
- **Current**: Conversations list stacked above message thread
- **Problem**: Requires endless scrolling, no clear back navigation
- **Impact**: Confusing user flow, hard to switch conversations

### Visual Issues
1. Hamburger menu too small for touch
2. H1 elements have excessive top margin (left-aligned)
3. Contacts button needs mobile-specific design
4. No transition animations between views

---

## Proposed New Structure

### Navigation Changes

```
BEFORE:
/agent/crm (tabs: Contacts | Email Inbox)

AFTER:
/agent/contacts (standalone page)
/agent/email (standalone page)
/agent/messages (already exists, needs mobile improvements)
```

### AgentNav Updates

**Desktop** (unchanged):
- Dashboard
- Contacts (new)
- Messages
- Email (new)
- Campaigns
- CMS
- Applications (team leaders only)
- Team (team leaders only)

**Mobile**:
- Same items in hamburger dropdown
- Larger hamburger icon (w-7 h-7 instead of w-6 h-6)
- Remove "CRM" nav item entirely

---

## Implementation Phases

### Phase 1: Quick Wins (Immediate)
**Estimated Time**: 30 minutes

1. **Increase hamburger menu size**
   - File: `src/app/components/AgentNav.tsx`
   - Change: `w-6 h-6` → `w-7 h-7`

2. **Reduce H1 top margins**
   - Files: All agent pages
   - Change: `mb-6 sm:mb-8` → `mb-4 sm:mb-6`
   - Remove excessive `pt-6` or `py-6` on page containers

3. **Redesign Contacts button (Messages page)**
   - File: `src/app/agent/messages/page.tsx`
   - Mobile: Bottom fixed button (bottom nav style)
   - Desktop: Keep current top-right position

---

### Phase 2: Messages Mobile Navigation (High Priority)
**Estimated Time**: 1-2 hours

#### Current Behavior
```
Mobile View:
┌─────────────────┐
│ Conversations   │
│ - Conv 1        │
│ - Conv 2        │
│ - Conv 3        │
├─────────────────┤
│ Message Thread  │
│ - Msg 1         │
│ - Msg 2         │
│ (scroll...)     │
└─────────────────┘
```

#### New Behavior
```
Mobile View (Conversation List):
┌─────────────────┐
│ ← Messages      │
│ Search...       │
├─────────────────┤
│ ○ Conv 1        │
│ ○ Conv 2        │
│ ○ Conv 3        │
└─────────────────┘

Mobile View (Selected Conversation):
┌─────────────────┐
│ ← Back          │
│ John Doe        │
│ +1760333...     │
├─────────────────┤
│ Message Thread  │
│ - Msg 1         │
│ - Msg 2         │
├─────────────────┤
│ Type message... │
└─────────────────┘
```

#### Implementation Details

**Add mobile state management**:
```typescript
const [mobileView, setMobileView] = useState<'list' | 'thread'>('list');
const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);

const handleSelectConversation = (conv: Conversation) => {
  setSelectedConversation(conv);
  setMobileView('thread'); // Switch to thread view on mobile
};

const handleBackToList = () => {
  setMobileView('list');
};
```

**Conditional rendering**:
```typescript
// Mobile: Show only one view at a time
<div className="md:hidden">
  {mobileView === 'list' ? (
    <ConversationList onSelect={handleSelectConversation} />
  ) : (
    <MessageThread
      conversation={selectedConversation}
      onBack={handleBackToList}
    />
  )}
</div>

// Desktop: Show both side-by-side (current behavior)
<div className="hidden md:grid md:grid-cols-12 gap-6">
  <ConversationList className="col-span-4" />
  <MessageThread className="col-span-8" />
</div>
```

**Add transition animations**:
```typescript
import { AnimatePresence, motion } from 'framer-motion';

<AnimatePresence mode="wait">
  {mobileView === 'list' ? (
    <motion.div
      key="list"
      initial={{ x: -300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -300, opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <ConversationList />
    </motion.div>
  ) : (
    <motion.div
      key="thread"
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 300, opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <MessageThread />
    </motion.div>
  )}
</AnimatePresence>
```

**Back button component**:
```typescript
const BackButton = ({ onClick, label }: { onClick: () => void; label: string }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 py-3 px-4 ${
      isLight ? 'hover:bg-gray-100' : 'hover:bg-gray-800/50'
    } transition-colors`}
  >
    <ChevronLeft className="w-5 h-5" />
    <span className="font-medium">{label}</span>
  </button>
);
```

---

### Phase 3: Split CRM into Contacts + Email (Major Refactor)
**Estimated Time**: 3-4 hours

#### Step 3A: Create New Contacts Page

**File**: `src/app/agent/contacts/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useTheme, useThemeClasses } from '@/app/contexts/ThemeContext';
import { Users, Plus } from 'lucide-react';
import ContactsTab from '@/app/components/crm/ContactsTab';
import AgentNav from '@/app/components/AgentNav';

export default function ContactsPage() {
  const { currentTheme } = useTheme();
  const { textPrimary, textSecondary } = useThemeClasses();
  const isLight = currentTheme === 'lightgradient';

  return (
    <div className="min-h-screen p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <AgentNav />

        {/* Header */}
        <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className={`text-2xl sm:text-3xl font-bold ${textPrimary} flex items-center gap-2`}>
              <Users className="w-6 h-6 sm:w-8 sm:h-8" />
              Contacts
            </h1>
            <p className={`${textSecondary} mt-1 text-sm sm:text-base`}>
              Manage your contact database
            </p>
          </div>
          <button
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              isLight
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-emerald-600 hover:bg-emerald-700'
            } text-white font-medium transition-colors`}
          >
            <Plus className="w-5 h-5" />
            Add Contact
          </button>
        </div>

        {/* Contacts Tab Component */}
        <ContactsTab isLight={isLight} />
      </div>
    </div>
  );
}
```

#### Step 3B: Create New Email Page

**File**: `src/app/agent/email/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useTheme, useThemeClasses } from '@/app/contexts/ThemeContext';
import { Mail } from 'lucide-react';
import EmailInbox from '@/app/components/crm/EmailInbox';
import AgentNav from '@/app/components/AgentNav';

export default function EmailPage() {
  const { currentTheme } = useTheme();
  const { textPrimary, textSecondary } = useThemeClasses();
  const isLight = currentTheme === 'lightgradient';

  return (
    <div className="min-h-screen p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <AgentNav />

        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <h1 className={`text-2xl sm:text-3xl font-bold ${textPrimary} flex items-center gap-2`}>
            <Mail className="w-6 h-6 sm:w-8 sm:h-8" />
            Email Inbox
          </h1>
          <p className={`${textSecondary} mt-1 text-sm sm:text-base`}>
            Manage your email communications
          </p>
        </div>

        {/* Email Inbox Component */}
        <EmailInbox isLight={isLight} />
      </div>
    </div>
  );
}
```

#### Step 3C: Update AgentNav

**File**: `src/app/components/AgentNav.tsx`

**Changes**:
1. Remove CRM nav item
2. Add Contacts nav item
3. Add Email nav item (after Messages)
4. Increase hamburger size

```typescript
const navItems = [
  {
    href: "/agent/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    exact: true,
    show: true,
  },
  {
    href: "/agent/contacts",  // NEW
    label: "Contacts",
    icon: Users,
    exact: false,
    show: true,
  },
  {
    href: "/agent/messages",
    label: "Messages",
    icon: MessageSquare,
    exact: false,
    show: true,
  },
  {
    href: "/agent/email",  // NEW
    label: "Email",
    icon: Mail,
    exact: false,
    show: true,
  },
  {
    href: "/agent/campaigns",
    label: "Campaigns",
    icon: Megaphone,
    exact: false,
    show: true,
  },
  // ... rest
];

// Hamburger icon size change
{mobileMenuOpen ? (
  <X className="w-7 h-7" />  // Changed from w-6 h-6
) : (
  <Menu className="w-7 h-7" />  // Changed from w-6 h-6
)}
```

#### Step 3D: Deprecate Old CRM Page

**Options**:
1. **Keep as redirect** (recommended for backwards compatibility):
   ```typescript
   // src/app/agent/crm/page.tsx
   'use client';

   import { useEffect } from 'react';
   import { useRouter } from 'next/navigation';

   export default function CRMRedirect() {
     const router = useRouter();

     useEffect(() => {
       router.replace('/agent/contacts');
     }, [router]);

     return null;
   }
   ```

2. **Delete entirely**: Remove `/agent/crm` folder

**Recommendation**: Keep as redirect for 1-2 months, then remove.

---

### Phase 4: Mobile Optimize Contacts Component
**Estimated Time**: 2 hours

**File**: `src/app/components/crm/ContactsTab.tsx`

#### Mobile Improvements Needed

1. **Contact Cards**: Stack vertically, larger touch targets
2. **Search/Filters**: Sticky header on mobile
3. **Action Buttons**: Bottom sheet or modal on mobile
4. **Bulk Actions**: Swipe gestures or long-press
5. **Add Contact**: Full-screen modal on mobile

**Example Mobile Card**:
```typescript
<div className={`p-4 border-b ${border} hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors`}>
  {/* Mobile: Vertical layout */}
  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
    {/* Avatar */}
    <div className={`w-12 h-12 rounded-full ${isLight ? 'bg-blue-100' : 'bg-blue-900/30'} flex items-center justify-center`}>
      <User className="w-6 h-6" />
    </div>

    {/* Info */}
    <div className="flex-1 min-w-0">
      <p className={`font-semibold ${textPrimary} text-base sm:text-lg`}>
        {contact.firstName} {contact.lastName}
      </p>
      <p className={`text-sm ${textSecondary} truncate`}>{contact.email}</p>
      <p className={`text-sm ${textSecondary}`}>{contact.phone}</p>
    </div>

    {/* Actions */}
    <div className="flex gap-2 self-end sm:self-auto">
      <button className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700">
        <Mail className="w-5 h-5" />
      </button>
      <button className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700">
        <MessageSquare className="w-5 h-5" />
      </button>
      <button className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700">
        <MoreVertical className="w-5 h-5" />
      </button>
    </div>
  </div>
</div>
```

---

### Phase 5: Mobile Optimize Email Inbox
**Estimated Time**: 2 hours

**File**: `src/app/components/crm/EmailInbox.tsx`

#### Mobile Improvements

1. **Email List**: Similar to Messages - list view → detail view with back button
2. **Compose**: Full-screen modal on mobile
3. **Reply**: Bottom sheet on mobile
4. **Attachments**: Better preview on mobile
5. **Folders**: Collapsible sidebar → bottom drawer on mobile

**State Management** (similar to Messages):
```typescript
const [mobileView, setMobileView] = useState<'list' | 'detail'>('list');
const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
```

---

## File Structure Changes

### New Files to Create
```
src/app/agent/contacts/
  └── page.tsx (new)

src/app/agent/email/
  └── page.tsx (new)
```

### Files to Modify
```
src/app/components/AgentNav.tsx (update nav items)
src/app/agent/crm/page.tsx (convert to redirect or delete)
src/app/agent/messages/page.tsx (add mobile view state)
src/app/components/crm/ContactsTab.tsx (mobile optimizations)
src/app/components/crm/EmailInbox.tsx (mobile optimizations)
```

### Files to Delete (Optional - Phase 3D)
```
src/app/agent/crm/page.tsx (after redirect period)
```

---

## Mobile-First Design Principles

### Touch Targets
- Minimum 44x44px (iOS guideline)
- Prefer 48x48px (Material Design)
- Add padding around clickable elements

### Typography
```
Mobile → Desktop
H1: text-2xl → text-3xl → text-4xl
Body: text-sm → text-base
Secondary: text-xs → text-sm
```

### Spacing
```
Mobile → Desktop
Container padding: p-4 → p-8
Section margins: mb-4 → mb-6 → mb-8
Gap between elements: gap-3 → gap-4 → gap-6
```

### Navigation
- Single view at a time on mobile
- Clear back buttons
- Transition animations (200-300ms)
- Bottom nav for primary actions

### Forms
- Full-width inputs on mobile
- Larger input fields (py-3 instead of py-2)
- Bottom-fixed submit buttons
- Auto-focus first field

---

## Testing Checklist

### Phase 1 (Quick Wins)
- [ ] Hamburger menu visible and easy to tap
- [ ] H1 margins look balanced on mobile
- [ ] Contacts button accessible on Messages page

### Phase 2 (Messages Navigation)
- [ ] Conversation list shows correctly
- [ ] Tapping conversation transitions to thread
- [ ] Back button returns to list
- [ ] Animations smooth (no jank)
- [ ] Desktop behavior unchanged

### Phase 3 (CRM Split)
- [ ] `/agent/contacts` page loads
- [ ] `/agent/email` page loads
- [ ] AgentNav shows new items
- [ ] Old `/agent/crm` redirects properly
- [ ] All links updated

### Phase 4 (Contacts Mobile)
- [ ] Contact cards readable on small screens
- [ ] Touch targets adequate (44px+)
- [ ] Search/filters accessible
- [ ] Add contact flow works on mobile

### Phase 5 (Email Mobile)
- [ ] Email list readable
- [ ] Detail view transitions work
- [ ] Compose button accessible
- [ ] Reply/forward work on mobile

### Cross-Browser Testing
- [ ] iOS Safari
- [ ] Android Chrome
- [ ] Desktop Chrome
- [ ] Desktop Safari
- [ ] Desktop Firefox

---

## Rollout Strategy

### Development
1. Create feature branch: `feature/mobile-crm-refactor`
2. Implement phases in order (1→2→3→4→5)
3. Test each phase before moving to next
4. PR review after Phase 2 and Phase 3

### Deployment
1. Deploy Phase 1-2 first (low risk)
2. Monitor user behavior
3. Deploy Phase 3 (CRM split) - **Breaking change**
4. Keep redirect active for 2 months
5. Deploy Phase 4-5 incrementally

### Communication
- Notify users of navigation changes
- Update help documentation
- Create video walkthrough for new flow

---

## Success Metrics

### User Experience
- **Mobile bounce rate**: Target <30%
- **Average session time on mobile**: Target >2min
- **Mobile conversion rate**: Match or exceed desktop

### Technical
- **Lighthouse mobile score**: Target >90
- **First contentful paint**: Target <1.5s
- **Time to interactive**: Target <3.5s

### Business
- **Mobile usage**: Track % of mobile vs desktop users
- **Feature adoption**: Track usage of Contacts vs Email pages
- **User feedback**: Survey satisfaction with new flow

---

## Risk Mitigation

### Breaking Changes
- **Risk**: Users bookmarked `/agent/crm`
- **Mitigation**: Redirect for 2 months minimum

### Performance
- **Risk**: Animations cause lag on low-end devices
- **Mitigation**: Reduce motion for users with `prefers-reduced-motion`

### Backwards Compatibility
- **Risk**: External links to old CRM page
- **Mitigation**: Permanent redirect, not 404

---

## Future Enhancements

### Phase 6 (Future)
- Offline support with service workers
- Push notifications for new messages/emails
- Voice-to-text for message composition
- Contact import from phone contacts (iOS/Android)
- Swipe gestures for common actions

---

## Timeline Estimate

| Phase | Time | Dependencies |
|-------|------|--------------|
| Phase 1: Quick Wins | 30 min | None |
| Phase 2: Messages Navigation | 1-2 hrs | Phase 1 |
| Phase 3: CRM Split | 3-4 hrs | Phase 2 |
| Phase 4: Contacts Mobile | 2 hrs | Phase 3 |
| Phase 5: Email Mobile | 2 hrs | Phase 3 |
| **Total** | **9-11 hrs** | |

**Recommended Schedule**:
- Day 1: Phase 1 + Phase 2
- Day 2: Phase 3
- Day 3: Phase 4 + Phase 5
- Day 4: Testing + Fixes

---

## Questions for Stakeholder

1. **CRM Redirect**: Keep redirect permanently or remove after 2 months?
2. **Email Priority**: Is email inbox high priority or can it wait?
3. **Contact Import**: Do we need CSV/Excel import for contacts?
4. **Bulk Actions**: What bulk operations do users need most?
5. **Mobile Stats**: Do we have current mobile usage data?

---

## Conclusion

This refactor transforms the CRM from a desktop-centric tabbed interface into a mobile-first experience with dedicated pages for Contacts and Email. The phased approach allows for incremental rollout and testing while minimizing disruption to existing users.

**Key Benefits**:
- ✅ Better mobile UX with touch-optimized interactions
- ✅ Clearer navigation without tabs
- ✅ Easier to find and manage contacts
- ✅ Smoother transitions between views
- ✅ Future-proof architecture for more features

**Next Steps**:
1. Review this plan with team
2. Get stakeholder approval
3. Begin Phase 1 implementation
4. Schedule testing sessions
