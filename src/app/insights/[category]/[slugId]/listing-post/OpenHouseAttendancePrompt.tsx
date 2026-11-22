"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

function localDay() {
  const now = new Date();
  return [now.getFullYear(), now.getMonth() + 1, now.getDate()]
    .map((part) => String(part).padStart(2, "0")).join("-");
}

export default function OpenHouseAttendancePrompt({ slug, eventDate, isLight }: {
  slug: string;
  eventDate: string;
  isLight: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [attended, setAttended] = useState(false);
  const [date, setDate] = useState(eventDate);
  const [feedback, setFeedback] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const storageKey = `listing-attendance:${slug}:${eventDate}`;

  useEffect(() => {
    if (eventDate > localDay()) return;
    try {
      if (localStorage.getItem(storageKey)) return;
    } catch { /* The prompt still works when storage is disabled. */ }
    const timer = window.setTimeout(() => setOpen(true), 8000);
    return () => window.clearTimeout(timer);
  }, [eventDate, storageKey]);

  function rememberResponse() {
    try { localStorage.setItem(storageKey, "1"); } catch { /* Optional persistence. */ }
  }

  function dismiss() {
    rememberResponse();
    setOpen(false);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setError("");
    try {
      const response = await fetch("/api/leads/listing-post/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, eventDate, attendedDate: date, feedback }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Could not save your response.");
      }
      rememberResponse();
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your response.");
    } finally {
      setSending(false);
    }
  }

  if (!open) return null;
  const field = `w-full rounded-lg border px-3 py-2 text-sm ${isLight ? "border-gray-300 bg-white" : "border-neutral-700 bg-neutral-800 [color-scheme:dark]"}`;
  return (
    <aside aria-labelledby="open-house-attendance-title"
      className={`fixed bottom-20 right-3 z-40 max-h-[65dvh] w-[calc(100%-1.5rem)] max-w-sm overflow-y-auto rounded-2xl border p-4 shadow-xl sm:bottom-6 sm:right-6 ${
        isLight ? "border-gray-200 bg-white text-gray-900" : "border-neutral-700 bg-neutral-900 text-white"
      }`}>
      <h2 id="open-house-attendance-title" className="pr-8 text-base font-semibold">Did you attend the open house?</h2>
      <button type="button" onClick={dismiss} aria-label="Dismiss open house prompt" className="absolute right-2 top-2 rounded-lg p-2 hover:bg-gray-500/15">
        <X aria-hidden="true" className="h-4 w-4" />
      </button>
      {sent ? <p role="status" className="mt-2 text-sm">Thanks. Your response was sent to the listing agent.</p> : attended ? (
        <form onSubmit={submit} className="mt-3 space-y-3">
          <label className="block text-sm">Date attended (optional)
            <input type="date" max={localDay()} className={field} value={date} onChange={(event) => setDate(event.target.value)} />
          </label>
          <label className="block text-sm">Feedback for the listing agent (optional)
            <textarea rows={2} maxLength={250} className={field} value={feedback} onChange={(event) => setFeedback(event.target.value)} />
          </label>
          {error && <p role="alert" className="text-sm">{error}</p>}
          <button type="submit" disabled={sending} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60">
            {sending ? "Sending…" : "Send response"}
          </button>
        </form>
      ) : (
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={() => setAttended(true)} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white">Yes, I attended</button>
          <button type="button" onClick={dismiss} className="rounded-lg px-3 py-2 text-sm hover:bg-gray-500/15">Dismiss</button>
        </div>
      )}
    </aside>
  );
}
