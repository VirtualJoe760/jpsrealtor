"use client";

// Book an in-office AI class. Same pipeline as /invest's ConsultationBooker:
// /api/agent/public (resolves to the platform owner on chatrealty.io) →
// /api/appointments/available-slots → /api/appointments/book, so the class
// lands on the owner's Google Calendar, creates a CRM contact and sends the
// booking alert.
//
// No account required, unlike /invest: the person booking is usually a broker
// or office manager who has never used ChatRealty, and an account wall would
// cost the booking. /book-appointment is public the same way.

import { useEffect, useMemo, useState } from "react";
import { CalendarCheck, Loader2 } from "lucide-react";
import { useCompanyTheme } from "@/app/components/company/CompanyShell";

type Slot = { start: string; end: string };

const TZ = "America/Los_Angeles";
const DAYS_AHEAD = 30;
const CLASS_MINUTES = 60;
const TOPICS = ["Claude Code", "AI content creation", "ChatRealty"];

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

export default function AiClassBooker() {
  const t = useCompanyTheme();
  const days = useMemo(() => upcomingWeekdays(DAYS_AHEAD), []);

  const [agentId, setAgentId] = useState<string | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slot, setSlot] = useState<Slot | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [brokerage, setBrokerage] = useState("");
  const [office, setOffice] = useState("");
  const [headcount, setHeadcount] = useState("");
  const [topics, setTopics] = useState<string[]>(TOPICS);
  const [note, setNote] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [booked, setBooked] = useState<Slot | null>(null);

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
    fetch(`/api/appointments/available-slots?agentId=${agentId}&date=${date}&duration=${CLASS_MINUTES}`)
      .then((r) => r.json())
      .then((d) => setSlots(d.slots || []))
      .catch(() => setError("Couldn't load times for that day."))
      .finally(() => setLoadingSlots(false));
  }, [date, agentId]);

  const toggleTopic = (topic: string) =>
    setTopics((cur) => (cur.includes(topic) ? cur.filter((x) => x !== topic) : [...cur, topic]));

  const canSubmit = !!slot && !!agentId && !!name.trim() && !!email.trim() && !!brokerage.trim() && !!office.trim();

  async function book(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !slot) return;
    setBusy(true);
    setError("");
    const message = [
      "[AI class]",
      topics.length ? `Topics: ${topics.join(", ")}` : null,
      headcount.trim() ? `Expected attendees: ${headcount.trim()}` : null,
      note.trim() || null,
    ]
      .filter(Boolean)
      .join("\n");
    try {
      const res = await fetch("/api/appointments/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId,
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          brokerage: brokerage.trim(),
          location: office.trim(),
          startTime: slot.start,
          endTime: slot.end,
          type: "ai-class",
          message,
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
          <CalendarCheck className="w-5 h-5" /> Your class is booked.
        </p>
        <p className="mt-1 text-sm">
          {fmtFull(booked.start)} at {brokerage}. A calendar invite is on its way to {email}.
        </p>
      </div>
    );
  }

  const chip = (active: boolean) =>
    `rounded-lg px-3 py-2 text-sm border transition-colors ${active ? "border-blue-500 bg-blue-600 text-white" : t.secondaryBtn}`;
  const field = `w-full rounded-lg border px-3 py-2 ${t.input}`;
  const label = `block text-sm mb-1.5 ${t.muted}`;

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
          <p className={`text-sm font-medium mb-2 ${t.heading}`}>
            2. Pick a start time <span className={`font-normal ${t.muted}`}>(shown in your time zone)</span>
          </p>
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
          <p className={`text-sm font-medium ${t.heading}`}>3. Tell us about your office</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={label} htmlFor="aic-name">Your name *</label>
              <input id="aic-name" required value={name} onChange={(e) => setName(e.target.value)} className={field} />
            </div>
            <div>
              <label className={label} htmlFor="aic-email">Email *</label>
              <input id="aic-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
            </div>
            <div>
              <label className={label} htmlFor="aic-phone">Phone</label>
              <input id="aic-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={field} />
            </div>
            <div>
              <label className={label} htmlFor="aic-brokerage">Brokerage *</label>
              <input id="aic-brokerage" required value={brokerage} onChange={(e) => setBrokerage(e.target.value)} className={field} />
            </div>
            <div className="sm:col-span-2">
              <label className={label} htmlFor="aic-office">Office address *</label>
              <input id="aic-office" required value={office} onChange={(e) => setOffice(e.target.value)} className={field} />
            </div>
            <div>
              <label className={label} htmlFor="aic-headcount">About how many agents?</label>
              <input id="aic-headcount" inputMode="numeric" value={headcount} onChange={(e) => setHeadcount(e.target.value)} className={field} />
            </div>
          </div>

          <fieldset>
            <legend className={label}>Topics</legend>
            <div className="flex flex-wrap gap-2">
              {TOPICS.map((topic) => (
                <button key={topic} type="button" aria-pressed={topics.includes(topic)} onClick={() => toggleTopic(topic)} className={chip(topics.includes(topic))}>
                  {topic}
                </button>
              ))}
            </div>
          </fieldset>

          <div>
            <label className={label} htmlFor="aic-note">Anything else we should know?</label>
            <textarea id="aic-note" rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} className={field} />
          </div>

          <button type="submit" disabled={busy || !canSubmit} className={`rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-60 ${t.primaryBtn}`}>
            {busy ? "Booking…" : `Book class for ${fmtFull(slot.start)}`}
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}
    </form>
  );
}
