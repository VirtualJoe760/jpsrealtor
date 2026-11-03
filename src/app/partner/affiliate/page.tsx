"use client";

// Affiliate program — partners section. One page, three states:
//   no record      → application form
//   pending/rejected → status
//   approved/paused/terminated → dashboard (link, clicks, signups, paying
//                    agents, earned / pending / payable / paid, payouts)
// Data: GET /api/affiliate/me. Docs: docs/commerce/affiliates.md.

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Copy, Check, Loader2, BadgeDollarSign, ExternalLink } from "lucide-react";
import { useThemeClasses } from "@/app/contexts/ThemeContext";

interface Tier { minAgents: number; ratePerAgent: number; label: string }
interface Program { tiers: Tier[]; payoutMinimum: number; refundHoldDays: number; payoutDay: number; attributionDays: number }
interface Summary {
  livemode: boolean;
  clicks: number;
  signups: number;
  payingAgents: number;
  currentRate: number;
  rateOverride: number | null;
  tier: Tier | null;
  nextTier: Tier | null;
  monthlyRunRate: number;
  totals: { earned: number; pending: number; payable: number; paid: number };
  commissions: Array<{ id: string; kind: string; status: string; amount: number; ratePerAgent: number; agent: string; earnedAt: string; payableAt: string }>;
  payouts: Array<{ id: string; amount: number; status: string; periodLabel: string; createdAt: string }>;
}
interface AffiliateInfo {
  status: "pending" | "approved" | "rejected" | "paused" | "terminated";
  name: string;
  code: string | null;
  link: string | null;
  rejectionReason?: string;
  payouts: { connected: boolean; detailsSubmitted: boolean; enabled: boolean };
}

