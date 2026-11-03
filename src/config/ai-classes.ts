// In-office AI classes (/ai-classes) — the one place for the rules and the
// intake options. The booking form and /api/appointments/book both read this,
// so the service area and lead time can't drift between client and server.

/** Classes run 60–90 minutes; the calendar blocks the full 90 so a long class never overlaps the next event. */
export const AI_CLASS_MINUTES = 90;
export const AI_CLASS_LENGTH_LABEL = "60–90 minute";

/** Classes are booked at least this many days out (time to prep the room and material). */
export const AI_CLASS_LEAD_DAYS = 7;

/** Minimum time between the end of one class and the start of the next (drive + setup). */
export const AI_CLASS_GAP_MINUTES = 120;

/**
 * How far ahead the calendar shows (days after the lead time). Lead + window
 * must stay inside the owner's calendarSettings.advanceBookingDays (default
 * 30) — available-slots returns nothing past it, which would show empty days.
 */
export const AI_CLASS_WINDOW_DAYS = 21;

/** Service area: Southern California only, for now. */
export const SOCAL_COUNTIES = [
  "Los Angeles",
  "Orange",
  "Riverside",
  "San Bernardino",
  "San Diego",
  "Ventura",
  "Santa Barbara",
  "Imperial",
  "Kern",
  "San Luis Obispo",
] as const;

export const REQUESTER_ROLES = [
  "Broker / owner",
  "Office manager",
  "Team lead",
  "Agent",
  "Other",
] as const;

export const AI_EXPERIENCE = [
  "Mostly new to AI",
  "Some use ChatGPT or similar",
  "Many already use AI daily",
] as const;

export const ROOM_TYPES = [
  "Conference room",
  "Training room / classroom",
  "Open office / bullpen",
  "Other",
] as const;

/** Yes / No / Not sure, for each piece of room equipment. */
export const EQUIPMENT = [
  { key: "tv", label: "TV or large display" },
  { key: "appleTv", label: "Apple TV (AirPlay)" },
  { key: "projector", label: "Projector and screen" },
  { key: "hdmi", label: "HDMI cable at the display" },
  { key: "wifi", label: "Wi-Fi attendees can join" },
  { key: "power", label: "Power outlets for laptops" },
] as const;

export type EquipmentKey = (typeof EQUIPMENT)[number]["key"];
export type EquipmentAnswer = "yes" | "no" | "unsure";

export interface AiClassIntake {
  brokerage: string;
  officeName?: string;
  address: string;
  city: string;
  county: string;
  requesterRole: string;
  officeAgents?: number;
  expectedAttendees?: number;
  aiExperience?: string;
  laptops?: EquipmentAnswer;
  /** Who to call at the office on the day of the class. */
  pointOfContact: { name: string; phone: string; email?: string };
  roomType: string;
  seats?: number;
  equipment: Partial<Record<EquipmentKey, EquipmentAnswer>>;
  roomNotes?: string;
  accessNotes?: string;
}

export function isSocalCounty(county: string | undefined): boolean {
  return !!county && (SOCAL_COUNTIES as readonly string[]).includes(county);
}

/** Earliest bookable moment: start of the day AI_CLASS_LEAD_DAYS from now. */
export function earliestClassStart(now = new Date()): Date {
  const d = new Date(now);
  d.setDate(d.getDate() + AI_CLASS_LEAD_DAYS);
  d.setHours(0, 0, 0, 0);
  return d;
}

const ANSWER: Record<EquipmentAnswer, string> = { yes: "Yes", no: "No", unsure: "Not sure" };

/** Plain-text block for the calendar event description. */
export function formatIntake(i: AiClassIntake): string {
  const eq = EQUIPMENT.map((e) => `  ${e.label}: ${i.equipment?.[e.key] ? ANSWER[i.equipment[e.key]!] : "—"}`);
  return [
    "— Office —",
    `Brokerage: ${i.brokerage}${i.officeName ? ` (${i.officeName})` : ""}`,
    `Address: ${i.address}, ${i.city} (${i.county} County)`,
    `Requested by: ${i.requesterRole}`,
    i.officeAgents ? `Agents in office: ${i.officeAgents}` : null,
    i.expectedAttendees ? `Expected attendees: ${i.expectedAttendees}` : null,
    i.aiExperience ? `AI experience: ${i.aiExperience}` : null,
    `Point of contact: ${i.pointOfContact.name}, ${i.pointOfContact.phone}${i.pointOfContact.email ? `, ${i.pointOfContact.email}` : ""}`,
    "",
    "— Room —",
    `Room: ${i.roomType}${i.seats ? `, seats ${i.seats}` : ""}`,
    ...eq,
    `  Attendees bring laptops: ${i.laptops ? ANSWER[i.laptops] : "—"}`,
    i.roomNotes ? `Room notes: ${i.roomNotes}` : null,
    i.accessNotes ? `Parking / access: ${i.accessNotes}` : null,
  ]
    .filter((l) => l !== null)
    .join("\n");
}
