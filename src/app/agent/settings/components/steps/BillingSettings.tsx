"use client";

// Plan & Billing — the onboarding wizard's plan step and Settings → Billing.
//
// Since 2026-10-28 being an agent requires the Basic plan, and the portal
// paywall (src/proxy.ts) sends unpaid agents HERE — so this panel must be able
// to sell Basic. States:
//   admin          → everything included, no billing
//   grandfathered  → Basic, free (agents who joined before paid onboarding)
//   paying         → Basic, "Manage billing" (Stripe portal: card, invoices, cancel)
//   unpaid/lapsed  → "Subscribe" (Stripe Checkout; promo codes accepted)

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { CreditCard, Check, Loader2 } from "lucide-react";
import { TIER_DETAILS } from "@/config/stripe-prices";

interface StepProps {
  formData: any;
  updateField: (path: string, value: any) => void;
  isLight: boolean;
  onSave: (stepFields: Record<string, any>) => Promise<void>;
  isSaving: boolean;
}

const BASIC = TIER_DETAILS.beginner;

export default function BillingSettings({ isLight }: StepProps) {
  const { data: session, update } = useSession();
  const params = useSearchParams();
  const tier = (session?.user as any)?.agentTier as string | undefined;
  const isAdmin = !!(session?.user as any)?.isAdmin;
  const [grandfathered, setGrandfathered] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/agent/application-status")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setGrandfathered(!!d?.grandfathered))
      .catch(() => setGrandfathered(false));
  }, []);

  // Back from Checkout: refresh the session so the portal unlocks right away.
  useEffect(() => {
    if (params.get("subscribed") === "1") update();
  }, [params, update]);

  const paying = !grandfathered && !!tier && tier !== "free";

  async function go(path: "/api/stripe/checkout" | "/api/stripe/portal") {
    setBusy(true);
    setError("");
    const back = `${window.location.origin}/agent/settings?section=billing`;
    const body =
      path === "/api/stripe/checkout"
        ? { tier: "beginner", billingInterval: "monthly", successUrl: `${back}&subscribed=1`, cancelUrl: back }
        : { returnUrl: back };
    try {
      const r = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.url) throw new Error(d.error || "Couldn't open billing");
      window.location.href = d.url;
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  const text = isLight ? "text-gray-900" : "text-white";
  const muted = isLight ? "text-gray-600" : "text-gray-400";
  const status = isAdmin
    ? "Admin account — everything is included, no billing."
    : grandfathered
    ? "You're a founding agent: the Basic plan is free for you, for good."
    : paying
    ? `You're on Basic — $${BASIC.monthlyPrice}/month.`
    : `Your agent account needs the Basic plan — $${BASIC.monthlyPrice}/month.`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className={`text-2xl font-semibold ${text}`}>Plan &amp; Billing</h2>
        <p className={`text-sm mt-1 ${muted}`}>{grandfathered === null && !isAdmin ? " " : status}</p>
      </div>

      <div
        className={`rounded-xl border p-5 max-w-md ${
          isLight ? "border-blue-500 bg-blue-50/50" : "border-emerald-600 bg-emerald-950/10"
        }`}
      >
        <div className="flex items-center gap-3">
          <CreditCard className={`w-7 h-7 ${isLight ? "text-blue-500" : "text-emerald-400"}`} />
          <div>
            <h3 className={`text-lg font-bold ${text}`}>{BASIC.name}</h3>
            <p className={`text-sm ${muted}`}>
              {isAdmin || grandfathered ? "Included" : `$${BASIC.monthlyPrice}/month`}
            </p>
          </div>
        </div>
        <p className={`text-sm mt-3 ${muted}`}>{BASIC.description}</p>
        <ul className="space-y-1.5 mt-3">
          {BASIC.features.map((f) => (
            <li key={f} className="flex items-start gap-2">
              <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isLight ? "text-blue-500" : "text-emerald-400"}`} />
              <span className={`text-sm ${isLight ? "text-gray-700" : "text-gray-300"}`}>{f}</span>
            </li>
          ))}
        </ul>

        {!isAdmin && grandfathered === false && (
          <div className="mt-5">
            {paying ? (
              <button
                type="button"
                onClick={() => go("/api/stripe/portal")}
                disabled={busy}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold disabled:opacity-60 ${
                  isLight ? "bg-white border border-gray-300 text-gray-900 hover:bg-gray-50" : "bg-gray-800 border border-gray-700 text-white hover:bg-gray-700"
                }`}
              >
                {busy && <Loader2 className="w-4 h-4 animate-spin" />} Manage billing
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => go("/api/stripe/checkout")}
                  disabled={busy}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {busy && <Loader2 className="w-4 h-4 animate-spin" />} Subscribe — ${BASIC.monthlyPrice}/month
                </button>
                <p className={`text-xs mt-2 ${muted}`}>Have a promo code? Enter it on the payment page.</p>
              </>
            )}
            {paying && <p className={`text-xs mt-2 ${muted}`}>Update your card, see invoices, or cancel.</p>}
          </div>
        )}
        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      </div>
    </div>
  );
}