const usd = (n: number) => `$${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function AffiliatePage() {
  const { status } = useSession();
  const router = useRouter();
  const { cardBg, textPrimary, textSecondary, border } = useThemeClasses();

  const [loading, setLoading] = useState(true);
  const [affiliate, setAffiliate] = useState<AffiliateInfo | null>(null);
  const [program, setProgram] = useState<Program | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState("");

  const [form, setForm] = useState({ name: "", website: "", audience: "", promotionPlan: "", isSettlementServiceProvider: false, agreeTerms: false, ftcDisclosure: false });
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/affiliate/me");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load");
      setAffiliate(data.affiliate);
      setProgram(data.program);
      setSummary(data.summary || null);
      if (!data.affiliate && data.defaultName) setForm((f) => ({ ...f, name: f.name || data.defaultName }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin?callbackUrl=/partner/affiliate");
    else if (status === "authenticated") load();
  }, [status, router, load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/affiliate/apply", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not submit");
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const connect = async () => {
    setConnecting(true);
    setError("");
    try {
      const res = await fetch("/api/affiliate/connect", { method: affiliate?.payouts.detailsSubmitted ? "GET" : "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Could not open Stripe");
      window.location.href = data.url;
    } catch (e) {
      setError((e as Error).message);
      setConnecting(false);
    }
  };

  const copy = async () => {
    if (!affiliate?.link) return;
    await navigator.clipboard.writeText(affiliate.link).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const input = `w-full rounded-lg border ${border} bg-transparent px-3 py-2 text-sm ${textPrimary}`;
  const card = `${cardBg} border ${border} rounded-2xl p-5`;

  if (status === "loading" || loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className={`animate-spin ${textSecondary}`} /></div>;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/dashboard/settings" className={`mb-4 inline-flex items-center gap-1 text-sm ${textSecondary}`}>
        <ArrowLeft size={16} /> Settings
      </Link>
      <h1 className={`mb-1 flex items-center gap-2 text-2xl font-bold ${textPrimary}`}>
        <BadgeDollarSign /> Affiliate program
      </h1>
      <p className={`mb-6 text-sm ${textSecondary}`}>
        Earn a monthly commission for every real estate agent who subscribes to ChatRealty through your link — every month they stay subscribed.
      </p>
      {error && <p className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-500">{error}</p>}

      {program && (!affiliate || affiliate.status === "rejected" || affiliate.status === "pending") && (
        <div className={`${card} mb-6`}>
          <h2 className={`mb-2 font-semibold ${textPrimary}`}>What you earn</h2>
          <p className={`mb-3 text-sm ${textSecondary}`}>
            Your rate is set by how many of your agents are paying right now, and applies to all of them.
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {program.tiers.map((t) => (
              <div key={t.minAgents} className={`rounded-lg border ${border} px-3 py-2`}>
                <div className={`text-xs ${textSecondary}`}>{t.label}</div>
                <div className={`font-semibold ${textPrimary}`}>${t.ratePerAgent}/agent/mo</div>
              </div>
            ))}
          </div>
          <p className={`mt-3 text-xs ${textSecondary}`}>
            Paid monthly once your balance reaches ${program.payoutMinimum}. Each commission is payable {program.refundHoldDays} days after the agent pays. Subscriptions only — never home sales, leads or closings.
          </p>
        </div>
      )}

      {affiliate?.status === "pending" && (
        <div className={card}>
          <h2 className={`font-semibold ${textPrimary}`}>Application received</h2>
          <p className={`mt-1 text-sm ${textSecondary}`}>We review every application by hand and will email your link once you&apos;re approved.</p>
        </div>
      )}

      {affiliate?.status === "rejected" && (
        <div className={`${card} mb-6`}>
          <h2 className={`font-semibold ${textPrimary}`}>Application not approved</h2>
          {affiliate.rejectionReason && <p className={`mt-1 text-sm ${textSecondary}`}>{affiliate.rejectionReason}</p>}
          <p className={`mt-1 text-sm ${textSecondary}`}>You can apply again below.</p>
        </div>
      )}

      {(!affiliate || affiliate.status === "rejected") && (
        <form onSubmit={submit} className={`${card} space-y-4`}>
          <h2 className={`font-semibold ${textPrimary}`}>Apply</h2>
          <label className="block">
            <span className={`mb-1 block text-sm ${textSecondary}`}>Your name or business name</span>
            <input className={input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={120} />
          </label>
          <label className="block">
            <span className={`mb-1 block text-sm ${textSecondary}`}>Website or social profile (optional)</span>
            <input className={input} value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} maxLength={300} />
          </label>
          <label className="block">
            <span className={`mb-1 block text-sm ${textSecondary}`}>Who is your audience? (optional)</span>
            <textarea className={input} rows={2} value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} maxLength={1000} />
          </label>
          <label className="block">
            <span className={`mb-1 block text-sm ${textSecondary}`}>How will you promote ChatRealty?</span>
            <textarea className={input} rows={3} value={form.promotionPlan} onChange={(e) => setForm({ ...form, promotionPlan: e.target.value })} required maxLength={2000} />
          </label>
          <label className={`flex items-start gap-2 text-sm ${textSecondary}`}>
            <input type="checkbox" className="mt-1" checked={form.isSettlementServiceProvider} onChange={(e) => setForm({ ...form, isSettlementServiceProvider: e.target.checked })} />
            I hold a real estate, mortgage, title or escrow license.
          </label>
          <label className={`flex items-start gap-2 text-sm ${textSecondary}`}>
            <input type="checkbox" className="mt-1" checked={form.ftcDisclosure} onChange={(e) => setForm({ ...form, ftcDisclosure: e.target.checked })} />
            Wherever I share my link, I&apos;ll clearly say I earn a commission if people subscribe.
          </label>
          <label className={`flex items-start gap-2 text-sm ${textSecondary}`}>
            <input type="checkbox" className="mt-1" checked={form.agreeTerms} onChange={(e) => setForm({ ...form, agreeTerms: e.target.checked })} />
            <span>I agree to the <Link href="/affiliate-terms" target="_blank" className="text-blue-500 underline">affiliate terms</Link>.</span>
          </label>
          <button type="submit" disabled={submitting || !form.agreeTerms || !form.ftcDisclosure} className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {submitting ? "Submitting…" : "Submit application"}
          </button>
        </form>
      )}

      {affiliate && ["approved", "paused", "terminated"].includes(affiliate.status) && summary && (
        <div className="space-y-6">
          {affiliate.status !== "approved" && (
            <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-600">
              Your affiliate account is {affiliate.status}. {affiliate.status === "paused" ? "Commissions still accrue; payouts are on hold." : "Your link no longer earns commissions."}
            </p>
          )}
          {!summary.livemode && (
            <p className={`rounded-lg border ${border} px-3 py-2 text-xs ${textSecondary}`}>Test mode — figures come from Stripe test payments.</p>
          )}

          <div className={card}>
            <div className={`mb-1 text-xs uppercase tracking-wide ${textSecondary}`}>Your link</div>
            <div className="flex flex-wrap items-center gap-2">
              <code className={`rounded bg-black/5 px-2 py-1 text-sm ${textPrimary}`}>{affiliate.link}</code>
              <button onClick={copy} className={`inline-flex items-center gap-1 rounded-lg border ${border} px-3 py-1 text-sm ${textPrimary}`}>
                {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <p className={`mt-2 text-xs ${textSecondary}`}>
              Code <strong>{affiliate.code}</strong>. Visitors are credited to you for {program?.attributionDays} days after their last click on your link. Always say you&apos;re paid when you share it.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Clicks", summary.clicks.toLocaleString()],
              ["Signups", summary.signups.toLocaleString()],
              ["Paying agents", summary.payingAgents.toLocaleString()],
              ["Rate now", `$${summary.currentRate}/agent`],
            ].map(([k, v]) => (
              <div key={k} className={card}>
                <div className={`text-xs ${textSecondary}`}>{k}</div>
                <div className={`text-xl font-bold ${textPrimary}`}>{v}</div>
              </div>
            ))}
          </div>
          {summary.nextTier && summary.rateOverride === null && (
            <p className={`text-sm ${textSecondary}`}>
              {summary.nextTier.minAgents - summary.payingAgents} more paying agent{summary.nextTier.minAgents - summary.payingAgents === 1 ? "" : "s"} lifts all of them to ${summary.nextTier.ratePerAgent}/month.
            </p>
          )}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Earned", summary.totals.earned],
              ["Pending", summary.totals.pending],
              ["Ready to pay", summary.totals.payable],
              ["Paid", summary.totals.paid],
            ].map(([k, v]) => (
              <div key={k as string} className={card}>
                <div className={`text-xs ${textSecondary}`}>{k}</div>
                <div className={`text-xl font-bold ${textPrimary}`}>{usd(v as number)}</div>
              </div>
            ))}
          </div>

          <div className={card}>
            <h2 className={`mb-1 font-semibold ${textPrimary}`}>Payouts</h2>
            {affiliate.payouts.enabled ? (
              <p className={`mb-3 text-sm ${textSecondary}`}>Payouts are set up. We pay on the {program?.payoutDay}th of each month once your balance is ${program?.payoutMinimum} or more.</p>
            ) : (
              <p className={`mb-3 text-sm ${textSecondary}`}>
                Connect a payout account to get paid. Stripe, our payment processor, collects your bank details and tax form (W-9) and sends your 1099.
              </p>
            )}
            <button onClick={connect} disabled={connecting || affiliate.status === "terminated"} className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {connecting ? <Loader2 size={14} className="animate-spin" /> : <ExternalLink size={14} />}
              {affiliate.payouts.detailsSubmitted ? "Open Stripe payout dashboard" : affiliate.payouts.connected ? "Finish payout setup" : "Set up payouts"}
            </button>
            {summary.payouts.length > 0 && (
              <table className={`mt-4 w-full text-sm ${textPrimary}`}>
                <tbody>
                  {summary.payouts.map((p) => (
                    <tr key={p.id} className={`border-t ${border}`}>
                      <td className="py-2">{p.periodLabel}</td>
                      <td className="py-2">{usd(p.amount)}</td>
                      <td className={`py-2 ${textSecondary}`}>{p.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className={card}>
            <h2 className={`mb-2 font-semibold ${textPrimary}`}>Commissions</h2>
            {summary.commissions.length === 0 ? (
              <p className={`text-sm ${textSecondary}`}>None yet. Commissions appear when an agent you referred pays their subscription.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className={`w-full text-sm ${textPrimary}`}>
                  <thead>
                    <tr className={`text-left text-xs ${textSecondary}`}>
                      <th className="py-1">Agent</th><th>Amount</th><th>Rate</th><th>Status</th><th>Payable</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.commissions.map((c) => (
                      <tr key={c.id} className={`border-t ${border}`}>
                        <td className="py-2">{c.agent}{c.kind === "clawback" ? " (refund)" : ""}</td>
                        <td>{usd(c.amount)}</td>
                        <td>${c.ratePerAgent}</td>
                        <td className={textSecondary}>{c.status}</td>
                        <td className={textSecondary}>{new Date(c.payableAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
