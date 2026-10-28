"use client";

// One-time contributions via Stripe Checkout. Kept separate from /invest on
// purpose — see the header of src/app/api/support/checkout/route.ts.

import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { AccountGate, CompanyShell, Section, useCompanyTheme } from "@/app/components/company/CompanyShell";

const PRESETS = [10, 25, 50, 100, 250];

function ContributeForm() {
  const t = useCompanyTheme();
  const [amount, setAmount] = useState("25");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function go(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/support/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(amount) }),
      });
      const d = await res.json();
      if (!res.ok || !d.url) throw new Error(d.error || "Could not start checkout");
      window.location.href = d.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start checkout");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={go} className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setAmount(String(p))}
            className={`rounded-lg px-4 py-2 text-sm border ${
              Number(amount) === p ? "border-blue-500 bg-blue-600 text-white" : t.secondaryBtn
            }`}
          >
            ${p}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 max-w-xs">
        <span className={t.heading}>$</span>
        <input
          type="number"
          min={5}
          max={10000}
          step={1}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className={`w-full rounded-lg border px-3 py-2 ${t.input}`}
          aria-label="Contribution in US dollars"
        />
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button type="submit" disabled={busy} className={`rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-60 ${t.primaryBtn}`}>
        {busy ? "Opening secure checkout…" : `Contribute $${Number(amount) || 0}`}
      </button>
      <p className={`text-xs ${t.muted}`}>Payments are processed securely by Stripe.</p>
    </form>
  );
}

export default function SupportClient() {
  const t = useCompanyTheme();
  const status = useSearchParams().get("status");

  return (
    <CompanyShell
      eyebrow="Support ChatRealty"
      title={<>Help fund a platform <span className={t.accent}>built for agents.</span></>}
      lede="If ChatRealty has helped your business, a one-time contribution goes straight into building it — new tools, better data, and keeping costs down for agents."
    >
      {status === "thanks" && (
        <p className={`rounded-xl p-4 ${t.isLight ? "bg-emerald-50 text-emerald-800" : "bg-emerald-950/50 text-emerald-300"}`}>
          Thank you — your contribution went through. A receipt is on its way to your email.
        </p>
      )}
      {status === "cancelled" && (
        <p className={`rounded-xl p-4 ${t.isLight ? "bg-gray-100 text-gray-700" : "bg-neutral-800 text-neutral-300"}`}>
          Checkout was cancelled. Nothing was charged.
        </p>
      )}

      <Section title="Make a contribution">
        <AccountGate action="contribute">
          <ContributeForm />
        </AccountGate>
      </Section>

      <p className={`text-xs leading-relaxed ${t.muted}`}>
        A contribution is a gift to ChatRealty. It is not an investment and does not give you equity, ownership,
        platform credits or any other reward. ChatRealty is not a charity, so contributions are not tax deductible.
        Interested in owning part of the company? See our{" "}
        <Link href="/invest" className="underline">planned community round</Link>.
      </p>
    </CompanyShell>
  );
}
