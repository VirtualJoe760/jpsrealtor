# CRM Documentation Index

**Project:** Joseph Sardella Real Estate CRM
**Last Updated:** 2026-01-14
**Status:** Active Development

---

## 📚 Quick Navigation

### 🎯 Start Here
- **[CRM Overview](#crm-overview)** - What is the CRM and its capabilities
- **[Architecture Guide](#architecture-guide)** - System design and structure
- **[Refactoring Roadmap](#refactoring-roadmap)** - Current refactoring initiatives

### 📖 Component Documentation
- **[Contacts System](#contacts-system)** - Contact management
- **[Email System](#email-system)** - Email inbox and composition
- **[Messaging System](#messaging-system)** - SMS and communication
- **[Campaign System](#campaign-system)** - Marketing campaigns

### 🔧 Development Guides
- **[Refactoring Plans](#refactoring-plans)** - Component refactoring details
- **[Feature Implementation](#feature-implementation)** - PWA, Push Notifications
- **[Technical Specs](#technical-specs)** - APIs, data models

---

## CRM Overview

### What is the CRM?

A comprehensive Customer Relationship Management system built for real estate professionals, featuring:

**Core Features:**
- ✅ Contact Management (1,000+ contacts)
- ✅ Email Integration (Resend API)
- ✅ SMS Messaging (Twilio)
- ✅ Campaign Management
- ✅ Property Data Integration
- ✅ Market Comparables
- ✅ Notes & Activity Tracking
- ✅ Import/Export (CSV, Google Contacts, Mojo Dialer)
- ✅ PWA with Push Notifications
- ✅ Real-time WebSocket Updates

**Technology Stack:**
- Next.js 14 (App Router)
- React 18 with TypeScript
- MongoDB with Mongoose
- Tailwind CSS
- Resend (Email) + Twilio (SMS)
- WebSocket (Socket.io)
- Service Workers (PWA)

---

## Architecture Guide

### System Components

```
CRM Ecosystem
│
├── Contacts Management
│   ├── ContactsTab (main list view)
│   ├── ContactViewPanel (detail panel)
│   ├── ContactDetailPanel (review/import)
│   └── ContactSyncModal (CSV import)
│
├── Email System
│   ├── EmailInbox (inbox/sent view)
│   ├── ComposePanel (email composition)
│   └── Email API Integration (Resend)
│
├── Messaging System
│   ├── Messages Page (SMS conversations)
│   ├── WebSocket (real-time updates)
│   └── Twilio Integration
│
├── Campaign Management
│   ├── Campaign Creation
│   ├── Contact Selection
│   └── Bulk Operations
│
└── Shared Infrastructure
    ├── API Routes (/api/crm/*)
    ├── Database Models
    ├── Utility Functions
    └── Type Definitions
```

### Data Flow

```
User Action → React Component → API Route → Database → Response → UI Update
                                    ↓
                              WebSocket Emit
                                    ↓
                              Real-time Update
```

---

## Refactoring Roadmap

### Current Status

The CRM is undergoing a **comprehensive refactoring initiative** to improve maintainability, testability, and performance.

**Progress Overview:**
- 🟡 Phase 1: ContactsTab (60% complete)
- ⏳ Phase 2: ContactViewPanel (planned)
- ⏳ Phase 3: EmailInbox (planned)
- ⏳ Phase 4: ComposePanel (planned)

**Timeline:** 12-15 weeks (started 2026-01-13)

### Why Refactoring?

**Before Refactoring:**
- Average component size: 1,262 lines
- 14.4 hooks per component (average)
- High complexity, low testability
- Difficult to maintain and extend

**After Refactoring (Target):**
- Average component size: ~300 lines (76% reduction)
- 5 hooks per component (65% reduction)
- Modular, testable, maintainable
- Clear separation of concerns

### Key Documents

| Document | Description | Status |
|----------|-------------|--------|
| [CRM_REFACTOR_PRIORITIES.md](./CRM_REFACTOR_PRIORITIES.md) | Overall analysis & roadmap | ✅ Complete |
| [CONTACTSTAB_REFACTOR_PLAN.md](./CONTACTSTAB_REFACTOR_PLAN.md) | ContactsTab refactor plan | ✅ Complete |
| [CONTACTSTAB_REFACTOR_PROGRESS.md](./CONTACTSTAB_REFACTOR_PROGRESS.md) | Progress tracking | 🟡 Phase 3 |
| [CONTACTVIEWPANEL_REFACTOR_PLAN.md](./CONTACTVIEWPANEL_REFACTOR_PLAN.md) | ContactViewPanel plan | ✅ Complete |
| [EMAILINBOX_REFACTOR_PLAN.md](./EMAILINBOX_REFACTOR_PLAN.md) | EmailInbox plan | ✅ Complete |
| [COMPOSEPANEL_REFACTOR_PLAN.md](./COMPOSEPANEL_REFACTOR_PLAN.md) | ComposePanel plan | ✅ Complete |

---

## Contacts System

### Overview

The contacts system manages all contact information, including personal details, property data, communication history, and status tracking.

### Components

#### ContactsTab.tsx (1,416 lines → ~300 lines)
**Location:** `src/app/agent/contacts/page.tsx`
**Status:** 🟡 Refactoring in Progress (Phase 3 of 6)

**Current Features:**
- Contact list with card/list views
- Filtering (by status, age, missing data, tags)
- Sorting (A-Z, date, status)
- Search functionality
- Bulk selection and operations
- Import/export
- Status statistics cards
- Tag filtering

**Refactoring Progress:**
- ✅ Phase 1: Types & Constants
- ✅ Phase 2: Custom Hooks (useContacts, useContactFilters, useContactSelection, useContactStats, useContactPersistence)
- ✅ Phase 3: UI Components (StatsCards, ContactToolbar)
- ⏳ Phase 4: ContactCard components
- ⏳ Phase 5: Integration
- ⏳ Phase 6: Testing

**See:** [CONTACTSTAB_REFACTOR_PROGRESS.md](./CONTACTSTAB_REFACTOR_PROGRESS.md)

#### ContactViewPanel.tsx (1,780 lines → ~250 lines)
**Location:** `src/app/components/crm/ContactViewPanel.tsx`
**Status:** ⏳ Not Started

**Features:**
- Contact details display
- Notes management (CRUD operations)
- Status editing
- Photo upload
- Phone/email editing
- Market comparables
- Property map view
- Drag-to-close gesture

**Refactoring Plan:**
- Extract 8 custom hooks
- Create 7 UI components
- Separate utilities for address/coordinate handling

**See:** [CONTACTVIEWPANEL_REFACTOR_PLAN.md](./CONTACTVIEWPANEL_REFACTOR_PLAN.md)

#### ContactSyncModal.tsx (783 lines)
**Location:** `src/app/components/crm/ContactSyncModal.tsx`
**Status:** ✅ Functional, refactor planned

**Features:**
- CSV import wizard
- Column mapping with AI detection
- Contact preview and review
- Duplicate handling
- Progress tracking
- Template saving

**Complexity:** Medium priority refactor

---

## Email System

### Overview

Email system integrates with Resend API for sending and receiving emails, with metadata tracking for read status, stars, and labels.

### Components

#### EmailInbox.tsx (1,562 lines → ~300 lines)
**Location:** `src/app/components/crm/EmailInbox.tsx`
**Status:** ⏳ Not Started (CRITICAL Priority)

**Features:**
- Inbox/Sent folder navigation
- Sent email subfolders (by domain)
- Email list with previews
- Expand/collapse email content
- Search and filtering
- Bulk selection
- Star/unstar emails
- Mark as read/unread

**Issues:**
- 27 React hooks (highest in codebase!)
- Complex dual API (emails + metadata)
- No separation of concerns

**Refactoring Plan:**
- Extract 6 custom hooks
- Create service layer for API calls
- Build focused UI components

**See:** [EMAILINBOX_REFACTOR_PLAN.md](./EMAILINBOX_REFACTOR_PLAN.md)

#### ComposePanel.tsx (730 lines → ~200 lines)
**Location:** `src/app/components/crm/ComposePanel.tsx`
**Status:** ⏳ Not Started (HIGH Priority)

**Features:**
- Rich text editor
- Email templates
- AI email generation
- File attachments
- Reply/forward support
- CC/BCC fields
- Minimize/maximize panel

**Key Win:**
- RichTextEditor will be extracted as reusable component!

**See:** [COMPOSEPANEL_REFACTOR_PLAN.md](./COMPOSEPANEL_REFACTOR_PLAN.md)

---

## Messaging System

### Overview

SMS messaging system using Twilio with real-time WebSocket updates and PWA push notifications.

### Components

#### Messages Page
**Location:** `src/app/agent/messages/page.tsx`
**Status:** ✅ Refactored (Phase 2 complete)

**Features:**
- Conversation list
- Message threads
- Real-time updates via WebSocket
- Contact search
- Inline contact editing
- Compose view

**Refactoring:**
- ✅ Custom hooks extracted
- ✅ Modular components
- ✅ Types and utilities separated

**See:** [MESSAGES_REFACTOR_PLAN.md](./MESSAGES_REFACTOR_PLAN.md)

#### SMS Webhook
**Location:** `src/app/api/crm/sms/webhook/route.ts`

**Features:**
- Receive inbound SMS
- Auto-create contacts
- Emit WebSocket events
- Send push notifications

---

## Campaign System

### Overview

Marketing campaign management with contact selection and bulk operations.

#### Campaign Components
**Location:** `src/app/agent/campaigns/`

**Features:**
- Campaign creation
- Contact filtering and selection
- Bulk email/SMS sending
- Campaign analytics
- Template management

**Status:** ✅ Functional

---

## Feature Implementation

### PWA & Push Notifications

**Status:** ✅ Fully Implemented

Comprehensive PWA with native push notifications for SMS messages.

**Features:**
- Service Worker registration
- Push subscription management
- Web Push Protocol (VAPID)
- SMS notifications
- Click-to-open conversations
- Works when browser closed

**Documentation:** [PWA_PUSH_NOTIFICATIONS_COMPLETE_GUIDE.md](./PWA_PUSH_NOTIFICATIONS_COMPLETE_GUIDE.md)

**Components:**
- Service Worker: `/public/sw.js`
- Push Service: `/src/services/pushNotificationService.ts`
- Subscription API: `/src/app/api/push/`
- React Hook: `/src/hooks/usePushNotifications.ts`
- UI Component: `/src/app/components/PushNotificationPrompt.tsx`

**Testing Guide:** [PWA_PUSH_TESTING_GUIDE.md](./PWA_PUSH_TESTING_GUIDE.md)

---

## Technical Specs

### API Routes

**Contacts API:**
- `GET /api/crm/contacts` - List contacts
- `GET /api/crm/contacts/:id` - Get contact
- `POST /api/crm/contacts` - Create contact
- `PATCH /api/crm/contacts/:id` - Update contact
- `DELETE /api/crm/contacts/:id` - Delete contact
- `POST /api/crm/contacts/import` - Import contacts
- `GET /api/crm/contacts/:id/comparables` - Get market data
- `POST /api/crm/contacts/:id/notes` - Add note

**Email API:**
- `GET /api/resend/inbox` - List emails
- `GET /api/resend/email/:id` - Get email content
- `POST /api/resend/send` - Send email
- `GET /api/email-metadata` - Get metadata
- `POST /api/email-metadata` - Update metadata

**SMS API:**
- `POST /api/crm/sms/send` - Send SMS
- `POST /api/crm/sms/webhook` - Receive SMS (Twilio webhook)
- `GET /api/crm/sms/conversations` - List conversations

**Push API:**
- `POST /api/push/subscribe` - Subscribe to push
- `POST /api/push/unsubscribe` - Unsubscribe

### Database Models

**Contact Model:**
```typescript
{
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  address?: Address;
  status: 'uncontacted' | 'contacted' | 'qualified' | 'nurturing' | 'client' | 'inactive';
  tags: string[];
  interests: ContactInterests;
  preferences: ContactPreferences;
  noteHistory: Note[];
  importedAt: Date;
  // Property data fields...
}
```

**Message Model:**
```typescript
{
  from: string;
  to: string;
  body: string;
  direction: 'inbound' | 'outbound';
  status: string;
  twilioSid: string;
  userId: ObjectId;
  contactId: ObjectId;
  createdAt: Date;
}
```

**PushSubscription Model:**
```typescript
{
  userId: ObjectId;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
  deviceType?: string;
  active: boolean;
  createdAt: Date;
}
```

---

## Development Workflow

### Adding a New Feature

1. **Plan:** Create design doc in `/docs`
2. **Types:** Define TypeScript interfaces
3. **API:** Create API route if needed
4. **Model:** Define/update database model
5. **Hook:** Create custom hook for state management
6. **Component:** Build UI component
7. **Integration:** Connect to existing system
8. **Test:** Write tests and manual testing
9. **Document:** Update relevant docs

### Refactoring a Component

1. **Analyze:** Count hooks, state vars, identify responsibilities
2. **Plan:** Create detailed refactor plan doc
3. **Types:** Extract type definitions
4. **Utils:** Extract pure functions
5. **Hooks:** Extract custom hooks
6. **Components:** Break down UI
7. **Integrate:** Refactor main component
8. **Test:** Ensure functionality intact
9. **Document:** Update progress doc

### Best Practices

**Component Design:**
- Keep components under 300 lines
- Max 5-6 React hooks per component
- Single responsibility principle
- Composition over complexity

**State Management:**
- Use custom hooks for complex state
- Memoize expensive computations
- Avoid prop drilling with context when needed

**Type Safety:**
- Use enums instead of string literals
- Define clear interfaces
- No `any` types without justification

**Performance:**
- Use `useMemo` and `useCallback`
- Implement virtualization for long lists
- Lazy load heavy components

---

## Additional Resources

### Related Documentation

| Document | Purpose | Status |
|----------|---------|--------|
| [API_LIMIT_REFACTOR.md](./API_LIMIT_REFACTOR.md) | API rate limiting | ✅ Implemented |
| [contacts-email-scroll-analysis.md](./contacts-email-scroll-analysis.md) | Scroll issue analysis | ✅ Fixed |
| [mobile-scroll-isolation-plan.md](./mobile-scroll-isolation-plan.md) | Mobile scroll fixes | ✅ Complete |
| [REFACTOR_COMPLETE.md](./REFACTOR_COMPLETE.md) | Messages refactor summary | ✅ Complete |
| [REFACTOR_REMAINING_COMPONENTS.md](./REFACTOR_REMAINING_COMPONENTS.md) | Outstanding work | 🟡 In Progress |
| [SMS_PHASE2_TESTING.md](./SMS_PHASE2_TESTING.md) | SMS system testing | ✅ Complete |

### External Links

- **Next.js Docs:** https://nextjs.org/docs
- **React Docs:** https://react.dev
- **Tailwind CSS:** https://tailwindcss.com/docs
- **Resend API:** https://resend.com/docs
- **Twilio SMS:** https://www.twilio.com/docs/sms
- **Web Push Protocol:** https://web.dev/push-notifications-overview/

---

## Contributing

### Code Style

- Use TypeScript strict mode
- Follow existing naming conventions
- Write meaningful comments for complex logic
- Keep functions small and focused

### Commit Messages

```
Type: Brief description (50 chars max)

Detailed explanation of changes:
- Bullet points for multiple changes
- Include context and reasoning
- Reference related issues/docs

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

**Types:** `Feat`, `Fix`, `Refactor`, `Docs`, `Style`, `Test`, `Chore`

---

## Getting Help

### Troubleshooting

1. Check relevant documentation in `/docs`
2. Review console logs for errors
3. Check API route logs
4. Verify database connection
5. Test in incognito mode (browser cache issues)

### Common Issues

**Import fails:**
- Check CSV format and column mappings
- Verify required fields (phone number)
- Check for duplicate detection settings

**Push notifications not working:**
- Verify VAPID keys in `.env.local`
- Ensure HTTPS (or localhost)
- Check service worker registration
- See [PWA_PUSH_TESTING_GUIDE.md](./PWA_PUSH_TESTING_GUIDE.md)

**WebSocket not connecting:**
- Check server is running: `npm run dev`
- Verify WebSocket server on correct port
- Check browser console for connection errors

---

## Appendix

### Glossary

**CRM:** Customer Relationship Management
**PWA:** Progressive Web App
**VAPID:** Voluntary Application Server Identification
**MCP:** Model-Context-Protocol
**API:** Application Programming Interface
**SMS:** Short Message Service
**CSV:** Comma-Separated Values

### Version History

- **v2.0** (2026-01-14) - Comprehensive documentation index created
- **v1.5** (2026-01-13) - Refactoring initiative started
- **v1.4** (2025-12) - PWA push notifications implemented
- **v1.3** (2025-11) - Messages page refactored
- **v1.2** (2025-10) - SMS system Phase 2 complete
- **v1.0** (2025-09) - Initial CRM launch

---

**Last Updated:** 2026-01-14
**Maintained By:** Development Team
**Questions?** Review documentation or check commit history for context
