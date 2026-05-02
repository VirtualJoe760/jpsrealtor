"use client";

import { useState, useEffect, useMemo } from "react";
import { useTheme } from "@/app/contexts/ThemeContext";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  Loader2,
  User,
  Mail,
  Phone,
  MessageSquare,
  Calendar,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

interface TimeSlot { start: string; end: string }

interface AgentInfo {
  id: string;
  name: string;
  email: string;
  phone?: string;
  subdomain?: string;
  headshot?: string;
}

interface CalendarDay {
  date: string;
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  disabled: boolean;
}

type Step = "date" | "time" | "info" | "confirm";

// ── Component ────────────────────────────────────────────────────────────────

export default function BookAppointmentPage() {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  // Agent
  const [agent, setAgent] = useState<AgentInfo | null>(null);

  // Booking flow
  const [step, setStep] = useState<Step>("date");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [booked, setBooked] = useState(false);
  const [error, setError] = useState("");

  // Form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [appointmentType, setAppointmentType] = useState("consultation");

  // Calendar
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // Load agent from public API — extract subdomain from hostname for multi-tenant
  useEffect(() => {
    let url = "/api/agent/public";
    // Extract subdomain from current hostname (e.g., bethanyklier.chatrealty.io → bethanyklier)
    const host = window.location.hostname;
    if (host.includes("chatrealty")) {
      const sub = host.split("chatrealty")[0]?.replace(/\.$/, "").split(".").pop();
      if (sub) url += `?subdomain=${sub}`;
    } else if (host.endsWith(".localhost")) {
      const sub = host.split(".localhost")[0];
      if (sub && sub !== "www") url += `?subdomain=${sub}`;
    }

    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (data.profile) {
          setAgent({
            id: data.profile._id || data.profile.id,
            name: data.profile.name,
            email: data.profile.email,
            phone: data.profile.agentProfile?.cellPhone || data.profile.phone,
            subdomain: data.profile.agentProfile?.subdomain,
            headshot: data.profile.agentProfile?.headshot || data.profile.agentProfile?.heroPhoto,
          });
        }
      })
      .catch(() => {});
  }, []);

  const agentName = agent?.name || "Agent";

  // ── Calendar days (Tailwind UI side-by-side pattern) ───────────────────────

  const calendarDays = useMemo((): CalendarDay[] => {
    const y = currentMonth.getFullYear();
    const m = currentMonth.getMonth();
    const firstDay = new Date(y, m, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const daysInPrev = new Date(y, m, 0).getDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days: CalendarDay[] = [];

    // Leading days from previous month
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = daysInPrev - i;
      const pm = m === 0 ? 11 : m - 1;
      const py = m === 0 ? y - 1 : y;
      days.push({
        date: `${py}-${String(pm + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
        day: d, isCurrentMonth: false, isToday: false, isSelected: false, disabled: true,
      });
    }

    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(y, m, d);
      const ds = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({
        date: ds, day: d, isCurrentMonth: true,
        isToday: dt.getTime() === today.getTime(),
        isSelected: selectedDate === ds,
        disabled: dt < today,
      });
    }

    // Trailing to fill 42 cells
    const rem = 42 - days.length;
    for (let d = 1; d <= rem; d++) {
      const nm = m === 11 ? 0 : m + 1;
      const ny = m === 11 ? y + 1 : y;
      days.push({
        date: `${ny}-${String(nm + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
        day: d, isCurrentMonth: false, isToday: false, isSelected: false, disabled: true,
      });
    }

    return days;
  }, [currentMonth, selectedDate]);

  const monthLabel = currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  // ── Fetch available slots ──────────────────────────────────────────────────

  useEffect(() => {
    if (!selectedDate || !agent) return;
    setLoadingSlots(true);
    setSlots([]);
    setSelectedSlot(null);

    fetch(`/api/appointments/available-slots?agentId=${agent.id}&date=${selectedDate}&duration=30`)
      .then((r) => r.json())
      .then((data) => {
        setSlots(data.slots || []);
        if (data.slots?.length > 0) setStep("time");
      })
      .catch(() => setError("Failed to load available times"))
      .finally(() => setLoadingSlots(false));
  }, [selectedDate, agent]);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

  const fmtDate = (ds: string) => {
    const [y, m, d] = ds.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric", year: "numeric",
    });
  };

  const prevMonth = () => {
    const now = new Date();
    const p = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    if (p >= new Date(now.getFullYear(), now.getMonth(), 1)) setCurrentMonth(p);
  };
  const nextMonth = () =>
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim() || !selectedSlot || !agent) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/appointments/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: agent.id, name: name.trim(), email: email.trim(),
          phone: phone.trim() || undefined, startTime: selectedSlot.start,
          endTime: selectedSlot.end, type: appointmentType,
          message: message.trim() || undefined,
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Booking failed"); }
      setBooked(true);
      setStep("confirm");
    } catch (e: any) { setError(e.message || "Something went wrong."); }
    finally { setSubmitting(false); }
  };

  // ── Theme classes ──────────────────────────────────────────────────────────

  const inputCls = `w-full px-4 py-3 rounded-lg border text-sm focus:outline-none focus:ring-2 ${
    isLight ? "bg-white border-gray-300 text-gray-900 focus:ring-blue-500"
            : "bg-gray-800 border-gray-700 text-white focus:ring-emerald-500"
  }`;

  // ── Success ────────────────────────────────────────────────────────────────

  if (booked && selectedSlot && selectedDate) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className={`max-w-md w-full rounded-2xl border p-8 text-center shadow-lg ${
          isLight ? "bg-white border-gray-200" : "bg-gray-900/60 border-gray-800"
        }`}>
          <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${
            isLight ? "bg-green-100" : "bg-green-900/30"
          }`}>
            <CheckCircle2 className={`w-8 h-8 ${isLight ? "text-green-600" : "text-green-400"}`} />
          </div>
          <h2 className={`text-2xl font-bold mb-2 ${isLight ? "text-gray-900" : "text-white"}`}>
            You&apos;re Booked!
          </h2>
          <p className={`mb-6 ${isLight ? "text-gray-500" : "text-gray-400"}`}>
            Your appointment with {agentName} has been confirmed.
          </p>
          <div className={`rounded-lg p-4 mb-6 ${isLight ? "bg-gray-50" : "bg-gray-800/50"}`}>
            <p className={`text-sm font-medium ${isLight ? "text-gray-900" : "text-white"}`}>
              {fmtDate(selectedDate)}
            </p>
            <p className={`text-lg font-bold mt-1 ${isLight ? "text-blue-600" : "text-emerald-400"}`}>
              {fmtTime(selectedSlot.start)} – {fmtTime(selectedSlot.end)}
            </p>
          </div>
          <p className={`text-sm ${isLight ? "text-gray-500" : "text-gray-400"}`}>
            A calendar invite has been sent to <strong>{email}</strong>.
          </p>
          <button
            onClick={() => {
              setBooked(false);
              setStep("date");
              setSelectedDate(null);
              setSelectedSlot(null);
              setSlots([]);
              setName("");
              setEmail("");
              setPhone("");
              setMessage("");
              setError("");
            }}
            className={`mt-6 px-6 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isLight
                ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                : "bg-white/10 text-gray-300 hover:bg-white/20"
            }`}
          >
            Book Another Appointment
          </button>
        </div>
      </div>
    );
  }

  // ── Main ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen">
      {/* ═══ Hero ═══ */}
      <div className={`relative overflow-hidden ${
        isLight
          ? "bg-gradient-to-br from-blue-600 to-blue-800"
          : "bg-gradient-to-br from-gray-900 via-emerald-950 to-gray-900"
      }`}>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.3'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
          }} />
        </div>
        <div className="relative max-w-3xl mx-auto px-4 py-12 md:py-16 text-center">
          {/* Agent headshot */}
          {agent?.headshot && (
            <div className="mb-4">
              <img
                src={agent.headshot}
                alt={agentName}
                className="w-20 h-20 md:w-24 md:h-24 rounded-full mx-auto object-cover border-4 border-white/20 shadow-xl"
              />
            </div>
          )}
          <h1 className="text-3xl md:text-4xl font-bold text-white">
            Book an Appointment
          </h1>
          <p className="mt-2 text-lg text-white/70">
            Schedule a time with {agentName}
          </p>
          {agent?.phone && (
            <p className="mt-3 text-sm text-white/50">
              or call directly:{" "}
              <a href={`tel:${agent.phone}`} className="text-white/80 hover:text-white font-medium underline">
                {agent.phone}
              </a>
            </p>
          )}
        </div>
      </div>

      {/* ═══ Calendar section ═══ */}
      <div className="px-4 py-8 md:py-12">
      <div className="max-w-3xl mx-auto">

        {/* ═══ Side-by-side: Calendar + Right panel ═══ */}
        <div className={`md:grid md:grid-cols-2 md:divide-x ${
          isLight ? "md:divide-gray-200" : "md:divide-white/10"
        }`}>
          {/* ── Left: Mini calendar (borderless Tailwind UI) ── */}
          <div className="md:pr-14">
            <div className="flex items-center">
              <h2 className={`flex-auto text-sm font-semibold ${isLight ? "text-gray-900" : "text-white"}`}>
                {monthLabel}
              </h2>
              <button onClick={prevMonth} className={`-my-1.5 flex items-center justify-center p-1.5 ${
                isLight ? "text-gray-400 hover:text-gray-500" : "text-gray-400 hover:text-white"
              }`}>
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={nextMonth} className={`-my-1.5 -mr-1.5 ml-2 flex items-center justify-center p-1.5 ${
                isLight ? "text-gray-400 hover:text-gray-500" : "text-gray-400 hover:text-white"
              }`}>
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Day-of-week headers */}
            <div className={`mt-10 grid grid-cols-7 text-center text-xs leading-6 ${
              isLight ? "text-gray-500" : "text-gray-400"
            }`}>
              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <div key={i}>{d}</div>)}
            </div>

            {/* Day grid */}
            <div className="mt-2 grid grid-cols-7 text-sm">
              {calendarDays.map((day, idx) => (
                <div
                  key={day.date}
                  className={`py-2 ${idx > 6
                    ? `border-t ${isLight ? "border-gray-200" : "border-white/10"}`
                    : ""
                  }`}
                >
                  <button
                    type="button"
                    disabled={day.disabled}
                    onClick={() => {
                      if (!day.disabled && day.isCurrentMonth) {
                        setSelectedDate(day.date);
                        setStep("time");
                      }
                    }}
                    className={[
                      "mx-auto flex size-8 items-center justify-center rounded-full transition-colors",
                      // Disabled
                      day.disabled ? "cursor-not-allowed opacity-30" : "",
                      // Not current month (faded)
                      !day.isCurrentMonth && !day.isSelected
                        ? isLight ? "text-gray-400" : "text-gray-600"
                        : "",
                      // Current month, not selected, not today
                      day.isCurrentMonth && !day.isSelected && !day.isToday
                        ? isLight ? "text-gray-900 hover:bg-gray-200" : "text-white hover:bg-white/10"
                        : "",
                      // Today, not selected
                      day.isToday && !day.isSelected
                        ? `font-semibold ${isLight ? "text-blue-600" : "text-emerald-400"}`
                        : "",
                      // Selected + today
                      day.isSelected && day.isToday
                        ? `font-semibold text-white ${isLight ? "bg-blue-600" : "bg-emerald-500"}`
                        : "",
                      // Selected + not today
                      day.isSelected && !day.isToday
                        ? `font-semibold text-white ${isLight ? "bg-gray-900" : "bg-white text-gray-900"}`
                        : "",
                    ].join(" ")}
                  >
                    <time dateTime={day.date}>{day.day}</time>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right: Time slots / Info form ── */}
          <section className="mt-12 md:mt-0 md:pl-14">
            {/* No date selected */}
            {step === "date" && (
              <div className={`flex flex-col items-center justify-center h-full py-16 ${
                isLight ? "text-gray-400" : "text-gray-500"
              }`}>
                <Calendar className="w-10 h-10 mb-3 opacity-40" />
                <p className="text-sm font-medium">Select a date</p>
              </div>
            )}

            {/* Time slots */}
            {step === "time" && selectedDate && (
              <>
                <h2 className={`text-base font-semibold ${isLight ? "text-gray-900" : "text-white"}`}>
                  <time dateTime={selectedDate}>{fmtDate(selectedDate)}</time>
                </h2>

                {loadingSlots ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className={`w-6 h-6 animate-spin ${isLight ? "text-gray-400" : "text-gray-500"}`} />
                  </div>
                ) : slots.length === 0 ? (
                  <div className={`text-center py-16 ${isLight ? "text-gray-400" : "text-gray-500"}`}>
                    <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No available times</p>
                    <p className="text-xs mt-1">Try a different date</p>
                  </div>
                ) : (
                  <ol className="mt-4 flex flex-col gap-y-1 text-sm leading-6">
                    {slots.map((slot, i) => (
                      <li key={i}>
                        <button
                          onClick={() => { setSelectedSlot(slot); setStep("info"); }}
                          className={`group w-full flex items-center gap-x-4 rounded-xl px-4 py-3 transition-colors ${
                            isLight
                              ? "text-gray-500 hover:bg-gray-100 focus-within:bg-gray-100"
                              : "text-gray-400 hover:bg-white/5 focus-within:bg-white/5"
                          }`}
                        >
                          <Clock className={`w-5 h-5 flex-none ${isLight ? "text-gray-400" : "text-gray-500"}`} />
                          <div className="flex-auto text-left">
                            <p className={isLight ? "text-gray-900" : "text-white"}>
                              {fmtTime(slot.start)} – {fmtTime(slot.end)}
                            </p>
                            <p className="mt-0.5 text-xs">30 min</p>
                          </div>
                          <span className={`flex-none text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity ${
                            isLight ? "text-blue-600" : "text-emerald-400"
                          }`}>
                            Select
                          </span>
                        </button>
                      </li>
                    ))}
                  </ol>
                )}
              </>
            )}

            {/* Contact info form */}
            {step === "info" && selectedSlot && selectedDate && (
              <>
                <button
                  onClick={() => setStep("time")}
                  className={`text-sm mb-4 flex items-center gap-1 ${
                    isLight ? "text-gray-500 hover:text-gray-700" : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" /> Change time
                </button>

                {/* Selected time badge */}
                <div className={`rounded-lg p-3 mb-5 flex items-center gap-3 ${
                  isLight ? "bg-blue-50 text-blue-700" : "bg-emerald-900/20 text-emerald-400"
                }`}>
                  <Calendar className="w-5 h-5 shrink-0" />
                  <div>
                    <p className="text-xs font-medium opacity-75">{fmtDate(selectedDate)}</p>
                    <p className="text-sm font-bold">{fmtTime(selectedSlot.start)} – {fmtTime(selectedSlot.end)}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <select value={appointmentType} onChange={(e) => setAppointmentType(e.target.value)} className={inputCls}>
                    <option value="consultation">Free Consultation</option>
                    <option value="showing">Property Showing</option>
                    <option value="call">Phone Call</option>
                    <option value="listing-presentation">Listing Presentation</option>
                    <option value="other">Other</option>
                  </select>

                  <div className="relative">
                    <User className="absolute left-3 top-3.5 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                      placeholder="Full name *" className={`${inputCls} pl-10`} />
                  </div>

                  <div className="relative">
                    <Mail className="absolute left-3 top-3.5 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email *" className={`${inputCls} pl-10`} />
                  </div>

                  <div className="relative">
                    <Phone className="absolute left-3 top-3.5 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                      placeholder="Phone (optional)" className={`${inputCls} pl-10`} />
                  </div>

                  <div className="relative">
                    <MessageSquare className="absolute left-3 top-3.5 w-4 h-4 text-gray-400 pointer-events-none" />
                    <textarea value={message} onChange={(e) => setMessage(e.target.value)}
                      placeholder="Message (optional)" rows={2} className={`${inputCls} pl-10`} />
                  </div>

                  {error && (
                    <p className={`text-sm rounded-lg p-3 ${
                      isLight ? "text-red-700 bg-red-50" : "text-red-400 bg-red-900/20"
                    }`}>{error}</p>
                  )}

                  <button
                    onClick={handleSubmit}
                    disabled={submitting || !name.trim() || !email.trim()}
                    className={`w-full py-3 rounded-lg text-sm font-bold shadow-sm transition-colors disabled:opacity-50 ${
                      isLight ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-emerald-600 hover:bg-emerald-500 text-white"
                    }`}
                  >
                    {submitting
                      ? <><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Booking...</>
                      : <><CheckCircle2 className="w-4 h-4 inline mr-2 -mt-0.5" />Confirm Booking</>
                    }
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
      </div>
    </div>
  );
}
