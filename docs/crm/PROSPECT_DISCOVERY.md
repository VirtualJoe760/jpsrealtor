# Prospect Discovery

**The Intelligent Contact Organization & Campaign Building System**

---

## Executive Summary

**Prospect Discovery** is a revolutionary contact management and organization system designed for real estate agents who need to quickly transform messy contact lists into organized, actionable calling campaigns. Using a swipe-based interface inspired by modern mobile UX patterns, agents can rapidly categorize contacts, apply labels, and launch targeted outreach campaigns.

### Key Innovation

Traditional CRM systems force users to manually organize contacts one-by-one through complex forms and dropdowns. Prospect Discovery introduces a **"Contact Bottom Panel"** - a card-based swipe interface that allows agents to process hundreds of contacts in minutes, not hours.

### Core Value Proposition

- ⚡ **10x Faster** - Organize 100 contacts in 5 minutes vs. 50 minutes traditional methods
- 🧹 **Automatic Cleaning** - Intelligent data normalization handles messy imports
- 🎯 **Campaign-Ready** - Direct path from contact upload to calling campaign
- 📱 **Mobile-First** - Built for the way agents actually work (on their phones)
- 🔖 **Flexible Tagging** - Create unlimited custom labels on-the-fly

---

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [Solution Overview](#solution-overview)
3. [Contact Upload Intelligence](#contact-upload-intelligence)
4. [Contact Bottom Panel](#contact-bottom-panel)
5. [User Flows](#user-flows)
6. [Technical Architecture](#technical-architecture)
7. [Implementation Phases](#implementation-phases)
8. [UI/UX Design](#uiux-design)
9. [Integration Points](#integration-points)
10. [Future Enhancements](#future-enhancements)

---

## Problem Statement

### The Agent's Reality

**Scenario:** Sarah, a real estate agent, wants to launch a "sphere of influence" calling campaign to generate business. She has 2,500 contacts in her Google Contacts, accumulated over 10 years.

**Current Problems:**

1. **Messy Data**
   - Contacts have emojis in names (🔥Firekat🔥)
   - Multiple phone numbers separated by weird delimiters (":::")
   - Organization-only entries (no person name)
   - Duplicate entries
   - Test numbers (555-555-5555)
   - Special characters (/ Campbell)

2. **No Organization**
   - Contacts are a flat list
   - No way to identify "High School Friends" vs "Past Clients" vs "Vendors"
   - Can't create targeted campaigns without manual sorting

3. **Time-Consuming Process**
   - Would take 8+ hours to manually sort 2,500 contacts
   - Traditional CRM forms are slow (click, select, type, save, repeat)
   - No bulk operations that maintain quality control

4. **Campaign Friction**
   - Can't quickly create "High School Friends Calling Campaign"
   - Must manually add contacts one-by-one to campaigns
   - No way to visualize progress while organizing

### What Agents Need

> "I want to upload my messy contacts, swipe through them like Tinder to organize them into calling lists, then immediately start dialing."

---

## Solution Overview

### Prospect Discovery Workflow

```
┌─────────────────────┐
│  Upload Contacts    │
│   (CSV/Google)      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Smart Analysis     │
│  - Detect issues    │
│  - Clean data       │
│  - Flag for review  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Review Dashboard   │
│  - Show statistics  │
│  - Offer filters    │
│  - Confirm import   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Contact Bottom Panel│
│  - Swipe interface  │
│  - Apply labels     │
│  - Build lists      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Create Campaign    │
│  - Select label     │
│  - Choose strategy  │
│  - Start calling    │
└─────────────────────┘
```

### Three-Phase System

#### Phase 1: Intelligent Upload
Contact files are analyzed, cleaned, and prepared for review with automatic issue detection.

#### Phase 2: Rapid Organization
Contact Bottom Panel enables swipe-based categorization at 10x speed.

#### Phase 3: Campaign Launch
One-click campaign creation from organized contact labels.

---

## Contact Upload Intelligence

### Automatic Data Cleaning Rules

#### 1. **Emoji Detection** (Personal vs Business)

**Rule:** Contacts with emojis are flagged as "potentially personal"

**User Prompt:**
```
⚠️ Personal Contacts Detected

We found 47 contacts with emojis in their names.
These may be personal contacts, not business leads.

Examples:
- 🔥Firekat🔥
- 🐈🍖
- Mom ❤️

□ Include personal contacts
□ Exclude personal contacts
□ Let me review individually
```

**Logic:**
- Regex: `/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u`
- Auto-apply "Personal" label if user includes them
- Strip emojis from display name
- Keep original name in "nickname" field

---

#### 2. **Name Cleaning**

**Rules:**

| Issue | Example | Solution |
|-------|---------|----------|
| Leading slash | `"/ Campbell"` | Remove slash → `"Campbell"` |
| Trailing spaces | `"John   "` | Trim → `"John"` |
| Special chars | `"Adam (Joe's Friend)"` | Remove → `"Adam Joe's Friend"` |
| ALL CAPS | `"JOHN SMITH"` | Title case → `"John Smith"` |
| No name | `"   "` | Flag for review or reject |

**Implementation:**
```typescript
function cleanName(name: string): string {
  return name
    .replace(/^[\/\*]+/, '') // Remove leading special chars
    .trim()
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
```

---

#### 3. **Organization-Only Contacts**

**Rule:** Contacts with organization but no first/last name are categorized as "Business Entities"

**Detection:**
- `firstName === '' && lastName === '' && organizationName !== ''`

**User Options:**

**Option A: Auto-Convert**
```
Organization: "Terminex"
→
First Name: "Terminex"
Last Name: "Contact"
Tags: ["Business Entity", "Vendor"]
```

**Option B: Review Panel**
```
🏢 Organization-Only Contacts (127 found)

□ "Terminex" - (877) 441-6176
   → Suggested: Vendor

□ "Suncity Front Gate" - (760) 360-6026
   → Suggested: Property Service

[Auto-categorize all] [Review individually]
```

**Suggested Categories:**
- Vendor (pest control, lawn service, etc.)
- Utility (electric, water, cable)
- Property Service (gate, HOA, management)
- Business Lead (potential client company)

---

#### 4. **Multiple Phone Numbers**

**Rule:** Split phone numbers separated by " ::: " into individual records or phone number fields

**Example Input:**
```csv
First Name: John
Last Name: Smith
Phone 1 - Label: mojoNumber
Phone 1 - Value: 7603404079 ::: 7608370374 ::: 6195551234
```

**Detection:**
```typescript
const phones = phoneValue.split(':::').map(p => p.trim()).filter(p => p);
```

**User Options:**

**Option A: Multiple Entries (Recommended)**
```
Create 3 separate contacts:

1. John Smith - (760) 340-4079 [Mobile]
2. John Smith - (760) 837-0374 [Phone 2]
3. John Smith - (619) 555-1234 [Phone 3]

Tags: ["Duplicate - Multi Phone"]
```

**Option B: Single Entry with Multiple Phones**
```
Contact: John Smith
Phones:
  - Mobile: (760) 340-4079
  - Home: (760) 837-0374
  - Work: (619) 555-1234
```

**Label Mapping:**
- `mojoNumber` → Mobile
- `Home` → Home
- `Work` → Work
- `Mobile` → Mobile
- `Other` → Phone 2, Phone 3, etc.
- *No label* → Phone 1, Phone 2, Phone 3 (sequential)

---

#### 5. **Phone Number Normalization**

**Rule:** All phone numbers are normalized to E.164 format (+1XXXXXXXXXX)

**Input Formats Handled:**
```
(760) 340-4079    → +17603404079
760-340-4079      → +17603404079
7603404079        → +17603404079
1 (760) 340-4079  → +17603404079
+1 (760) 340-4079 → +17603404079
```

**Validation:**
- Must be 10 digits (or 11 with leading "1")
- Must be numeric after removing special chars
- Reject: "555-555-5555" (test numbers)
- Reject: "000-000-0000" (placeholder)
- Reject: Less than 10 digits

---

#### 6. **Duplicate Detection**

**Rule:** Contacts with identical phone numbers (after normalization) are flagged as duplicates

**Detection Strategy:**
1. Normalize all phone numbers to E.164
2. Hash: `phone_number → SHA256`
3. Check against existing contacts
4. If match found → Flag as duplicate

**User Review Panel:**
```
🔄 Duplicates Detected (23 contacts)

Contact 1:
  John Smith - (760) 340-4079
  Source: Google Contacts
  Last Modified: 2025-12-15

Contact 2:
  John S - (760) 340-4079
  Source: Current CSV Import
  Last Modified: 2026-01-08

Actions:
□ Keep Contact 1 (existing)
□ Keep Contact 2 (new)
□ Merge contacts
□ Keep both (different people)
```

**Merge Logic:**
- Combine all phone numbers
- Combine all emails
- Use most complete name
- Preserve all tags/labels
- Keep most recent "Last Modified"

---

#### 7. **Junk Entry Filtering**

**Rule:** Automatically filter out obvious junk/test entries

**Junk Patterns:**
- Phone: `555-555-5555`, `000-000-0000`, `123-456-7890`
- Name: `Aaaaaaaaiaiaiaia`, `Test Contact`, `asdfasdf`
- Email: `test@test.com`, `noemail@domain.com`

**Filter Logic:**
```typescript
function isJunkEntry(contact: Contact): boolean {
  const junkPhones = ['5555555555', '0000000000', '1234567890'];
  const junkNames = /^(test|aaaa|asdf|xxx)/i;

  const phone = contact.phone.replace(/\D/g, '');
  const name = contact.firstName + contact.lastName;

  return junkPhones.includes(phone) || junkNames.test(name);
}
```

**User Notification:**
```
🗑️ Filtered 12 junk entries

- "Aaaaaaaaiaiaiaia" - (555) 555-5555
- "Test Contact" - (000) 000-0000
- "asdfasdf" - (123) 456-7890

[Review filtered entries] [Confirm exclusion]
```

---

#### 8. **No Phone Number Handling**

**Rule:** Contacts without any phone number are flagged for review

**Options:**

**A. Auto-Exclude** (Default for calling campaigns)
```
⚠️ 89 contacts have no phone number

These contacts cannot be used for calling campaigns.

□ Exclude from import
□ Import anyway (for email campaigns)
□ Review individually
```

**B. Email-Only Import**
- Import to CRM
- Tag as "Email Only"
- Exclude from calling campaigns
- Include in email campaigns

---

### Import Summary Dashboard

After analysis, show user a comprehensive summary:

```
═══════════════════════════════════════════════════════════
📊 CONTACT IMPORT ANALYSIS
═══════════════════════════════════════════════════════════

📁 File: contacts.csv
📈 Total Rows: 5,056

✅ READY TO IMPORT: 3,847 (76.1%)

⚠️  REQUIRES REVIEW: 1,209 (23.9%)
    - 47 Personal contacts (emojis)
    - 127 Organization-only
    - 342 Multiple phone numbers
    - 23 Duplicates
    - 89 No phone number
    - 581 Other issues

🗑️  AUTO-FILTERED: 12 (0.2%)
    - 12 Junk/test entries

═══════════════════════════════════════════════════════════

[Review All Issues] [Import Ready Contacts] [Cancel]
```

---

## Contact Bottom Panel

### Design Philosophy

**Inspiration:** Tinder, Instagram Reels, TikTok - apps that allow rapid decision-making through swipe gestures.

**Core Principle:** Reduce cognitive load by presenting one contact at a time with a simple binary decision: Include or Exclude.

### Visual Layout

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  [Contact Counter: 47 / 500]        [Labels ▼]     │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │                                             │   │
│  │         JOHN SMITH                          │   │
│  │                                             │   │
│  │  📞 (760) 340-4079 [Mobile]                │   │
│  │  📧 jsmith@gmail.com                        │   │
│  │  🏢 Keller Williams                         │   │
│  │                                             │   │
│  │  📝 Notes: Met at open house 2024          │   │
│  │                                             │   │
│  │  🏷️ Tags: [Past Client] [VIP]              │   │
│  │                                             │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ┌─────────────┐              ┌─────────────┐     │
│  │     ✕       │              │      ✓      │     │
│  │   SKIP      │              │   APPLY     │     │
│  │  [LABEL]    │              │  [LABEL]    │     │
│  └─────────────┘              └─────────────┘     │
│                                                     │
│  [⬅ Undo Last] [Search] [List View] [Done]        │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

### Interaction Patterns

#### 1. **Swipe Right** - Apply Label
- **Touch:** Swipe card right
- **Keyboard:** → (Right arrow)
- **Button:** Click ✓ APPLY
- **Result:**
  - Label applied to contact
  - Card slides right with animation
  - Next contact appears
  - Counter increments

#### 2. **Swipe Left** - Skip
- **Touch:** Swipe card left
- **Keyboard:** ← (Left arrow)
- **Button:** Click ✕ SKIP
- **Result:**
  - Contact skipped (no label applied)
  - Card slides left with animation
  - Next contact appears
  - Counter increments

#### 3. **Undo**
- **Button:** "⬅ Undo Last"
- **Keyboard:** Ctrl+Z / Cmd+Z
- **Result:**
  - Previous contact returns
  - Previous action reversed
  - Counter decrements
  - Stack supports 10 levels of undo

#### 4. **Label Dropdown**
- **Location:** Top-right corner
- **Function:** Switch active label being applied
- **Options:**
  - Select existing label
  - Create new label (+ icon)
  - Edit label name/color
  - Delete label

---

### Swipe Gestures

#### Touch Events
```typescript
const handleTouchStart = (e: TouchEvent) => {
  startX = e.touches[0].clientX;
  startY = e.touches[0].clientY;
};

const handleTouchMove = (e: TouchEvent) => {
  const currentX = e.touches[0].clientX;
  const currentY = e.touches[0].clientY;

  const deltaX = currentX - startX;
  const deltaY = currentY - startY;

  // Update card position
  cardTransform = `translateX(${deltaX}px) rotate(${deltaX / 20}deg)`;

  // Visual feedback
  if (Math.abs(deltaX) > 50) {
    if (deltaX > 0) {
      showApplyIndicator();
    } else {
      showSkipIndicator();
    }
  }
};

const handleTouchEnd = (e: TouchEvent) => {
  const deltaX = currentX - startX;

  if (Math.abs(deltaX) > SWIPE_THRESHOLD) {
    if (deltaX > 0) {
      applyLabel();
    } else {
      skipContact();
    }
  } else {
    // Reset card position
    resetCardPosition();
  }
};
```

#### Animation
```typescript
// Swipe Right Animation
const animateApply = () => {
  gsap.to(card, {
    x: window.innerWidth,
    rotation: 45,
    opacity: 0,
    duration: 0.3,
    ease: 'power2.out',
    onComplete: () => {
      loadNextContact();
    }
  });
};

// Swipe Left Animation
const animateSkip = () => {
  gsap.to(card, {
    x: -window.innerWidth,
    rotation: -45,
    opacity: 0,
    duration: 0.3,
    ease: 'power2.out',
    onComplete: () => {
      loadNextContact();
    }
  });
};
```

---

### Label Management

#### Creating Labels On-the-Fly

**Workflow:**
1. User swipes through contacts
2. Realizes they need a new category (e.g., "College Friends")
3. Clicks "+ New Label" in dropdown
4. Modal appears with label creator
5. Types label name, selects color
6. Label is created and immediately becomes active
7. Next swipe applies the new label

**Label Creator UI:**
```
┌─────────────────────────────────────┐
│  Create New Label                   │
├─────────────────────────────────────┤
│                                     │
│  Label Name:                        │
│  ┌───────────────────────────────┐ │
│  │ High School Friends           │ │
│  └───────────────────────────────┘ │
│                                     │
│  Color:                             │
│  ⬤ 🔴 🟠 🟡 🟢 🔵 🟣 🟤 ⚫ ⚪       │
│                                     │
│  Icon (optional):                   │
│  🏫 👥 📞 🎓 💼 🏡                  │
│                                     │
│  [Cancel]           [Create Label]  │
│                                     │
└─────────────────────────────────────┘
```

#### Pre-defined Label Templates

**Categories:**

**Personal Sphere:**
- 🎓 High School Friends
- 🏫 College Friends
- 👥 Family
- 🏡 Neighbors
- 🏋️ Gym/Sports Friends

**Business Sphere:**
- 💼 Past Clients
- 🌟 VIP Clients
- 🏠 Potential Buyers
- 📈 Potential Sellers
- 🏢 Business Partners

**Professional Network:**
- 🤝 Lenders
- 📄 Title Companies
- 🔧 Contractors
- 🏗️ Home Inspectors
- 📸 Photographers

**Lead Sources:**
- 🌐 Zillow Leads
- 📱 Social Media Leads
- 🏘️ Open House Visitors
- 📞 Cold Calls
- 🎯 Referrals

---

### Alternative Views

#### List View

For users who prefer bulk operations:

```
┌───────────────────────────────────────────────────────┐
│  [Grid View] [List View] [Card View]    🔍 Search     │
├───────────────────────────────────────────────────────┤
│                                                       │
│  ☑ ALL (500)  Select: All | None | Invert           │
│                                                       │
│  ☑ John Smith        (760) 340-4079   [Past Client] │
│  ☑ Sarah Johnson     (858) 123-4567   [VIP]         │
│  □ Mike Williams     (619) 555-0123   [New Lead]    │
│  ☑ Emma Davis        (760) 222-3333   [Referral]    │
│  □ Robert Brown      (442) 444-5555                  │
│                                                       │
│  [Selected: 3]                                        │
│  [Apply Label ▼] [Add to Campaign] [Export]          │
│                                                       │
└───────────────────────────────────────────────────────┘
```

**Features:**
- Multi-select with checkboxes
- Search/filter
- Sort by name, date added, phone, label
- Bulk label application
- Quick actions (export, delete, merge)

---

## User Flows

### Flow 1: Basic Contact Organization

**Persona:** Sarah, Realtor Agent
**Goal:** Organize imported contacts into "High School Friends" calling list

**Steps:**

1. **Upload**
   ```
   Sarah clicks "Import Contacts"
   → Uploads contacts.csv (2,500 rows)
   → System analyzes for 30 seconds
   ```

2. **Review Issues**
   ```
   System shows: "47 personal contacts detected"
   Sarah clicks: "Include personal contacts"
   System shows: "127 organization-only contacts"
   Sarah clicks: "Auto-categorize as vendors"
   ```

3. **Confirm Import**
   ```
   System shows: "3,847 contacts ready to import"
   Sarah clicks: "Import Contacts"
   → Contacts imported to CRM
   ```

4. **Open Contact Panel**
   ```
   Sarah clicks: "Organize Contacts"
   → Contact Bottom Panel opens
   → First contact card appears
   ```

5. **Create Label**
   ```
   Sarah clicks: "+ New Label"
   → Types: "High School Friends"
   → Selects color: 🔵 Blue
   → Clicks: "Create Label"
   ```

6. **Swipe Through Contacts**
   ```
   Contact 1: John Smith - "Yes, high school friend"
   → Swipes RIGHT
   → Label applied ✓

   Contact 2: Sarah Johnson - "Don't know this person"
   → Swipes LEFT
   → No label applied

   Contact 3: Mike Williams - "Yes, played football together"
   → Swipes RIGHT
   → Label applied ✓

   [Continues for 30 contacts, takes 3 minutes]
   ```

7. **Create Campaign**
   ```
   Sarah clicks: "Done"
   → Panel closes
   Sarah navigates to: "Campaigns"
   → Clicks: "Create Campaign"
   → Campaign Type: "Calling Campaign"
   → Contact Source: "Label: High School Friends"
   → 30 contacts added automatically
   → Clicks: "Start Calling"
   ```

8. **Start Calling**
   ```
   Campaign dashboard opens
   → Shows first contact: John Smith
   → Sarah clicks phone icon
   → Device dials: (760) 340-4079
   → Sarah makes call
   → Records outcome
   → Next contact appears
   ```

**Time:** 10 minutes total (vs. 2 hours manually)

---

### Flow 2: Review & Merge Duplicates

**Persona:** Mark, Team Lead
**Goal:** Clean up team's shared contact database before import

**Steps:**

1. **Upload with Duplicate Detection**
   ```
   Mark uploads team-contacts.csv (5,000 rows)
   System detects 143 duplicate phone numbers
   ```

2. **Duplicate Review Panel**
   ```
   ┌─────────────────────────────────────────┐
   │  🔄 Duplicates Found (143)              │
   ├─────────────────────────────────────────┤
   │                                         │
   │  Contact A:                             │
   │  John Smith - (760) 340-4079            │
   │  Email: jsmith@gmail.com                │
   │  Source: Google Contacts (2024-03-15)   │
   │  Labels: [Past Client]                  │
   │                                         │
   │  Contact B:                             │
   │  John S - (760) 340-4079                │
   │  Email: john.smith@outlook.com          │
   │  Source: CSV Import (2026-01-08)        │
   │  Labels: [New Lead]                     │
   │                                         │
   │  ┌─────────────────────────────────┐   │
   │  │ ✅ Merge Contacts               │   │
   │  │                                 │   │
   │  │ Merged Result:                  │   │
   │  │ John Smith                      │   │
   │  │ Phones: (760) 340-4079          │   │
   │  │ Emails: jsmith@gmail.com,       │   │
   │  │         john.smith@outlook.com  │   │
   │  │ Labels: [Past Client], [Lead]   │   │
   │  │                                 │   │
   │  └─────────────────────────────────┘   │
   │                                         │
   │  [Keep A] [Keep B] [Merge] [Both]      │
   │                                         │
   └─────────────────────────────────────────┘
   ```

3. **Bulk Actions**
   ```
   Mark reviews first 10 duplicates manually
   Sees pattern: Most are legitimate merges
   Clicks: "Auto-merge remaining 133 duplicates"
   → System merges using smart rules
   → Shows summary of merges
   ```

4. **Confirm Import**
   ```
   Original: 5,000 contacts
   After merge: 4,857 unique contacts
   143 duplicates merged

   Mark clicks: "Confirm Import"
   ```

**Time:** 15 minutes (vs. 6 hours manual review)

---

### Flow 3: Multi-Phone Contact Handling

**Persona:** Lisa, Luxury Agent
**Goal:** Import high-net-worth clients with multiple contact numbers

**Steps:**

1. **Upload Detection**
   ```
   Lisa uploads vip-clients.csv
   System detects: "342 contacts have multiple phone numbers"
   ```

2. **Multi-Phone Review**
   ```
   ┌─────────────────────────────────────────┐
   │  📱 Multiple Phone Numbers (342)        │
   ├─────────────────────────────────────────┤
   │                                         │
   │  John Smith                             │
   │  Phones (separated by :::):             │
   │  • 760-340-4079 [Mobile]                │
   │  • 760-555-1234 [Home]                  │
   │  • 619-777-8888 [Work]                  │
   │                                         │
   │  Import Options:                        │
   │  ⚪ Create 3 separate contacts         │
   │  ⦿ Single contact, 3 phone fields       │
   │  ⚪ Let me choose per contact           │
   │                                         │
   │  [Apply to All]  [Review Each]          │
   │                                         │
   └─────────────────────────────────────────┘
   ```

3. **Smart Import**
   ```
   Lisa selects: "Single contact, 3 phone fields"
   System imports:

   Contact: John Smith
   Mobile: (760) 340-4079
   Home: (760) 555-1234
   Work: (619) 777-8888

   → All 3 numbers preserved
   → Labels applied automatically
   → Can call any number in campaign
   ```

**Time:** 5 minutes

---

## Technical Architecture

### Data Models

#### Contact Model (Enhanced)
```typescript
interface Contact {
  _id: ObjectId;
  userId: ObjectId;
  teamId?: ObjectId;

  // Personal Info
  firstName: string;
  lastName: string;
  middleName?: string;
  nickname?: string;
  originalName?: string; // Before cleaning

  // Contact Info
  phones: Phone[];
  emails: Email[];
  addresses: Address[];

  // Organization
  organizationName?: string;
  organizationTitle?: string;
  organizationDepartment?: string;

  // Classification
  labels: ObjectId[]; // References to Label model
  tags: string[]; // Freeform tags
  contactType: 'person' | 'organization' | 'personal' | 'business';
  isPersonal: boolean; // Flag for emoji/personal contacts

  // Data Quality
  dataQuality: {
    score: number; // 0-100
    issues: string[]; // ['emoji_in_name', 'multiple_phones', etc.]
    cleanedAt?: Date;
    verifiedAt?: Date;
  };

  // Source Tracking
  source: 'manual' | 'csv_import' | 'google_contacts' | 'api';
  importBatchId?: ObjectId;
  originalData?: any; // Raw import data

  // Relationships
  duplicateOf?: ObjectId; // If merged
  relatedContacts?: ObjectId[]; // Associated contacts

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastContactedAt?: Date;
  notes?: string;
}

interface Phone {
  number: string; // E.164 format
  label: 'mobile' | 'home' | 'work' | 'other';
  isPrimary: boolean;
  isValid: boolean;
  country: string; // 'US'
}

interface Email {
  address: string;
  label: 'personal' | 'work' | 'other';
  isPrimary: boolean;
  isValid: boolean;
}

interface Address {
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  label: 'home' | 'work' | 'other';
  isPrimary: boolean;
}
```

#### Label Model
```typescript
interface Label {
  _id: ObjectId;
  userId: ObjectId;
  teamId?: ObjectId;

  name: string; // "High School Friends"
  slug: string; // "high-school-friends"
  color: string; // "#3B82F6"
  icon?: string; // "🎓" or icon name
  description?: string;

  // Stats
  contactCount: number; // Denormalized

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  isSystem: boolean; // Pre-defined vs user-created
}
```

#### Import Batch Model
```typescript
interface ImportBatch {
  _id: ObjectId;
  userId: ObjectId;
  teamId?: ObjectId;

  // File Info
  fileName: string;
  fileSize: number;
  fileHash: string; // MD5 for duplicate detection
  source: 'csv' | 'google' | 'outlook' | 'api';

  // Processing
  status: 'analyzing' | 'pending_review' | 'importing' | 'completed' | 'failed';
  totalRows: number;
  processedRows: number;
  successCount: number;
  errorCount: number;

  // Analysis Results
  analysis: {
    issues: {
      noName: number;
      noPhone: number;
      multiplePhones: number;
      multipleEmails: number;
      emojis: number;
      organizationOnly: number;
      duplicates: number;
      junk: number;
    };
    readyToImport: number;
    requiresReview: number;
    autoFiltered: number;
  };

  // User Decisions
  userChoices: {
    includePersonalContacts: boolean;
    multiplePhoneStrategy: 'separate' | 'single' | 'manual';
    duplicateStrategy: 'auto_merge' | 'manual' | 'keep_all';
    organizationStrategy: 'auto_convert' | 'skip' | 'manual';
  };

  // Results
  importedContacts: ObjectId[];
  skippedContacts: any[];
  errors: Array<{
    row: number;
    contact: any;
    error: string;
  }>;

  // Metadata
  createdAt: Date;
  completedAt?: Date;
}
```

---

### API Endpoints

#### Contact Import Flow

```typescript
// 1. Upload & Analyze
POST /api/contacts/import/upload
Body: FormData { file: CSV }
Response: {
  batchId: string;
  status: 'analyzing';
  totalRows: number;
}

// 2. Get Analysis Results
GET /api/contacts/import/:batchId/analysis
Response: {
  batchId: string;
  status: 'pending_review';
  totalRows: number;
  analysis: { ... };
  issues: [ ... ];
}

// 3. Submit User Choices
POST /api/contacts/import/:batchId/review
Body: {
  includePersonalContacts: boolean;
  multiplePhoneStrategy: string;
  duplicateStrategy: string;
  organizationStrategy: string;
}
Response: {
  batchId: string;
  status: 'importing';
  message: 'Import started';
}

// 4. Monitor Progress
GET /api/contacts/import/:batchId/progress
Response: {
  batchId: string;
  status: 'importing';
  progress: 67; // percentage
  processedRows: 3400;
  totalRows: 5056;
}

// 5. Get Results
GET /api/contacts/import/:batchId/results
Response: {
  batchId: string;
  status: 'completed';
  successCount: 4847;
  errorCount: 209;
  importedContacts: ObjectId[];
  errors: [ ... ];
}
```

#### Contact Organization

```typescript
// Get contacts for bottom panel
GET /api/contacts/organize
Query: {
  filter?: 'unlabeled' | 'all' | labelId;
  limit?: number; // Default 50
  offset?: number;
}
Response: {
  contacts: Contact[];
  total: number;
  hasMore: boolean;
}

// Apply label (swipe right)
POST /api/contacts/:contactId/labels
Body: {
  labelId: string;
}
Response: {
  success: true;
  contact: Contact;
}

// Bulk apply labels
POST /api/contacts/bulk/labels
Body: {
  contactIds: string[];
  labelId: string;
}
Response: {
  success: true;
  updatedCount: number;
}

// Undo action
POST /api/contacts/organize/undo
Body: {
  actionId: string; // From action history
}
Response: {
  success: true;
  restoredContact: Contact;
}
```

#### Label Management

```typescript
// Create label
POST /api/labels
Body: {
  name: string;
  color: string;
  icon?: string;
}
Response: {
  label: Label;
}

// Get user's labels
GET /api/labels
Response: {
  labels: Label[];
}

// Update label
PATCH /api/labels/:labelId
Body: {
  name?: string;
  color?: string;
  icon?: string;
}
Response: {
  label: Label;
}

// Delete label
DELETE /api/labels/:labelId
Query: {
  action: 'remove' | 'reassign';
  reassignTo?: string; // If action='reassign'
}
Response: {
  success: true;
}
```

---

### State Management

#### Contact Bottom Panel State

```typescript
interface ContactPanelState {
  // Active Data
  currentContact: Contact | null;
  contactQueue: Contact[];
  currentIndex: number;
  totalContacts: number;

  // Active Label
  activeLabel: Label | null;
  availableLabels: Label[];

  // UI State
  isLoading: boolean;
  viewMode: 'card' | 'list' | 'grid';
  isSwipeInProgress: boolean;

  // History (for undo)
  actionHistory: Array<{
    id: string;
    type: 'apply' | 'skip';
    contactId: string;
    labelId?: string;
    timestamp: Date;
  }>;

  // Filters
  filter: {
    showLabeled: boolean;
    showUnlabeled: boolean;
    searchQuery: string;
    selectedLabels: string[];
  };
}

// Actions
type ContactPanelAction =
  | { type: 'LOAD_CONTACTS'; contacts: Contact[] }
  | { type: 'NEXT_CONTACT' }
  | { type: 'APPLY_LABEL'; labelId: string }
  | { type: 'SKIP_CONTACT' }
  | { type: 'UNDO_LAST' }
  | { type: 'SET_ACTIVE_LABEL'; label: Label }
  | { type: 'SET_VIEW_MODE'; mode: 'card' | 'list' | 'grid' }
  | { type: 'UPDATE_FILTER'; filter: Partial<FilterState> };
```

---

### Real-Time Updates

#### WebSocket Events

```typescript
// Client subscribes to import progress
socket.on('import:progress', (data) => {
  // data: { batchId, progress, processedRows, totalRows }
  updateProgressBar(data.progress);
});

// Server emits completion
socket.emit('import:completed', {
  batchId,
  successCount,
  errorCount,
  importedContacts,
});

// Client receives and updates UI
socket.on('import:completed', (data) => {
  showSuccessToast(`Imported ${data.successCount} contacts`);
  redirectToContactPanel();
});
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)

**Goal:** Basic contact import with cleaning

**Deliverables:**
- [ ] Enhanced Contact model with data quality fields
- [ ] Label model
- [ ] Import Batch model
- [ ] CSV parser with cleaning rules
- [ ] Phone number normalization
- [ ] Email validation
- [ ] Basic import API endpoints

**Tasks:**
1. Update database schema
2. Implement cleaning functions
3. Build import analyzer
4. Create import review UI
5. Test with sample CSV files

---

### Phase 2: Contact Bottom Panel (Week 3-4)

**Goal:** Swipe-based contact organization

**Deliverables:**
- [ ] Contact Bottom Panel component
- [ ] Swipe gesture handling
- [ ] Card animation system
- [ ] Label dropdown with creation
- [ ] Undo functionality
- [ ] List/Grid alternative views

**Tasks:**
1. Design and build card UI
2. Implement swipe detection (touch + mouse)
3. Add GSAP animations
4. Build label management
5. Create action history system
6. Add keyboard shortcuts

---

### Phase 3: Intelligence & Automation (Week 5-6)

**Goal:** Smart issue detection and auto-handling

**Deliverables:**
- [ ] Emoji detection
- [ ] Organization-only handling
- [ ] Multiple phone splitting
- [ ] Duplicate detection & merge
- [ ] Junk filtering
- [ ] Batch processing

**Tasks:**
1. Build issue detection engine
2. Create review panels for each issue type
3. Implement merge logic
4. Add bulk operations
5. Create pre-defined label templates

---

### Phase 4: Campaign Integration (Week 7-8)

**Goal:** Seamless flow from organization to calling

**Deliverables:**
- [ ] Label → Campaign integration
- [ ] Auto-populate contacts from label
- [ ] Calling interface enhancements
- [ ] Progress tracking
- [ ] Analytics dashboard

**Tasks:**
1. Update campaign creation flow
2. Add label selector in campaign builder
3. Build contact progress tracker
4. Create campaign analytics
5. Test end-to-end workflow

---

## UI/UX Design

### Design System

#### Colors

**Label Colors:**
```scss
$label-colors: (
  'red': #EF4444,
  'orange': #F97316,
  'yellow': #EAB308,
  'green': #10B981,
  'blue': #3B82F6,
  'indigo': #6366F1,
  'purple': #A855F7,
  'pink': #EC4899,
);
```

**Status Colors:**
```scss
$status-colors: (
  'success': #10B981,
  'warning': #F59E0B,
  'error': #EF4444,
  'info': #3B82F6,
);
```

---

#### Typography

```scss
// Contact Card Name
.contact-name {
  font-size: 28px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.5px;
}

// Contact Details
.contact-detail {
  font-size: 16px;
  font-weight: 400;
  line-height: 1.5;
}

// Labels
.contact-label {
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
```

---

#### Animations

**Swipe Right (Apply):**
```scss
@keyframes swipe-right {
  0% {
    transform: translateX(0) rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: translateX(200%) rotate(45deg);
    opacity: 0;
  }
}
```

**Swipe Left (Skip):**
```scss
@keyframes swipe-left {
  0% {
    transform: translateX(0) rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: translateX(-200%) rotate(-45deg);
    opacity: 0;
  }
}
```

**Card Entrance:**
```scss
@keyframes card-enter {
  0% {
    transform: scale(0.8) translateY(50px);
    opacity: 0;
  }
  100% {
    transform: scale(1) translateY(0);
    opacity: 1;
  }
}
```

---

### Mobile Responsiveness

#### Breakpoints
```scss
$breakpoints: (
  'mobile': 320px,
  'tablet': 768px,
  'desktop': 1024px,
  'wide': 1440px,
);

// Contact Panel Mobile
@media (max-width: 768px) {
  .contact-panel {
    padding: 16px;

    .contact-card {
      width: 100%;
      max-width: none;
      height: 60vh;
    }

    .swipe-buttons {
      flex-direction: row;
      gap: 20px;

      button {
        flex: 1;
        height: 60px;
      }
    }
  }
}
```

---

### Accessibility

#### Keyboard Navigation
```typescript
const keyboardShortcuts = {
  'ArrowRight': () => applyLabel(), // Swipe right
  'ArrowLeft': () => skipContact(),  // Swipe left
  'Space': () => toggleCardFlip(),   // Flip to see details
  'Enter': () => applyLabel(),       // Alternative to right
  'Escape': () => closePanel(),      // Close panel
  'z': (e) => e.ctrlKey && undo(),   // Undo (Ctrl+Z)
  'Tab': () => focusNextButton(),    // Tab through actions
};
```

#### Screen Reader Support
```typescript
// Announce contact info
<div
  role="article"
  aria-label={`Contact: ${firstName} ${lastName}`}
  aria-describedby="contact-details"
>
  <h2 id="contact-name">{firstName} {lastName}</h2>
  <div id="contact-details">
    <p aria-label="Phone number">{formatPhone(phone)}</p>
    <p aria-label="Email">{email}</p>
    <p aria-label="Organization">{organization}</p>
  </div>
</div>

// Announce actions
<button
  aria-label={`Apply ${activeLabel.name} label to ${contact.name}`}
  onClick={applyLabel}
>
  Apply Label
</button>
```

---

## Integration Points

### 1. Campaign Builder

**Integration:** Label selector in campaign creation

```typescript
// Campaign creation form
<FormField>
  <Label>Contact Source</Label>
  <Select>
    <Option value="all">All Contacts</Option>
    <Option value="label:high-school">Label: High School Friends</Option>
    <Option value="label:past-clients">Label: Past Clients</Option>
    <Option value="tag:vip">Tag: VIP</Option>
    <Option value="custom">Custom Filter...</Option>
  </Select>
</FormField>

// Auto-populate contacts when label selected
useEffect(() => {
  if (selectedSource.startsWith('label:')) {
    const labelId = selectedSource.split(':')[1];
    loadContactsByLabel(labelId);
  }
}, [selectedSource]);
```

---

### 2. Calling Interface

**Integration:** Display label context during calls

```typescript
// During call, show contact's labels
<CallScreen>
  <ContactInfo>
    <Name>John Smith</Name>
    <Labels>
      <Badge color="blue">High School Friends</Badge>
      <Badge color="green">Past Client</Badge>
    </Labels>
    <Note>Met at 2019 reunion. Interested in upgrading home.</Note>
  </ContactInfo>

  <CallActions>
    <Button>Call Mobile</Button>
    <Button>Call Home</Button>
    <Button>Send Text</Button>
  </CallActions>
</CallScreen>
```

---

### 3. CRM Dashboard

**Integration:** Contact label widgets

```typescript
// Dashboard widget showing label breakdown
<Widget>
  <Header>Contact Organization</Header>
  <LabelStats>
    <LabelStat label="High School Friends" count={127} color="blue" />
    <LabelStat label="Past Clients" count={342} color="green" />
    <LabelStat label="Potential Sellers" count={89} color="yellow" />
    <LabelStat label="Unlabeled" count={1247} color="gray" />
  </LabelStats>
  <Action>
    <Button onClick={openContactPanel}>Organize Contacts</Button>
  </Action>
</Widget>
```

---

### 4. Google Contacts Sync

**Integration:** Two-way label sync with Google Contact Groups

```typescript
// Map labels to Google Contact groups
const syncLabelsToGoogle = async (userId: string) => {
  const labels = await Label.find({ userId });
  const googleGroups = await google.people.contactGroups.list();

  for (const label of labels) {
    // Find or create corresponding Google group
    const group = googleGroups.find(g => g.name === label.name);

    if (!group) {
      await google.people.contactGroups.create({
        contactGroup: {
          name: label.name,
        }
      });
    }

    // Sync contacts in label to group
    const contacts = await Contact.find({ labels: label._id });
    for (const contact of contacts) {
      await addContactToGroup(contact, group.resourceName);
    }
  }
};
```

---

## Future Enhancements

### Phase 5: AI-Powered Suggestions (Future)

**Feature:** AI suggests labels based on contact data

```typescript
// Analyze contact and suggest labels
const suggestLabels = async (contact: Contact) => {
  const features = extractFeatures(contact);
  // features: { organizationName, jobTitle, email domain, notes, etc. }

  const suggestions = await AI.predict({
    model: 'label-classifier',
    input: features,
  });

  // suggestions: [
  //   { label: 'Past Client', confidence: 0.89 },
  //   { label: 'Potential Seller', confidence: 0.72 },
  //   { label: 'Real Estate Professional', confidence: 0.65 },
  // ]

  return suggestions.filter(s => s.confidence > 0.7);
};
```

**UI Enhancement:**
```
┌─────────────────────────────────────┐
│         JOHN SMITH                  │
│                                     │
│  📞 (760) 340-4079                  │
│  🏢 Keller Williams - Agent         │
│                                     │
│  🤖 AI Suggestions:                 │
│  • Real Estate Professional (89%)   │
│  • Potential Referral (72%)         │
│                                     │
│  [Apply Both] [Review] [Ignore]     │
└─────────────────────────────────────┘
```

---

### Phase 6: Smart Campaigns

**Feature:** Auto-create campaigns from label trends

```typescript
// Detect contact patterns and suggest campaigns
const detectCampaignOpportunities = async (userId: string) => {
  const labels = await Label.find({ userId });

  const opportunities = [];

  for (const label of labels) {
    const contacts = await Contact.find({ labels: label._id });
    const recentlyAdded = contacts.filter(c =>
      isWithinDays(c.createdAt, 7)
    );

    if (recentlyAdded.length >= 10) {
      opportunities.push({
        type: 'new_label_campaign',
        label: label.name,
        contactCount: recentlyAdded.length,
        suggestion: `You've added ${recentlyAdded.length} contacts to "${label.name}" this week. Start a calling campaign?`,
      });
    }
  }

  return opportunities;
};
```

---

### Phase 7: Voice-Based Organization

**Feature:** Use voice commands during contact organization

```typescript
// Voice control for hands-free operation
const voiceCommands = {
  'apply': () => applyLabel(),
  'skip': () => skipContact(),
  'next': () => nextContact(),
  'back': () => previousContact(),
  'label [name]': (name) => switchLabel(name),
  'create label [name]': (name) => createLabel(name),
};

// Speech recognition
const recognition = new SpeechRecognition();
recognition.onresult = (event) => {
  const command = event.results[0][0].transcript.toLowerCase();
  executeVoiceCommand(command);
};
```

---

### Phase 8: Collaborative Organization

**Feature:** Team members can organize shared contacts together

```typescript
// Real-time collaboration
const collaborationSession = {
  teamId: string;
  activeUsers: User[];
  contactQueue: Contact[];
  conflictResolution: 'first-wins' | 'merge-labels' | 'vote';
};

// User A applies label
socket.emit('label:applied', {
  contactId,
  labelId,
  userId: userA.id,
});

// User B sees real-time update
socket.on('label:applied', ({ contactId, labelId }) => {
  updateContactCard(contactId, labelId);
  showToast('John labeled by Sarah');
});
```

---

## Success Metrics

### Key Performance Indicators (KPIs)

#### 1. **Time to Organize**
- **Goal:** Reduce from 2 hours → 10 minutes
- **Measure:** Average time from upload to organized (labeled)
- **Target:** 80% of users complete organization in < 15 minutes

#### 2. **Label Application Rate**
- **Goal:** Maximum contact engagement
- **Measure:** % of contacts that receive at least one label
- **Target:** 75% of uploaded contacts labeled within 7 days

#### 3. **Swipe Speed**
- **Goal:** Fast decision-making
- **Measure:** Average seconds per contact in swipe mode
- **Target:** < 5 seconds per contact

#### 4. **Import Success Rate**
- **Goal:** Handle messy data gracefully
- **Measure:** % of contacts successfully imported
- **Target:** > 90% import success rate

#### 5. **Campaign Creation Speed**
- **Goal:** Fast path to calling
- **Measure:** Time from contact organization → active campaign
- **Target:** < 3 minutes

#### 6. **User Satisfaction**
- **Goal:** Love the feature
- **Measure:** NPS score + feature usage frequency
- **Target:** NPS > 50, 70% of users return weekly

---

## Competitive Analysis

### Current Solutions

| Feature | Salesforce | HubSpot | Our CRM |
|---------|-----------|---------|---------|
| CSV Import | ✅ | ✅ | ✅ |
| Duplicate Detection | ✅ | ✅ | ✅ |
| Contact Cleaning | ⚠️ Basic | ⚠️ Basic | ✅ Advanced |
| Swipe Organization | ❌ | ❌ | ✅ **NEW** |
| Real-time Label Creation | ❌ | ⚠️ Limited | ✅ |
| Campaign Integration | ✅ | ✅ | ✅ |
| Speed (100 contacts) | 30 min | 25 min | **5 min** |

### Our Competitive Advantage

1. **10x Faster** - Swipe-based UI dramatically reduces organization time
2. **Mobile-First** - Built for agents on-the-go
3. **Real Estate Focused** - Pre-defined labels match agent workflows
4. **Intelligent Cleaning** - Handles messy Google Contacts exports
5. **Zero Learning Curve** - Swipe interface is instantly familiar

---

## Conclusion

**Prospect Discovery** transforms contact organization from a dreaded hours-long chore into a quick, engaging, mobile-first experience. By combining intelligent data cleaning with an intuitive swipe interface, we empower real estate agents to rapidly build targeted calling campaigns from messy contact lists.

### Next Steps

1. ✅ **Documentation Complete** - This document
2. ⏳ **Design Mockups** - Create high-fidelity UI designs
3. ⏳ **Technical Spec** - Detailed implementation plan
4. ⏳ **Phase 1 Development** - Contact cleaning & import
5. ⏳ **Phase 2 Development** - Contact Bottom Panel
6. ⏳ **Beta Testing** - Test with 10 real agents
7. ⏳ **Launch** - Roll out to all users

---

**Document Version:** 1.0
**Created:** 2026-01-08
**Author:** AI Development Team
**Status:** Planning
**Target Launch:** Q2 2026
