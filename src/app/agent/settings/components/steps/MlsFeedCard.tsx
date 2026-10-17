"use client";

// src/app/agent/settings/components/steps/MlsFeedCard.tsx
//
// MLS data feed (BYOD) — the agent pastes their MLS replication key here.
// POST /api/integrations/mls-feed tests it against their MLS, then encrypts and
// stores it on their user record. The key is never sent back to the browser:
// after saving, this card only ever knows the host, the auth mode and the last
// four characters.

import { useEffect, useRef, useState } from "react";
import { Loader2, Database, Check, AlertCircle, RefreshCw } from "lucide-react";
import { toast } from "react-toastify";

type FeedStatus = {
  status: "connected" | "disconnected" | "invalid";
  authMode: "bearer" | "oauth" | null;
  baseUrl: string | null;
  tokenUrl: string | null;
  scope: string | null;
  last4: string | null;
  lastError: string | null;
  addedAt: string | null;
  lastVerifiedAt: string | null;
  networkField: string | null;
  availableNetworks: Array<{ name: string; count: number | null }>;
  totalListings: number | null;
  networksCheckedAt: string | null;
  networks: string[];
};

const fmt = (n: number) => n.toLocaleString();

type Form = {
  baseUrl: string;
  bearerToken: string;
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  scope: string;
};

// Mirrors DEFAULT_BASE_URL in src/lib/mls-feed.ts (server module — can't be
// imported into a client bundle; it pulls in mongoose).
const SPARK_REPLICATION_URL = "https://replication.sparkapi.com/Reso/OData";

const EMPTY_FORM: Form = {
  baseUrl: SPARK_REPLICATION_URL,
  bearerToken: "",
  tokenUrl: "",
  clientId: "",
  clientSecret: "",
  scope: "",
};

// Agents who already ran `npx @chatrealty/sync` have these as RESO_* lines in
// their .env.local. Pasting that block into any field fills every field it
// names, instead of making them pick the lines apart by hand.
const ENV_FIELDS: Record<string, keyof Form> = {
  RESO_BASE_URL: "baseUrl",
  RESO_BEARER_TOKEN: "bearerToken",
  RESO_TOKEN_URL: "tokenUrl",
  RESO_CLIENT_ID: "clientId",
  RESO_CLIENT_SECRET: "clientSecret",
  RESO_SCOPE: "scope",
};

