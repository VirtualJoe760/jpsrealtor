/**
 * Google Calendar API Client
 *
 * Per-agent Google Calendar integration.
 * Each agent connects their own Google account via OAuth.
 * Client ID and Client Secret are app-level (env vars).
 * Refresh token is per-agent (stored in User.calendarSettings).
 */

import dbConnect from "@/lib/mongoose";
import User from "@/models/User";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CalendarCredentials {
  refreshToken: string;
}

export interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  location?: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  attendees?: Array<{ email: string; displayName?: string }>;
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{ method: "email" | "popup"; minutes: number }>;
  };
  status?: "confirmed" | "tentative" | "cancelled";
  htmlLink?: string;
}

export interface FreeBusySlot {
  start: string;
  end: string;
}

export interface TimeSlot {
  start: string; // ISO string
  end: string;   // ISO string
}

// ── Token Cache ───────────────────────────────────────────────────────────────

const tokenCache = new Map<string, { token: string; expiresAt: number }>();

function tokenCacheKey(refreshToken: string): string {
  return `gcal_${refreshToken.slice(-8)}`;
}

// ── Core Auth ─────────────────────────────────────────────────────────────────

function getClientCredentials() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set");
  }
  return { clientId, clientSecret };
}

async function refreshAccessToken(credentials: CalendarCredentials): Promise<string> {
  const { clientId, clientSecret } = getClientCredentials();
  const cacheKey = tokenCacheKey(credentials.refreshToken);

  const cached = tokenCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.token;
  }

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: credentials.refreshToken,
    grant_type: "refresh_token",
  });

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });

  if (!resp.ok) {
    const errBody = await resp.text();
    console.error("[gcal] Token refresh failed:", errBody);
    throw new Error(`Google Calendar token refresh failed: ${resp.status}`);
  }

  const data = await resp.json();
  const expiresInMs = (data.expires_in || 3600) * 1000;
  tokenCache.set(cacheKey, {
    token: data.access_token,
    expiresAt: Date.now() + expiresInMs - 60_000, // 60s buffer
  });

  return data.access_token;
}

// ── Generic Fetch ─────────────────────────────────────────────────────────────

async function gcalFetch(
  url: string,
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" = "GET",
  body?: Record<string, unknown>,
  credentials?: CalendarCredentials
): Promise<any> {
  if (!credentials?.refreshToken) {
    throw new Error("No calendar credentials provided");
  }

  const accessToken = await refreshAccessToken(credentials);

  const opts: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  };

  if (body) {
    opts.body = JSON.stringify(body);
  }

  const resp = await fetch(url, opts);

  if (!resp.ok) {
    const errorData = await resp.json().catch(() => ({}));
    throw new Error(`Google Calendar API error (${resp.status}): ${JSON.stringify(errorData)}`);
  }

  if (resp.status === 204) return null;
  return resp.json();
}

// ── Agent Credential Lookup ───────────────────────────────────────────────────

export async function getAgentCalendarCredentials(
  agentId: string
): Promise<CalendarCredentials | null> {
  await dbConnect();
  const user = await User.findById(agentId, { calendarSettings: 1 }).lean();

  const cal = (user as any)?.calendarSettings;
  if (!cal?.refreshToken || cal.status === "disconnected") {
    return null;
  }

  return { refreshToken: cal.refreshToken };
}

export async function getAgentCalendarSettings(agentId: string) {
  await dbConnect();
  const user = await User.findById(agentId, {
    calendarSettings: 1,
    "agentProfile.businessHours": 1,
    name: 1,
  }).lean();
  return (user as any) || null;
}

// ── Calendar API Methods ──────────────────────────────────────────────────────

const BASE_URL = "https://www.googleapis.com/calendar/v3";

/**
 * Create a calendar event
 */
export async function createEvent(
  event: Omit<CalendarEvent, "id">,
  calendarId: string = "primary",
  credentials?: CalendarCredentials
): Promise<CalendarEvent> {
  return gcalFetch(
    `${BASE_URL}/calendars/${encodeURIComponent(calendarId)}/events?sendUpdates=all`,
    "POST",
    event as any,
    credentials
  );
}

/**
 * Update a calendar event
 */
export async function updateEvent(
  eventId: string,
  updates: Partial<CalendarEvent>,
  calendarId: string = "primary",
  credentials?: CalendarCredentials
): Promise<CalendarEvent> {
  return gcalFetch(
    `${BASE_URL}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}?sendUpdates=all`,
    "PATCH",
    updates as any,
    credentials
  );
}

