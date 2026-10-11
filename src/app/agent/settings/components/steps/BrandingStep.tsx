"use client";

import LogoUploadField from "../LogoUploadField";
import Wordmark from "@/app/components/brand/Wordmark";

import { Loader2, Sun, Moon, SunMoon, PanelLeft, PanelTop, Columns2, Image as ImageIcon, Film, Images, LayoutTemplate, CircleUserRound } from "lucide-react";

interface StepProps {
  formData: any;
  updateField: (path: string, value: any) => void;
  isLight: boolean;
  onSave: (stepFields: Record<string, any>) => Promise<void>;
  isSaving: boolean;
}

type ThemeMode = "both" | "light" | "dark";

const THEME_OPTIONS: { id: ThemeMode; label: string; icon: typeof Sun; desc: string }[] = [
  { id: "both", label: "Both", icon: SunMoon, desc: "Visitors can toggle between light & dark" },
  { id: "light", label: "Light Only", icon: Sun, desc: "Site always uses the light theme" },
  { id: "dark", label: "Dark Only", icon: Moon, desc: "Site always uses the dark theme" },
];

type NavLayout = "sidebar" | "navbar";

const NAV_OPTIONS: { id: NavLayout; label: string; icon: typeof PanelLeft; desc: string }[] = [
  { id: "sidebar", label: "Sidebar", icon: PanelLeft, desc: "Vertical navigation on the left (default)" },
  { id: "navbar", label: "Top Navbar", icon: PanelTop, desc: "Horizontal navigation bar across the top" },
];


// Share-card background presets (public/ assets + the agent's own photos).
const OG_BG_PRESETS: { id: string; label: string; value: string | null }[] = [
  { id: "none", label: "Soft neutral (no photo)", value: null },
  { id: "mcm", label: "Mid-century home", value: "/about-morph/03-mcmhouse.jpg" },
  { id: "golf", label: "Golf course", value: "/about-morph/04-golf.jpg" },
  { id: "clubhouse", label: "Clubhouse", value: "/about-morph/02-clubhouse.jpg" },
];

type HeroStyle = "split" | "fullwidth" | "video" | "carousel" | "minimal" | "spotlight";

const HERO_OPTIONS: { id: HeroStyle; label: string; icon: typeof Columns2; desc: string }[] = [
  { id: "split", label: "Split Classic", icon: Columns2, desc: "Headline + CTAs with your headshot — the default" },
  { id: "fullwidth", label: "Full-Width Image", icon: ImageIcon, desc: "Full-bleed hero photo, centered headline" },
  { id: "video", label: "Video", icon: Film, desc: "Looping background video (uses your intro video)" },
  { id: "carousel", label: "Carousel", icon: Images, desc: "Rotating gallery photos as the background" },
  { id: "minimal", label: "Minimal Card", icon: LayoutTemplate, desc: "Clean brand panel with stats — no big photo" },
  { id: "spotlight", label: "Spotlight", icon: CircleUserRound, desc: "Centered headshot, very personal" },
];

