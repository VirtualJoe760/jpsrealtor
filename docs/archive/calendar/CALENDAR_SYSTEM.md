# Calendar & Booking System

Multi-tenant appointment scheduling powered by Google Calendar, integrated with the CRM, AI chat, and public booking pages.

## Architecture Overview

Google Calendar is the **primary data store** for events. The local `Appointment` model in MongoDB stores metadata and CRM links. This avoids sync conflicts and lets agents use Google Calendar as their native UI.

```
Visitor books on agent subdomain
         |
         v
POST /api/appointments/book
         |
    +----+----+
    |         |
    v         v
  MongoDB   Google Calendar API
  (Appointment)  (Event on agent's calendar)
    |
    v
  Contact created/linked in CRM
```

## Per-Agent Isolation

Each agent connects their **own Google account**. No shared calendar. No cross-contamination.

| Agent | Subdomain | Google Account | Calendar |
|-------|-----------|----------------|----------|
| Joseph | josephsardella.chatrealty.io | josephsardella@gmail.com | Joseph's calendar |
| Bethany | bethanyklier.chatrealty.io | bethanyklier@gmail.com | Bethany's calendar |

Credentials are stored on each agent's `User.calendarSettings`:
```typescript
calendarSettings: {
  refreshToken: string,       // OAuth refresh token
  calendarEmail: string,      // Google account email
  calendarId: "primary",      // Which calendar to use
  connectedAt: Date,
  status: "connected" | "disconnected",
  bookingEnabled: boolean,    // Toggle public booking on/off
  defaultDuration: 30,        // Minutes per appointment
  bufferTime: 15,             // Buffer between appointments
  advanceBookingDays: 30,     // How far ahead visitors can book
}
```

## OAuth Flow

### Connect (Agent Settings)

1. Agent clicks "Connect Google Calendar" in Settings
2. `GET /api/auth/google-calendar/connect` redirects to Google consent screen
3. Scopes requested:
   - `calendar` (full read/write)
   - `calendar.events` (event management)
   - `userinfo.email` (to identify the connected Google account)
4. Google redirects to `/api/auth/google-calendar/callback`
5. Callback exchanges code for refresh token, stores on the agent's User doc

### Disconnect

Set `calendarSettings.status = "disconnected"`. The refresh token is kept in case they reconnect (Google revokes via their Google Account settings if they truly want to disconnect).

### Environment Variables

Uses the existing Google OAuth credentials (same as NextAuth):
```
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
```

No additional env vars needed. The `NEXTAUTH_URL` is used for redirect URI construction.

### Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/) > APIs & Services > Library
2. Enable **Google Calendar API**
3. Under Credentials, ensure the OAuth 2.0 Client ID has these redirect URIs:
   - `http://localhost:3000/api/auth/google-calendar/callback` (dev)
   - `https://chatrealty.io/api/auth/google-calendar/callback` (prod)
4. Under OAuth consent screen, add scopes:
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/calendar.events`
   - `https://www.googleapis.com/auth/userinfo.email`

## Data Model

### Appointment (MongoDB)

```typescript
{
  agentId: ObjectId,            // Which agent owns this
  contactId?: ObjectId,         // Link to CRM Contact
  googleEventId?: string,       // Google Calendar event ID
  googleCalendarId?: string,    // "primary" or specific calendar

  title: string,                // "Consultation with John Doe"
  description?: string,
  type: "showing" | "consultation" | "call" | "open-house" |
        "listing-presentation" | "closing" | "other",
  status: "scheduled" | "confirmed" | "cancelled" | "completed" | "no-show",
  source: "booking-page" | "chat" | "crm" | "agent-manual" | "google-calendar",

  startTime: Date,
  endTime: Date,
  timezone: string,

  location?: string,
  propertyListingKey?: string,  // Link to MLS listing
  propertyAddress?: string,

  attendee?: {                  // The visitor/lead
    name: string,
    email: string,
    phone?: string,
  },

  notes?: string,
  reminderSent?: boolean,
  createdAt: Date,
  updatedAt: Date,
}
```

