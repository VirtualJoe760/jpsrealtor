"use client";

import { useState } from "react";

export default function InquiryForm({ listingKey, source }: { listingKey?: string; source?: string }) {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState<string>("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("sending");
    setError("");
    const form = e.currentTarget;
    const data = new FormData(form);
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name") || undefined,
          email: data.get("email") || undefined,
          phone: data.get("phone") || undefined,
          company: data.get("company") || undefined, // honeypot
          tags: [
            ...(listingKey ? [`listing:${listingKey}`] : []),
            ...(source ? [source] : []),
          ],
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `Request failed (${res.status})`);
      }
      setState("done");
      form.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
        Thanks — we&apos;ll be in touch.
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      {/* Honeypot: hidden from humans, tempting to bots. */}
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden="true"
      />
      <input
        name="name"
        placeholder="Your name"
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand"
      />
      <input
        name="email"
        type="email"
        placeholder="Email"
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand"
      />
      <input
        name="phone"
        type="tel"
        placeholder="Phone (optional)"
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand"
      />
      {state === "error" && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={state === "sending"}
        className="w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
      >
        {state === "sending" ? "Sending…" : "Request info"}
      </button>
      <p className="text-[11px] text-gray-400">
        Provide an email or phone. We&apos;ll only use it to follow up about this home.
      </p>
    </form>
  );
}
