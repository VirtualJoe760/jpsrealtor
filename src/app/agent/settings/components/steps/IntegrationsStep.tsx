"use client";

// src/app/agent/settings/components/steps/IntegrationsStep.tsx
//
// Two cards:
//   1. Anthropic API key — bring-your-own-key for the in-CMS Claude chat builder
//      (POST /api/integrations/anthropic).
//   2. Website API token — the crt_live_ token a scaffolded site needs in its
//      .env.local (components/steps/TokenCard.tsx, variant "website").
//   3. Connect Claude — the same kind of token, but for the MCP connector
//      (TokenCard variant "claude"), plus the install commands.
//   4. Active tokens — one shared list; a token is a token whichever card
//      minted it.
//
// (2) and (3) used to be a SINGLE minter living inside the "Connect Claude"
// card. An agent looking for the API token their website needed read that
// heading, concluded it was Claude setup, and filed a critical blocker — the
// feature had been there all along. Same credential, two unrelated jobs, so
// now two cards.

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
  Smartphone,
} from "lucide-react";
import { toast } from "react-toastify";
import TokenCard from "./TokenCard";

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
  scopes: string[];
  createdAt: string;
  lastUsedAt: string | null;
};

type Preset = {
  label: string;
  description: string;
  scopes: string[];
};

type PresetId =
  | "website"
  | "content_drafting"
  | "lead_aware"
  | "full_workspace"
  | "client_research"
  | "custom";

