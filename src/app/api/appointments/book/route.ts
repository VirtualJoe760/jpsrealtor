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
  } = body;

  try {
  // Validate required fields
  if (!name || !email || !startTime || !endTime) {
    return NextResponse.json(
      { error: "name, email, startTime, and endTime are required" },
      { status: 400 }
    );
  }

  if (!agentId && !subdomain) {
    return NextResponse.json(
      { error: "agentId or subdomain required" },
      { status: 400 }
    );
  }

  await dbConnect();

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
    : `${type.charAt(0).toUpperCase() + type.slice(1)} with ${name}`;

  const description = [
    `Booked via chatRealty`,
    `Name: ${name}`,
    `Email: ${email}`,
    phone ? `Phone: ${phone}` : null,
    propertyAddress ? `Property: ${propertyAddress}` : null,
    message ? `\nMessage: ${message}` : null,
  ].filter(Boolean).join("\n");

  if (credentials) {
    try {
      const gcalEvent = await createEvent(
        {
          summary: title,
          description,
          location: propertyAddress,
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
    location: propertyAddress,
    propertyListingKey,
    propertyAddress,
    attendee: { name, email, phone },
    notes: message,
  });

  // SMS alert — a booking is a high-intent event for the agent.
  notifyAgentLead({
    agentId: String(resolvedAgentId),
    kind: "hot_lead",
    leadName: name,
    detail: [`Booked ${type}`, propertyAddress].filter(Boolean).join(" • "),
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
