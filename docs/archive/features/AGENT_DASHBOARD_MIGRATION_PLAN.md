> Archived: migration plan, not a description of the running system — see docs/admin/README.md and docs/commerce/free-tier-gating.md, verified 2026-10-17

# Agent Dashboard Migration & Activity Tracking System
**Action Plan for AdminNav → AgentNav Migration**
**Created:** December 23, 2025

---

## 🎯 EXECUTIVE SUMMARY

**Current State:**
- `AdminNav.tsx` contains 3 tabs: Dashboard, CMS, CRM
- CMS and CRM are currently admin-only
- No activity tracking for agent actions
- No differentiation between admin analytics and agent analytics

**Goal:**
- Migrate CRM and CMS from admin-only to agent-level
- Create `AgentNav.tsx` for agent dashboard
- Build comprehensive agent activity tracking system
- Admin dashboard shows website-wide stats
- Agent dashboard shows personal productivity stats

---

## 📊 CURRENT SYSTEM ARCHITECTURE

### AdminNav.tsx (Current)
```typescript
Routes:
- /admin → Admin Dashboard (stats overview)
- /admin/cms → Article Management (AI generation, publishing)
- /admin/crm → Contact Management (emails, SMS, voicemail)
```

###CMS Features (Currently Admin-Only)
- **Article List** (`/admin/cms`)
  - AI-powered article generation
  - Publish to GitHub (MDX files)
  - Stats carousel (total articles, drafts, categories)
  - Search and filter articles
  - Edit, unpublish, delete actions

- **Article Editor** (`/admin/cms/edit/[slugId]` & `/admin/cms/new`)
  - TipTap rich text editor
  - AI article generator (Groq)
  - Frontmatter management (title, excerpt, category, SEO)
  - Preview modal
  - Publish or save as draft

- **Publishing Pipeline**
  - Auto-generates MDX files
  - Pushes to GitHub
  - Triggers Vercel deployment

### CRM Features (Currently Admin-Only)
- **Contacts Tab** (`/admin/crm` - contacts)
  - Contact list with search and filters
  - Import from Google Contacts, CSV, vCard
  - Add manual contacts
  - View/edit contact details
  - Real estate interests tracking
  - TCPA compliance (opt-in tracking)

- **SMS Messaging** (`/admin/crm` - messaging)
  - Send SMS to contacts (Twilio)
  - Message templates
  - Bulk messaging
  - Delivery tracking
  - Opt-out management

- **Voicemail Campaign** (`/admin/crm` - voicemail)
  - Drop Cowboy integration
  - Pre-recorded voicemail drops
  - Campaign management
  - Delivery and listen tracking

- **Email Inbox** (`/admin/crm` - inbox)
  - Unified email inbox (Resend)
  - Thread view
  - Lead matching
  - Email tracking (opens, clicks)

- **Email Composer** (`/admin/crm` - compose)
  - Rich text email editor
  - Contact selection
  - Email templates
  - Send via Resend

---

## 🏗️ NEW ARCHITECTURE

### Admin Dashboard (`/admin`)
**Purpose:** Website-wide analytics for owner only (josephsardella@gmail.com)

**Stats:**
- **Website Metrics:**
  - Total users registered
  - Active sessions (real-time)
  - Total chat conversations
  - Total swipes (likes/dislikes)
  - Map searches performed

- **Content Metrics:**
  - Total published articles
  - Article views (if tracked)
  - Top performing articles

- **Listing Metrics:**
  - Total listings in database (unified_listings)
  - Cities covered
  - Subdivisions covered
  - MLS associations integrated

- **Team Metrics:**
  - Total agents
  - Total teams
  - Pending agent applications

- **Revenue Metrics (Future):**
  - Total transactions
  - Commission revenue
  - Pipeline value

**Navigation:**
- Dashboard (website stats)
- Agent Applications (review applications)
- System Settings (admin tools)

---

### Agent Dashboard (`/agent` or `/dashboard/agent`)
**Purpose:** Agent productivity hub and CRM

**AgentNav Tabs:**
1. **Dashboard** - Agent personal stats
2. **CRM** - Contact management (migrated from admin)
3. **CMS** - Content creation (migrated from admin, scoped to agent)

#### 1. Agent Dashboard (`/agent`)

**Stats Carousel (similar to CMS stats):**
- **Contacts:**
  - Total contacts
  - New contacts this week
  - Active clients (buyer/seller agreements)

- **Activity This Week:**
  - Emails sent
  - SMS messages sent
  - Voicemail drops sent
  - Phone calls logged

- **AI Usage:**
  - Chat messages sent
  - Article drafts generated
  - CMA reports generated

