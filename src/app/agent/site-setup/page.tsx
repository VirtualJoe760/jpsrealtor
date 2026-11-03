"use client";

// $300 custom-site setup (site-platform plan P5), agent side:
// buy (active Basic subscribers only) → intake form → status until live.
// APIs: /api/site-setup, /api/site-setup/[id]/intake. Docs: docs/commerce/site-setup.md.

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Upload, Globe, CheckCircle2 } from "lucide-react";
import { useThemeClasses } from "@/app/contexts/ThemeContext";
import { uploadToCloudinary } from "@/app/utils/cloudinaryUpload";

interface Order {
  id: string;
  status: string;
  amount: number;
  livemode: boolean;
  paidAt?: string;
  intake: { style: string; styleNotes: string; serviceAreas: string[]; logoUrl: string; exampleSites: string[]; colors: string; notes: string; submittedAt?: string };
  liveUrl?: string;
}

const STATUS_TEXT: Record<string, string> = {
  intake_pending: "Paid — waiting for your setup form",
  intake_received: "Form received — we'll start building soon",
  in_progress: "Your site is being built",
  live: "Live",
  refunded: "Refunded",
  cancelled: "Cancelled",
};

export default function SiteSetupPage() {
  const { status } = useSession();
  const router = useRouter();
  const { cardBg, textPrimary, textSecondary, border } = useThemeClasses();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ price: number; styles: { id: string; label: string }[]; eligible: boolean; message: string | null; orders: Order[] } | null>(null);
  const [error, setError] = useState("");
  const [buying, setBuying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({ style: "", styleNotes: "", serviceAreas: "", logoUrl: "", exampleSites: "", colors: "", notes: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/site-setup");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not load");
      setData(json);
      const open = (json.orders as Order[]).find((o) => ["intake_pending", "intake_received"].includes(o.status));
      if (open) {
        setForm({
          style: open.intake.style,
          styleNotes: open.intake.styleNotes,
          serviceAreas: open.intake.serviceAreas.join(", "),
          logoUrl: open.intake.logoUrl,
          exampleSites: open.intake.exampleSites.join("\n"),
          colors: open.intake.colors,
          notes: open.intake.notes,
        });
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin?callbackUrl=/agent/site-setup");
    else if (status === "authenticated") load();
  }, [status, router, load]);

  const buy = async () => {
    setBuying(true);
    setError("");
    try {
      const res = await fetch("/api/site-setup", { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.url) throw new Error(json.error || "Could not start checkout");
      window.location.href = json.url;
    } catch (e) {
      setError((e as Error).message);
      setBuying(false);
    }
  };

  const uploadLogo = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const [url] = await uploadToCloudinary(files, "site-setup-logos");
      if (url) setForm((f) => ({ ...f, logoUrl: url }));
    } catch {
      setError("Logo upload failed — try a PNG or JPG under 10 MB.");
    } finally {
      setUploading(false);
    }
  };

  const submitIntake = async (orderId: string) => {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch(`/api/site-setup/${orderId}/intake`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not save");
      setSaved(true);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const input = `w-full rounded-lg border ${border} bg-transparent px-3 py-2 text-sm ${textPrimary}`;
  const card = `${cardBg} border ${border} rounded-2xl p-5`;

  if (status === "loading" || loading || !data) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className={`animate-spin ${textSecondary}`} /></div>;
  }

  const editable = data.orders.find((o) => ["intake_pending", "intake_received"].includes(o.status));
  const current = data.orders.find((o) => !["refunded", "cancelled"].includes(o.status));
  const canBuy = data.eligible && !data.orders.some((o) => ["intake_pending", "intake_received", "in_progress"].includes(o.status));

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/agent/settings?section=billing" className={`mb-4 inline-flex items-center gap-1 text-sm ${textSecondary}`}>
        <ArrowLeft size={16} /> Billing
      </Link>
      <h1 className={`mb-1 flex items-center gap-2 text-2xl font-bold ${textPrimary}`}><Globe /> Custom site setup</h1>
      <p className={`mb-6 text-sm ${textSecondary}`}>
        A one-time ${data.price} service: we design and build a custom website for you with Claude, connected to your ChatRealty
        listings, blog, landing pages and leads.
      </p>
      {error && <p className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-500">{error}</p>}

      {current && (
        <div className={`${card} mb-6`}>
          <div className={`text-xs uppercase tracking-wide ${textSecondary}`}>Status</div>
          <div className={`text-lg font-semibold ${textPrimary}`}>{STATUS_TEXT[current.status] || current.status}</div>
          {current.status === "live" && current.liveUrl && (
            <a href={/^https?:/.test(current.liveUrl) ? current.liveUrl : `https://${current.liveUrl}`} target="_blank" rel="noreferrer" className="mt-1 inline-block text-blue-500 underline">
              {current.liveUrl}
            </a>
          )}
          {!current.livemode && <p className={`mt-1 text-xs ${textSecondary}`}>Test-mode payment.</p>}
        </div>
      )}

      {!current && (
        <div className={card}>
          <ul className={`mb-4 list-disc space-y-1 pl-5 text-sm ${textSecondary}`}>
            <li>Your own design — style, colors and layout picked for you</li>
            <li>Your listings, communities and blog pulled live from ChatRealty</li>
            <li>Search-engine setup handled by the platform</li>
            <li>We email you when it&apos;s live</li>
          </ul>
          {canBuy ? (
            <button onClick={buy} disabled={buying} className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {buying ? "Opening checkout…" : `Buy setup — $${data.price}`}
            </button>
          ) : (
            <p className={`text-sm ${textSecondary}`}>
              {data.message}{" "}
              {data.message?.includes("Subscribe") && <Link href="/agent/settings?section=billing" className="text-blue-500 underline">Go to billing</Link>}
            </p>
          )}
        </div>
      )}

      {editable && (
        <form onSubmit={(e) => { e.preventDefault(); submitIntake(editable.id); }} className={`${card} space-y-4`}>
          <h2 className={`font-semibold ${textPrimary}`}>Tell us what you want</h2>
          <div>
            <span className={`mb-2 block text-sm ${textSecondary}`}>Style</span>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {data.styles.map((s) => (
                <label key={s.id} className={`flex items-center gap-2 rounded-lg border ${border} px-3 py-2 text-sm ${textPrimary}`}>
                  <input type="radio" name="style" value={s.id} checked={form.style === s.id} onChange={() => setForm({ ...form, style: s.id })} />
                  {s.label}
                </label>
              ))}
            </div>
            <textarea className={`${input} mt-2`} rows={2} placeholder="Anything else about the look and feel (optional)" value={form.styleNotes} onChange={(e) => setForm({ ...form, styleNotes: e.target.value })} />
          </div>
          <label className="block">
            <span className={`mb-1 block text-sm ${textSecondary}`}>Areas you serve (comma-separated)</span>
            <input className={input} placeholder="Palm Desert, La Quinta, Indian Wells" value={form.serviceAreas} onChange={(e) => setForm({ ...form, serviceAreas: e.target.value })} />
          </label>
          <div>
            <span className={`mb-1 block text-sm ${textSecondary}`}>Logo</span>
            <div className="flex items-center gap-3">
              {form.logoUrl && <img src={form.logoUrl} alt="Logo" className="h-12 max-w-[160px] object-contain" />}
              <label className={`inline-flex cursor-pointer items-center gap-1 rounded-lg border ${border} px-3 py-2 text-sm ${textPrimary}`}>
                {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                {form.logoUrl ? "Replace" : "Upload"}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadLogo(e.target.files)} />
              </label>
            </div>
          </div>
          <label className="block">
            <span className={`mb-1 block text-sm ${textSecondary}`}>Sites you like (one per line, optional)</span>
            <textarea className={input} rows={3} placeholder="https://example.com" value={form.exampleSites} onChange={(e) => setForm({ ...form, exampleSites: e.target.value })} />
          </label>
          <label className="block">
            <span className={`mb-1 block text-sm ${textSecondary}`}>Brand colors (optional)</span>
            <input className={input} placeholder="Navy and gold, #1e3a8a" value={form.colors} onChange={(e) => setForm({ ...form, colors: e.target.value })} />
          </label>
          <label className="block">
            <span className={`mb-1 block text-sm ${textSecondary}`}>Anything else (optional)</span>
            <textarea className={input} rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </label>
          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving || uploading} className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {saving ? "Saving…" : editable.status === "intake_pending" ? "Send to ChatRealty" : "Update"}
            </button>
            {saved && <span className="inline-flex items-center gap-1 text-sm text-emerald-500"><CheckCircle2 size={14} /> Saved</span>}
          </div>
        </form>
      )}
    </div>
  );
}