/**
 * Delete (cancel) a calendar event
 */
export async function deleteEvent(
  eventId: string,
  calendarId: string = "primary",
  credentials?: CalendarCredentials
): Promise<void> {
  await gcalFetch(
    `${BASE_URL}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}?sendUpdates=all`,
    "DELETE",
    undefined,
    credentials
  );
}

/**
 * Get a single event
 */
export async function getEvent(
  eventId: string,
  calendarId: string = "primary",
  credentials?: CalendarCredentials
): Promise<CalendarEvent> {
  return gcalFetch(
    `${BASE_URL}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
    "GET",
    undefined,
    credentials
  );
}

/**
 * List events in a time range
 */
export async function listEvents(
  timeMin: string,
  timeMax: string,
  calendarId: string = "primary",
  credentials?: CalendarCredentials
): Promise<CalendarEvent[]> {
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "250",
  });

  const result = await gcalFetch(
    `${BASE_URL}/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
    "GET",
    undefined,
    credentials
  );

  return result.items || [];
}

/**
 * Get free/busy information for an agent's calendar
 * Returns busy time slots in the given range
 */
export async function getFreeBusy(
  timeMin: string,
  timeMax: string,
  calendarId: string = "primary",
  credentials?: CalendarCredentials
): Promise<FreeBusySlot[]> {
  const result = await gcalFetch(
    `${BASE_URL}/freeBusy`,
    "POST",
    {
      timeMin,
      timeMax,
      items: [{ id: calendarId }],
    },
    credentials
  );

  return result.calendars?.[calendarId]?.busy || [];
}

/**
 * Get available time slots for booking
 * Combines agent's business hours with Google Calendar free/busy
 */
export async function getAvailableSlots(
  agentId: string,
  dateStr: string, // YYYY-MM-DD
  durationMinutes: number = 30
): Promise<TimeSlot[]> {
  const agent = await getAgentCalendarSettings(agentId);
  if (!agent) return [];

  const cal = agent.calendarSettings;
  const businessHours = agent.agentProfile?.businessHours || [];
  const bufferTime = cal?.bufferTime || 15;
  const credentials = cal?.refreshToken
    ? { refreshToken: cal.refreshToken }
    : null;

  // Get the day of week
  const date = new Date(dateStr + "T00:00:00");
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dayName = dayNames[date.getDay()];

  // Find business hours for this day
  const dayHours = businessHours.find(
    (h: any) => h.day.toLowerCase() === dayName.toLowerCase()
  );

  if (!dayHours || dayHours.closed) return [];

  // Parse open/close times
  const timezone = cal?.calendarId ? "America/Los_Angeles" : "America/Los_Angeles";
  const openTime = parseTimeString(dayHours.open, dateStr);
  const closeTime = parseTimeString(dayHours.close, dateStr);

  if (!openTime || !closeTime) return [];

  // Get busy slots from Google Calendar (if connected)
  let busySlots: FreeBusySlot[] = [];
  if (credentials) {
    try {
      busySlots = await getFreeBusy(
        openTime.toISOString(),
        closeTime.toISOString(),
        cal?.calendarId || "primary",
        credentials
      );
    } catch (err) {
      console.error("[gcal] Free/busy lookup failed:", err);
      // Continue without — show all slots as available
    }
  }

  // Generate time slots
  const slots: TimeSlot[] = [];
  let current = new Date(openTime);

  while (current.getTime() + durationMinutes * 60000 <= closeTime.getTime()) {
    const slotEnd = new Date(current.getTime() + durationMinutes * 60000);

    // Check if this slot overlaps any busy period
    const isBusy = busySlots.some((busy) => {
      const busyStart = new Date(busy.start).getTime();
      const busyEnd = new Date(busy.end).getTime();
      return current.getTime() < busyEnd && slotEnd.getTime() > busyStart;
    });

    if (!isBusy) {
      slots.push({
        start: current.toISOString(),
        end: slotEnd.toISOString(),
      });
    }

    // Move to next slot (duration + buffer)
    current = new Date(current.getTime() + (durationMinutes + bufferTime) * 60000);
  }

  return slots;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseTimeString(timeStr: string, dateStr: string): Date | null {
  if (!timeStr) return null;

  // Parse "9:00 AM" or "6:00 PM" format
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;

  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const period = match[3].toUpperCase();

  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;

  const date = new Date(`${dateStr}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`);
  return isNaN(date.getTime()) ? null : date;
}
