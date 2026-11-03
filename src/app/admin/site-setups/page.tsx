"use client";

// Admin → Site setups: queue of paid $300 custom-site setups (P5 step 5.4).
// Move status; setting "live" needs the URL and sends the handoff email once.
// API: /api/admin/site-setups. Docs: docs/commerce/site-setup.md.

import { useCallback, useEffect, useState } from "react";
import { useThemeClasses } from "@/app/contexts/ThemeContext";
import { toast } from "react-toastify";

interface Order {
  id: string;
  status: string;
  amount: number;
  livemode: boolean;
  paidAt?: string;
  intake: { style: string; styleNotes: string; serviceAreas: string[]; logoUrl: string; exampleSites: string[]; colors: string; notes: string; submittedAt?: string };
  liveUrl?: string;
  liveEmailSentAt?: string;
  adminNotes: string;
  agent: { id: string; name: string; email: string; subdomain?: string } | null;
}

export default function AdminSiteSetupsPage() {
  const { cardBg, textPrimary, textSecondary, border } = useThemeClasses();
  const [orders, setOrders] = useState<Order[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, { liveUrl: string; adminNotes: string }>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/site-setups");
    const json = await res.json();
    setOrders(json.orders || []);
    setStatuses(json.statuses || []);
    setDrafts(Object.fromEntries((json.orders || []).map((o: Order) => [o.id, { liveUrl: o.liveUrl || "", adminNotes: o.adminNotes || "" }])));
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async (o: Order, status?: string) => {
    if (status === "live" && !window.confirm(`Mark live and email ${o.agent?.email} that ${drafts[o.id]?.liveUrl} is live?`)) return;
    setBusy(o.id);
    try {
      const res = await fetch("/api/admin/site-setups", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: o.id, status, ...drafts[o.id] }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      toast.success(json.liveEmailSent ? "Live — handoff email sent" : "Saved");
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const input = `w-full rounded-md border ${border} bg-transparent px-2 py-1 text-sm ${textPrimary}`;

  return (
    <div className="p-4 md:p-6">
      <h1 className={`text-2xl font-bold ${textPrimary}`}>Site setups</h1>
      <p className={`mb-4 text-sm ${textSecondary}`}>Paid $300 custom-site setups. Build grant (step 5.3) is pending P3 — build with the agent&apos;s own MCP access for now.</p>
      {loading ? (
        <p className={textSecondary}>Loading…</p>
      ) : orders.length === 0 ? (
        <p className={textSecondary}>No paid setups yet.</p>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <div key={o.id} className={`${cardBg} border ${border} rounded-xl p-4`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className={`font-semibold ${textPrimary}`}>{o.agent?.name || "—"} <span className={`text-sm font-normal ${textSecondary}`}>{o.agent?.email}</span></div>
                  <div className={`text-xs ${textSecondary}`}>
                    Paid {o.paidAt ? new Date(o.paidAt).toLocaleDateString() : "—"} · ${o.amount} {o.livemode ? "" : "(test)"}
                    {o.agent?.subdomain ? ` · ${o.agent.subdomain}.chatrealty.io` : ""}
                  </div>
                </div>
                <select
                  value={o.status}
                  disabled={busy === o.id || o.status === "refunded"}
                  onChange={(e) => save(o, e.target.value)}
                  className={`rounded-md border ${border} bg-transparent px-2 py-1 text-sm ${textPrimary}`}
                >
                  {Array.from(new Set([o.status, ...statuses])).map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {o.intake.submittedAt ? (
                <div className={`mt-3 grid gap-1 text-sm ${textSecondary}`}>
                  <div><strong>Style:</strong> {o.intake.style}{o.intake.styleNotes ? ` — ${o.intake.styleNotes}` : ""}</div>
                  <div><strong>Areas:</strong> {o.intake.serviceAreas.join(", ")}</div>
                  {o.intake.colors && <div><strong>Colors:</strong> {o.intake.colors}</div>}
                  {o.intake.exampleSites.length > 0 && <div><strong>Examples:</strong> {o.intake.exampleSites.join(" · ")}</div>}
                  {o.intake.notes && <div><strong>Notes:</strong> {o.intake.notes}</div>}
                  {o.intake.logoUrl && <img src={o.intake.logoUrl} alt="logo" className="mt-1 h-10 max-w-[160px] object-contain" />}
                </div>
              ) : (
                <p className={`mt-3 text-sm ${textSecondary}`}>Waiting for the agent&apos;s intake form.</p>
              )}

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <input className={input} placeholder="Live URL (needed to mark live)" value={drafts[o.id]?.liveUrl || ""} onChange={(e) => setDrafts({ ...drafts, [o.id]: { ...drafts[o.id], liveUrl: e.target.value } })} />
                <input className={input} placeholder="Admin notes" value={drafts[o.id]?.adminNotes || ""} onChange={(e) => setDrafts({ ...drafts, [o.id]: { ...drafts[o.id], adminNotes: e.target.value } })} />
              </div>
              <div className="mt-2 flex items-center gap-2">
                <button className={`rounded-md border ${border} px-3 py-1 text-xs ${textPrimary}`} disabled={busy === o.id} onClick={() => save(o)}>Save</button>
                {o.status !== "live" && o.status !== "refunded" && (
                  <button className="rounded-md bg-blue-600 px-3 py-1 text-xs text-white disabled:opacity-50" disabled={busy === o.id || !drafts[o.id]?.liveUrl} onClick={() => save(o, "live")}>
                    Mark live + email agent
                  </button>
                )}
                {o.liveEmailSentAt && <span className={`text-xs ${textSecondary}`}>Handoff email sent {new Date(o.liveEmailSentAt).toLocaleDateString()}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
