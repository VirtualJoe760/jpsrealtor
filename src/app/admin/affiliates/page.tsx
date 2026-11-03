"use client";

// Admin → Affiliates: approval queue, pause/terminate, per-affiliate rate
// override, and each affiliate's commission ledger + payouts.
// APIs: /api/admin/affiliates, /api/admin/affiliates/[id]. Docs: docs/commerce/affiliates.md.

import { useCallback, useEffect, useState } from "react";
import { useThemeClasses } from "@/app/contexts/ThemeContext";
import { toast } from "react-toastify";

interface Row {
  _id: string;
  name: string;
  email: string;
  status: string;
  code: string | null;
  link: string | null;
  website?: string;
  audience?: string;
  promotionPlan?: string;
  isSettlementServiceProvider: boolean;
  appliedAt: string;
  rejectionReason?: string;
  adminNotes?: string;
  rateOverride: number | null;
  clicks: number;
  signups: number;
  payingAgents: number;
  currentRate: number;
  payoutsEnabled: boolean;
  balances: Record<string, number>;
}
interface LedgerRow {
  id: string; kind: string; status: string; amount: number; ratePerAgent: number; payingAgentsAtInvoice: number;
  agent: { name: string; email: string } | null; stripeInvoiceId?: string; livemode: boolean; earnedAt: string; payableAt: string; reversalReason?: string;
}

const usd = (n?: number) => `$${(n || 0).toFixed(2)}`;
const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-600",
  approved: "bg-emerald-500/15 text-emerald-600",
  rejected: "bg-red-500/15 text-red-600",
  paused: "bg-slate-500/15 text-slate-500",
  terminated: "bg-red-500/15 text-red-600",
};

