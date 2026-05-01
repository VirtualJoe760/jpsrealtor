"use client";

import { Loader2, Sun, Moon, SunMoon } from "lucide-react";

interface StepProps {
  formData: any;
  updateField: (path: string, value: any) => void;
  isLight: boolean;
  onSave: (stepFields: Record<string, any>) => Promise<void>;
  isSaving: boolean;
}

const FONT_OPTIONS = [
  "Raleway",
  "Plus Jakarta Sans",
  "DM Sans",
  "Inter",
  "Jost",
];

type ThemeMode = "both" | "light" | "dark";

const THEME_OPTIONS: { id: ThemeMode; label: string; icon: typeof Sun; desc: string }[] = [
  { id: "both", label: "Both", icon: SunMoon, desc: "Visitors can toggle between light & dark" },
  { id: "light", label: "Light Only", icon: Sun, desc: "Site always uses the light theme" },
  { id: "dark", label: "Dark Only", icon: Moon, desc: "Site always uses the dark theme" },
];

export default function BrandingStep({
  formData,
  updateField,
  isLight,
  onSave,
  isSaving,
}: StepProps) {
  const themeMode: ThemeMode = formData.agentProfile?.themeMode || "both";

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
        fontFamily: formData.agentProfile?.fontFamily || "Raleway",
        themeMode,
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
        Customize your font and theme mode.
      </p>

      {/* Font Family */}
      <div className="mb-6">
        <label className={labelClass}>Font Family</label>
        <select
          value={formData.agentProfile?.fontFamily || "Raleway"}
          onChange={(e) =>
            updateField("agentProfile.fontFamily", e.target.value)
          }
          className={inputClass}
        >
          {FONT_OPTIONS.map((font) => (
            <option key={font} value={font}>
              {font}
            </option>
          ))}
        </select>
      </div>

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
