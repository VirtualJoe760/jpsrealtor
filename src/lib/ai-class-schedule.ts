// Server-side spacing rule for in-office AI classes: at least
// AI_CLASS_GAP_MINUTES between the end of one class and the start of the next
// (drive time + setup). Google free/busy only prevents overlap, so the gap is
// enforced here, against the AI classes already booked in Mongo.

import Appointment from "@/models/Appointment";
import { AI_CLASS_GAP_MINUTES } from "@/config/ai-classes";

type Range = { start: Date; end: Date };

const GAP_MS = AI_CLASS_GAP_MINUTES * 60_000;

/** Booked AI classes (not cancelled) that touch [from, to] once the gap is added. */
async function nearbyClasses(agentId: string, from: Date, to: Date): Promise<Range[]> {
  const rows = await Appointment.find(
    {
      agentId,
      type: "ai-class",
      status: { $in: ["scheduled", "confirmed"] },
      startTime: { $lt: new Date(to.getTime() + GAP_MS) },
      endTime: { $gt: new Date(from.getTime() - GAP_MS) },
    },
    { startTime: 1, endTime: 1 }
  ).lean();
  return rows.map((r: any) => ({ start: new Date(r.startTime), end: new Date(r.endTime) }));
}

const tooClose = (s: Range, c: Range) =>
  s.start.getTime() < c.end.getTime() + GAP_MS && s.end.getTime() > c.start.getTime() - GAP_MS;

/** Drop slots that start or end within the gap of another AI class. */
export async function filterAiClassSlots<T extends { start: string; end: string }>(
  agentId: string,
  slots: T[]
): Promise<T[]> {
  if (!slots.length) return slots;
  const ranges = slots.map((s) => ({ start: new Date(s.start), end: new Date(s.end) }));
  const from = new Date(Math.min(...ranges.map((r) => r.start.getTime())));
  const to = new Date(Math.max(...ranges.map((r) => r.end.getTime())));
  const classes = await nearbyClasses(agentId, from, to);
  if (!classes.length) return slots;
  return slots.filter((_, i) => !classes.some((c) => tooClose(ranges[i], c)));
}

/** True if a class at [start, end] would sit within the gap of another AI class. */
export async function aiClassTooClose(agentId: string, start: Date, end: Date): Promise<boolean> {
  const classes = await nearbyClasses(agentId, start, end);
  return classes.some((c) => tooClose({ start, end }, c));
}
