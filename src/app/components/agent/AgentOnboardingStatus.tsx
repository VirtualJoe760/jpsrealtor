"use client";

// Dashboard card for agents who joined through paid onboarding (2026-10-28):
// paid ✓ → verify ID (Stripe Identity) → admin confirms → site can go live.
// Hidden for grandfathered agents, admins, and once both steps are done.
// See src/lib/agent-onboarding.ts.

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Circle, Loader2, ShieldCheck, Clock } from "lucide-react";

type Status = {
  isAgent: boolean;
  isAdmin: boolean;
  grandfathered: boolean;
  identityStatus: "pending" | "verified" | "failed" | "requires_input" | null;
  siteApproved: boolean;
};

export default function AgentOnboardingStatus({ isLight }: { isLight: boolean }) {
  const params = useSearchParams();
  const [s, setS] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const r = await fetch("/api/agent/application-status").catch(() => null);
    if (r?.ok) setS(await r.json());
  }, []);

  useEffect(() => {
    (async () => {
      // Back from Stripe's ID check: pull the result before showing the card.
      if (params.get("identity") === "1") await fetch("/api/agent/verify-identity").catch(() => null);
      await load();
    })();
  }, [params, load]);

  if (!s || !s.isAgent || s.isAdmin || s.grandfathered) return null;
  const verified = s.identityStatus === "verified";
  if (verified && s.siteApproved) return null;

  async function verify() {
    setBusy(true);
    setMsg("");
    const r = await fetch("/api/agent/verify-identity", { method: "POST" });
    const d = await r.json().catch(() => ({}));
    if (r.ok && d.url) {
      window.location.href = d.url;
      return;
    }
    setMsg(d.error || "Couldn't start ID verification.");
    setBusy(false);
  }

  const text = isLight ? "text-gray-900" : "text-white";
  const muted = isLight ? "text-gray-600" : "text-gray-400";
  const Step = ({ done, active, title, children }: { done: boolean; active?: boolean; title: string; children?: React.ReactNode }) => (
    <li className="flex gap-3">
      {done ? (
        <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
      ) : active ? (
        <Clock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
      ) : (
        <Circle className={`w-5 h-5 shrink-0 mt-0.5 ${muted}`} />
      )}
      <div>
        <p className={`font-medium ${text}`}>{title}</p>
        {children && <div className={`text-sm mt-0.5 ${muted}`}>{children}</div>}
      </div>
    </li>
  );

  return (
    <div className={`rounded-xl border p-5 ${isLight ? "bg-white border-blue-200" : "bg-gray-900/60 border-blue-900/60"}`}>
      <div className="flex items-center gap-2 mb-4">
        <ShieldCheck className={`w-5 h-5 ${isLight ? "text-blue-600" : "text-blue-400"}`} />
        <h3 className={`font-semibold ${text}`}>Getting your site live</h3>
      </div>
      <ol className="space-y-4">
        <Step done title="Basic plan active" />
        <Step done={verified} active={!verified} title="Verify your identity">
          {verified ? (
            "Verified."
          ) : s.identityStatus === "pending" ? (
            "Stripe is checking your ID — this usually takes a minute or two."
          ) : (
            <>
              {s.identityStatus === "requires_input" && <p className="mb-1">Stripe couldn&apos;t verify that attempt — please try again with a clear photo.</p>}
              <p>A photo of your driver&apos;s license or passport and a quick selfie. About two minutes, handled securely by Stripe.</p>
              <button
                type="button"
                onClick={verify}
                disabled={busy}
                className="mt-2 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {busy && <Loader2 className="w-4 h-4 animate-spin" />} Verify my ID
              </button>
              {msg && <p className="mt-2 text-amber-600">{msg}</p>}
            </>
          )}
        </Step>
        <Step done={s.siteApproved} active={verified && !s.siteApproved} title="We confirm your details">
          {s.siteApproved
            ? "Confirmed — your site publishes once your profile checklist is complete."
            : "We check your license and MLS details, then your public site can go live. We'll email you."}
        </Step>
      </ol>
    </div>
  );
}
