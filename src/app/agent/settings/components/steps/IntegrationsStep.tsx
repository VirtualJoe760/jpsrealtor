"use client";

// src/app/agent/settings/components/steps/IntegrationsStep.tsx
//
// Two cards:
//   1. Anthropic API key — bring-your-own-key for the in-CMS Claude chat builder
//      (POST /api/integrations/anthropic).
//   2. ChatRealty Desktop Skill — mint API tokens for the Claude Code / Claude
//      Desktop skill (POST /api/integrations/api-tokens). Token is shown ONCE.

import { useEffect, useState } from "react";
import {
  Loader2,
  Key,
  Terminal,
  Check,
  AlertCircle,
  Copy,
  Trash2,
  Plus,
  ExternalLink,
} from "lucide-react";
import { toast } from "react-toastify";

interface StepProps {
  formData: any;
  updateField: (path: string, value: any) => void;
  isLight: boolean;
  onSave: (stepFields: Record<string, any>) => Promise<void>;
  isSaving: boolean;
}

type AnthropicStatus = {
  status: "connected" | "disconnected" | "invalid";
  last4: string | null;
  model: string;
  addedAt: string | null;
  lastVerifiedAt: string | null;
};

type ApiToken = {
  id: string;
  last4: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
};

export default function IntegrationsStep({ isLight }: StepProps) {
  const cardClass = `rounded-xl border p-6 ${
    isLight ? "bg-white border-gray-200" : "bg-gray-900 border-gray-800"
  }`;
  const inputClass = `w-full px-4 py-3 rounded-lg border text-sm focus:outline-none focus:ring-2 font-mono ${
    isLight
      ? "bg-white border-gray-300 text-gray-900 focus:ring-blue-500"
      : "bg-gray-800 border-gray-700 text-white focus:ring-emerald-500"
  }`;
  const textPrimary = isLight ? "text-gray-900" : "text-white";
  const textMuted = isLight ? "text-gray-500" : "text-gray-400";

  // ---- Anthropic key state ----
  const [anthropic, setAnthropic] = useState<AnthropicStatus | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<
    null | { ok: boolean; message: string }
  >(null);

  // ---- API tokens state ----
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [tokensLoading, setTokensLoading] = useState(true);
  const [newTokenName, setNewTokenName] = useState("");
  const [creatingToken, setCreatingToken] = useState(false);
  const [revealedToken, setRevealedToken] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/integrations/anthropic");
        if (res.ok) setAnthropic(await res.json());
      } catch {
        /* ignore */
      }
    })();
    (async () => {
      try {
        const res = await fetch("/api/integrations/api-tokens");
        if (res.ok) {
          const data = await res.json();
          setTokens(data.tokens || []);
        }
      } finally {
        setTokensLoading(false);
      }
    })();
  }, []);

  // ---- Anthropic handlers ----
  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/integrations/anthropic/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: apiKeyInput }),
      });
      const data = await res.json();
      if (data.ok) {
        setTestResult({ ok: true, message: `Key valid (model: ${data.model})` });
      } else {
        setTestResult({ ok: false, message: data.message || "Test failed" });
      }
    } catch {
      setTestResult({ ok: false, message: "Network error" });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/integrations/anthropic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: apiKeyInput }),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success("Anthropic key saved");
        setAnthropic({
          status: "connected",
          last4: data.last4,
          model: data.model,
          addedAt: data.lastVerifiedAt,
          lastVerifiedAt: data.lastVerifiedAt,
        });
        setApiKeyInput("");
        setTestResult(null);
      } else {
        toast.error(data.message || "Save failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Remove your Anthropic API key? You can re-add it anytime.")) return;
    try {
      const res = await fetch("/api/integrations/anthropic", { method: "DELETE" });
      if (res.ok) {
        toast.success("Disconnected");
        setAnthropic({
          status: "disconnected",
          last4: null,
          model: "claude-sonnet-4-5-20250929",
          addedAt: null,
          lastVerifiedAt: null,
        });
      }
    } catch {
      toast.error("Failed to disconnect");
    }
  };

  // ---- API token handlers ----
  const handleCreateToken = async () => {
    const name = newTokenName.trim();
    if (!name) {
      toast.error("Give this token a name (e.g. 'MacBook')");
      return;
    }
    setCreatingToken(true);
    try {
      const res = await fetch("/api/integrations/api-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        setRevealedToken(data.token);
        setNewTokenName("");
        // Refresh list
        const list = await fetch("/api/integrations/api-tokens");
        if (list.ok) setTokens((await list.json()).tokens || []);
      } else {
        toast.error(data.error || "Failed to create token");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setCreatingToken(false);
    }
  };

  const handleRevokeToken = async (id: string) => {
    if (!confirm("Revoke this token? Any device using it will lose access.")) return;
    try {
      const res = await fetch(`/api/integrations/api-tokens/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Token revoked");
        setTokens((prev) => prev.filter((t) => t.id !== id));
      }
    } catch {
      toast.error("Failed to revoke");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied");
  };

  const isConnected = anthropic?.status === "connected";

  return (
    <div className="space-y-6">
      {/* ============================================================ */}
      {/* Anthropic API Key */}
      {/* ============================================================ */}
      <div className={cardClass}>
        <div className="flex items-start gap-4 mb-4">
          <div
            className={`p-3 rounded-lg ${
              isLight ? "bg-orange-50" : "bg-orange-950/30"
            }`}
          >
            <Key className={`w-6 h-6 ${isLight ? "text-orange-600" : "text-orange-400"}`} />
          </div>
          <div className="flex-1">
            <h3 className={`text-lg font-bold ${textPrimary}`}>Anthropic API Key</h3>
            <p className={`text-sm mt-0.5 ${textMuted}`}>
              Add your Anthropic API key to use Claude in the CMS landing-page builder.
              Your key is encrypted at rest and only used for your generations.
            </p>
            <a
              href="https://console.anthropic.com/settings/keys"
              target="_blank"
              rel="noreferrer"
              className={`text-xs inline-flex items-center gap-1 mt-2 ${
                isLight ? "text-blue-600 hover:underline" : "text-blue-400 hover:underline"
              }`}
            >
              Get a key from console.anthropic.com
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {isConnected ? (
          <div className="space-y-3">
            <div
              className={`flex items-center justify-between p-3 rounded-lg ${
                isLight ? "bg-green-50 border border-green-200" : "bg-green-950/20 border border-green-900"
              }`}
            >
              <div className="flex items-center gap-3">
                <Check className={`w-5 h-5 ${isLight ? "text-green-600" : "text-green-400"}`} />
                <div>
                  <div className={`text-sm font-semibold ${textPrimary}`}>
                    Connected · sk-ant-…{anthropic?.last4}
                  </div>
                  <div className={`text-xs ${textMuted}`}>
                    Model: {anthropic?.model}
                    {anthropic?.lastVerifiedAt &&
                      ` · verified ${new Date(anthropic.lastVerifiedAt).toLocaleDateString()}`}
                  </div>
                </div>
              </div>
              <button
                onClick={handleDisconnect}
                className={`text-xs px-3 py-1.5 rounded-md ${
                  isLight ? "text-red-600 hover:bg-red-50" : "text-red-400 hover:bg-red-950/30"
                }`}
              >
                Disconnect
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${textMuted}`}>
                API Key
              </label>
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="sk-ant-api03-..."
                className={inputClass}
                autoComplete="off"
                spellCheck={false}
              />
            </div>

            {testResult && (
              <div
                className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
                  testResult.ok
                    ? isLight
                      ? "bg-green-50 text-green-800"
                      : "bg-green-950/20 text-green-300"
                    : isLight
                      ? "bg-red-50 text-red-800"
                      : "bg-red-950/20 text-red-300"
                }`}
              >
                {testResult.ok ? (
                  <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleTest}
                disabled={!apiKeyInput || testing || saving}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors disabled:opacity-50 ${
                  isLight
                    ? "border-gray-300 text-gray-700 hover:bg-gray-50"
                    : "border-gray-700 text-gray-300 hover:bg-gray-800"
                }`}
              >
                {testing ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Testing
                  </span>
                ) : (
                  "Test connection"
                )}
              </button>
              <button
                onClick={handleSave}
                disabled={!apiKeyInput || saving || testing}
                className={`px-4 py-2 rounded-lg text-sm font-bold text-white transition-colors disabled:opacity-50 ${
                  isLight ? "bg-blue-600 hover:bg-blue-700" : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {saving ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving
                  </span>
                ) : (
                  "Save key"
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* ChatRealty Desktop Skill */}
      {/* ============================================================ */}
      <div className={cardClass}>
        <div className="flex items-start gap-4 mb-4">
          <div
            className={`p-3 rounded-lg ${
              isLight ? "bg-purple-50" : "bg-purple-950/30"
            }`}
          >
            <Terminal className={`w-6 h-6 ${isLight ? "text-purple-600" : "text-purple-400"}`} />
          </div>
          <div className="flex-1">
            <h3 className={`text-lg font-bold ${textPrimary}`}>ChatRealty Desktop Skill</h3>
            <p className={`text-sm mt-0.5 ${textMuted}`}>
              Generate an API token so you can create landing pages on ChatRealty from
              Claude Code or Claude Desktop. After installing the skill, just say
              <em> &ldquo;create a landing page about X&rdquo;</em> in any Claude window.
            </p>
          </div>
        </div>

        {/* Revealed-token modal-ish panel (shown only once) */}
        {revealedToken && (
          <div
            className={`mb-4 p-4 rounded-lg border ${
              isLight ? "bg-amber-50 border-amber-300" : "bg-amber-950/20 border-amber-800"
            }`}
          >
            <div className="flex items-start gap-2 mb-3">
              <AlertCircle
                className={`w-5 h-5 mt-0.5 ${isLight ? "text-amber-700" : "text-amber-400"}`}
              />
              <div>
                <p className={`text-sm font-bold ${isLight ? "text-amber-900" : "text-amber-300"}`}>
                  Copy this token now — it will not be shown again.
                </p>
                <p className={`text-xs mt-0.5 ${isLight ? "text-amber-800" : "text-amber-400"}`}>
                  Save it somewhere safe. If you lose it, revoke and create a new one.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <code
                className={`flex-1 px-3 py-2 rounded-md text-xs font-mono break-all ${
                  isLight ? "bg-white border border-amber-200" : "bg-gray-900 border border-amber-900"
                } ${textPrimary}`}
              >
                {revealedToken}
              </code>
              <button
                onClick={() => copyToClipboard(revealedToken)}
                className={`px-3 py-2 rounded-md text-xs font-medium flex items-center gap-1.5 ${
                  isLight
                    ? "bg-amber-100 text-amber-900 hover:bg-amber-200"
                    : "bg-amber-900/40 text-amber-200 hover:bg-amber-900/60"
                }`}
              >
                <Copy className="w-3.5 h-3.5" />
                Copy
              </button>
            </div>
            <div className={`mt-3 text-xs ${isLight ? "text-amber-900" : "text-amber-300"}`}>
              <p className="font-semibold mb-1">Install the skill (one command):</p>
              <code
                className={`block px-3 py-2 rounded-md text-xs font-mono ${
                  isLight ? "bg-white border border-amber-200" : "bg-gray-900 border border-amber-900"
                } ${textPrimary}`}
              >
                npx @chatrealty/install-skill {revealedToken.slice(0, 18)}…
              </code>
            </div>
            <button
              onClick={() => setRevealedToken(null)}
              className={`mt-3 text-xs px-3 py-1.5 rounded-md ${
                isLight ? "text-amber-900 hover:bg-amber-100" : "text-amber-300 hover:bg-amber-900/30"
              }`}
            >
              I&apos;ve saved it — dismiss
            </button>
          </div>
        )}

        {/* Create token */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={newTokenName}
              onChange={(e) => setNewTokenName(e.target.value)}
              placeholder="Name this token (e.g. MacBook, Office Desktop)"
              maxLength={60}
              className={`flex-1 px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 ${
                isLight
                  ? "bg-white border-gray-300 text-gray-900 focus:ring-blue-500"
                  : "bg-gray-800 border-gray-700 text-white focus:ring-emerald-500"
              }`}
            />
            <button
              onClick={handleCreateToken}
              disabled={!newTokenName.trim() || creatingToken}
              className={`px-4 py-2.5 rounded-lg text-sm font-bold text-white flex items-center gap-1.5 disabled:opacity-50 ${
                isLight ? "bg-purple-600 hover:bg-purple-700" : "bg-purple-600 hover:bg-purple-700"
              }`}
            >
              {creatingToken ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Generate
            </button>
          </div>
        </div>

        {/* Token list */}
        {tokensLoading ? (
          <div className={`mt-4 text-sm ${textMuted}`}>Loading…</div>
        ) : tokens.length > 0 ? (
          <div className="mt-4">
            <div className={`text-xs font-semibold uppercase tracking-wide mb-2 ${textMuted}`}>
              Active tokens
            </div>
            <div className="space-y-2">
              {tokens.map((t) => (
                <div
                  key={t.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    isLight ? "bg-gray-50 border-gray-200" : "bg-gray-800/50 border-gray-700"
                  }`}
                >
                  <div>
                    <div className={`text-sm font-medium ${textPrimary}`}>{t.name}</div>
                    <div className={`text-xs ${textMuted}`}>
                      crt_live_…{t.last4} · created{" "}
                      {new Date(t.createdAt).toLocaleDateString()}
                      {t.lastUsedAt && ` · last used ${new Date(t.lastUsedAt).toLocaleDateString()}`}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRevokeToken(t.id)}
                    className={`p-2 rounded-md ${
                      isLight ? "text-red-600 hover:bg-red-50" : "text-red-400 hover:bg-red-950/30"
                    }`}
                    title="Revoke"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className={`mt-4 text-sm ${textMuted}`}>
            No tokens yet. Generate one to install the desktop skill.
          </div>
        )}
      </div>
    </div>
  );
}
