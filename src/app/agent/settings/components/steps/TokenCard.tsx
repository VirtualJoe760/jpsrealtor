"use client";

// One card, one job, one button.
//
// Both of this component's uses mint the SAME kind of credential — a
// crt_live_ token — but they are used for two unrelated things, and the old
// UI hid that. A single minter lived under the heading "Connect Claude
// (ChatRealty MCP)", so an agent hunting for the API token their WEBSITE needs
// read "Connect Claude", concluded it wasn't for them, and gave up. A tester
// filed it as a critical blocker; the feature had been there the whole time.
//
// So: two cards. `website` mints the token that goes in a site's .env.local;
// `claude` mints the one the MCP connector wraps. Each carries only the
// choices its own job needs.
//
// EASIER MEANS FEWER DECISIONS. The old card asked for a name (required, free
// text), a preset from a six-card grid, and optionally a hand-picked scope set
// — before you could press anything. Here the name is pre-filled, the website
// card has no preset choice at all (there is only one right answer), and
// scopes hide behind "Advanced". The common path is: press the button, copy
// the line it gives you.

import { useState } from "react";
import { Loader2, Copy, Check, Globe, Terminal, ChevronDown } from "lucide-react";
import { toast } from "react-toastify";

export type Preset = { label: string; description: string; scopes: string[] };

export interface TokenCardProps {
  variant: "website" | "claude";
  presets: Record<string, Preset>;
  scopeCatalog: string[];
  isLight: boolean;
  /** Refresh the shared token list after a successful mint. */
  onCreated: () => void;
}

/** Presets each card is allowed to offer. The website card has exactly one. */
const ALLOWED: Record<TokenCardProps["variant"], string[]> = {
  website: ["website"],
  claude: ["content_drafting", "lead_aware", "full_workspace", "client_research"],
};

const COPY = {
  website: {
    icon: Globe,
    title: "Website API token",
    blurb:
      "Powers a site built with create-chatrealty-site: CHAP search, listings and market data, your blog, and lead capture into your CRM.",
    defaultName: "My website",
    button: "Create website token",
  },
  claude: {
    icon: Terminal,
    title: "Connect Claude",
    blurb:
      "Lets Claude work on your behalf — on your phone, the web, or Claude Code. You will paste this once when connecting; after that Claude remembers it.",
    defaultName: "Claude",
    button: "Create Claude token",
  },
} as const;