### Indexes
```
{ agentId, startTime }          — Agent's upcoming/past appointments
{ agentId, status, startTime }  — Filter by status
{ contactId, startTime }        — Contact's appointment history
{ agentId, googleEventId }      — Unique constraint for sync
```

## API Endpoints

### Authentication Required (Agent)

#### `GET /api/appointments`
List agent's appointments.

Query params:
- `start` — ISO date, filter appointments starting after
- `end` — ISO date, filter appointments starting before
- `status` — Filter by status
- `contactId` — Filter by CRM contact

Response: `{ appointments: Appointment[] }`

#### `POST /api/appointments`
Create an appointment. Auto-syncs to Google Calendar if connected.

Body:
```json
{
  "title": "Showing at 123 Main St",
  "type": "showing",
  "startTime": "2026-05-15T10:00:00-07:00",
  "endTime": "2026-05-15T10:30:00-07:00",
  "timezone": "America/Los_Angeles",
  "attendee": { "name": "Jane Doe", "email": "jane@example.com", "phone": "555-1234" },
  "propertyAddress": "123 Main St, Portland, OR",
  "propertyListingKey": "abc123",
  "source": "crm"
}
```

#### `PATCH /api/appointments`
Update an appointment. Syncs changes to Google Calendar.

Body: `{ "appointmentId": "xxx", ...updates }`

#### `DELETE /api/appointments`
Cancel an appointment. Cancels in Google Calendar too.

Body: `{ "appointmentId": "xxx" }`

### Public (No Auth Required)

#### `GET /api/appointments/available-slots`
Get bookable time slots for an agent on a specific date.

Query params:
- `agentId` or `subdomain` — identifies the agent
- `date` — YYYY-MM-DD
- `duration` — minutes (default: 30)

Response:
```json
{
  "slots": [
    { "start": "2026-05-15T09:00:00.000Z", "end": "2026-05-15T09:30:00.000Z" },
    { "start": "2026-05-15T09:45:00.000Z", "end": "2026-05-15T10:15:00.000Z" }
  ],
  "agentName": "Bethany Klier",
  "duration": 30
}
```

Availability is computed from:
1. Agent's `businessHours` (which days/times they work)
2. Google Calendar free/busy (blocks out existing events)
3. `bufferTime` between slots
4. `advanceBookingDays` limit

#### `POST /api/appointments/book`
Public booking submission. Creates appointment + Google Calendar event + CRM contact.

Body:
```json
{
  "subdomain": "bethanyklier",
  "name": "Jane Doe",
  "email": "jane@example.com",
  "phone": "555-1234",
  "startTime": "2026-05-15T10:00:00-07:00",
  "endTime": "2026-05-15T10:30:00-07:00",
  "type": "consultation",
  "message": "Interested in homes in NE Portland"
}
```

What happens:
1. Resolves agent by subdomain
2. Finds or creates a Contact in the agent's CRM
3. Creates Google Calendar event on the agent's calendar (with visitor as attendee)
4. Creates Appointment record linked to both
5. Google Calendar sends email invite to the visitor automatically

## Integration Points

### 1. Agent Settings (Settings Wizard)

New "Calendar" step in the settings wizard:
- Connect/disconnect Google Calendar button
- Business hours configuration (already in model, not yet in UI)
- Booking preferences (duration, buffer, advance days)
- Toggle public booking on/off

**File:** `src/app/agent/settings/components/steps/CalendarStep.tsx` (to be created)

### 2. Public Booking Page

Route: `/book` on each agent subdomain (e.g., `bethanyklier.chatrealty.io/book`)

UI flow:
1. Date picker (calendar grid)
2. Available time slots for selected date
3. Visitor enters name, email, phone, optional message
4. Confirm booking
5. Success screen with appointment details