export default function BrandingStep({
  formData,
  updateField,
  isLight,
  onSave,
  isSaving,
}: StepProps) {
  const themeMode: ThemeMode = formData.agentProfile?.themeMode || "both";
  const navLayout: NavLayout = formData.agentProfile?.navLayout === "navbar" ? "navbar" : "sidebar";
  const heroStyle: HeroStyle = (HERO_OPTIONS.find((h) => h.id === formData.agentProfile?.heroStyle)?.id) || "split";
  // The nav mark lives in navLogo, NOT teamLogo — it is the agent's own site
  // brand and must survive leaving a team. teamLogo is read only as a fallback
  // so an agent who set this before 2026-10-11 still sees their current choice.
  const navLogo: string | null =
    formData.agentProfile?.navLogo || formData.agentProfile?.teamLogo || null;
  const navLogoDark: string | null =
    formData.agentProfile?.navLogoDark || formData.agentProfile?.teamLogoDark || null;

  const ogBackgroundImage: string | null = formData.agentProfile?.ogBackgroundImage || null;


  const inputClass = `w-full px-4 py-3 rounded-lg border text-sm focus:outline-none focus:ring-2 ${
    isLight
      ? "bg-white border-gray-300 text-gray-900 focus:ring-blue-500"
      : "bg-gray-800 border-gray-700 text-white focus:ring-emerald-500"
  }`;

  const labelClass = `block text-sm font-medium mb-1.5 ${
    isLight ? "text-gray-700" : "text-gray-300"
  }`;

  const handleSave = () => {
    onSave({
      agentProfile: {
        themeMode,
        navLayout,
        heroStyle,
        navLogo,
        navLogoDark,
        // Must be listed: this payload is a whitelist, so a field edited in the
        // form but missing here is silently discarded on Save.
        navWordmark: formData.agentProfile?.navWordmark,
        brandMark: formData.agentProfile?.brandMark,
        ogBackgroundImage,
      },
    });
  };

  return (
    <div
      className={`rounded-xl border p-6 ${
        isLight
          ? "bg-white border-gray-200"
          : "bg-gray-900/60 border-gray-800"
      }`}
    >
      <h2
        className={`text-xl font-bold mb-1 ${
          isLight ? "text-gray-900" : "text-white"
        }`}
      >
        Branding
      </h2>
      <p
        className={`text-sm mb-6 ${
          isLight ? "text-gray-500" : "text-gray-400"
        }`}
      >
        Choose how your site handles light and dark mode.
      </p>

      {/* Theme Mode Toggle */}
      <div className="mb-6">
        <label className={labelClass}>Theme Mode</label>
        <div className="grid grid-cols-3 gap-2">
          {THEME_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isActive = themeMode === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => updateField("agentProfile.themeMode", opt.id)}
                className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all text-center ${
                  isActive
                    ? isLight
                      ? "border-blue-500 bg-blue-50"
                      : "border-emerald-500 bg-emerald-900/20"
                    : isLight
                    ? "border-gray-200 bg-gray-50 hover:border-gray-300"
                    : "border-gray-700 bg-gray-800/40 hover:border-gray-600"
                }`}
              >
                <Icon
                  size={20}
                  className={
                    isActive
                      ? isLight
                        ? "text-blue-600"
                        : "text-emerald-400"
                      : isLight
                      ? "text-gray-500"
                      : "text-gray-400"
                  }
                />
                <span
                  className={`text-sm font-semibold ${
                    isActive
                      ? isLight
                        ? "text-blue-700"
                        : "text-emerald-300"
                      : isLight
                      ? "text-gray-700"
                      : "text-gray-300"
                  }`}
                >
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>
        <p
          className={`text-xs mt-2 ${
            isLight ? "text-gray-500" : "text-gray-400"
          }`}
        >
          {THEME_OPTIONS.find((o) => o.id === themeMode)?.desc}
        </p>
      </div>

      {/* Navigation Layout (desktop/tablet) */}
      <div className="mb-6">
        <label className={labelClass}>Navigation Layout</label>
        <div className="grid grid-cols-2 gap-2">
          {NAV_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isActive = navLayout === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => updateField("agentProfile.navLayout", opt.id)}
                className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all text-center ${
                  isActive
                    ? isLight
                      ? "border-blue-500 bg-blue-50"
                      : "border-emerald-500 bg-emerald-900/20"
                    : isLight
                    ? "border-gray-200 bg-gray-50 hover:border-gray-300"
                    : "border-gray-700 bg-gray-800/40 hover:border-gray-600"
                }`}
              >
                <Icon
                  size={20}
                  className={
                    isActive
                      ? isLight
                        ? "text-blue-600"
                        : "text-emerald-400"
                      : isLight
                      ? "text-gray-500"
                      : "text-gray-400"
                  }
                />
                <span
                  className={`text-sm font-semibold ${
                    isActive
                      ? isLight
                        ? "text-blue-700"
                        : "text-emerald-300"
                      : isLight
                      ? "text-gray-700"
                      : "text-gray-300"
                  }`}
                >
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>
        <p className={`text-xs mt-2 ${isLight ? "text-gray-500" : "text-gray-400"}`}>
          {NAV_OPTIONS.find((o) => o.id === navLayout)?.desc} · Mobile always uses the bottom nav bar.
        </p>
      </div>

      {/* Nav Wordmark — the text alternative to an uploaded logo. */}
      <div className="mb-6">
        <label className={labelClass}>Nav Wordmark</label>
        <p className={`text-xs mb-2 ${isLight ? "text-gray-500" : "text-gray-400"}`}>
          Set your name as type instead of an image — first half light, second half bold, e.g.
          {" "}<span className="font-semibold">JPS</span> + <span className="font-semibold">REALTOR</span>.
          Stays sharp at any size and follows the theme, so it needs no light/dark pair.
          If set, this is used instead of the uploaded logo below.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className={`text-xs mb-1.5 ${isLight ? "text-gray-500" : "text-gray-400"}`}>Light half</p>
            <input
              type="text"
              value={formData.agentProfile?.navWordmark?.thin || ""}
              onChange={(e) => updateField("agentProfile.navWordmark.thin", e.target.value)}
              placeholder="JPS"
              className={inputClass}
            />
          </div>
          <div>
            <p className={`text-xs mb-1.5 ${isLight ? "text-gray-500" : "text-gray-400"}`}>Bold half</p>
            <input
              type="text"
              value={formData.agentProfile?.navWordmark?.bold || ""}
              onChange={(e) => updateField("agentProfile.navWordmark.bold", e.target.value)}
              placeholder="REALTOR"
              className={inputClass}
            />
          </div>
        </div>
        {(formData.agentProfile?.navWordmark?.thin || formData.agentProfile?.navWordmark?.bold) && (
          <div className={`mt-3 rounded-lg px-4 py-3 ${isLight ? "bg-white border border-gray-200" : "bg-neutral-900 border border-gray-700"}`}>
            <p className={`text-[10px] uppercase tracking-wider mb-1.5 ${isLight ? "text-gray-400" : "text-gray-500"}`}>Preview</p>
            <Wordmark
              className={`text-[21px] ${isLight ? "text-gray-900" : "text-neutral-50"}`}
              thin={formData.agentProfile?.navWordmark?.thin || ""}
              bold={formData.agentProfile?.navWordmark?.bold || ""}
            />
          </div>
        )}
      </div>

      {/* Brand Mark — the standalone badge in hero corners and on the chat page. */}
      <div className="mb-6">
        <label className={labelClass}>Brand Mark</label>
        <p className={`text-xs mb-2 ${isLight ? "text-gray-500" : "text-gray-400"}`}>
          The badge in your banner corner and on your chat page — e.g. a short monogram like
          {" "}<span className="font-semibold">JPS</span>. Leave both empty to show your brokerage
          logo there instead, or nothing if you have not set one.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className={`text-xs mb-1.5 ${isLight ? "text-gray-500" : "text-gray-400"}`}>Light half</p>
            <input
              type="text"
              value={formData.agentProfile?.brandMark?.thin || ""}
              onChange={(e) => updateField("agentProfile.brandMark.thin", e.target.value)}
              placeholder="JPS"
              className={inputClass}
            />
          </div>
          <div>
            <p className={`text-xs mb-1.5 ${isLight ? "text-gray-500" : "text-gray-400"}`}>Bold half (optional)</p>
            <input
              type="text"
              value={formData.agentProfile?.brandMark?.bold || ""}
              onChange={(e) => updateField("agentProfile.brandMark.bold", e.target.value)}
              placeholder=""
              className={inputClass}
            />
          </div>
        </div>
        {(formData.agentProfile?.brandMark?.thin || formData.agentProfile?.brandMark?.bold) && (
          <div className="mt-3 grid grid-cols-2 gap-3">
            {[
              { bg: "#111827", fg: "text-white", caption: "On a dark banner" },
              { bg: "#ffffff", fg: "text-gray-900", caption: "On a light banner" },
            ].map((p) => (
              <div key={p.caption}>
                <p className={`text-[10px] uppercase tracking-wider mb-1.5 ${isLight ? "text-gray-400" : "text-gray-500"}`}>
                  {p.caption}
                </p>
                <div
                  className="flex h-20 items-center justify-center rounded-lg border border-gray-700/40"
                  style={{ background: p.bg }}
                >
                  <Wordmark
                    className={`text-[30px] ${p.fg}`}
                    thin={formData.agentProfile?.brandMark?.thin || ""}
                    bold={formData.agentProfile?.brandMark?.bold || ""}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Navigation Bar Logo — uploaded by the agent, not chosen from a list.
          The preset grid that was here hardcoded specific agencies into shared
          platform code, so every tenant was offered one agent's brokerages and
          none could supply their own. See docs/ARCHITECTURE.md invariants. */}
      <div className="mb-6">
        <LogoUploadField
          label="Navigation Bar Logo"
          hint="Shown top-left on your site and on your share cards. Leave both empty to fall back to the ChatRealty wordmark. A PNG with a transparent background works best."
          lightValue={navLogo}
          darkValue={navLogoDark}
          isLight={isLight}
          onChange={(variant, url) =>
            updateField(variant === "light" ? "agentProfile.navLogo" : "agentProfile.navLogoDark", url)
          }
        />
      </div>

      {/* Share-card background */}
      <div className="mb-6">
        <label className={labelClass}>Share-Card Background</label>
        <p className={`text-xs mb-2 ${isLight ? "text-gray-500" : "text-gray-400"}`}>
          The photo behind your link-preview card (Facebook, iMessage, LinkedIn). A light overlay keeps your name readable.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {OG_BG_PRESETS.map((preset) => {
            const isActive = ogBackgroundImage === preset.value;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => updateField("agentProfile.ogBackgroundImage", preset.value)}
                className={`flex flex-col items-center gap-2 p-2 rounded-lg border-2 transition-all text-center ${
                  isActive
                    ? isLight
                      ? "border-blue-500 bg-blue-50"
                      : "border-emerald-500 bg-emerald-900/20"
                    : isLight
                    ? "border-gray-200 bg-gray-50 hover:border-gray-300"
                    : "border-gray-700 bg-gray-800/40 hover:border-gray-600"
                }`}
              >
                {preset.value ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={preset.value} alt="" className="h-14 w-full rounded object-cover" />
                ) : (
                  <span className="flex h-14 w-full items-center justify-center rounded" style={{ backgroundColor: "#f5f4f2" }}>
                    <span className="text-[10px] uppercase tracking-widest text-gray-400">neutral</span>
                  </span>
                )}
                <span
                  className={`text-xs font-semibold ${
                    isActive
                      ? isLight ? "text-blue-700" : "text-emerald-300"
                      : isLight ? "text-gray-700" : "text-gray-300"
                  }`}
                >
                  {preset.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Hero Style */}
      <div className="mb-6">
        <label className={labelClass}>Homepage Hero Style</label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {HERO_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isActive = heroStyle === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => updateField("agentProfile.heroStyle", opt.id)}
                className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all text-center ${
                  isActive
                    ? isLight
                      ? "border-blue-500 bg-blue-50"
                      : "border-emerald-500 bg-emerald-900/20"
                    : isLight
                    ? "border-gray-200 bg-gray-50 hover:border-gray-300"
                    : "border-gray-700 bg-gray-800/40 hover:border-gray-600"
                }`}
              >
                <Icon
                  size={20}
                  className={
                    isActive
                      ? isLight ? "text-blue-600" : "text-emerald-400"
                      : isLight ? "text-gray-500" : "text-gray-400"
                  }
                />
                <span className={`text-xs font-semibold ${
                  isActive
                    ? isLight ? "text-blue-700" : "text-emerald-300"
                    : isLight ? "text-gray-700" : "text-gray-300"
                }`}>
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>
        <p className={`text-xs mt-2 ${isLight ? "text-gray-500" : "text-gray-400"}`}>
          {HERO_OPTIONS.find((o) => o.id === heroStyle)?.desc}
        </p>
      </div>

      {/* Save & Continue */}
      <div className="mt-8 flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold text-white transition-colors disabled:opacity-50 ${
            isLight
              ? "bg-blue-600 hover:bg-blue-700"
              : "bg-emerald-600 hover:bg-emerald-700"
          }`}
        >
          {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
          Save &amp; Continue
        </button>
      </div>
    </div>
  );
}
