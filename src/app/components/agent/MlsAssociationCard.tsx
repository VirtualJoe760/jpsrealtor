"use client";

// The agent's MLS association: name, MLS ID, and the association's contact
// details. ChatRealty uses it to call each association about IDX data access
// (we don't have feeds for every association yet).
//
// Two variants:
//   "settings"  — standalone card in Settings.
//   "checklist" — a row inside the go-live checklist on the dashboard, styled
//                 to match the readiness bounties around it.
//
// Both stay visible when complete (as a Done row / "On file"). The dashboard
// used to render a third, "prompt", which vanished once the association was
// saved; it was dropped on 2026-11-17 along with the standalone dashboard
// card. A checklist that silently drops finished items reads as if the item
// was never there.
//
// Backed by /api/agent/mls-association.
//
// NOTE it is deliberately NOT part of getSiteReadiness: the association is
// about IDX data access, not about whether the agent's public site may
// publish. Adding it there would hold sites back from going live. The row
// says so, so the checklist doesn't imply otherwise.

import { useEffect, useState } from "react";
import { Building2, CheckCircle2, Loader2, Pencil } from "lucide-react";

type Membership = {
  associationName: string;
  mlsId: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  website: string;
};

const EMPTY: Membership = { associationName: "", mlsId: "", contactName: "", contactPhone: "", contactEmail: "", website: "" };

