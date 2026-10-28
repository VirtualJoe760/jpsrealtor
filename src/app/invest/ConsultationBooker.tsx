"use client";

// Book a 30-minute investment consultation with the platform owner.
//
// Reuses the public booking pipeline (/api/agent/public → available-slots →
// appointments/book), so the meeting lands on the owner's Google Calendar,
// creates a CRM contact and sends the usual agent notification. The booking
// type is "consultation" (the Appointment enum has no investor type); the
// "[Investment consultation]" prefix on the message marks it in the calendar
// description and CRM.
//
// No amounts are asked or collected here: under Reg CF testing-the-waters the
// company can talk with prospective investors but cannot take money or
// commitments before a Form C is filed.

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { CalendarCheck, Loader2 } from "lucide-react";
import { useCompanyTheme } from "@/app/components/company/CompanyShell";

type Slot = { start: string; end: string };

const TZ = "America/Los_Angeles";
const DAYS_AHEAD = 21;

/** Next N weekdays as YYYY-MM-DD in Pacific time (the owner's calendar). */
function upcomingWeekdays(n: number): string[] {
  const out: string[] = [];
  const d = new Date();
  while (out.length < n) {
    d.setDate(d.getDate() + 1);
    const wd = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: TZ }).format(d);
    if (wd !== "Sat" && wd !== "Sun") {
      out.push(new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d));
    }
  }
  return out;
}

const fmtDay = (ymd: string) =>
  new Date(`${ymd}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
const fmtFull = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" });

export default function ConsultationBooker() {
  const t = useCompanyTheme();
  const { data: session } = useSession();
  const days = useMemo(() => upcomingWeekdays(DAYS_AHEAD), []);

  const [agentId, setAgentId] = useState<string | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [booked, setBooked] = useState<Slot | null>(null);

  // On chatrealty.io this resolves to the platform owner.
  useEffect(() => {
    fetch("/api/agent/public")
      .then((r) => r.json())
      .then((d) => setAgentId(d?.profile?._id || d?.profile?.id || null))
      .catch(() => setError("Booking is unavailable right now."));
  }, []);

  useEffect(() => {
    if (!date || !agentId) return;
    setLoadingSlots(true);
    setSlot(null);
    setError("");
    fetch(`/api/appointments/available-slots?agentId=${agentId}&date=${date}&duration=30`)
      .then((r) => r.json())
      .then((d) => setSlots(d.slots || []))
      .catch(() => setError("Couldn't load times for that day."))
      .finally(() => setLoadingSlots(false));
  }, [date, agentId]);

  async function book(e: React.FormEvent) {
    e.preventDefault();
    if (!slot || !agentId || !session?.user?.email) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/appointments/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId,
          name: session.user.name || session.user.email,
          email: session.user.email,
          phone: phone.trim() || undefined,
          startTime: slot.start,
          endTime: slot.end,
          type: "consultation",
          message: `[Investment consultation] ${note.trim()}`.trim(),
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Booking failed");
      setBooked(slot);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking failed");
    } finally {
      setBusy(false);
    }
  }

  if (booked) {
    return (
      <div className={`rounded-xl p-5 ${t.isLight ? "bg-emerald-50 text-emerald-800" : "bg-emerald-950/50 text-emerald-300"}`}>
        <p className="font-semibold flex items-center gap-2">
          <CalendarCheck className="w-5 h-5" /> You&apos;re booked.
        </p>
        <p className="mt-1 text-sm">
          {fmtFull(booked.start)}. A calendar invite is on its way to {session?.user?.email}.
        </p>
      </div>
    );
  }

  const chip = (active: boolean) =>
    `rounded-lg px-3 py-2 text-sm border transition-colors ${active ? "border-blue-500 bg-blue-600 text-white" : t.secondaryBtn}`;

  return (
    <form onSubmit={book} className="space-y-5">
      <div>
        <p className={`text-sm font-medium mb-2 ${t.heading}`}>1. Pick a day</p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {days.map((d) => (
            <button key={d} type="button" onClick={() => setDate(d)} className={`${chip(d === date)} shrink-0`}>
              {fmtDay(d)}
            </button>
          ))}
        </div>
      </div>

      {date && (
        <div>
          <p className={`text-sm font-medium mb-2 ${t.heading}`}>2. Pick a time <span className={`font-normal ${t.muted}`}>(30 minutes, shown in your time zone)</span></p>
          {loadingSlots ? (
            <p className={`text-sm flex items-center gap-2 ${t.muted}`}><Loader2 className="w-4 h-4 animate-spin" /> Loading times…</p>
          ) : slots.length === 0 ? (
            <p className={`text-sm ${t.muted}`}>No open times that day — try another.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {slots.map((s) => (
                <button key={s.start} type="button" onClick={() => setSlot(s)} className={chip(slot?.start === s.start)}>
                  {fmtTime(s.start)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {slot && (
        <div className="space-y-4">
          <p className={`text-sm font-medium ${t.heading}`}>3. Confirm</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={`block text-sm mb-1.5 ${t.muted}`} htmlFor="inv-phone">Phone (optional)</label>
              <input id="inv-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={`w-full rounded-lg border px-3 py-2 ${t.input}`} />
            </div>
            <div>
              <label className={`block text-sm mb-1.5 ${t.muted}`}>Email</label>
              <input value={session?.user?.email || ""} disabled className={`w-full rounded-lg border px-3 py-2 opacity-70 ${t.input}`} />
            </div>
          </div>
          <div>
            <label className={`block text-sm mb-1.5 ${t.muted}`} htmlFor="inv-note">What would you like to talk about? (optional)</label>
            <textarea id="inv-note" rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} className={`w-full rounded-lg border px-3 py-2 ${t.input}`} />
          </div>
          <button type="submit" disabled={busy} className={`rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-60 ${t.primaryBtn}`}>
            {busy ? "Booking…" : `Book ${fmtFull(slot.start)}`}
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}
    </form>
  );
}