- **Listings & Transactions:**
  - Active listings
  - Pending transactions
  - Closings this month

- **Client Engagement:**
  - Swipe sessions created
  - Properties favorited by clients
  - Appointments scheduled

**To-Do List Component:**
```typescript
interface AgentTodo {
  id: string;
  agentId: string;
  title: string;
  description?: string;
  dueDate?: Date;
  priority: "low" | "medium" | "high" | "urgent";
  status: "pending" | "in_progress" | "completed";
  linkedTo?: {
    type: "contact" | "listing" | "transaction";
    id: string;
  };
  createdAt: Date;
  completedAt?: Date;
}
```

**Client Digest Component:**
```typescript
interface ClientDigest {
  contact: IContact;
  clientType: "buyer" | "seller" | "both";
  agreements: {
    buyer?: { signed: boolean; signedAt?: Date; expiresAt?: Date };
    seller?: { signed: boolean; signedAt?: Date; expiresAt?: Date };
  };
  stats: {
    lastContact: Date;
    totalEmails: number;
    totalSMS: number;
    totalCalls: number;
    favoriteListings: number;
    scheduledAppointments: number;
  };
  nextAction?: {
    type: "follow_up" | "showing" | "offer" | "closing";
    date: Date;
    description: string;
  };
}
```

#### 2. Agent CRM (`/agent/crm`)

**Migrated from `/admin/crm` with agent scoping:**

