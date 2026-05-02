import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import { getAvailableSlots } from "@/lib/gcal-api";

/**
 * GET /api/appointments/available-slots
 * Public endpoint — returns available booking slots for an agent.
 * Used by the public booking page on agent subdomains.
 *
 * Query params:
 *   agentId=xxx OR subdomain=xxx  — identifies the agent
 *   date=YYYY-MM-DD               — date to check
 *   duration=30                    — appointment duration in minutes (optional)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get("agentId");
  const subdomain = searchParams.get("subdomain");
  const date = searchParams.get("date");
  const duration = parseInt(searchParams.get("duration") || "30");

  if (!date) {
    return NextResponse.json({ error: "date parameter required (YYYY-MM-DD)" }, { status: 400 });
  }

  if (!agentId && !subdomain) {
    return NextResponse.json({ error: "agentId or subdomain required" }, { status: 400 });
  }

  await dbConnect();

  // Resolve agent
  let resolvedAgentId = agentId;
  if (!resolvedAgentId && subdomain) {
    const agent = await User.findOne(
      { "agentProfile.subdomain": subdomain },
      { _id: 1 }
    ).lean();
    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }
    resolvedAgentId = String((agent as any)._id);
  }

  if (!resolvedAgentId) {
    return NextResponse.json({ error: "Could not resolve agent" }, { status: 400 });
  }

  // Check if agent has booking enabled
  const agent = await User.findById(resolvedAgentId, {
    calendarSettings: 1,
    "agentProfile.businessHours": 1,
    name: 1,
  }).lean();

  const cal = (agent as any)?.calendarSettings;
  if (cal && cal.bookingEnabled === false) {
    return NextResponse.json({ error: "Booking is not enabled for this agent" }, { status: 403 });
  }

  // Check advance booking limit
  const advanceDays = cal?.advanceBookingDays || 30;
  const requestDate = new Date(date);
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + advanceDays);
  if (requestDate > maxDate) {
    return NextResponse.json({
      slots: [],
      message: `Booking is only available up to ${advanceDays} days in advance`,
    });
  }

  // Don't allow booking in the past
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (requestDate < today) {
    return NextResponse.json({ slots: [] });
  }

  try {
    const slots = await getAvailableSlots(
      resolvedAgentId,
      date,
      duration
    );

    return NextResponse.json({
      slots,
      agentName: (agent as any)?.name,
      duration,
    });
  } catch (err) {
    console.error("[available-slots] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch available slots" },
      { status: 500 }
    );
  }
}
