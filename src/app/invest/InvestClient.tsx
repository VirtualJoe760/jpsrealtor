"use client";

// Investor summary for the planned pre-seed community round.
//
// Everything on this page must stay inside Reg CF "testing the waters"
// (17 CFR 227.206): describe the plan, collect NON-BINDING interest, take no
// money. That is why the page has no payment button and why the contribution
// checkout lives on its own page (/support). Do not add "invest now" payment
// flows here — real investments go through a registered funding portal once a
// Form C is filed.

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { AccountGate, CompanyShell, Section, useCompanyTheme } from "@/app/components/company/CompanyShell";

const RAISE = 3_000_000;
const EQUITY = 0.15;
const POST_MONEY = RAISE / EQUITY; // $20M
const usd = (n: number) => `$${n.toLocaleString("en-US")}`;

const BUILT = [
  "Agent websites on the agent's own domain, with live MLS search and an AI chat assistant",
  "CRM with contacts, inbox and follow-up",
  "Outreach: postcards, ringless voicemail and ad campaigns funded by platform credits",
  "AI market tools: on-demand CMAs, cash-flow analysis, historical sales data",
  "A public API and MCP server so agents can build on the platform",
];

const PRESETS = [500, 1_000, 5_000, 10_000, 25_000];

function InterestForm() {
  const t = useCompanyTheme();
  const { status } = useSession();
  const [amount, setAmount] = useState<string>("1000");
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState<{ amount: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/invest/interest")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.interest) {
          setSaved({ amount: d.interest.amount });
          setAmount(String(d.interest.amount));
          setNote(d.interest.note || "");
        }
      })
      .catch(() => {});
  }, [status]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/invest/interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(amount), note }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Could not save");
      setSaved({ amount: d.interest.amount });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {saved && (
        <p className={`rounded-lg p-3 text-sm ${t.isLight ? "bg-emerald-50 text-emerald-800" : "bg-emerald-950/50 text-emerald-300"}`}>
          You&apos;re on the list at {usd(saved.amount)}. We&apos;ll email you when the offering opens. You can change it any time.
        </p>
      )}
      <div>
        <label className={`block text-sm font-medium mb-2 ${t.heading}`}>How much might you invest?</label>
        <div className="flex flex-wrap gap-2 mb-3">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setAmount(String(p))}
              className={`rounded-lg px-3 py-1.5 text-sm border ${
                Number(amount) === p ? "border-blue-500 bg-blue-600 text-white" : t.secondaryBtn
              }`}
            >
              {usd(p)}
            </button>
          ))}
        </div>
        <input
          type="number"
          min={100}
          max={RAISE}
          step={1}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className={`w-full rounded-lg border px-3 py-2 ${t.input}`}
          aria-label="Amount in US dollars"
        />
      </div>
      <div>
        <label className={`block text-sm font-medium mb-2 ${t.heading}`}>Anything we should know? (optional)</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={1000}
          rows={3}
          placeholder="e.g. I'm an agent in San Diego and would use the platform"
          className={`w-full rounded-lg border px-3 py-2 ${t.input}`}
        />
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button type="submit" disabled={busy} className={`rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-60 ${t.primaryBtn}`}>
        {busy ? "Saving…" : saved ? "Update my interest" : "Reserve my interest"}
      </button>
      <p className={`text-xs ${t.muted}`}>
        This is not an investment and costs nothing. It only tells us you may want to participate.
      </p>
    </form>
  );
}

export default function InvestClient() {
  const t = useCompanyTheme();
  const stat = `rounded-xl border p-4 ${t.isLight ? "border-gray-200" : "border-neutral-700"}`;

  return (
    <CompanyShell
      eyebrow="Invest · Pre-Seed Community Round"
      title={<>Own a piece of the platform <span className={t.accent}>agents build.</span></>}
      lede="We plan to open ChatRealty's pre-seed round to our community — the agents and clients who use it — instead of only to outside investors."
    >
      <Section title="The round">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className={stat}>
            <p className={`text-sm ${t.muted}`}>Target raise</p>
            <p className={`mt-1 text-2xl font-bold ${t.heading}`}>{usd(RAISE)}</p>
          </div>
          <div className={stat}>
            <p className={`text-sm ${t.muted}`}>Equity offered</p>
            <p className={`mt-1 text-2xl font-bold ${t.heading}`}>{EQUITY * 100}%</p>
          </div>
          <div className={stat}>
            <p className={`text-sm ${t.muted}`}>Implied valuation</p>
            <p className={`mt-1 text-2xl font-bold ${t.heading}`}>{usd(POST_MONEY)}</p>
            <p className={`text-xs ${t.muted}`}>post-money</p>
          </div>
        </div>
        <p>
          The offering is planned under Regulation Crowdfunding, which lets non-accredited investors participate
          through a registered funding portal. Final terms will be set out in the offering documents.
        </p>
      </Section>

      <Section title="The problem">
        <p>
          Agents pay their association, pay for MLS access, then pay again — CRM, dialer, website, leads — to
          companies reselling access to the same data. Portals sell an agent&apos;s own market back to them as leads.
        </p>
        <p>
          ChatRealty puts all of it in one platform where the agent&apos;s profile becomes their own website, and
          their brand — not a lead auction — drives visibility.{" "}
          <Link href="/mission" className="underline">Read the full mission.</Link>
        </p>
      </Section>

      <Section title="What's already built">
        <ul className="space-y-2 list-disc pl-5">
          {BUILT.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      </Section>

      <Section title="How ChatRealty makes money">
        <ul className="space-y-2 list-disc pl-5">
          <li><strong className={t.heading}>Subscriptions</strong> — agent plans at $125, $500 and $1,000 per month.</li>
          <li><strong className={t.heading}>Marketing spend</strong> — agents buy platform credits for ads, postcards and voicemail at a tiered markup.</li>
          <li><strong className={t.heading}>Referral partnerships</strong> — a network of agent sites that refer business to one another.</li>
        </ul>
      </Section>

      <Section title="Reserve your interest">
        <AccountGate action="reserve your place in the round">
          <InterestForm />
        </AccountGate>
      </Section>

      <p className={`text-xs leading-relaxed ${t.muted}`}>
        ChatRealty is considering an offering of securities exempt from registration under Regulation
        Crowdfunding, but has not yet determined whether to proceed. No money or other consideration is being
        solicited, and if sent in response, will not be accepted. No offer to buy the securities can be accepted and
        no part of the purchase price can be received until an offering statement on Form C is filed and only
        through an intermediary&apos;s platform. A person&apos;s indication of interest involves no obligation or
        commitment of any kind. This page is not an offer to sell or a solicitation of an offer to buy securities.
      </p>
    </CompanyShell>
  );
}