export default function AdminAffiliatesPage() {
  const { cardBg, textPrimary, textSecondary, border } = useThemeClasses();
  const [rows, setRows] = useState<Row[]>([]);
  const [livemode, setLivemode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [ledger, setLedger] = useState<{ ledger: LedgerRow[]; payouts: any[] } | null>(null);
  const [filter, setFilter] = useState<"all" | "pending">("all");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/affiliates");
    const data = await res.json();
    setRows(data.affiliates || []);
    setLivemode(!!data.livemode);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const act = async (affiliateId: string, action: string, extra: Record<string, unknown> = {}) => {
    setBusy(affiliateId + action);
    try {
      const res = await fetch("/api/admin/affiliates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ affiliateId, action, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success(data.message || "Saved");
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const toggleLedger = async (id: string) => {
    if (open === id) { setOpen(null); return; }
    setOpen(id);
    setLedger(null);
    const res = await fetch(`/api/admin/affiliates/${id}`);
    setLedger(await res.json());
  };

  const shown = filter === "pending" ? rows.filter((r) => r.status === "pending") : rows;
  const btn = `rounded-md border ${border} px-2.5 py-1 text-xs ${textPrimary} disabled:opacity-50`;

  return (
    <div className="p-4 md:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className={`text-2xl font-bold ${textPrimary}`}>Affiliates</h1>
          <p className={`text-sm ${textSecondary}`}>
            Balances shown for Stripe {livemode ? "live" : "test"} mode. Rates and payout rules: src/config/affiliates.ts.
          </p>
        </div>
        <div className="flex gap-2">
          {(["all", "pending"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`${btn} ${filter === f ? "bg-blue-600 text-white" : ""}`}>
              {f === "all" ? "All" : `Pending (${rows.filter((r) => r.status === "pending").length})`}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className={textSecondary}>Loading…</p>
      ) : shown.length === 0 ? (
        <p className={textSecondary}>No affiliates yet.</p>
      ) : (
        <div className="space-y-3">
          {shown.map((r) => (
            <div key={r._id} className={`${cardBg} border ${border} rounded-xl p-4`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold ${textPrimary}`}>{r.name}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_COLORS[r.status] || ""}`}>{r.status}</span>
                    {r.isSettlementServiceProvider && (
                      <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-600" title="Licensed RE/lender/title/escrow — counsel check">licensed</span>
                    )}
                  </div>
                  <div className={`text-sm ${textSecondary}`}>{r.email}{r.code ? ` · ${r.code}` : ""}</div>
                  {r.website && <div className={`text-xs ${textSecondary}`}>{r.website}</div>}
                  {r.status === "pending" && (
                    <div className={`mt-2 text-sm ${textSecondary}`}>
                      {r.audience && <p><strong>Audience:</strong> {r.audience}</p>}
                      {r.promotionPlan && <p><strong>Plan:</strong> {r.promotionPlan}</p>}
                    </div>
                  )}
                </div>
                <div className={`grid grid-cols-3 gap-x-4 gap-y-1 text-xs sm:grid-cols-6 ${textSecondary}`}>
                  <div>Clicks<div className={`text-sm ${textPrimary}`}>{r.clicks}</div></div>
                  <div>Signups<div className={`text-sm ${textPrimary}`}>{r.signups}</div></div>
                  <div>Paying<div className={`text-sm ${textPrimary}`}>{r.payingAgents}</div></div>
                  <div>Rate<div className={`text-sm ${textPrimary}`}>${r.currentRate}{r.rateOverride !== null ? "*" : ""}</div></div>
                  <div>Pending<div className={`text-sm ${textPrimary}`}>{usd(r.balances.pending)}</div></div>
                  <div>Payable<div className={`text-sm ${textPrimary}`}>{usd(r.balances.payable)}</div></div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {(r.status === "pending" || r.status === "rejected") && (
                  <button className={btn} disabled={!!busy} onClick={() => act(r._id, "approve")}>Approve</button>
                )}
                {r.status === "pending" && (
                  <button className={btn} disabled={!!busy} onClick={() => {
                    const reason = window.prompt("Reason (sent to the applicant, optional):") ?? undefined;
                    if (reason !== undefined) act(r._id, "reject", { reason });
                  }}>Reject</button>
                )}
                {r.status === "approved" && <button className={btn} disabled={!!busy} onClick={() => act(r._id, "pause")}>Pause</button>}
                {r.status === "paused" && <button className={btn} disabled={!!busy} onClick={() => act(r._id, "resume")}>Resume</button>}
                {["approved", "paused"].includes(r.status) && (
                  <button className={btn} disabled={!!busy} onClick={() => {
                    if (window.confirm(`Terminate ${r.name}? Their link stops earning and payouts stop.`)) act(r._id, "terminate");
                  }}>Terminate</button>
                )}
                {r.code && (
                  <button className={btn} disabled={!!busy} onClick={() => {
                    const v = window.prompt("Rate override in $/agent/month (blank = use tier table):", r.rateOverride?.toString() ?? "");
                    if (v === null) return;
                    act(r._id, "setRate", { rateOverride: v.trim() === "" ? null : Number(v) });
                  }}>Rate override</button>
                )}
                <button className={btn} onClick={() => toggleLedger(r._id)}>{open === r._id ? "Hide ledger" : "Ledger"}</button>
                <span className={`text-xs ${textSecondary}`}>{r.payoutsEnabled ? "Payouts connected" : "No payout account"}</span>
              </div>

              {open === r._id && (
                <div className="mt-3 overflow-x-auto">
                  {!ledger ? (
                    <p className={`text-sm ${textSecondary}`}>Loading…</p>
                  ) : ledger.ledger.length === 0 ? (
                    <p className={`text-sm ${textSecondary}`}>No commissions yet.</p>
                  ) : (
                    <table className={`w-full text-xs ${textPrimary}`}>
                      <thead className={textSecondary}>
                        <tr className="text-left"><th>Earned</th><th>Agent</th><th>Kind</th><th>Amount</th><th>Rate</th><th>Paying</th><th>Status</th><th>Payable</th><th>Invoice</th><th>Mode</th></tr>
                      </thead>
                      <tbody>
                        {ledger.ledger.map((c) => (
                          <tr key={c.id} className={`border-t ${border}`}>
                            <td className="py-1">{new Date(c.earnedAt).toLocaleDateString()}</td>
                            <td>{c.agent?.name || "—"}</td>
                            <td>{c.kind}</td>
                            <td>{usd(c.amount)}</td>
                            <td>${c.ratePerAgent}</td>
                            <td>{c.payingAgentsAtInvoice}</td>
                            <td title={c.reversalReason}>{c.status}</td>
                            <td>{new Date(c.payableAt).toLocaleDateString()}</td>
                            <td className="font-mono">{c.stripeInvoiceId?.slice(-10)}</td>
                            <td>{c.livemode ? "live" : "test"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  {ledger && ledger.payouts.length > 0 && (
                    <p className={`mt-2 text-xs ${textSecondary}`}>
                      Payouts: {ledger.payouts.map((p: any) => `${p.periodLabel} ${usd(p.amount)} ${p.status}`).join(" · ")}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