export default function MlsAssociationCard({
  isLight,
  variant = "settings",
}: {
  isLight: boolean;
  variant?: "settings" | "checklist";
}) {
  const [m, setM] = useState<Membership>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [complete, setComplete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/agent/mls-association")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const v = { ...EMPTY, ...(d?.membership || {}) };
        setM(v);
        const done = !!(v.associationName && v.mlsId && (v.contactPhone || v.contactEmail));
        setComplete(done);
        setEditing(!done);
      })
      .finally(() => setLoaded(true));
  }, []);

  const isChecklist = variant === "checklist";

  if (!loaded) return null;

  const text = isLight ? "text-gray-900" : "text-white";
  const muted = isLight ? "text-gray-600" : "text-gray-400";
  const input = `w-full rounded-lg border px-3 py-2 text-sm ${
    isLight ? "bg-white border-gray-300 text-gray-900" : "bg-gray-800 border-gray-700 text-white"
  }`;
  const set = (k: keyof Membership) => (e: React.ChangeEvent<HTMLInputElement>) => setM({ ...m, [k]: e.target.value });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/agent/mls-association", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(m),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Couldn't save");
      setComplete(true);
      setEditing(false);
      setSaved(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const form = (
    <form onSubmit={save} className="mt-4 grid gap-3 sm:grid-cols-2">
      <label className="sm:col-span-2 text-sm">
        <span className={muted}>Association name *</span>
        <input className={input} value={m.associationName} onChange={set("associationName")} placeholder="e.g. California Desert Association of REALTORS®" required />
      </label>
      <label className="text-sm">
        <span className={muted}>Your MLS ID number *</span>
        <input className={input} value={m.mlsId} onChange={set("mlsId")} required />
      </label>
      <label className="text-sm">
        <span className={muted}>Association contact person</span>
        <input className={input} value={m.contactName} onChange={set("contactName")} placeholder="Optional" />
      </label>
      <label className="text-sm">
        <span className={muted}>Association phone</span>
        <input className={input} type="tel" value={m.contactPhone} onChange={set("contactPhone")} />
      </label>
      <label className="text-sm">
        <span className={muted}>Association email</span>
        <input className={input} type="email" value={m.contactEmail} onChange={set("contactEmail")} />
      </label>
      <label className="sm:col-span-2 text-sm">
        <span className={muted}>Association website</span>
        <input className={input} value={m.website} onChange={set("website")} placeholder="Optional" />
      </label>
      <p className={`sm:col-span-2 text-xs ${muted}`}>* Required, plus the association&apos;s phone or email.</p>
      {error && <p className="sm:col-span-2 text-sm text-red-500">{error}</p>}
      <div className="sm:col-span-2">
        <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
          {busy && <Loader2 className="w-4 h-4 animate-spin" />} Save
        </button>
      </div>
    </form>
  );

  // ---- Checklist row (dashboard) ----------------------------------------
  // Matches the bounty rows in GoLiveBounties: icon tile, label + hint, and a
  // Done pill or an action on the right.
  if (isChecklist) {
    const Icon = complete && !editing ? CheckCircle2 : Building2;
    return (
      <div
        className={`rounded-lg p-3 border ${
          complete && !editing
            ? isLight
              ? "bg-green-50/60 border-green-100"
              : "bg-green-900/10 border-green-900/40"
            : isLight
            ? "bg-white border-amber-200"
            : "bg-slate-800/40 border-amber-800/50"
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-lg flex-shrink-0 ${
              complete && !editing
                ? isLight ? "bg-green-100" : "bg-green-900/40"
                : isLight ? "bg-amber-100" : "bg-amber-900/40"
            }`}
          >
            <Icon
              className={`w-5 h-5 ${
                complete && !editing
                  ? isLight ? "text-green-600" : "text-green-400"
                  : isLight ? "text-amber-600" : "text-amber-400"
              }`}
            />
          </div>

          <div className="flex-1 min-w-0">
            <p
              className={`text-sm font-semibold ${
                complete && !editing
                  ? isLight ? "text-gray-400 line-through" : "text-gray-500 line-through"
                  : isLight ? "text-gray-900" : "text-white"
              }`}
            >
              Your MLS association
            </p>
            {complete && !editing ? (
              <p className={`text-xs mt-0.5 truncate ${muted}`}>
                {m.associationName} · MLS ID {m.mlsId}
                {m.contactPhone ? ` · ${m.contactPhone}` : ""}
                {m.contactEmail ? ` · ${m.contactEmail}` : ""}
              </p>
            ) : (
              <p className={`text-xs mt-0.5 ${muted}`}>
                Tell us your association and we&apos;ll handle the IDX data-access conversation. Not
                required to publish your site.
              </p>
            )}
          </div>

          {complete && !editing ? (
            <div className="flex items-center gap-2 flex-shrink-0">
              <span
                className={`text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded ${
                  isLight ? "bg-green-100 text-green-700" : "bg-green-900/40 text-green-300"
                }`}
              >
                {saved ? "Saved" : "Done"}
              </span>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors ${
                  isLight
                    ? "bg-white hover:bg-gray-100 text-gray-700 border border-gray-200"
                    : "bg-slate-800 hover:bg-slate-700 text-gray-200 border border-slate-700"
                }`}
              >
                <Pencil className="w-3 h-3" /> Edit
              </button>
            </div>
          ) : null}
        </div>

        {editing && form}
      </div>
    );
  }

  // ---- Standalone card (Settings) ----------------------------------------
  return (
    <div className={`rounded-xl border p-5 ${isLight ? "bg-white border-gray-200" : "bg-gray-900/60 border-gray-700"}`}>
      <div className="flex items-start gap-3">
        <Building2 className={`w-5 h-5 mt-0.5 shrink-0 ${isLight ? "text-amber-600" : "text-amber-400"}`} />
        <div className="min-w-0 flex-1">
          <h3 className={`font-semibold ${text}`}>Your MLS association</h3>
          <p className={`text-sm mt-1 ${muted}`}>
            We&apos;re working with each MLS association to bring their listings onto ChatRealty. Tell us yours
            and how to reach them, and we&apos;ll handle the data-access conversation.
          </p>

          {!editing ? (
            <div className={`mt-3 text-sm ${text}`}>
              <p className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                {saved ? "Saved — thank you." : "On file."}
              </p>
              <p className={`mt-1 ${muted}`}>
                {m.associationName} · MLS ID {m.mlsId}
                {m.contactPhone ? ` · ${m.contactPhone}` : ""}
                {m.contactEmail ? ` · ${m.contactEmail}` : ""}
              </p>
              <button type="button" onClick={() => setEditing(true)} className="mt-2 inline-flex items-center gap-1 text-sm underline">
                <Pencil className="w-3.5 h-3.5" /> Edit
              </button>
            </div>
          ) : (
            form
          )}
        </div>
      </div>
    </div>
  );
}
