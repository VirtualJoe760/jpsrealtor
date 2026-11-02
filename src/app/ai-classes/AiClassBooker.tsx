"use client";

// Book an in-office AI class. Two steps:
//   1. Intake — who's asking, the office, and the presentation room (screen,
//      Apple TV, projector, Wi-Fi…) so the class can be set up for the room.
//      Offices outside Southern California stop here.
//   2. Schedule — a month calendar (weekdays, at least AI_CLASS_LEAD_DAYS out)
//      and the open start times from the owner's Google Calendar.
//
// Same pipeline as /invest's ConsultationBooker: /api/agent/public (resolves to
// the platform owner on chatrealty.io) → /api/appointments/available-slots →
// /api/appointments/book. The intake is saved on the Appointment (`aiClass`)
// and written into the calendar event description.
//
// No account required, unlike /invest: the booker is usually a broker or office
// manager who has never used ChatRealty.

import { useEffect, useMemo, useState } from "react";
import { CalendarCheck, ChevronLeft, ChevronRight, Loader2, MapPin } from "lucide-react";
import { useCompanyTheme } from "@/app/components/company/CompanyShell";
import {
  AI_CLASS_LEAD_DAYS,
  AI_CLASS_LENGTH_LABEL,
  AI_CLASS_MINUTES,
  AI_CLASS_WINDOW_DAYS,
  AI_EXPERIENCE,
  EQUIPMENT,
  REQUESTER_ROLES,
  ROOM_TYPES,
  SOCAL_COUNTIES,
  type AiClassIntake,
  type EquipmentAnswer,
  type EquipmentKey,
} from "@/config/ai-classes";

type Slot = { start: string; end: string };

const TZ = "America/Los_Angeles";
const OUTSIDE = "outside";

/** Today's date in Pacific time as YYYY-MM-DD. */
const pacificToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());

