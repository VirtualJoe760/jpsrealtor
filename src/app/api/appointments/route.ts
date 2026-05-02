import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import Appointment from "@/models/Appointment";
import Contact from "@/models/Contact";
import {
  createEvent,
  updateEvent,
  deleteEvent,
  getAgentCalendarCredentials,
  getAgentCalendarSettings,
} from "@/lib/gcal-api";

/**
 * GET /api/appointments
 * List appointments for the current agent
 * Query params: ?start=ISO&end=ISO&status=scheduled&contactId=xxx
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  const status = searchParams.get("status");
  const contactId = searchParams.get("contactId");

  await dbConnect();

  const query: any = { agentId: session.user.id };

  if (start || end) {
    query.startTime = {};
    if (start) query.startTime.$gte = new Date(start);
    if (end) query.startTime.$lte = new Date(end);
  }
  if (status) query.status = status;
  if (contactId) query.contactId = contactId;

  const appointments = await Appointment.find(query)
    .sort({ startTime: 1 })
    .limit(200)
    .lean();

  return NextResponse.json({ appointments });
}

/**
 * POST /api/appointments
 * Create a new appointment (optionally syncs to Google Calendar)
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    title,
    description,
    type = "consultation",
    startTime,
    endTime,
    timezone = "America/Los_Angeles",
    location,
    propertyListingKey,
    propertyAddress,
    attendee,
    contactId,
    source = "agent-manual",
    notes,
  } = body;

  if (!title || !startTime || !endTime) {
    return NextResponse.json(
      { error: "title, startTime, and endTime are required" },
      { status: 400 }
    );
  }

  await dbConnect();

  // If attendee provided but no contactId, try to find or create a contact
  let resolvedContactId = contactId;
  if (!resolvedContactId && attendee?.email) {
    const existing = await Contact.findOne({
      agentId: session.user.id,
      email: attendee.email,
    }).select("_id").lean();

    if (existing) {
      resolvedContactId = (existing as any)._id;
    }
  }

  // Create Google Calendar event if agent has calendar connected
  let googleEventId: string | undefined;
  const credentials = await getAgentCalendarCredentials(session.user.id);
  const agentSettings = await getAgentCalendarSettings(session.user.id);
  const calendarId = agentSettings?.calendarSettings?.calendarId || "primary";

  if (credentials) {
    try {
      const gcalEvent = await createEvent(
        {
          summary: title,
          description: description || `${type} appointment`,
          location: propertyAddress || location,
          start: { dateTime: startTime, timeZone: timezone },
          end: { dateTime: endTime, timeZone: timezone },
          attendees: attendee?.email
            ? [{ email: attendee.email, displayName: attendee.name }]
            : undefined,
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
      console.error("[appointments] Failed to create Google Calendar event:", err);
      // Non-blocking — still save locally
    }
  }

  const appointment = await Appointment.create({
    agentId: session.user.id,
    contactId: resolvedContactId,
    googleEventId,
    googleCalendarId: calendarId,
    title,
    description,
    type,
    status: "scheduled",
    source,
    startTime: new Date(startTime),
    endTime: new Date(endTime),
    timezone,
    location,
    propertyListingKey,
    propertyAddress,
    attendee,
    notes,
  });

  return NextResponse.json({ appointment }, { status: 201 });
}

/**
 * PATCH /api/appointments
 * Update an appointment (syncs changes to Google Calendar)
 * Body: { appointmentId, ...updates }
 */
export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { appointmentId, ...updates } = body;

  if (!appointmentId) {
    return NextResponse.json({ error: "appointmentId required" }, { status: 400 });
  }

  await dbConnect();

  const appointment = await Appointment.findOne({
    _id: appointmentId,
    agentId: session.user.id,
  });

  if (!appointment) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }

  // Sync to Google Calendar if connected
  if (appointment.googleEventId) {
    const credentials = await getAgentCalendarCredentials(session.user.id);
    if (credentials) {
      try {
        const gcalUpdates: any = {};
        if (updates.title) gcalUpdates.summary = updates.title;
        if (updates.description) gcalUpdates.description = updates.description;
        if (updates.location) gcalUpdates.location = updates.location;
        if (updates.startTime) {
          gcalUpdates.start = {
            dateTime: updates.startTime,
            timeZone: updates.timezone || appointment.timezone,
          };
        }
        if (updates.endTime) {
          gcalUpdates.end = {
            dateTime: updates.endTime,
            timeZone: updates.timezone || appointment.timezone,
          };
        }
        if (updates.status === "cancelled") {
          gcalUpdates.status = "cancelled";
        }

        if (Object.keys(gcalUpdates).length > 0) {
          await updateEvent(
            appointment.googleEventId,
            gcalUpdates,
            appointment.googleCalendarId || "primary",
            credentials
          );
        }
      } catch (err) {
        console.error("[appointments] Failed to update Google Calendar event:", err);
      }
    }
  }

  // Update locally
  Object.assign(appointment, updates);
  if (updates.startTime) appointment.startTime = new Date(updates.startTime);
  if (updates.endTime) appointment.endTime = new Date(updates.endTime);
  await appointment.save();

  return NextResponse.json({ appointment });
}

/**
 * DELETE /api/appointments
 * Cancel/delete an appointment
 * Body: { appointmentId }
 */
export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { appointmentId } = body;

  if (!appointmentId) {
    return NextResponse.json({ error: "appointmentId required" }, { status: 400 });
  }

  await dbConnect();

  const appointment = await Appointment.findOne({
    _id: appointmentId,
    agentId: session.user.id,
  });

  if (!appointment) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }

  // Cancel in Google Calendar
  if (appointment.googleEventId) {
    const credentials = await getAgentCalendarCredentials(session.user.id);
    if (credentials) {
      try {
        await deleteEvent(
          appointment.googleEventId,
          appointment.googleCalendarId || "primary",
          credentials
        );
      } catch (err) {
        console.error("[appointments] Failed to delete Google Calendar event:", err);
      }
    }
  }

  appointment.status = "cancelled";
  await appointment.save();

  return NextResponse.json({ success: true });
}
