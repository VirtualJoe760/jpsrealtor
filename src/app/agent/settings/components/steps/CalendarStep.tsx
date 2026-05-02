"use client";

import { useState, useEffect } from "react";
import {
  Save,
  Loader2,
  Calendar,
  Clock,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";

interface StepProps {
  formData: any;
  updateField: (path: string, value: any) => void;
  isLight: boolean;
  onSave: (stepFields: Record<string, any>) => Promise<void>;
  isSaving: boolean;
}

interface BusinessHour {
  day: string;
  open: string;
  close: string;
  closed: boolean;
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const TIME_OPTIONS = [
  "6:00 AM", "6:30 AM", "7:00 AM", "7:30 AM",
  "8:00 AM", "8:30 AM", "9:00 AM", "9:30 AM",
  "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
  "12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM",
  "2:00 PM", "2:30 PM", "3:00 PM", "3:30 PM",
  "4:00 PM", "4:30 PM", "5:00 PM", "5:30 PM",
  "6:00 PM", "6:30 PM", "7:00 PM", "7:30 PM",
  "8:00 PM", "8:30 PM", "9:00 PM",
];

const DEFAULT_HOURS: BusinessHour[] = DAYS.map((day) => ({
  day,
  open: "9:00 AM",
  close: "5:00 PM",
  closed: day === "Sunday",
}));

export default function CalendarStep({
  formData,
  updateField,
  isLight,
  onSave,
  isSaving,
}: StepProps) {
  const inputClass = `w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 ${
    isLight
      ? "bg-white border-gray-300 text-gray-900 focus:ring-blue-500"
      : "bg-gray-800 border-gray-700 text-white focus:ring-emerald-500"
  }`;

  const labelClass = `block text-sm font-medium mb-1.5 ${
    isLight ? "text-gray-700" : "text-gray-300"
  }`;

  const ap = formData.agentProfile || {};
  const calSettings = formData.calendarSettings || {};
  const businessHours: BusinessHour[] =
    ap.businessHours && ap.businessHours.length > 0
      ? ap.businessHours
      : DEFAULT_HOURS;

  const [connecting, setConnecting] = useState(false);
  const [liveCalStatus, setLiveCalStatus] = useState<any>(null);

  // On mount, check if we just returned from OAuth and refresh calendar status
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("calendar") === "connected" || calSettings.status !== "connected") {
      // Fetch fresh profile to get updated calendarSettings
      fetch("/api/user/profile")
        .then((r) => r.json())
        .then((data) => {
          const fresh = data.profile?.calendarSettings;
          if (fresh) {
            setLiveCalStatus(fresh);
            // Also update parent formData so it persists across step navigation
            updateField("calendarSettings", fresh);
          }
        })
        .catch(() => {});
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Merge live status with formData (live takes priority)
  const effectiveCalSettings = liveCalStatus || calSettings;
  const isCalendarConnected = effectiveCalSettings.status === "connected";

  // Use default hours if none set (don't mutate parent state during render)
  const displayHours = businessHours.length > 0 ? businessHours : DEFAULT_HOURS;

  const updateHour = (index: number, field: keyof BusinessHour, value: any) => {
    const updated = [...displayHours];
    updated[index] = { ...updated[index], [field]: value };
    updateField("agentProfile.businessHours", updated);
  };

  const handleConnectCalendar = () => {
    setConnecting(true);
    // Redirect to OAuth — returnTo will bring them back to settings
    const returnTo = encodeURIComponent("/agent/settings");
    window.location.href = `/api/auth/google-calendar/connect?returnTo=${returnTo}`;
  };

  const handleSave = () => {
    onSave({
      agentProfile: {
        businessHours: displayHours,
      },
      calendarSettings: {
        bookingEnabled: calSettings.bookingEnabled !== false,
        defaultDuration: calSettings.defaultDuration || 30,
        bufferTime: calSettings.bufferTime || 15,
        advanceBookingDays: calSettings.advanceBookingDays || 30,
      },
    });
  };

  return (
    <div
      className={`rounded-xl border p-6 ${
        isLight ? "bg-white border-gray-200" : "bg-gray-900/60 border-gray-800"
      }`}
    >
      <h2 className={`text-xl font-bold mb-1 ${isLight ? "text-gray-900" : "text-white"}`}>
        Calendar &amp; Booking
      </h2>
      <p className={`text-sm mb-6 ${isLight ? "text-gray-500" : "text-gray-400"}`}>
        Set your availability and connect Google Calendar for appointment sync.
      </p>

      <div className="space-y-8">
        {/* ═══ Google Calendar Connection ═══ */}
        <div>
          <label className={labelClass}>
            <Calendar className="w-4 h-4 inline mr-1.5 -mt-0.5" />
            Google Calendar
          </label>
          <p className={`text-xs mb-3 ${isLight ? "text-gray-400" : "text-gray-500"}`}>
            Connect your Google Calendar to automatically sync appointments and show real-time availability on your booking page.
          </p>

          {isCalendarConnected ? (
            <div className={`flex items-center gap-3 rounded-lg p-4 ${
              isLight ? "bg-green-50 border border-green-200" : "bg-green-900/20 border border-green-800"
            }`}>
              <CheckCircle2 className={`w-5 h-5 flex-shrink-0 ${isLight ? "text-green-600" : "text-green-400"}`} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${isLight ? "text-green-800" : "text-green-300"}`}>
                  Connected
                </p>
                {effectiveCalSettings.calendarEmail && (
                  <p className={`text-xs truncate ${isLight ? "text-green-600" : "text-green-400"}`}>
                    {effectiveCalSettings.calendarEmail}
                  </p>
                )}
              </div>
              <button
                onClick={handleConnectCalendar}
                className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
                  isLight
                    ? "text-gray-600 hover:bg-green-100"
                    : "text-gray-400 hover:bg-green-900/30"
                }`}
              >
                Reconnect
              </button>
            </div>
          ) : (
            <button
              onClick={handleConnectCalendar}
              disabled={connecting}
              className={`flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-medium transition-colors ${
                isLight
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              } disabled:opacity-50`}
            >
              {connecting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ExternalLink className="w-4 h-4" />
              )}
              Connect Google Calendar
            </button>
          )}
        </div>

        {/* ═══ Business Hours ═══ */}
        <div>
          <label className={labelClass}>
            <Clock className="w-4 h-4 inline mr-1.5 -mt-0.5" />
            Business Hours
          </label>
          <p className={`text-xs mb-3 ${isLight ? "text-gray-400" : "text-gray-500"}`}>
            Set your available hours for each day. Visitors can only book within these times.
          </p>

          <div className="space-y-2">
            {displayHours.map((hour, index) => (
              <div
                key={hour.day}
                className={`flex items-center gap-3 rounded-lg px-4 py-3 ${
                  isLight ? "bg-gray-50" : "bg-gray-800/50"
                }`}
              >
                {/* Day name */}
                <span className={`w-24 text-sm font-medium ${
                  hour.closed
                    ? isLight ? "text-gray-400" : "text-gray-600"
                    : isLight ? "text-gray-900" : "text-white"
                }`}>
                  {hour.day.slice(0, 3)}
                </span>

                {/* Toggle closed */}
                <button
                  type="button"
                  onClick={() => updateHour(index, "closed", !hour.closed)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    !hour.closed
                      ? isLight ? "bg-blue-600" : "bg-emerald-600"
                      : isLight ? "bg-gray-200" : "bg-gray-700"
                  }`}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                    !hour.closed ? "translate-x-5" : "translate-x-0"
                  }`} />
                </button>

                {/* Time selectors */}
                {!hour.closed ? (
                  <div className="flex items-center gap-2 flex-1">
                    <select
                      value={hour.open}
                      onChange={(e) => updateHour(index, "open", e.target.value)}
                      className={`flex-1 px-2 py-1.5 rounded-md border text-xs ${
                        isLight
                          ? "bg-white border-gray-300 text-gray-900"
                          : "bg-gray-800 border-gray-600 text-white"
                      }`}
                    >
                      {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <span className={`text-xs ${isLight ? "text-gray-400" : "text-gray-500"}`}>to</span>
                    <select
                      value={hour.close}
                      onChange={(e) => updateHour(index, "close", e.target.value)}
                      className={`flex-1 px-2 py-1.5 rounded-md border text-xs ${
                        isLight
                          ? "bg-white border-gray-300 text-gray-900"
                          : "bg-gray-800 border-gray-600 text-white"
                      }`}
                    >
                      {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                ) : (
                  <span className={`flex-1 text-xs ${isLight ? "text-gray-400" : "text-gray-600"}`}>
                    Closed
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ═══ Booking Preferences ═══ */}
        <div>
          <label className={labelClass}>Booking Preferences</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={`text-xs mb-1 block ${isLight ? "text-gray-500" : "text-gray-400"}`}>
                Appointment Duration
              </label>
              <select
                value={calSettings.defaultDuration || 30}
                onChange={(e) => updateField("calendarSettings.defaultDuration", parseInt(e.target.value))}
                className={inputClass}
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>1 hour</option>
                <option value={90}>1.5 hours</option>
              </select>
            </div>

            <div>
              <label className={`text-xs mb-1 block ${isLight ? "text-gray-500" : "text-gray-400"}`}>
                Buffer Between
              </label>
              <select
                value={calSettings.bufferTime || 15}
                onChange={(e) => updateField("calendarSettings.bufferTime", parseInt(e.target.value))}
                className={inputClass}
              >
                <option value={0}>No buffer</option>
                <option value={5}>5 minutes</option>
                <option value={10}>10 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
              </select>
            </div>

            <div>
              <label className={`text-xs mb-1 block ${isLight ? "text-gray-500" : "text-gray-400"}`}>
                Advance Booking
              </label>
              <select
                value={calSettings.advanceBookingDays || 30}
                onChange={(e) => updateField("calendarSettings.advanceBookingDays", parseInt(e.target.value))}
                className={inputClass}
              >
                <option value={7}>1 week</option>
                <option value={14}>2 weeks</option>
                <option value={30}>1 month</option>
                <option value={60}>2 months</option>
                <option value={90}>3 months</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="mt-8 flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold text-white transition-colors disabled:opacity-50 bg-green-600 hover:bg-green-700`}
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save &amp; Continue
        </button>
      </div>
    </div>
  );
}