export default function TokenCard({
  variant,
  presets,
  scopeCatalog,
  isLight,
  onCreated,
}: TokenCardProps) {
  const copy = COPY[variant];
  const Icon = copy.icon;

  const allowed = ALLOWED[variant].filter((id) => presets[id]);
  const [name, setName] = useState<string>(copy.defaultName);
  const [preset, setPreset] = useState<string>(allowed[0] || "website");
  const [advanced, setAdvanced] = useState(false);
  const [custom, setCustom] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [revealed, setRevealed] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const card = `rounded-xl border p-6 ${
    isLight ? "bg-white border-gray-200" : "bg-gray-900/60 border-gray-800"
  }`;
  const textPrimary = isLight ? "text-gray-900" : "text-white";
  const textMuted = isLight ? "text-gray-500" : "text-gray-400";

  const scopes = advanced && custom.size ? [...custom] : presets[preset]?.scopes || [];

  async function create() {
    if (!scopes.length) {
      toast.error("Pick at least one permission");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/integrations/api-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() || copy.defaultName, scopes }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        setRevealed(data.token);
        onCreated();
      } else {
        toast.error(data.error || "Couldn't create that token");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setBusy(false);
    }
  }

  // What to actually DO with the token, which is the part people were missing.
  const snippet =
    variant === "website"
      ? `CHATREALTY_API_TOKEN=${revealed}`
      : revealed || "";

  function copyIt() {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    toast.success("Copied");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className={card}>
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-lg ${isLight ? "bg-blue-50" : "bg-blue-950/30"}`}>
          <Icon className={`w-6 h-6 ${isLight ? "text-blue-600" : "text-blue-400"}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`text-lg font-bold ${textPrimary}`}>{copy.title}</h3>
          <p className={`text-sm mt-0.5 ${textMuted}`}>{copy.blurb}</p>
        </div>
      </div>

      {/* The token, shown ONCE. Paired with the exact line to paste, because a
          bare secret still leaves you wondering where it goes. */}
      {revealed ? (
        <div
          className={`mt-5 rounded-lg border p-4 ${
            isLight ? "bg-emerald-50 border-emerald-200" : "bg-emerald-950/20 border-emerald-800"
          }`}
        >
          <p className={`text-sm font-semibold ${textPrimary}`}>
            Copy this now — it is only shown once.
          </p>
          {variant === "website" && (
            <p className={`text-xs mt-1 ${textMuted}`}>
              Paste it into your site&rsquo;s <code>.env.local</code>:
            </p>
          )}
          <div className="mt-2 flex items-center gap-2">
            <code
              className={`flex-1 min-w-0 truncate rounded-md px-3 py-2 font-mono text-xs ${
                isLight ? "bg-white border border-emerald-200" : "bg-black/40 border border-emerald-900"
              } ${textPrimary}`}
            >
              {snippet}
            </code>
            <button
              onClick={copyIt}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <button
            onClick={() => setRevealed(null)}
            className={`mt-3 text-xs underline ${textMuted}`}
          >
            Done — hide it
          </button>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            aria-label="Token name"
            className={`w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 ${
              isLight
                ? "bg-white border-gray-300 text-gray-900 focus:ring-blue-500"
                : "bg-gray-800 border-gray-700 text-white focus:ring-emerald-500"
            }`}
          />

          {/* The Claude card genuinely has a choice to make; the website card
              does not, so it isn't asked. */}
          {variant === "claude" && allowed.length > 1 && (
            <div className="grid gap-2 sm:grid-cols-2">
              {allowed.map((id) => {
                const p = presets[id];
                const on = preset === id && !(advanced && custom.size);
                return (
                  <button
                    key={id}
                    onClick={() => {
                      setPreset(id);
                      setCustom(new Set());
                    }}
                    className={`rounded-lg border p-3 text-left transition ${
                      on
                        ? "border-blue-500 ring-1 ring-blue-500"
                        : isLight
                        ? "border-gray-200 hover:border-gray-300"
                        : "border-gray-700 hover:border-gray-600"
                    }`}
                  >
                    <div className={`text-sm font-semibold ${textPrimary}`}>{p.label}</div>
                    <div className={`mt-0.5 text-xs ${textMuted}`}>{p.description}</div>
                  </button>
                );
              })}
            </div>
          )}

          <button
            onClick={create}
            disabled={busy}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {busy ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Creating…
              </span>
            ) : (
              copy.button
            )}
          </button>

          <button
            onClick={() => setAdvanced((a) => !a)}
            className={`inline-flex items-center gap-1 text-xs ${textMuted}`}
          >
            <ChevronDown className={`w-3.5 h-3.5 transition ${advanced ? "rotate-180" : ""}`} />
            Advanced — choose exact permissions
          </button>

          {advanced && (
            <div
              className={`rounded-lg border p-3 ${
                isLight ? "border-gray-200 bg-gray-50" : "border-gray-700 bg-gray-800/40"
              }`}
            >
              <p className={`mb-2 text-xs ${textMuted}`}>
                Leave everything unchecked to use the preset above
                {presets[preset] ? ` (${presets[preset].scopes.length} permissions)` : ""}.
              </p>
              <div className="grid gap-1 sm:grid-cols-2">
                {scopeCatalog.map((s) => (
                  <label key={s} className={`flex items-center gap-2 text-xs ${textPrimary}`}>
                    <input
                      type="checkbox"
                      checked={custom.has(s)}
                      onChange={(e) => {
                        const next = new Set(custom);
                        e.target.checked ? next.add(s) : next.delete(s);
                        setCustom(next);
                      }}
                    />
                    <span className="font-mono">{s}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
