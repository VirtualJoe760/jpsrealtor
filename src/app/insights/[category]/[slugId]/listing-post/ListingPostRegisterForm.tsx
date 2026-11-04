"use client";

// Registration form on a listing blog post → POST /api/leads/listing-post.
// Turnstile-protected like the buy/sell intake forms. The consent checkbox is
// required; the sold-comps checkbox is optional.

import { useRef, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import TurnstileWidget, { TurnstileWidgetHandle } from "@/components/TurnstileWidget";

export default function ListingPostRegisterForm({
  slug,
  isOpenHouse,
  agentName,
  isLight,
  preview,
}: {
  slug: string;
  isOpenHouse: boolean;
  agentName: string;
  isLight: boolean;
  preview?: boolean;
}) {
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", wantsComps: false, consent: false });
  const [token, setToken] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const turnstileRef = useRef<TurnstileWidgetHandle>(null);

  const input = `w-full rounded-xl px-4 py-3 text-sm outline-none transition-colors ${
    isLight
      ? "bg-white border border-gray-300 text-gray-900 focus:border-blue-500"
      : "bg-neutral-900/70 border border-neutral-700 text-white focus:border-emerald-500"
  }`;
  const muted = isLight ? "text-gray-600" : "text-neutral-400";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (preview) {
      setError("This is a preview — registration opens once the post is published.");
      return;
    }
    if (!form.consent) {
      setError("Please agree to the communication terms to register.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/leads/listing-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, ...form, turnstileToken: token }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Registration failed");
      setDone(true);
    } catch (err: any) {
      setError(err?.message || "Something went wrong");
      turnstileRef.current?.reset();
      setToken("");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <CheckCircle2 className={`h-10 w-10 ${isLight ? "text-emerald-600" : "text-emerald-400"}`} />
        <p className={`text-lg font-semibold ${isLight ? "text-gray-900" : "text-white"}`}>You&apos;re registered</p>
        <p className={`text-sm ${muted}`}>Check your email to finish setting up your account.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input className={input} placeholder="First name" required autoComplete="given-name"
          value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
        <input className={input} placeholder="Last name" autoComplete="family-name"
          value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
      </div>
      <input className={input} type="email" placeholder="Email" required autoComplete="email"
        value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      <input className={input} type="tel" placeholder="Phone" autoComplete="tel"
        value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />

      <label className={`flex items-start gap-3 text-sm ${isLight ? "text-gray-800" : "text-neutral-200"}`}>
        <input type="checkbox" className="mt-1 h-4 w-4" checked={form.wantsComps}
          onChange={(e) => setForm({ ...form, wantsComps: e.target.checked })} />
        <span>Email me recently sold homes nearby (comparable sales)</span>
      </label>

      <label className={`flex items-start gap-3 text-xs leading-relaxed ${muted}`}>
        <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0" required checked={form.consent}
          onChange={(e) => setForm({ ...form, consent: e.target.checked })} />
        <span>
          I agree to be contacted by {agentName} about this property and real estate services by email, and by
          phone call or text message at the number above (message and data rates may apply; reply STOP to opt out).
          Consent is not a condition of purchase. I agree to the{" "}
          <a href="/terms-of-service" target="_blank" rel="noopener noreferrer" className="underline">terms of service</a>{" "}
          and{" "}
          <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="underline">privacy policy</a>.
        </span>
      </label>

      {error && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-500">{error}</p>}

      {!preview && (
        <div className="flex justify-center">
          <TurnstileWidget
            ref={turnstileRef}
            onVerify={setToken}
            onExpire={() => setToken("")}
            onError={() => setToken("")}
            theme={isLight ? "light" : "dark"}
            action="listing-post"
          />
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || (!preview && !token) || !form.consent}
        className={`flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 font-semibold text-white transition-opacity disabled:opacity-60 ${
          isLight ? "bg-blue-600 hover:bg-blue-700" : "bg-emerald-600 hover:bg-emerald-500"
        }`}
      >
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
        {isOpenHouse ? "Register for the open house" : "Register for details"}
      </button>
    </form>
  );
}
