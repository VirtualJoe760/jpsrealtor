"use client";

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

// Navbar logo presets bundled with the platform (public/images/brand/).
// Each needs BOTH variants: `light` renders on light backgrounds (dark
// artwork), `dark` renders on dark backgrounds (white artwork). "Default"
// clears the fields → the site falls back to the ChatRealty text wordmark.
const NAV_LOGO_PRESETS: {
  id: string;
  label: string;
  light: string | null;
  dark: string | null;
}[] = [
  { id: "wordmark", label: "ChatRealty wordmark (default)", light: null, dark: null },
  {
    id: "obsidian",
    label: "Obsidian Group | eXp",
    light: "/images/brand/obsidian-logo-black.png",
    dark: "/images/brand/logo-white-obsidian.png",
  },
  {
    id: "exp",
    label: "eXp Realty",
    light: "/images/brand/exp-Realty-Logo-black.png",
    dark: "/images/brand/EXP-white-square.png",
  },
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
  const teamLogo: string | null = formData.agentProfile?.teamLogo || null;
  const teamLogoDark: string | null = formData.agentProfile?.teamLogoDark || null;

  const ogBackgroundImage: string | null = formData.agentProfile?.ogBackgroundImage || null;

  const applyLogoPreset = (preset: (typeof NAV_LOGO_PRESETS)[number]) => {
    updateField("agentProfile.teamLogo", preset.light);
    updateField("agentProfile.teamLogoDark", preset.dark);
  };

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
        teamLogo,
        teamLogoDark,
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

      {/* Navigation Bar Logo */}
      <div className="mb-6">
        <label className={labelClass}>Navigation Bar Logo</label>
        <p className={`text-xs mb-2 ${isLight ? "text-gray-500" : "text-gray-400"}`}>
          Shown top-left on your site and on your share cards. Needs a light-mode and a dark-mode version.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {NAV_LOGO_PRESETS.map((preset) => {
            const isActive = teamLogo === preset.light && teamLogoDark === preset.dark;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyLogoPreset(preset)}
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
                {preset.light ? (
                  <span className="flex w-full items-center justify-center rounded bg-white px-2 py-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={preset.light} alt="" className="h-7 w-auto max-w-full object-contain" />
                  </span>
                ) : (
                  <span
                    className={`flex w-full items-center justify-center rounded px-2 py-2 text-sm uppercase tracking-[0.3em] ${
                      isLight ? "bg-white text-gray-900" : "bg-neutral-900 text-neutral-100"
                    }`}
                  >
                    <span className="font-extralight">Chat</span>
                    <span className="font-medium">Realty</span>
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
