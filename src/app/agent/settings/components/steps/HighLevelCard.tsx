"use client";

// src/app/agent/settings/components/steps/HighLevelCard.tsx
//
// Settings → Integrations → HighLevel. One button starts OAuth
// (/api/integrations/crm/connect); once connected, every new ChatRealty lead
// (website forms, appointment bookings, tenant-site signups) is pushed into
// the agent's HighLevel sub-account, tagged "chatrealty". One-way only.

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Check, AlertCircle, Link2 } from "lucide-react";
import { toast } from "react-toastify";

type Status = {
  configured: boolean;
  status: "connected" | "disconnected" | "error";
  locationName: string | null;
  locationId: string | null;
  connectedAt: string | null;
  lastPushAt: string | null;
  pushedCount: number;
  lastError: string | null;
  sync: {
    status: "queued" | "running" | "idle" | "error" | null;
    synced: number;
    skipped: number;
    failed: number;
    backfillTotal: number;
    backfillDoneAt: string | null;
    lastRunAt: string | null;
    lastError: string | null;
  };
};

const RESULT_MESSAGES: Record<string, { ok: boolean; text: string }> = {
  connected: { ok: true, text: "HighLevel connected" },
  denied: { ok: false, text: "HighLevel connection was cancelled" },
  state_mismatch: { ok: false, text: "Connection expired — please try again" },
  failed: { ok: false, text: "HighLevel connection failed — please try again" },
  no_code: { ok: false, text: "HighLevel didn't return an authorization — please try again" },
  not_configured: { ok: false, text: "HighLevel isn't set up on this server yet" },
};

