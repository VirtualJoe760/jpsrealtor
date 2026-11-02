import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import Contact from "@/models/Contact";
import Appointment from "@/models/Appointment";
import {
  createEvent,
  getAgentCalendarCredentials,
  getAgentCalendarSettings,
} from "@/lib/gcal-api";
import { notifyAgentLead } from "@/lib/messaging/notify-agent";
import { aiClassTooClose } from "@/lib/ai-class-schedule";
import {
  AI_CLASS_GAP_MINUTES,
  AI_CLASS_LEAD_DAYS,
  earliestClassStart,
  formatIntake,
  isSocalCounty,
  type AiClassIntake,
} from "@/config/ai-classes";

/**
 * POST /api/appointments/book
 * Public endpoint — allows visitors to book an appointment with an agent.
 * No auth required (this is the public booking page submission).
 *
 * Body: {
 *   agentId OR subdomain,
 *   name, email, phone?,
 *   startTime, endTime,
 *   type?, message?, propertyAddress?
 * }
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    agentId,
    subdomain,
    name,
    email,
    phone,
    startTime,
    endTime,
    type = "consultation",
    message,
    propertyAddress,
    propertyListingKey,
    // AI-class bookings (/ai-classes): office + room intake, see src/config/ai-classes.ts
    aiClass,
  } = body as { aiClass?: AiClassIntake } & Record<string, any>;

  const brokerage: string | undefined = aiClass?.brokerage;
  const location: string | undefined = aiClass ? `${aiClass.address}, ${aiClass.city}` : undefined;

  try {
  // Validate required fields
  if (!name || !email || !startTime || !endTime) {
    return NextResponse.json(
      { error: "name, email, startTime, and endTime are required" },
      { status: 400 }
    );
  }

  // AI classes: Southern California only, booked at least a week out. The
  // form enforces both too; this stops a hand-made request from skipping them.
  if (type === "ai-class") {
    if (!aiClass?.brokerage || !aiClass.address || !aiClass.city || !aiClass.roomType) {
      return NextResponse.json({ error: "Office and room details are required for an AI class" }, { status: 400 });
    }
    if (!aiClass.pointOfContact?.name || !aiClass.pointOfContact?.phone) {
      return NextResponse.json({ error: "A point of contact with a phone number is required" }, { status: 400 });
    }
    if (!isSocalCounty(aiClass.county)) {
      return NextResponse.json({ error: "AI classes are currently offered in Southern California only" }, { status: 400 });
    }
    if (new Date(startTime) < earliestClassStart()) {
      return NextResponse.json({ error: `AI classes must be booked at least ${AI_CLASS_LEAD_DAYS} days in advance` }, { status: 400 });
    }
  }

  if (!agentId && !subdomain) {
    return NextResponse.json(
      { error: "agentId or subdomain required" },
      { status: 400 }
    );
  }

  await dbConnect();

  // AI classes keep a gap between them (checked after connect: it reads Appointments).
  if (type === "ai-class" && agentId && (await aiClassTooClose(String(agentId), new Date(startTime), new Date(endTime)))) {
    return NextResponse.json(
      { error: `That time is too close to another class (we need ${AI_CLASS_GAP_MINUTES / 60} hours between classes). Please pick another time.` },
      { status: 409 }
    );
  }

  // Resolve agent
  let resolvedAgentId = agentId;
  let agentName = "Agent";
  if (!resolvedAgentId && subdomain) {
    const agent = await User.findOne(
      { "agentProfile.subdomain": subdomain },
      { _id: 1, name: 1 }
    ).lean();
    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }
    resolvedAgentId = String((agent as any)._id);
    agentName = (agent as any).name || agentName;
  } else {
    const agent = await User.findById(resolvedAgentId, { name: 1 }).lean();
    agentName = (agent as any)?.name || agentName;
  }

  // Find or create contact for this visitor
  let contact = await Contact.findOne({
    userId: resolvedAgentId,
    $or: [
      { "emails.address": email.toLowerCase() },
      { email: email.toLowerCase() },
    ],
  }).lean();

  if (!contact) {
    try {
      contact = await Contact.create({
        userId: resolvedAgentId,
        firstName: name.split(" ")[0] || "Unknown",
        lastName: name.split(" ").slice(1).join(" ") || "",
        emails: [{ address: email.toLowerCase(), label: "personal" }],
        phones: phone ? [{ number: phone, label: "mobile" }] : [],
        source: "website",
        status: "uncontacted",
      });
    } catch (contactErr) {
      console.error("[book] Failed to create contact:", contactErr);
      // Non-blocking — continue without contact link
    }
  }

  const contactId = (contact as any)?._id || undefined;

  // Create Google Calendar event if agent has calendar connected
  let googleEventId: string | undefined;
  const credentials = await getAgentCalendarCredentials(resolvedAgentId);
  const agentSettings = await getAgentCalendarSettings(resolvedAgentId);
  const calendarId = agentSettings?.calendarSettings?.calendarId || "primary";
  const timezone = "America/Los_Angeles";

  const title = type === "showing"
    ? `Showing: ${propertyAddress || "Property"} — ${name}`
    : type === "ai-class"
      ? `AI Class: ${brokerage || "Brokerage"} — ${name}`
      : `${type.charAt(0).toUpperCase() + type.slice(1)} with ${name}`;

  const eventLocation: string | undefined = propertyAddress || location || undefined;

  const description = [
    `Booked via chatRealty`,
    `Name: ${name}`,
    `Email: ${email}`,
    phone ? `Phone: ${phone}` : null,
    propertyAddress ? `Property: ${propertyAddress}` : null,
    aiClass ? `\n${formatIntake(aiClass)}` : null,
    message ? `\nMessage: ${message}` : null,
  ].filter(Boolean).join("\n");

  if (credentials) {
    try {
      const gcalEvent = await createEvent(
        {
          summary: title,
          description,
          location: eventLocation,
          start: { dateTime: startTime, timeZone: timezone },
          end: { dateTime: endTime, timeZone: timezone },
          attendees: [{ email, displayName: name }],
          reminders: {
            useDefault: false,
            overrides: [
              { method: "email", minutes: 60 },
              { method: "popup", minutes: 15 },
            ],
          },
        },
        calendarId,
        credentials
      );
      googleEventId = gcalEvent.id;
    } catch (err) {
      console.error("[book] Failed to create Google Calendar event:", err);
    }
  }

  // Create appointment record
  const appointment = await Appointment.create({
    agentId: resolvedAgentId,
    contactId,
    googleEventId,
    googleCalendarId: calendarId,
    title,
    description,
    type,
    status: "scheduled",
    source: "booking-page",
    startTime: new Date(startTime),
    endTime: new Date(endTime),
    timezone,
    location: eventLocation,
    propertyListingKey,
    propertyAddress,
    attendee: { name, email, phone },
    aiClass: type === "ai-class" ? aiClass : undefined,
    notes: message,
  });

  // SMS alert — a booking is a high-intent event for the agent.
  notifyAgentLead({
    agentId: String(resolvedAgentId),
    kind: "hot_lead",
    leadName: name,
    detail: [`Booked ${type}`, brokerage, propertyAddress].filter(Boolean).join(" • "),
    leadPhone: phone,
  }).catch(() => {});

  return NextResponse.json({
    success: true,
    appointment: {
      id: appointment._id,
      title,
      startTime,
      endTime,
      agentName,
    },
  }, { status: 201 });

  } catch (err: any) {
    console.error("[book] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to book appointment" },
      { status: 500 }
    );
  }
}