function parseEnvPaste(text: string): Partial<Form> | null {
  const out: Partial<Form> = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.trim().replace(/^export\s+/, "").match(/^(RESO_[A-Z_]+)\s*=\s*(.*)$/);
    if (!m || !(m[1] in ENV_FIELDS)) continue;
    let v = m[2].trim();
    if (v.length >= 2 && /^(["']).*\1$/.test(v)) v = v.slice(1, -1).trim();
    if (v) out[ENV_FIELDS[m[1]]] = v;
  }
  return Object.keys(out).length > 0 ? out : null;
}

function hostOf(url: string | null): string {
  if (!url) return "";
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

export default function MlsFeedCard({ isLight }: { isLight: boolean }) {
  const cardClass = `rounded-xl border p-6 ${isLight ? "bg-white border-gray-200" : "bg-gray-900 border-gray-800"}`;
  const inputClass = `w-full px-4 py-3 rounded-lg border text-sm focus:outline-none focus:ring-2 font-mono ${
    isLight
      ? "bg-white border-gray-300 text-gray-900 focus:ring-blue-500"
      : "bg-gray-800 border-gray-700 text-white focus:ring-emerald-500"
  }`;
  const labelClass = `block text-xs font-medium mb-1.5 ${isLight ? "text-gray-500" : "text-gray-400"}`;
  const textPrimary = isLight ? "text-gray-900" : "text-white";
  const textMuted = isLight ? "text-gray-500" : "text-gray-400";

  const [feed, setFeed] = useState<FeedStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState<"bearer" | "oauth">("bearer");
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [result, setResult] = useState<null | { ok: boolean; message: string }>(null);
  const [pasteNote, setPasteNote] = useState<string | null>(null);
  // Associations picker
  const [discovering, setDiscovering] = useState(false);
  const [networksError, setNetworksError] = useState<string | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [savingPick, setSavingPick] = useState(false);
  const autoDiscovered = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/integrations/mls-feed");
        if (res.ok) setFeed(await res.json());
      } catch {
        /* ignore — card falls back to the empty form */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const parsed = parseEnvPaste(e.clipboardData.getData("text"));
    if (!parsed) return; // ordinary paste — let the input take it
    e.preventDefault();
    setForm((f) => ({ ...f, ...parsed }));
    if (parsed.bearerToken) setAuthMode("bearer");
    else if (parsed.clientId || parsed.clientSecret || parsed.tokenUrl) setAuthMode("oauth");
    const n = Object.keys(parsed).length;
    setPasteNote(`Filled ${n} field${n === 1 ? "" : "s"} from your .env lines.`);
  };

  const canSave =
    !!form.baseUrl.trim() &&
    (authMode === "bearer"
      ? !!form.bearerToken.trim()
      : !!form.tokenUrl.trim() && !!form.clientId.trim() && !!form.clientSecret.trim());

  const handleSave = async () => {
    setSaving(true);
    setResult(null);
    try {
      const payload =
        authMode === "bearer"
          ? { authMode, baseUrl: form.baseUrl, bearerToken: form.bearerToken }
          : {
              authMode,
              baseUrl: form.baseUrl,
              tokenUrl: form.tokenUrl,
              clientId: form.clientId,
              clientSecret: form.clientSecret,
              scope: form.scope,
            };
      const res = await fetch("/api/integrations/mls-feed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.ok) {
        const { ok: _ok, sampleCount: _n, ...status } = data;
        // A new key may reach different associations — let the picker ask again.
        autoDiscovered.current = false;
        setFeed(status as FeedStatus);
        // Drop the plaintext from memory as soon as the server has it.
        setForm(EMPTY_FORM);
        setReplacing(false);
        setPasteNote(null);
        toast.success("MLS key verified and saved");
      } else {
        setResult({ ok: false, message: data.message || "Couldn't verify that key." });
      }
    } catch {
      setResult({ ok: false, message: "Network error — nothing was saved." });
    } finally {
      setSaving(false);
    }
  };

  const handleVerify = async () => {
    setVerifying(true);
    setResult(null);
    try {
      const res = await fetch("/api/integrations/mls-feed/verify", { method: "POST" });
      const data = await res.json();
      const { ok, reason: _r, message, httpStatus: _h, ...status } = data;
      setFeed(status as FeedStatus);
      setResult(ok ? { ok: true, message: "Your MLS accepted the saved key." } : { ok: false, message });
    } catch {
      setResult({ ok: false, message: "Network error" });
    } finally {
      setVerifying(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm("Remove your MLS key? Your listings stop updating until you add one again.")) return;
    try {
      const res = await fetch("/api/integrations/mls-feed", { method: "DELETE" });
      if (res.ok) {
        toast.success("MLS key removed");
        setFeed(null);
        setResult(null);
        setReplacing(false);
      }
    } catch {
      toast.error("Failed to remove");
    }
  };

  const handleDiscover = async () => {
    setDiscovering(true);
    setNetworksError(null);
    try {
      const res = await fetch("/api/integrations/mls-feed/networks", { method: "POST" });
      const data = await res.json();
      const { ok, reason: _r, message, httpStatus: _h, capped, ...status } = data;
      if (status?.status) setFeed(status as FeedStatus);
      if (!ok) setNetworksError(message || "Couldn't list the associations.");
      else if (capped) setNetworksError("This key reaches more than 50 associations — only the first 50 are listed.");
    } catch {
      setNetworksError("Network error — try again.");
    } finally {
      setDiscovering(false);
    }
  };

  const handleSavePick = async () => {
    setSavingPick(true);
    setNetworksError(null);
    try {
      const res = await fetch("/api/integrations/mls-feed/networks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ networks: Array.from(picked) }),
      });
      const data = await res.json();
      if (data.ok) {
        const { ok: _ok, ...status } = data;
        setFeed(status as FeedStatus);
        toast.success("Associations saved");
      } else {
        setNetworksError(data.message || "Couldn't save the selection.");
      }
    } catch {
      setNetworksError("Network error — nothing was saved.");
    } finally {
      setSavingPick(false);
    }
  };

  const connected = feed?.status === "connected";
  const invalid = feed?.status === "invalid";
  const showForm = !loading && (!connected || replacing);

  // The checkboxes follow whatever the server last saved.
  const savedNetworks = feed?.networks ?? [];
  const savedKey = savedNetworks.join("\u0000");
  useEffect(() => {
    setPicked(new Set(savedNetworks));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedKey]);

  // First time a key is connected, ask the MLS what it reaches without making
  // the agent find a button. Once per mount; the list is cached server-side.
  useEffect(() => {
    if (connected && !feed?.networksCheckedAt && !autoDiscovered.current && !discovering) {
      autoDiscovered.current = true;
      handleDiscover();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, feed?.networksCheckedAt]);

  const available = feed?.availableNetworks ?? [];
  const pickChanged =
    picked.size !== savedNetworks.length || savedNetworks.some((n) => !picked.has(n));
  const savedCount = available
    .filter((n) => savedNetworks.includes(n.name))
    .reduce((t, n) => t + (n.count ?? 0), 0);

  return (
    <div className={cardClass}>
      <div className="flex items-start gap-4 mb-4">
        <div className={`p-3 rounded-lg ${isLight ? "bg-sky-50" : "bg-sky-950/30"}`}>
          <Database className={`w-6 h-6 ${isLight ? "text-sky-600" : "text-sky-400"}`} />
        </div>
        <div className="flex-1">
          <h3 className={`text-lg font-bold ${textPrimary}`}>MLS Data Feed</h3>
          <p className={`text-sm mt-0.5 ${textMuted}`}>
            Your MLS replication key is what lets ChatRealty copy your MLS&apos;s listings into your own
            database, so your site shows live listings. You get it from your MLS or its data vendor (for
            many MLSs that&apos;s Spark Platform). We test it against your MLS, then encrypt it before
            storing it — after that it&apos;s never shown again, not even here.
          </p>
        </div>
      </div>

      {loading && <div className={`text-sm ${textMuted}`}>Loading…</div>}

      {/* Connected summary */}
      {connected && !replacing && (
        <div
          className={`flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg ${
            isLight ? "bg-green-50 border border-green-200" : "bg-green-950/20 border border-green-900"
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <Check className={`w-5 h-5 flex-shrink-0 ${isLight ? "text-green-600" : "text-green-400"}`} />
            <div className="min-w-0">
              <div className={`text-sm font-semibold ${textPrimary} break-all`}>
                Connected · {hostOf(feed?.baseUrl ?? null)}
              </div>
              <div className={`text-xs ${textMuted}`}>
                {feed?.authMode === "oauth" ? "Client secret" : "Access token"} …{feed?.last4}
                {feed?.lastVerifiedAt && ` · verified ${new Date(feed.lastVerifiedAt).toLocaleDateString()}`}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleVerify}
              disabled={verifying}
              className={`text-xs px-3 py-1.5 rounded-md inline-flex items-center gap-1.5 disabled:opacity-50 ${
                isLight ? "text-gray-700 hover:bg-gray-100" : "text-gray-300 hover:bg-gray-800"
              }`}
            >
              {verifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Re-check
            </button>
            <button
              onClick={() => {
                setReplacing(true);
                setResult(null);
                setAuthMode(feed?.authMode === "oauth" ? "oauth" : "bearer");
                setForm({ ...EMPTY_FORM, baseUrl: feed?.baseUrl || SPARK_REPLICATION_URL, tokenUrl: feed?.tokenUrl || "", scope: feed?.scope || "" });
              }}
              className={`text-xs px-3 py-1.5 rounded-md ${
                isLight ? "text-gray-700 hover:bg-gray-100" : "text-gray-300 hover:bg-gray-800"
              }`}
            >
              Replace key
            </button>
            <button
              onClick={handleRemove}
              className={`text-xs px-3 py-1.5 rounded-md ${
                isLight ? "text-red-600 hover:bg-red-50" : "text-red-400 hover:bg-red-950/30"
              }`}
            >
              Remove
            </button>
          </div>
        </div>
      )}

      {/* Associations the key reaches — pick which ones the site uses */}
      {connected && !replacing && (
        <div className={`mt-4 p-4 rounded-lg border ${isLight ? "border-gray-200" : "border-gray-800"}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className={`text-sm font-semibold ${textPrimary}`}>Which associations should your site show?</div>
              <p className={`text-xs mt-0.5 ${textMuted}`}>
                One key can reach several MLS associations. Pick the ones your site should pull listings from.
              </p>
            </div>
            <button
              onClick={handleDiscover}
              disabled={discovering}
              className={`text-xs px-3 py-1.5 rounded-md inline-flex items-center gap-1.5 disabled:opacity-50 ${
                isLight ? "text-gray-700 hover:bg-gray-100" : "text-gray-300 hover:bg-gray-800"
              }`}
            >
              {discovering ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Refresh list
            </button>
          </div>

          {discovering && available.length === 0 && (
            <div className={`flex items-center gap-2 mt-3 text-sm ${textMuted}`}>
              <Loader2 className="w-4 h-4 animate-spin" />
              Asking your MLS which associations this key reaches…
            </div>
          )}

          {networksError && (
            <div
              className={`flex items-start gap-2 p-3 mt-3 rounded-lg text-sm ${
                isLight ? "bg-red-50 text-red-800" : "bg-red-950/20 text-red-300"
              }`}
            >
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{networksError}</span>
            </div>
          )}

          {available.length > 0 && (
            <>
              {feed?.totalListings != null && (
                <p className={`text-xs mt-3 ${textMuted}`}>
                  This key reaches {fmt(feed.totalListings)} listings across {available.length} association
                  {available.length === 1 ? "" : "s"}
                  {feed.networksCheckedAt && ` · checked ${new Date(feed.networksCheckedAt).toLocaleDateString()}`}.
                </p>
              )}
              <div className="mt-2 space-y-1.5">
                {available.map((n) => {
                  const on = picked.has(n.name);
                  return (
                    <label
                      key={n.name}
                      className={`flex items-center justify-between gap-3 p-2.5 rounded-lg border cursor-pointer transition ${
                        on
                          ? isLight
                            ? "border-sky-500 bg-sky-50"
                            : "border-sky-500 bg-sky-950/20"
                          : isLight
                          ? "border-gray-200 hover:border-gray-300"
                          : "border-gray-700 hover:border-gray-600"
                      }`}
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={(e) => {
                            const next = new Set(picked);
                            if (e.target.checked) next.add(n.name);
                            else next.delete(n.name);
                            setPicked(next);
                          }}
                        />
                        <span className={`text-sm ${textPrimary} break-words`}>{n.name}</span>
                      </span>
                      <span className={`text-xs whitespace-nowrap ${textMuted}`}>
                        {n.count != null ? `${fmt(n.count)} listings` : "count unavailable"}
                      </span>
                    </label>
                  );
                })}
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-3">
                <button
                  onClick={handleSavePick}
                  disabled={!pickChanged || savingPick}
                  className={`px-4 py-2 rounded-lg text-sm font-bold text-white transition-colors disabled:opacity-50 ${
                    isLight ? "bg-blue-600 hover:bg-blue-700" : "bg-emerald-600 hover:bg-emerald-700"
                  }`}
                >
                  {savingPick ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving
                    </span>
                  ) : (
                    "Save selection"
                  )}
                </button>
                <span className={`text-xs ${textMuted}`}>
                  {savedNetworks.length === 0
                    ? "Nothing picked yet — until you pick, your site would take everything this key reaches."
                    : `Using ${savedNetworks.length} association${savedNetworks.length === 1 ? "" : "s"}${
                        savedCount > 0 ? ` · ${fmt(savedCount)} listings` : ""
                      }.`}
                </span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Saved key stopped working */}
      {invalid && !replacing && (
        <div
          className={`flex items-start gap-2 p-3 mb-3 rounded-lg text-sm ${
            isLight ? "bg-red-50 text-red-800" : "bg-red-950/20 text-red-300"
          }`}
        >
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>
            Your MLS stopped accepting the saved key ({hostOf(feed?.baseUrl ?? null)} …{feed?.last4}). Paste a new
            one below — the old one is replaced when the new one passes.
          </span>
        </div>
      )}

      {showForm && (
        <div className="space-y-3">
          <div>
            <label className={labelClass}>How does your MLS give you access?</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {([
                { id: "bearer" as const, title: "Access token", desc: "One long key. Spark Platform replication keys work this way." },
                { id: "oauth" as const, title: "Client ID + secret", desc: "A pair plus a token URL (Trestle, Bridge, MLS Grid and others)." },
              ]).map((o) => {
                const on = authMode === o.id;
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => setAuthMode(o.id)}
                    className={`text-left p-3 rounded-lg border transition ${
                      on
                        ? isLight
                          ? "border-sky-500 ring-1 ring-sky-500 bg-sky-50"
                          : "border-sky-500 ring-1 ring-sky-500 bg-sky-950/20"
                        : isLight
                        ? "border-gray-200 hover:border-gray-300"
                        : "border-gray-700 hover:border-gray-600"
                    }`}
                  >
                    <div className={`text-sm font-semibold ${textPrimary}`}>{o.title}</div>
                    <div className={`text-xs mt-0.5 ${textMuted}`}>{o.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className={labelClass}>Feed URL</label>
            <input
              type="text"
              value={form.baseUrl}
              onChange={set("baseUrl")}
              onPaste={handlePaste}
              placeholder={SPARK_REPLICATION_URL}
              className={inputClass}
              autoComplete="off"
              spellCheck={false}
            />
            <p className={`text-xs mt-1 ${textMuted}`}>
              The RESO Web API address from your MLS. Spark replication keys use the address already filled in.
            </p>
          </div>

          {authMode === "bearer" ? (
            <div>
              <label className={labelClass}>Replication access token</label>
              <input
                type="password"
                value={form.bearerToken}
                onChange={set("bearerToken")}
                onPaste={handlePaste}
                placeholder="Paste your token (or your RESO_ lines from .env.local)"
                className={inputClass}
                autoComplete="new-password"
                spellCheck={false}
                data-1p-ignore
                data-lpignore="true"
              />
            </div>
          ) : (
            <>
              <div>
                <label className={labelClass}>Token URL</label>
                <input
                  type="text"
                  value={form.tokenUrl}
                  onChange={set("tokenUrl")}
                  onPaste={handlePaste}
                  placeholder="https://…/oauth2/token"
                  className={inputClass}
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Client ID</label>
                  <input
                    type="password"
                    value={form.clientId}
                    onChange={set("clientId")}
                    onPaste={handlePaste}
                    className={inputClass}
                    autoComplete="new-password"
                    spellCheck={false}
                    data-1p-ignore
                    data-lpignore="true"
                  />
                </div>
                <div>
                  <label className={labelClass}>Client secret</label>
                  <input
                    type="password"
                    value={form.clientSecret}
                    onChange={set("clientSecret")}
                    onPaste={handlePaste}
                    className={inputClass}
                    autoComplete="new-password"
                    spellCheck={false}
                    data-1p-ignore
                    data-lpignore="true"
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>Scope (only if your MLS lists one)</label>
                <input
                  type="text"
                  value={form.scope}
                  onChange={set("scope")}
                  onPaste={handlePaste}
                  placeholder="e.g. api"
                  className={inputClass}
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
            </>
          )}

          {pasteNote && <p className={`text-xs ${isLight ? "text-sky-700" : "text-sky-400"}`}>{pasteNote}</p>}
        </div>
      )}

      {result && (
        <div
          className={`flex items-start gap-2 p-3 mt-3 rounded-lg text-sm ${
            result.ok
              ? isLight
                ? "bg-green-50 text-green-800"
                : "bg-green-950/20 text-green-300"
              : isLight
              ? "bg-red-50 text-red-800"
              : "bg-red-950/20 text-red-300"
          }`}
        >
          {result.ok ? <Check className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
          <span>{result.message}</span>
        </div>
      )}

      {showForm && (
        <div className="flex gap-2 mt-3">
          <button
            onClick={handleSave}
            disabled={!canSave || saving}
            className={`px-4 py-2 rounded-lg text-sm font-bold text-white transition-colors disabled:opacity-50 ${
              isLight ? "bg-blue-600 hover:bg-blue-700" : "bg-emerald-600 hover:bg-emerald-700"
            }`}
          >
            {saving ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Testing with your MLS
              </span>
            ) : (
              "Test & save"
            )}
          </button>
          {replacing && (
            <button
              onClick={() => {
                setReplacing(false);
                setForm(EMPTY_FORM);
                setResult(null);
                setPasteNote(null);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium border ${
                isLight ? "border-gray-300 text-gray-700 hover:bg-gray-50" : "border-gray-700 text-gray-300 hover:bg-gray-800"
              }`}
            >
              Cancel
            </button>
          )}
        </div>
      )}
    </div>
  );
}