**File:** `src/app/book/page.tsx` (to be created)

### 3. CRM Contact Page

Show appointment history on the contact detail view:
- Upcoming appointments
- Past appointments with status
- "Schedule Appointment" button → opens slot picker

Query: `GET /api/appointments?contactId=xxx`

### 4. Agent Dashboard Widget

"Today's Schedule" card showing upcoming appointments:
- Time, title, type badge, attendee name
- Click to view/edit

Query: `GET /api/appointments?start=today&end=tomorrow`

### 5. Groq AI Chat Tool

New tool for the AI chat system:

```typescript
{
  name: "scheduleShowing",
  description: "Check agent availability and schedule a showing or consultation",
  parameters: {
    date: "YYYY-MM-DD",
    time: "HH:MM (24hr)",
    duration: "minutes",
    type: "showing | consultation | call",
    propertyAddress: "optional",
    visitorName: "string",
    visitorEmail: "string",
    visitorPhone: "optional"
  }
}
```

Chat flow:
- User: "Can I see that house on Saturday?"
- AI calls `available-slots` for Saturday
- AI: "I have openings at 10:00 AM, 11:00 AM, and 2:00 PM. Which works best?"
- User: "11 AM"
- AI calls `book` endpoint
- AI: "You're all set! I've scheduled a showing for Saturday at 11:00 AM. You'll receive a calendar invite at your email."

**File:** `src/lib/chat-v2/tools.ts` — add `scheduleShowing` tool definition
**File:** `src/lib/chat-v2/tool-executors.ts` — add executor

### 6. Google Calendar (Agent's native view)

Agents see all appointments in their Google Calendar app (web, mobile, desktop). They can:
- See visitor details in event description
- Get native Google Calendar reminders
- Reschedule by dragging events (future: webhook sync back)

## File Reference

### Backend (Built)
| File | Purpose |
|------|---------|
| `src/models/Appointment.ts` | Mongoose model |
| `src/models/User.ts` | `calendarSettings` field added |
| `src/lib/gcal-api.ts` | Google Calendar API utility (auth, CRUD, free/busy, slots) |
| `src/app/api/auth/google-calendar/connect/route.ts` | OAuth initiation |
| `src/app/api/auth/google-calendar/callback/route.ts` | OAuth callback |
| `src/app/api/appointments/route.ts` | CRUD endpoints |
| `src/app/api/appointments/available-slots/route.ts` | Public availability |
| `src/app/api/appointments/book/route.ts` | Public booking |

### Frontend (To Build)
| File | Purpose |
|------|---------|
| `src/app/agent/settings/components/steps/CalendarStep.tsx` | Settings step |
| `src/app/book/page.tsx` | Public booking page |
| `src/app/components/calendar/CalendarWidget.tsx` | Dashboard widget |
| `src/app/components/calendar/SlotPicker.tsx` | Reusable slot picker |
| `src/lib/chat-v2/tools.ts` | Add `scheduleShowing` tool |

## Implementation Priority

1. **Google Cloud Console** — Enable Calendar API, add redirect URIs
2. **CalendarStep.tsx** — So agents can connect their calendar
3. **Booking page** — Public-facing, revenue-generating
4. **Dashboard widget** — Agent daily view
5. **CRM integration** — Contact appointment history
6. **AI chat tool** — Automated scheduling via chat
7. **Webhook sync** — (Future) Sync changes made directly in Google Calendar back to MongoDB

## Security Notes

- Refresh tokens are stored encrypted-at-rest in MongoDB (Atlas encryption)
- Public endpoints (`available-slots`, `book`) do not expose the agent's calendar details — only free/busy derived slots
- `book` endpoint creates a Contact, which is scoped to the agent (`agentId`)
- OAuth state parameter includes `userId` to prevent CSRF
- Rate limiting should be added to public `book` endpoint to prevent abuse
