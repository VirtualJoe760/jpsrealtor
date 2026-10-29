"use client";

// The agent's MLS association: name, MLS ID, and the association's contact
// details. ChatRealty uses it to call each association about IDX data access
// (we don't have feeds for every association yet). Shown on the dashboard as
// a prompt until filled in (`variant="prompt"`), and in Settings
// (`variant="settings"`). Backed by /api/agent/mls-association.

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
  variant?: "prompt" | "settings";
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

  // The dashboard prompt disappears once it's filled in (Settings keeps it).
  if (!loaded || (variant === "prompt" && complete && !editing && !saved)) return null;

  const card = isLight ? "bg-white border-amber-200" : "bg-gray-900/60 border-amber-800/50";
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

  return (
    <div className={`rounded-xl border p-5 ${variant === "prompt" ? card : isLight ? "bg-white border-gray-200" : "bg-gray-900/60 border-gray-700"}`}>
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
          )}
        </div>
      </div>
    </div>
  );
}