- All contacts filtered by `userId` (agent's own contacts)
- SMS, email, voicemail features work the same
- Activity tracking updated to record agent metrics

**New: Client Management:**
- Mark contacts as clients (signed agreements)
- Track buyer/seller status
- Link agreements (documents)
- Transaction pipeline view

#### 3. Agent CMS (`/agent/cms`)

**Migrated from `/admin/cms` with agent scoping:**

- Agents can write articles (drafts only)
- Articles must be approved by admin before publishing
- Agent-specific stats (articles written, drafts, approved)

**Workflow:**
1. Agent writes article
2. Saves as draft
3. Submits for admin review
4. Admin approves → Publishes to site
5. Admin rejects → Agent edits and resubmits

---

## 💾 AGENT ACTIVITY TRACKING MODEL

### New Model: AgentActivity

```typescript
import mongoose, { Schema, Document } from "mongoose";

export interface IAgentActivity extends Document {
  agentId: mongoose.Types.ObjectId; // Reference to User (agent)
  teamId?: mongoose.Types.ObjectId; // Reference to Team

  // Activity Type
  activityType:
    | "email_sent"
    | "sms_sent"
    | "voicemail_sent"
    | "phone_call"
    | "chat_message"
    | "article_created"
    | "cma_generated"
    | "listing_created"
    | "agreement_signed"
    | "appointment_scheduled"
    | "property_shown";

  // Related Entities
  contactId?: mongoose.Types.ObjectId; // Related contact
  listingId?: string; // Related listing (listingKey)
  articleId?: string; // Related article slug

  // Activity Details
  metadata?: {
    // For emails
    subject?: string;
    recipientEmail?: string;
    opened?: boolean;
    clicked?: boolean;

    // For SMS
    messageBody?: string;
    recipientPhone?: string;
    delivered?: boolean;

    // For voicemail
    dropCowboyId?: string;
    listened?: boolean;

    // For articles
    articleTitle?: string;
    wordCount?: number;
    category?: string;

    // For CMA
    propertyAddress?: string;
    estimatedValue?: number;

    // For agreements
    agreementType?: "buyer" | "seller";
    documentUrl?: string;

    // For AI usage
    aiProvider?: "groq" | "claude";
    tokensUsed?: number;
    responseTime?: number;
  };

  // Timestamps
  activityDate: Date;
  createdAt: Date;
}

const AgentActivitySchema = new Schema<IAgentActivity>(
  {
    agentId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    teamId: { type: Schema.Types.ObjectId, ref: "Team", index: true },

    activityType: {
      type: String,
      enum: [
        "email_sent",
        "sms_sent",
        "voicemail_sent",
        "phone_call",
        "chat_message",
        "article_created",
        "cma_generated",
        "listing_created",
        "agreement_signed",
        "appointment_scheduled",
        "property_shown",
      ],
      required: true,
      index: true,
    },

    contactId: { type: Schema.Types.ObjectId, ref: "Contact" },
    listingId: { type: String },
    articleId: { type: String },

    metadata: { type: Schema.Types.Mixed },

    activityDate: { type: Date, default: Date.now, index: true },
  },
  {
    timestamps: true,
    collection: "agent_activities",
  }
);

// Compound indexes for efficient queries
AgentActivitySchema.index({ agentId: 1, activityDate: -1 });
AgentActivitySchema.index({ agentId: 1, activityType: 1, activityDate: -1 });
AgentActivitySchema.index({ teamId: 1, activityDate: -1 });
AgentActivitySchema.index({ contactId: 1, activityDate: -1 });

export default mongoose.models.AgentActivity ||
  mongoose.model<IAgentActivity>("AgentActivity", AgentActivitySchema);
```

### Activity Tracking Hooks

**Email Sent:**
```typescript
// In /api/crm/send-email/route.ts
await AgentActivity.create({
  agentId: session.user.id,
  teamId: agent.team,
  activityType: "email_sent",
  contactId: contact._id,
  metadata: {
    subject: emailSubject,
    recipientEmail: contact.email,
  },
  activityDate: new Date(),
});
```

**SMS Sent:**
```typescript
// In /api/crm/sms/send/route.ts
await AgentActivity.create({
  agentId: session.user.id,
  teamId: agent.team,
  activityType: "sms_sent",
  contactId: contact._id,
  metadata: {
    messageBody: message,
    recipientPhone: contact.phone,
  },
  activityDate: new Date(),
});
```

**Voicemail Sent:**
```typescript
// In Drop Cowboy campaign handler
await AgentActivity.create({
  agentId: agent._id,
  teamId: agent.team,
  activityType: "voicemail_sent",
  contactId: contact._id,
  metadata: {
    dropCowboyId: campaign.id,
  },
  activityDate: new Date(),
});
```

**Article Created:**
```typescript
// In /api/articles/publish/route.ts
await AgentActivity.create({
  agentId: session.user.id,
  teamId: agent.team,
  activityType: "article_created",
  articleId: article.slug,
  metadata: {
    articleTitle: article.title,
    wordCount: article.content.split(" ").length,
    category: article.category,
  },
  activityDate: new Date(),
});
```

**Agreement Signed:**
```typescript
// In client agreement route
await AgentActivity.create({
  agentId: session.user.id,
  teamId: agent.team,
  activityType: "agreement_signed",
  contactId: client._id,
  metadata: {
    agreementType: "buyer", // or "seller"
    documentUrl: documentUrl,
  },
  activityDate: new Date(),
});
```

---

## 📁 FILE STRUCTURE CHANGES

### New Files to Create:

```
src/
├── app/
│   ├── agent/
│   │   ├── page.tsx                        # Agent Dashboard (stats + todos + clients)
│   │   ├── crm/
│   │   │   └── page.tsx                    # Migrated from /admin/crm
│   │   └── cms/
│   │       ├── page.tsx                    # Agent article list
│   │       ├── new/page.tsx                # Create new article (draft only)
│   │       └── edit/[slugId]/page.tsx      # Edit draft article
│   │
│   ├── components/
│   │   ├── AgentNav.tsx                    # NEW - Agent navigation
│   │   ├── agent/
│   │   │   ├── AgentStatsCarousel.tsx      # Activity stats
│   │   │   ├── AgentTodoList.tsx           # To-do list component
│   │   │   ├── ClientDigest.tsx            # Client summary cards
│   │   │   └── ActivityTimeline.tsx        # Recent activity feed
│   │   └── admin/
│   │       └── WebsiteStats.tsx            # NEW - Admin dashboard stats
│   │
│   └── api/
│       ├── agent/
│       │   ├── activities/route.ts         # Get agent activities
│       │   ├── stats/route.ts              # Get agent stats
│       │   ├── todos/route.ts              # Todo CRUD
│       │   └── clients/route.ts            # Client digest data
│       │
│       └── admin/
│           └── website-stats/route.ts      # Website-wide analytics
│
├── models/
│   ├── AgentActivity.ts                    # NEW - Activity tracking
│   └── AgentTodo.ts                        # NEW - To-do list items
│
└── hooks/
    └── useAgentStats.ts                    # Hook for agent stats
```

### Files to Modify:

```
src/
├── app/
│   ├── admin/
│   │   ├── page.tsx                        # UPDATE - Website stats only
│   │   ├── crm/page.tsx                    # REMOVE - Migrate to /agent/crm
│   │   └── cms/page.tsx                    # UPDATE - Admin approval workflow
│   │
│   ├── components/
│   │   └── AdminNav.tsx                    # UPDATE - Remove CRM/CMS tabs
│   │
│   └── api/
│       ├── crm/
│       │   ├── send-email/route.ts         # ADD activity tracking
│       │   └── sms/send/route.ts           # ADD activity tracking
│       │
│       └── articles/
│           └── publish/route.ts            # ADD activity tracking
│
└── models/
    ├── User.ts                             # ADD agent metrics fields
    └── contact.ts                          # ADD clientType, agreements
```

---

## 🔧 IMPLEMENTATION STEPS

### Phase 1: Models & API Foundation
- [ ] Create `AgentActivity` model
- [ ] Create `AgentTodo` model
- [ ] Update `Contact` model with client fields
- [ ] Create `/api/agent/activities` route
- [ ] Create `/api/agent/stats` route
- [ ] Create `/api/agent/todos` routes (CRUD)
- [ ] Create `/api/agent/clients` route
- [ ] Create `/api/admin/website-stats` route

### Phase 2: Activity Tracking Hooks
- [ ] Add tracking to email send route
- [ ] Add tracking to SMS send route
- [ ] Add tracking to voicemail campaign
- [ ] Add tracking to article publish
- [ ] Add tracking to agreement signing
- [ ] Add tracking to chat messages
- [ ] Add tracking to CMA generation

### Phase 3: Agent Dashboard UI
- [ ] Create `AgentNav.tsx` component
- [ ] Create `/agent/page.tsx` (dashboard)
- [ ] Create `AgentStatsCarousel.tsx`
- [ ] Create `AgentTodoList.tsx`
- [ ] Create `ClientDigest.tsx`
- [ ] Create `ActivityTimeline.tsx`

### Phase 4: CRM Migration
- [ ] Copy `/admin/crm/page.tsx` → `/agent/crm/page.tsx`
- [ ] Add `userId` filtering to all contact queries
- [ ] Update navigation links
- [ ] Test all CRM features with agent scoping

### Phase 5: CMS Migration
- [ ] Copy `/admin/cms` → `/agent/cms`
- [ ] Add draft-only mode for agents
- [ ] Create admin approval workflow
- [ ] Update article model with `authorId` field
- [ ] Update `/admin/cms/page.tsx` with approval UI

### Phase 6: Admin Dashboard Overhaul
- [ ] Update `AdminNav.tsx` (remove CRM/CMS tabs)
- [ ] Update `/admin/page.tsx` with website stats
- [ ] Create `WebsiteStats.tsx` component
- [ ] Add Agent Applications link to AdminNav

### Phase 7: Access Control
- [ ] Add middleware to protect `/agent` routes (realEstateAgent role)
- [ ] Add middleware to protect `/admin` routes (isAdmin)
- [ ] Update navigation to show/hide based on roles
- [ ] Test role-based access

### Phase 8: Testing & Deployment
- [ ] Test agent dashboard with test user
- [ ] Test activity tracking across all features
- [ ] Test admin dashboard with real data
- [ ] Test role-based access control
- [ ] Deploy to production

---

## 🎨 UI MOCKUPS

### AgentNav (Similar to AdminNav style)
```
┌─────────────────────────────────────────────┐
│  Dashboard  │  CRM  │  CMS                  │
│  ========                                    │
└─────────────────────────────────────────────┘
```

### Agent Dashboard (`/agent`)
```
┌─────────────────────────────────────────────┐
│  Agent Dashboard                            │
│  Your productivity hub                      │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─ Stats Carousel ─────────────────────┐  │
│  │  📧  Emails Sent This Week    42     │  │
│  │  ○ ○ ● ○ ○ ○ ○                       │  │
│  └──────────────────────────────────────┘  │
│                                             │
│  ┌─ To-Do List ───────────┬─ Clients ───┐  │
│  │                        │              │  │
│  │  • Follow up with John │  John Doe    │  │
│  │    Due: Today          │  Buyer       │  │
│  │                        │  Last: 2 days│  │
│  │  • Schedule showing    │              │  │
│  │    Due: Tomorrow       │  Jane Smith  │  │
│  │                        │  Seller      │  │
│  │  • Submit offer        │  Last: 1 week│  │
│  │    Due: Dec 25         │              │  │
│  │                        │              │  │
│  └────────────────────────┴──────────────┘  │
└─────────────────────────────────────────────┘
```

### Admin Dashboard (`/admin`)
```
┌─────────────────────────────────────────────┐
│  Admin Dashboard                            │
│  Website analytics & management             │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─ Website Metrics ────────────────────┐  │
│  │  Users: 1,234  │ Sessions: 45       │  │
│  │  Chats: 5,678  │ Swipes: 12,345     │  │
│  └──────────────────────────────────────┘  │
│                                             │
│  ┌─ Content ──────────────────────────┐    │
│  │  Articles: 156  │ Views: 23,456    │    │
│  └──────────────────────────────────────┘  │
│                                             │
│  ┌─ Listings ─────────────────────────┐    │
│  │  Total: 81,052  │ Cities: 47       │    │
│  └──────────────────────────────────────┘  │
│                                             │
│  ┌─ Team ────────────────────────────┐     │
│  │  Agents: 5  │ Pending Apps: 2    │      │
│  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

---

## 📊 METRICS & ANALYTICS

### Agent Performance Metrics

**Weekly Report:**
- Contacts added
- Emails sent
- SMS sent
- Voicemail drops
- Phone calls
- Appointments scheduled
- Showings completed
- Offers submitted
- Contracts signed
- AI usage (chat, articles, CMAs)

**Monthly Report:**
- Total activities
- Client conversions (endUser → client)
- Active listings
- Closed transactions
- Commission revenue
- Average response time
- Client satisfaction (if tracked)

**Leaderboard (Team-wide):**
- Most emails sent
- Most SMS sent
- Most articles written
- Most clients signed
- Most transactions closed
- Highest revenue
- Best response time

### Team Leader Metrics

**Team Dashboard (`/team`):**
- Team-wide stats
- Individual agent performance
- Pending applications
- Team activity timeline
- Revenue by agent
- Client distribution

---

## 🔐 PERMISSIONS & ACCESS CONTROL

### Role-Based Access:

**Admin (isAdmin: true):**
- Full access to `/admin`
- Website-wide analytics
- Agent application approval
- System settings
- Can access all agent/team dashboards (view-only)

**Team Leader (isTeamLeader: true):**
- Access to `/team` dashboard
- View team member stats
- Manage sub-teams
- Review agent applications (for their team)
- Cannot access admin dashboard

**Real Estate Agent (roles includes "realEstateAgent"):**
- Access to `/agent` dashboard
- Personal CRM (own contacts only)
- Personal CMS (own articles only)
- Cannot view other agents' data

**End User (roles: ["endUser"]):**
- Access to `/dashboard` (user dashboard)
- Cannot access `/agent` or `/admin`

### Middleware Implementation:

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect /admin routes
  if (pathname.startsWith("/admin")) {
    return requireAdmin(request);
  }

  // Protect /agent routes
  if (pathname.startsWith("/agent")) {
    return requireAgent(request);
  }

  // Protect /team routes
  if (pathname.startsWith("/team")) {
    return requireTeamLeader(request);
  }

  return NextResponse.next();
}
```

---

## 🚀 DEPLOYMENT PLAN

### Development Phase (1-2 weeks):
1. Create models and API routes
2. Build activity tracking hooks
3. Create agent dashboard UI
4. Migrate CRM/CMS to agent level
5. Test with development data

### Testing Phase (3-5 days):
1. Create test agents with different roles
2. Test all activity tracking
3. Test role-based access
4. Performance testing (database queries)
5. Fix bugs

### Production Deployment:
1. Database migration (create new collections)
2. Deploy backend changes
3. Deploy frontend changes
4. Verify admin dashboard still works
5. Create your team and assign yourself
6. Monitor for errors

---

## 📚 RELATED DOCUMENTATION

- [AGENT_APPLICATION_SYSTEM.md](./AGENT_APPLICATION_SYSTEM.md) - Agent onboarding flow
- [CRM_OVERVIEW.md](../crm/CRM_OVERVIEW.md) - CRM features and architecture
- [CMS_AND_INSIGHTS_COMPLETE.md](../cms/CMS_AND_INSIGHTS_COMPLETE.md) - CMS features
- [DATABASE_MODELS.md](../architecture/DATABASE_MODELS.md) - User and Team models
- [AUTHENTICATION.md](./AUTHENTICATION.md) - Role-based access

---

## ✅ SUCCESS CRITERIA

**Agent Dashboard Must:**
- [ ] Show accurate activity stats for each agent
- [ ] Allow agents to manage their own contacts
- [ ] Track all CRM activities (email, SMS, voicemail)
- [ ] Provide to-do list functionality
- [ ] Display client digest with agreement status
- [ ] Work on mobile and desktop
- [ ] Load in <2 seconds

**Admin Dashboard Must:**
- [ ] Show website-wide metrics
- [ ] Aggregate team performance
- [ ] Display pending agent applications
- [ ] Load in <2 seconds
- [ ] Update in real-time (or near real-time)

**Security Must:**
- [ ] Enforce role-based access
- [ ] Prevent agents from accessing other agents' data
- [ ] Prevent unauthorized access to admin routes
- [ ] Log all sensitive operations

---

**Ready to begin implementation?**

Let me know and I'll start building the models and API routes!