// Scopes whose effects are immediate, outward-facing, and not undoable by
// revoking the token afterwards. Checking one of these gets a red row and a
// confirmation. Keep this in sync with the scopes NO preset grants
// (src/lib/skill-scopes.ts) — that exclusion and this warning are the same
// judgement call expressed in two places.
const HIGH_RISK_SCOPES: Record<string, string> = {
  "campaigns:send":
    "campaigns:send lets Claude launch campaigns that cost real money (postcards, voicemails, ads). Consider creating a separate, scoped token just for sending and revoking it when not in use.",
  "social:post":
    "social:post lets Claude publish straight to your connected Instagram Business Account. Posts go live immediately — there is no draft step, and deleting one afterwards does not un-notify your followers. Consider a separate token just for posting.",
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
  const [installTab, setInstallTab] = useState<"claude_remote" | "claude_code" | "claude_desktop" | "skill">("claude_remote");

  // Scope catalog + presets loaded from the API on mount
  const [scopeCatalog, setScopeCatalog] = useState<string[]>([]);
  const [presets, setPresets] = useState<Record<string, Preset>>({});
  // Which preset the user picked for the next-minted token. "website" is the
  // universal default (it exists on every tier — Free only gets this one).
  // When preset=custom, which scopes are checked

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
          if (Array.isArray(data.catalog)) setScopeCatalog(data.catalog);
          if (data.presets && typeof data.presets === "object") {
            // The API tier-filters these (Free → website only). Each
            // TokenCard picks its own default from what it is handed, so no
            // selection has to be reconciled here any more.
            setPresets(data.presets);
          }
        }
      } finally {
        setTokensLoading(false);
      }
    })();
  }, []);

  // Effective scopes for the next-minted token

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

  /** Re-read the token list. Both TokenCards call this after minting. */
  const refreshTokens = async () => {
    try {
      const list = await fetch("/api/integrations/api-tokens");
      if (list.ok) setTokens((await list.json()).tokens || []);
    } catch {
      /* the list is cosmetic; a failed refresh must not eat the new token */
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
      {/* API tokens — one card per JOB, not one card for both              */}
      {/* ============================================================ */}
      <TokenCard
        variant="website"
        presets={presets}
        scopeCatalog={scopeCatalog}
        isLight={isLight}
        onCreated={refreshTokens}
      />
      <TokenCard
        variant="claude"
        presets={presets}
        scopeCatalog={scopeCatalog}
        isLight={isLight}
        onCreated={refreshTokens}
      />

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
            <h3 className={`text-lg font-bold ${textPrimary}`}>Connect Claude (ChatRealty MCP)</h3>
            <p className={`text-sm mt-0.5 ${textMuted}`}>
              Generate an API token, then connect ChatRealty to Claude on your phone,
              the web, or the desktop / CLI apps. Once connected, just say
              <em> &ldquo;search active listings in La Quinta under $800k&rdquo;</em> or
              <em> &ldquo;create a landing page about X&rdquo;</em> in any Claude window.
            </p>
          </div>
        </div>

        {/* The token itself is minted and revealed by the "Connect Claude"
            card above. These install steps are no longer gated behind having
            just minted one — you can read them BEFORE deciding to, which is
            the order people actually want them in. */}

            {/* Install commands — pick a target client */}
            <div className="mt-4">
              <p className={`text-xs font-semibold mb-2 ${isLight ? "text-amber-900" : "text-amber-300"}`}>
                Install in your Claude client
              </p>
              <div className={`inline-flex flex-wrap rounded-md p-0.5 border ${isLight ? "bg-white border-amber-200" : "bg-gray-900 border-amber-900"}`}>
                <button
                  type="button"
                  onClick={() => setInstallTab("claude_remote")}
                  className={`px-2.5 py-1 text-xs font-medium rounded ${
                    installTab === "claude_remote"
                      ? isLight ? "bg-amber-200 text-amber-900" : "bg-amber-800/60 text-amber-200"
                      : textMuted
                  }`}
                >
                  Web &amp; mobile
                </button>
                <button
                  type="button"
                  onClick={() => setInstallTab("claude_code")}
                  className={`px-2.5 py-1 text-xs font-medium rounded ${
                    installTab === "claude_code"
                      ? isLight ? "bg-amber-200 text-amber-900" : "bg-amber-800/60 text-amber-200"
                      : textMuted
                  }`}
                >
                  Claude Code
                </button>
                <button
                  type="button"
                  onClick={() => setInstallTab("claude_desktop")}
                  className={`px-2.5 py-1 text-xs font-medium rounded ${
                    installTab === "claude_desktop"
                      ? isLight ? "bg-amber-200 text-amber-900" : "bg-amber-800/60 text-amber-200"
                      : textMuted
                  }`}
                >
                  Claude Desktop
                </button>
                <button
                  type="button"
                  onClick={() => setInstallTab("skill")}
                  className={`px-2.5 py-1 text-xs font-medium rounded ${
                    installTab === "skill"
                      ? isLight ? "bg-amber-200 text-amber-900" : "bg-amber-800/60 text-amber-200"
                      : textMuted
                  }`}
                >
                  Skill (legacy)
                </button>
              </div>

              {installTab === "claude_remote" && (
                <div className={`mt-2 text-xs ${isLight ? "text-amber-900" : "text-amber-300"} space-y-2`}>
                  <p className="flex items-center gap-1.5 font-semibold">
                    <Smartphone className="w-3.5 h-3.5" /> Easiest — works on iPhone, Android, and claude.ai. Nothing to install.
                  </p>
                  <ol className="list-decimal ml-4 space-y-1">
                    <li>Copy the token above.</li>
                    <li>In the Claude app (or claude.ai): <strong>Settings → Connectors → Add custom connector</strong>.</li>
                    <li>Paste this URL:</li>
                  </ol>
                  <div className="flex gap-2">
                    <code
                      className={`flex-1 px-3 py-2 rounded-md text-xs font-mono break-all ${
                        isLight ? "bg-white border border-amber-200" : "bg-gray-900 border border-amber-900"
                      } ${textPrimary}`}
                    >
                      https://www.chatrealty.io/api/mcp/mcp
                    </code>
                    <button
                      type="button"
                      onClick={() => copyToClipboard("https://www.chatrealty.io/api/mcp/mcp")}
                      className={`px-3 py-2 rounded-md text-xs font-medium flex items-center gap-1.5 ${
                        isLight ? "bg-amber-100 text-amber-900 hover:bg-amber-200" : "bg-amber-900/40 text-amber-200 hover:bg-amber-900/60"
                      }`}
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Copy
                    </button>
                  </div>
                  <p>
                    On the <strong>&ldquo;Connect ChatRealty to Claude&rdquo;</strong> approval screen, paste the
                    token above and approve. Your tools (search_listings, find_comparables, get_market_stats,
                    create_landing_page, …) appear right away.
                  </p>
                  <p className={textMuted}>Use the <code>www.</code> URL exactly as shown — the bare domain redirects and won&apos;t connect.</p>
                </div>
              )}

              {installTab === "claude_code" && (
                <div className={`mt-2 text-xs ${isLight ? "text-amber-900" : "text-amber-300"} space-y-2`}>
                  <p>Two commands. The first adds ChatRealty as an MCP server; the second registers your token in the env.</p>
                  <code
                    className={`block px-3 py-2 rounded-md text-xs font-mono ${
                      isLight ? "bg-white border border-amber-200" : "bg-gray-900 border border-amber-900"
                    } ${textPrimary}`}
                  >
                    claude mcp add chatrealty -- npx -y @chatrealty/mcp-server
                  </code>
                  <code
                    className={`block px-3 py-2 rounded-md text-xs font-mono ${
                      isLight ? "bg-white border border-amber-200" : "bg-gray-900 border border-amber-900"
                    } ${textPrimary}`}
                  >
                    claude mcp add-env chatrealty CHATREALTY_API_TOKEN=crt_live_…
                  </code>
                  <p>Restart Claude Code. The ChatRealty tools (whoami, search_listings, create_landing_page, …) will appear in the tool tray.</p>
                </div>
              )}

              {installTab === "claude_desktop" && (
                <div className={`mt-2 text-xs ${isLight ? "text-amber-900" : "text-amber-300"} space-y-2`}>
                  <p>Settings → Connectors → Add Custom Connector → Local. Paste this JSON:</p>
                  <code
                    className={`block px-3 py-2 rounded-md text-xs font-mono whitespace-pre ${
                      isLight ? "bg-white border border-amber-200" : "bg-gray-900 border border-amber-900"
                    } ${textPrimary}`}
                  >{`{
  "chatrealty": {
    "command": "npx",
    "args": ["-y", "@chatrealty/mcp-server"],
    "env": {
      "CHATREALTY_API_TOKEN": "crt_live_…"
    }
  }
}`}</code>
                  <p>Restart Claude Desktop. Confirm the connector loads with the tool list visible.</p>
                </div>
              )}

              {installTab === "skill" && (
                <div className={`mt-2 text-xs ${isLight ? "text-amber-900" : "text-amber-300"} space-y-2`}>
                  <p>Older landing-page-only skill (markdown + curl). MCP above is recommended; this is here for Claude Code installs that don't yet support MCP servers.</p>
                  <code
                    className={`block px-3 py-2 rounded-md text-xs font-mono ${
                      isLight ? "bg-white border border-amber-200" : "bg-gray-900 border border-amber-900"
                    } ${textPrimary}`}
                  >
                    npx @chatrealty/install-skill crt_live_…
                  </code>
                </div>
              )}
            </div>

        {/* The minter used to live here, inside this "Connect Claude" card —
            which is why an agent looking for their WEBSITE token read the
            heading, decided it wasn't for them, and filed a blocker. Both
            token kinds now have their own card above; this card keeps only
            what is genuinely Claude-specific: how to install it. */}


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
                  className={`flex items-start justify-between gap-3 p-3 rounded-lg border ${
                    isLight ? "bg-gray-50 border-gray-200" : "bg-gray-800/50 border-gray-700"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium ${textPrimary}`}>{t.name}</div>
                    <div className={`text-xs ${textMuted}`}>
                      crt_live_…{t.last4} · created{" "}
                      {new Date(t.createdAt).toLocaleDateString()}
                      {t.lastUsedAt && ` · last used ${new Date(t.lastUsedAt).toLocaleDateString()}`}
                    </div>
                    {/* Scope chips */}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {t.scopes.length === 0 ? (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                            isLight ? "bg-amber-100 text-amber-800" : "bg-amber-900/40 text-amber-300"
                          }`}
                          title="This token was minted before per-token scopes existed. It runs with a safe read-only fallback set on each call. Revoke and re-mint to pick explicit scopes."
                        >
                          legacy
                        </span>
                      ) : (
                        t.scopes.map((s) => {
                          const isSend = s === "campaigns:send";
                          return (
                            <span
                              key={s}
                              className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                                isSend
                                  ? isLight ? "bg-red-100 text-red-700" : "bg-red-950/40 text-red-300"
                                  : isLight ? "bg-gray-200 text-gray-700" : "bg-gray-700 text-gray-300"
                              }`}
                            >
                              {s}
                            </span>
                          );
                        })
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRevokeToken(t.id)}
                    className={`p-2 rounded-md flex-shrink-0 ${
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
            No tokens yet. Create one with a card above.
          </div>
        )}
      </div>
    </div>
  );
}