/** Add days to a YYYY-MM-DD string (calendar math, no time zone drift). */
function addDays(ymd: string, n: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

const ymdOf = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
const fmtLongDay = (ymd: string) =>
  new Date(`${ymd}T12:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
const fmtFull = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" });

const toNum = (s: string) => {
  const n = parseInt(s, 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

export default function AiClassBooker() {
  const t = useCompanyTheme();

  // Bookable range, in Pacific dates.
  const [firstDay, lastDay] = useMemo(() => {
    const first = addDays(pacificToday(), AI_CLASS_LEAD_DAYS);
    return [first, addDays(first, AI_CLASS_WINDOW_DAYS)];
  }, []);

  const [step, setStep] = useState<"intake" | "schedule">("intake");
  const [agentId, setAgentId] = useState<string | null>(null);

  // Contact
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [requesterRole, setRequesterRole] = useState("");

  // Office
  const [brokerage, setBrokerage] = useState("");
  const [officeName, setOfficeName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [county, setCounty] = useState("");
  const [officeAgents, setOfficeAgents] = useState("");
  const [expectedAttendees, setExpectedAttendees] = useState("");
  const [aiExperience, setAiExperience] = useState("");

  // Day-of point of contact (defaults to the requester)
  const [pocIsMe, setPocIsMe] = useState(true);
  const [pocName, setPocName] = useState("");
  const [pocPhone, setPocPhone] = useState("");
  const [pocEmail, setPocEmail] = useState("");

  // Room
  const [roomType, setRoomType] = useState("");
  const [seats, setSeats] = useState("");
  const [equipment, setEquipment] = useState<Partial<Record<EquipmentKey, EquipmentAnswer>>>({});
  const [laptops, setLaptops] = useState<EquipmentAnswer | "">("");
  const [roomNotes, setRoomNotes] = useState("");
  const [accessNotes, setAccessNotes] = useState("");
  const [note, setNote] = useState("");

  // Schedule
  const [month, setMonth] = useState(() => {
    const [y, m] = firstDay.split("-").map(Number);
    return { y, m: m - 1 };
  });
  const [date, setDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slot, setSlot] = useState<Slot | null>(null);

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
    fetch(`/api/appointments/available-slots?agentId=${agentId}&date=${date}&duration=${AI_CLASS_MINUTES}&type=ai-class`)
      .then((r) => r.json())
      .then((d) => setSlots(d.slots || []))
      .catch(() => setError("Couldn't load times for that day."))
      .finally(() => setLoadingSlots(false));
  }, [date, agentId]);

  const outsideArea = county === OUTSIDE;
  const intakeComplete =
    !!name.trim() && !!email.trim() && !!requesterRole && !!brokerage.trim() && !!address.trim() &&
    !!city.trim() && !!county && !outsideArea && !!roomType &&
    (pocIsMe ? !!phone.trim() : !!pocName.trim() && !!pocPhone.trim());

  const pointOfContact = pocIsMe
    ? { name: name.trim(), phone: phone.trim(), email: email.trim() || undefined }
    : { name: pocName.trim(), phone: pocPhone.trim(), email: pocEmail.trim() || undefined };

  const intake: AiClassIntake = {
    brokerage: brokerage.trim(),
    officeName: officeName.trim() || undefined,
    address: address.trim(),
    city: city.trim(),
    county,
    requesterRole,
    officeAgents: toNum(officeAgents),
    expectedAttendees: toNum(expectedAttendees),
    aiExperience: aiExperience || undefined,
    laptops: laptops || undefined,
    pointOfContact,
    roomType,
    seats: toNum(seats),
    equipment,
    roomNotes: roomNotes.trim() || undefined,
    accessNotes: accessNotes.trim() || undefined,
  };

  async function book() {
    if (!slot || !agentId || !intakeComplete) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/appointments/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId,
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          startTime: slot.start,
          endTime: slot.end,
          type: "ai-class",
          aiClass: intake,
          message: note.trim() || undefined,
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

  // ── Styles ────────────────────────────────────────────────────────────────
  const chip = (active: boolean) =>
    `rounded-lg px-3 py-2 text-sm border transition-colors ${active ? "border-blue-500 bg-blue-600 text-white" : t.secondaryBtn}`;
  const field = `w-full rounded-lg border px-3 py-2 ${t.input}`;
  const label = `block text-sm mb-1.5 ${t.muted}`;
  const groupTitle = `text-sm font-semibold uppercase tracking-wider ${t.accent}`;
  const divider = t.isLight ? "border-gray-200" : "border-neutral-700";

  // ── Booked ────────────────────────────────────────────────────────────────
  if (booked) {
    return (
      <div className={`rounded-xl p-5 ${t.isLight ? "bg-emerald-50 text-emerald-800" : "bg-emerald-950/50 text-emerald-300"}`}>
        <p className="font-semibold flex items-center gap-2">
          <CalendarCheck className="w-5 h-5" /> Your class is booked.
        </p>
        <p className="mt-1 text-sm">
          {fmtFull(booked.start)} at {brokerage}. A calendar invite is on its way to {email}, and we&apos;ll be in touch
          before the class to confirm the room setup.
        </p>
      </div>
    );
  }

  // ── Step 2: schedule ──────────────────────────────────────────────────────
  if (step === "schedule") {
    const { y, m } = month;
    const lead = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const cells: (string | null)[] = [
      ...Array.from({ length: lead }, () => null),
      ...Array.from({ length: daysInMonth }, (_, i) => ymdOf(y, m, i + 1)),
    ];
    while (cells.length % 7) cells.push(null);

    const [fy, fm] = firstDay.split("-").map(Number);
    const [ly, lm] = lastDay.split("-").map(Number);
    const canPrev = y * 12 + m > fy * 12 + (fm - 1);
    const canNext = y * 12 + m < ly * 12 + (lm - 1);
    const shift = (n: number) => {
      const idx = y * 12 + m + n;
      setMonth({ y: Math.floor(idx / 12), m: idx % 12 });
    };
    const bookable = (ymd: string) => {
      const wd = new Date(`${ymd}T12:00:00`).getDay();
      return ymd >= firstDay && ymd <= lastDay && wd !== 0 && wd !== 6;
    };
    const today = pacificToday();

    return (
      <div className="space-y-6">
        <button type="button" onClick={() => setStep("intake")} className={`text-sm flex items-center gap-1 ${t.muted}`}>
          <ChevronLeft className="w-4 h-4" /> Edit office details
        </button>

        <p className={`text-sm flex items-center gap-2 ${t.muted}`}>
          <MapPin className="w-4 h-4" /> {brokerage}
          {officeName.trim() ? ` · ${officeName.trim()}` : ""} — {address}, {city}
        </p>

        <div className={`md:grid md:grid-cols-2 md:gap-8 md:divide-x ${t.isLight ? "md:divide-gray-200" : "md:divide-neutral-700"}`}>
          {/* Month view */}
          <div className="md:pr-8">
            <div className="flex items-center">
              <h3 className={`flex-auto font-semibold ${t.heading}`}>
                {new Date(y, m, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </h3>
              <button type="button" aria-label="Previous month" disabled={!canPrev} onClick={() => shift(-1)} className={`p-1.5 disabled:opacity-30 ${t.muted}`}>
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button type="button" aria-label="Next month" disabled={!canNext} onClick={() => shift(1)} className={`p-1.5 disabled:opacity-30 ${t.muted}`}>
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <div className={`mt-6 grid grid-cols-7 text-center text-xs ${t.muted}`}>
              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <div key={i}>{d}</div>)}
            </div>
            <div className="mt-2 grid grid-cols-7 text-sm">
              {cells.map((ymd, i) => {
                if (!ymd) return <div key={`e${i}`} className="py-1.5" />;
                const ok = bookable(ymd);
                const selected = ymd === date;
                return (
                  <div key={ymd} className="py-1.5">
                    <button
                      type="button"
                      disabled={!ok}
                      onClick={() => setDate(ymd)}
                      className={[
                        "mx-auto flex size-9 items-center justify-center rounded-full transition-colors",
                        selected
                          ? "bg-blue-600 text-white font-semibold"
                          : ok
                            ? `font-medium ${t.heading} ${t.isLight ? "bg-blue-50 hover:bg-blue-100" : "bg-sky-500/10 hover:bg-sky-500/20"}`
                            : `${t.muted} opacity-40 cursor-not-allowed`,
                        ymd === today && !selected ? "ring-1 ring-current" : "",
                      ].join(" ")}
                    >
                      <time dateTime={ymd}>{Number(ymd.slice(8))}</time>
                    </button>
                  </div>
                );
              })}
            </div>
            <p className={`mt-3 text-xs ${t.muted}`}>
              Weekdays only. Classes are booked at least {AI_CLASS_LEAD_DAYS} days ahead.
            </p>
          </div>

          {/* Times */}
          <div className="mt-8 md:mt-0 md:pl-8">
            {!date ? (
              <p className={`text-sm py-12 text-center ${t.muted}`}>Pick a highlighted day to see start times.</p>
            ) : (
              <>
                <h3 className={`font-semibold ${t.heading}`}>{fmtLongDay(date)}</h3>
                <p className={`text-xs mt-0.5 ${t.muted}`}>{AI_CLASS_LENGTH_LABEL} class · times in your time zone</p>
                {loadingSlots ? (
                  <p className={`mt-4 text-sm flex items-center gap-2 ${t.muted}`}><Loader2 className="w-4 h-4 animate-spin" /> Loading times…</p>
                ) : slots.length === 0 ? (
                  <p className={`mt-4 text-sm ${t.muted}`}>No open times that day — try another.</p>
                ) : (
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {slots.map((s) => (
                      <button key={s.start} type="button" onClick={() => setSlot(s)} className={chip(slot?.start === s.start)}>
                        {fmtTime(s.start)}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {slot && (
          <button type="button" onClick={book} disabled={busy} className={`w-full sm:w-auto rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-60 ${t.primaryBtn}`}>
            {busy ? "Booking…" : `Book class for ${fmtFull(slot.start)}`}
          </button>
        )}
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    );
  }

  // ── Step 1: intake ────────────────────────────────────────────────────────
  const yesNo = (value: EquipmentAnswer | undefined, set: (v: EquipmentAnswer) => void) => (
    <div className="flex gap-1.5">
      {(["yes", "no", "unsure"] as const).map((v) => (
        <button key={v} type="button" aria-pressed={value === v} onClick={() => set(v)} className={`${chip(value === v)} px-2.5 py-1 text-xs`}>
          {v === "yes" ? "Yes" : v === "no" ? "No" : "Not sure"}
        </button>
      ))}
    </div>
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (intakeComplete) setStep("schedule");
      }}
      className="space-y-8"
    >
      {/* About you */}
      <fieldset className="space-y-4">
        <legend className={groupTitle}>About you</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="aic-name">Your name *</label>
            <input id="aic-name" required value={name} onChange={(e) => setName(e.target.value)} className={field} />
          </div>
          <div>
            <label className={label} htmlFor="aic-role">Your role *</label>
            <select id="aic-role" required value={requesterRole} onChange={(e) => setRequesterRole(e.target.value)} className={field}>
              <option value="">Select…</option>
              {REQUESTER_ROLES.map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className={label} htmlFor="aic-email">Email *</label>
            <input id="aic-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
          </div>
          <div>
            <label className={label} htmlFor="aic-phone">Phone</label>
            <input id="aic-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={field} />
          </div>
        </div>
      </fieldset>

      {/* Office */}
      <fieldset className={`space-y-4 border-t pt-6 ${divider}`}>
        <legend className={`${groupTitle} float-left w-full mb-4`}>The office</legend>
        <div className="grid gap-4 sm:grid-cols-2 clear-left">
          <div>
            <label className={label} htmlFor="aic-brokerage">Brokerage *</label>
            <input id="aic-brokerage" required value={brokerage} onChange={(e) => setBrokerage(e.target.value)} className={field} />
          </div>
          <div>
            <label className={label} htmlFor="aic-officename">Office / branch name</label>
            <input id="aic-officename" value={officeName} onChange={(e) => setOfficeName(e.target.value)} className={field} />
          </div>
          <div className="sm:col-span-2">
            <label className={label} htmlFor="aic-address">Street address *</label>
            <input id="aic-address" required value={address} onChange={(e) => setAddress(e.target.value)} className={field} />
          </div>
          <div>
            <label className={label} htmlFor="aic-city">City *</label>
            <input id="aic-city" required value={city} onChange={(e) => setCity(e.target.value)} className={field} />
          </div>
          <div>
            <label className={label} htmlFor="aic-county">County *</label>
            <select id="aic-county" required value={county} onChange={(e) => setCounty(e.target.value)} className={field}>
              <option value="">Select…</option>
              {SOCAL_COUNTIES.map((c) => <option key={c} value={c}>{c} County</option>)}
              <option value={OUTSIDE}>Outside Southern California</option>
            </select>
          </div>
        </div>

        {outsideArea && (
          <p className={`rounded-lg p-4 text-sm ${t.isLight ? "bg-amber-50 text-amber-800" : "bg-amber-950/40 text-amber-300"}`}>
            In-office classes are available in Southern California only for now. We&apos;re expanding — email{" "}
            <a href="mailto:support@chatrealty.io" className="underline">support@chatrealty.io</a> and we&apos;ll let you know
            when we reach your area.
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={label} htmlFor="aic-agents">Agents in the office</label>
            <input id="aic-agents" inputMode="numeric" value={officeAgents} onChange={(e) => setOfficeAgents(e.target.value.replace(/\D/g, ""))} className={field} />
          </div>
          <div>
            <label className={label} htmlFor="aic-attendees">Expected attendees</label>
            <input id="aic-attendees" inputMode="numeric" value={expectedAttendees} onChange={(e) => setExpectedAttendees(e.target.value.replace(/\D/g, ""))} className={field} />
          </div>
          <div>
            <label className={label} htmlFor="aic-exp">Agents&apos; AI experience</label>
            <select id="aic-exp" value={aiExperience} onChange={(e) => setAiExperience(e.target.value)} className={field}>
              <option value="">Select…</option>
              {AI_EXPERIENCE.map((x) => <option key={x}>{x}</option>)}
            </select>
          </div>
        </div>

      </fieldset>

      {/* Point of contact */}
      <fieldset className={`space-y-4 border-t pt-6 ${divider}`}>
        <legend className={`${groupTitle} float-left w-full mb-1`}>Point of contact</legend>
        <p className={`text-sm clear-left ${t.muted}`}>Who we call on the day of the class, at the office.</p>
        <label className={`flex items-center gap-2 text-sm ${t.heading}`}>
          <input type="checkbox" checked={pocIsMe} onChange={(e) => setPocIsMe(e.target.checked)} className="h-4 w-4" />
          That&apos;s me
        </label>
        {!pocIsMe && (
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className={label} htmlFor="aic-poc-name">Name *</label>
              <input id="aic-poc-name" required value={pocName} onChange={(e) => setPocName(e.target.value)} className={field} />
            </div>
            <div>
              <label className={label} htmlFor="aic-poc-phone">Phone *</label>
              <input id="aic-poc-phone" type="tel" required value={pocPhone} onChange={(e) => setPocPhone(e.target.value)} className={field} />
            </div>
            <div>
              <label className={label} htmlFor="aic-poc-email">Email</label>
              <input id="aic-poc-email" type="email" value={pocEmail} onChange={(e) => setPocEmail(e.target.value)} className={field} />
            </div>
          </div>
        )}
        {pocIsMe && !phone.trim() && (
          <p className={`text-sm ${t.isLight ? "text-amber-700" : "text-amber-300"}`}>Add your phone number above so we can reach you on the day.</p>
        )}
      </fieldset>

      {/* Room */}
      <fieldset className={`space-y-4 border-t pt-6 ${divider}`}>
        <legend className={`${groupTitle} float-left w-full mb-1`}>The presentation room</legend>
        <p className={`text-sm clear-left ${t.muted}`}>So we can bring the right cables and set up for your space.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="aic-room">Room type *</label>
            <select id="aic-room" required value={roomType} onChange={(e) => setRoomType(e.target.value)} className={field}>
              <option value="">Select…</option>
              {ROOM_TYPES.map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className={label} htmlFor="aic-seats">Seats in the room</label>
            <input id="aic-seats" inputMode="numeric" value={seats} onChange={(e) => setSeats(e.target.value.replace(/\D/g, ""))} className={field} />
          </div>
        </div>

        <div className={`rounded-xl border divide-y ${divider} ${t.isLight ? "divide-gray-200" : "divide-neutral-700"}`}>
          {EQUIPMENT.map((e) => (
            <div key={e.key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3">
              <span className={`text-sm ${t.heading}`}>{e.label}</span>
              {yesNo(equipment[e.key], (v) => setEquipment((cur) => ({ ...cur, [e.key]: v })))}
            </div>
          ))}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3">
            <span className={`text-sm ${t.heading}`}>Will attendees bring laptops?</span>
            {yesNo(laptops || undefined, setLaptops)}
          </div>
        </div>

        <div>
          <label className={label} htmlFor="aic-roomnotes">Describe the room</label>
          <textarea
            id="aic-roomnotes"
            rows={3}
            maxLength={1000}
            value={roomNotes}
            onChange={(e) => setRoomNotes(e.target.value)}
            placeholder="Size, seating layout, where the screen is, anything we should know"
            className={field}
          />
        </div>
        <div>
          <label className={label} htmlFor="aic-access">Parking and building access</label>
          <input id="aic-access" value={accessNotes} onChange={(e) => setAccessNotes(e.target.value)} className={field} />
        </div>
        <div>
          <label className={label} htmlFor="aic-note">Anything else?</label>
          <textarea id="aic-note" rows={2} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} className={field} />
        </div>
      </fieldset>

      <button type="submit" disabled={!intakeComplete} className={`rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-50 ${t.primaryBtn}`}>
        Continue to scheduling
      </button>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </form>
  );
}
