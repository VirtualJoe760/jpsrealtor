"use client";

// "Continue with Google / Facebook" on the registration gate.
//
// Both providers are already configured in src/lib/auth.ts and its signIn
// callback already creates the User, so this only has to do the part OAuth
// cannot: capture consent before leaving, and hand the complete route enough to
// build the CRM contact when the visitor comes back.
//
// Its consent text is NOT the form's. OAuth gives us an email and a name and no
// phone number, so this agrees to email only — the form's checkbox, which does
// cover calls and texts, would be a consent the visitor never gave. Same reason
// the complete route writes `tcpaConsent: false`.

import { useState } from "react";
import { signIn } from "next-auth/react";
import type { OpenHouseAttendance } from "@/lib/listings/listing-post-pending";

interface Props {
  slug: string;
  isLight: boolean;
  /** Optional RSVP, carried across the redirect. */
  registerForOpenHouse: boolean;
  openHouseAttendance?: OpenHouseAttendance;
  wantsComps?: boolean;
  /** Preview mode: render the buttons but never actually leave the page. */
  preview?: boolean;
}

export default function ListingPostSocialRegister({
  slug,
  isLight,
  registerForOpenHouse,
  openHouseAttendance,
  wantsComps,
  preview,
}: Props) {
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState<"google" | "facebook" | null>(null);
  const [error, setError] = useState("");

  async function go(provider: "google" | "facebook") {
    if (preview) {
      setError("Social sign-in is disabled in preview.");
      return;
    }
    if (!consent) {
      setError("Please agree to be contacted before continuing.");
      return;
    }
    setError("");
    setBusy(provider);
    try {
      // Park the consent and selections first. If this fails we must NOT send
      // them to the provider: they would come back signed in with no pending
      // registration, and the gate would still be shut with no explanation.
      const res = await fetch("/api/leads/listing-post/pending", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, registerForOpenHouse, openHouseAttendance, wantsComps, consent: true }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        setError(data?.error || "Could not start registration. Please use the form below.");
        setBusy(null);
        return;
      }
      await signIn(provider, { callbackUrl: "/api/leads/listing-post/complete" });
    } catch {
      setError("Could not start registration. Please use the form below.");
      setBusy(null);
    }
  }

  const btn = `flex min-h-[44px] w-full items-center justify-center gap-2.5 rounded-lg border px-4 text-sm font-semibold transition disabled:opacity-60 ${
    isLight
      ? "border-gray-300 bg-white text-gray-800 hover:bg-gray-50"
      : "border-neutral-700 bg-neutral-900 text-white hover:bg-neutral-800"
  }`;

  return (
    <div className="mb-5">
      <label
        htmlFor={`social-consent-${slug}`}
        className={`mb-3 flex cursor-pointer items-start gap-2.5 text-xs leading-relaxed ${
          isLight ? "text-gray-600" : "text-neutral-400"
        }`}
      >
        <input
          id={`social-consent-${slug}`}
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-500"
        />
        <span>
          I agree to be contacted <strong className={isLight ? "text-gray-800" : "text-neutral-200"}>by email</strong>{" "}
          about this property and my home search. See the{" "}
          <a href="/terms-of-service">Terms of Service</a> and <a href="/privacy-policy">Privacy Policy</a>.
        </span>
      </label>

      <div className="grid gap-2.5 sm:grid-cols-2">
        <button type="button" onClick={() => go("google")} disabled={busy !== null} className={btn}>
          <svg className="h-[18px] w-[18px]" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.0 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"/>
            <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.0 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
            <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2C37.0 40.2 44 35 44 24c0-1.3-.1-2.6-.4-3.9z"/>
          </svg>
          {busy === "google" ? "Redirecting…" : "Continue with Google"}
        </button>

        <button type="button" onClick={() => go("facebook")} disabled={busy !== null} className={btn}>
          <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="#1877F2" aria-hidden="true">
            <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.09 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.69.24 2.69.24v2.96h-1.52c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.09 24 18.1 24 12.07z"/>
          </svg>
          {busy === "facebook" ? "Redirecting…" : "Continue with Facebook"}
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-2.5 text-xs font-medium text-red-500">
          {error}
        </p>
      )}

      <p className={`mt-2.5 text-[11px] ${isLight ? "text-gray-500" : "text-neutral-500"}`}>
        Use the form below if you’d like to include your phone number.
      </p>

      <div className="my-4 flex items-center gap-3" aria-hidden="true">
        <span className={`h-px flex-1 ${isLight ? "bg-gray-200" : "bg-neutral-800"}`} />
        <span className={`text-[11px] font-semibold uppercase tracking-wider ${isLight ? "text-gray-400" : "text-neutral-600"}`}>
          or
        </span>
        <span className={`h-px flex-1 ${isLight ? "bg-gray-200" : "bg-neutral-800"}`} />
      </div>
    </div>
  );
}