export default function HighLevelCard({ isLight }: { isLight: boolean }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const searchParams = useSearchParams();

  const textPrimary = isLight ? "text-gray-900" : "text-white";
  const textMuted = isLight ? "text-gray-500" : "text-gray-400";

  const load = async () => {
    try {
      const res = await fetch("/api/integrations/crm", { cache: "no-store" });
      if (res.ok) setStatus(await res.json());
    } catch {
      /* ignore */
    }
  };

  // While the backfill is moving, refresh the progress every 5s.
  const syncing = status?.status === "connected" && (status.sync?.status === "running" || status.sync?.status === "queued");
  useEffect(() => {
    if (!syncing) return;
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncing]);

  const syncNow = async (full: boolean) => {
    if (full && !confirm("Re-send every ChatRealty contact to HighLevel? Existing HighLevel contacts are updated, not duplicated.")) return;
    setBusy(true);
    try {
      const res = await fetch("/api/integrations/crm/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full }),
      });
      if (res.ok) {
        toast.success(full ? "Full re-sync started" : "Sync started");
        setTimeout(load, 1500);
      } else toast.error("Couldn't start the sync");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    load();
    const result = searchParams.get("highlevel");
    const msg = result && RESULT_MESSAGES[result];
    if (msg) (msg.ok ? toast.success : toast.error)(msg.text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const disconnect = async () => {
    if (!confirm("Stop sending new leads to HighLevel? Contacts already sent stay in HighLevel.")) return;
    setBusy(true);
    try {
      const res = await fetch("/api/integrations/crm", { method: "DELETE" });
      if (res.ok) {
        toast.success("HighLevel disconnected");
        await load();
      }
    } finally {
      setBusy(false);
    }
  };

  const connected = status?.status === "connected";
  const broken = status?.status === "error";

  return (
    <div className={`rounded-xl border p-6 ${isLight ? "bg-white border-gray-200" : "bg-gray-900 border-gray-800"}`}>
      <div className="flex items-start gap-4 mb-4">
        <div className={`p-3 rounded-lg ${isLight ? "bg-sky-50" : "bg-sky-950/30"}`}>
          <Link2 className={`w-6 h-6 ${isLight ? "text-sky-600" : "text-sky-400"}`} />
        </div>
        <div className="flex-1">
          <h3 className={`text-lg font-bold ${textPrimary}`}>HighLevel CRM</h3>
          <p className={`text-sm mt-0.5 ${textMuted}`}>
            Send every new ChatRealty lead — website forms, appointment bookings and site sign-ups —
            straight into your HighLevel sub-account as a contact tagged <code>chatrealty</code>, so
            your HighLevel workflows can pick them up.
          </p>
        </div>
      </div>

      {!status ? (
        <div className={`text-sm ${textMuted}`}>Loading…</div>
      ) : connected ? (
        <div
          className={`flex items-center justify-between gap-3 p-3 rounded-lg ${
            isLight ? "bg-green-50 border border-green-200" : "bg-green-950/20 border border-green-900"
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <Check className={`w-5 h-5 flex-shrink-0 ${isLight ? "text-green-600" : "text-green-400"}`} />
            <div className="min-w-0">
              <div className={`text-sm font-semibold truncate ${textPrimary}`}>
                Connected · {status.locationName || status.locationId}
              </div>
              <div className={`text-xs ${textMuted}`}>
                {status.pushedCount} lead{status.pushedCount === 1 ? "" : "s"} sent
                {status.lastPushAt && ` · last ${new Date(status.lastPushAt).toLocaleString()}`}
              </div>
              {status.lastError && (
                <div className={`text-xs mt-0.5 ${isLight ? "text-amber-700" : "text-amber-400"}`}>
                  Last send failed — it will retry on the next lead.
                </div>
              )}
            </div>
          </div>
          <button
            onClick={disconnect}
            disabled={busy}
            className={`text-xs px-3 py-1.5 rounded-md flex-shrink-0 ${
              isLight ? "text-red-600 hover:bg-red-50" : "text-red-400 hover:bg-red-950/30"
            }`}
          >
            Disconnect
          </button>
        </div>
      ) : null}

      {/* Contact feed progress */}
      {connected && status && (
        <div className={`mt-3 p-3 rounded-lg border text-sm ${isLight ? "border-gray-200" : "border-gray-800"}`}>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className={`font-semibold ${textPrimary}`}>
                Contact sync{" "}
                {syncing ? (
                  <span className={`inline-flex items-center gap-1 text-xs font-normal ${textMuted}`}>
                    <Loader2 className="w-3 h-3 animate-spin" /> copying your contacts…
                  </span>
                ) : status.sync.status === "error" ? (
                  <span className={`text-xs font-normal ${isLight ? "text-red-600" : "text-red-400"}`}>paused — error</span>
                ) : status.sync.backfillDoneAt ? (
                  <span className={`text-xs font-normal ${isLight ? "text-green-700" : "text-green-400"}`}>on · keeps HighLevel up to date every 5 minutes</span>
                ) : null}
              </div>
              <div className={`text-xs mt-0.5 ${textMuted}`}>
                {status.sync.synced} sent
                {status.sync.backfillTotal > 0 && ` of ${status.sync.backfillTotal}`}
                {status.sync.skipped > 0 && ` · ${status.sync.skipped} skipped (personal or no email/phone)`}
                {status.sync.failed > 0 && ` · ${status.sync.failed} failed`}
                {status.sync.lastRunAt && ` · last run ${new Date(status.sync.lastRunAt).toLocaleTimeString()}`}
              </div>
              {status.sync.backfillTotal > 0 && !status.sync.backfillDoneAt && (
                <div className={`mt-2 h-1.5 rounded-full overflow-hidden ${isLight ? "bg-gray-100" : "bg-gray-800"}`}>
                  <div
                    className="h-full bg-sky-500 transition-all"
                    style={{
                      width: `${Math.min(100, Math.round(((status.sync.synced + status.sync.skipped + status.sync.failed) / status.sync.backfillTotal) * 100))}%`,
                    }}
                  />
                </div>
              )}
            </div>
            <div className="flex flex-col gap-1 flex-shrink-0">
              <button
                onClick={() => syncNow(false)}
                disabled={busy || syncing}
                className={`text-xs px-3 py-1.5 rounded-md border disabled:opacity-50 ${
                  isLight ? "border-gray-300 text-gray-700 hover:bg-gray-50" : "border-gray-700 text-gray-300 hover:bg-gray-800"
                }`}
              >
                Sync now
              </button>
              <button
                onClick={() => syncNow(true)}
                disabled={busy || syncing}
                className={`text-[11px] ${textMuted} hover:underline disabled:opacity-50`}
              >
                Re-send all
              </button>
            </div>
          </div>
          <p className={`text-xs mt-2 ${textMuted}`}>
            All your ChatRealty contacts and their tags are copied into HighLevel (tagged <code>chatrealty</code>).
            Tags are only ever added, so tags you set inside HighLevel stay. Personal contacts are skipped.
          </p>
        </div>
      )}

      {status && !connected && (
        <div className="space-y-3">
          {broken && (
            <div
              className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
                isLight ? "bg-red-50 text-red-800" : "bg-red-950/20 text-red-300"
              }`}
            >
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>HighLevel stopped accepting our access (the app may have been uninstalled). Reconnect to resume sending leads.</span>
            </div>
          )}
          <a
            href="/api/integrations/crm/connect"
            aria-disabled={!status.configured}
            onClick={(e) => {
              if (!status.configured) {
                e.preventDefault();
                toast.error("HighLevel isn't set up on this server yet");
              } else {
                setBusy(true);
              }
            }}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-white ${
              status.configured ? "" : "opacity-50 cursor-not-allowed"
            } ${isLight ? "bg-blue-600 hover:bg-blue-700" : "bg-emerald-600 hover:bg-emerald-700"}`}
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {broken ? "Reconnect HighLevel" : "Connect HighLevel"}
          </a>
          <p className={`text-xs ${textMuted}`}>
            You&apos;ll sign in to HighLevel and choose which sub-account receives your leads.
          </p>
        </div>
      )}
    </div>
  );
}
