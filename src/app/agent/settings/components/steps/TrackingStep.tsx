"use client";

// Visitor tracking / retargeting tag IDs for this agent's site.
//
// These are PUBLIC measurement IDs — they ship in the page HTML by design — so
// they belong in agent settings rather than in env vars. Before this step
// existed the whole platform shared one hardcoded Meta pixel and one GA4
// property, so no agent could build a retargeting audience of their own
// visitors, and the Google Ads tag that YouTube remarketing requires was not
// rendered anywhere at all.

import { Save, Loader2, Facebook, BarChart3, Target, Megaphone } from "lucide-react";

interface StepProps {
  formData: any;
  updateField: (path: string, value: any) => void;
  isLight: boolean;
  onSave: (stepFields: Record<string, any>) => Promise<void>;
  isSaving: boolean;
}

const FIELDS = [
  {
    key: "metaPixelId",
    label: "Meta Pixel ID",
    icon: Facebook,
    placeholder: "1378421466770456",
    pattern: /^\d{8,20}$/,
    hint: "Events Manager → Data Sources. Digits only. Powers Facebook & Instagram retargeting.",
  },
  {
    key: "ga4MeasurementId",
    label: "GA4 Measurement ID",
    icon: BarChart3,
    placeholder: "G-XXXXXXXXXX",
    pattern: /^G-[A-Z0-9]{6,15}$/i,
    hint: "Google Analytics → Admin → Data Streams. Measures traffic; does not by itself build ad audiences.",
  },
  {
    key: "googleAdsId",
    label: "Google Ads Tag ID",
    icon: Target,
    placeholder: "AW-123456789",
    pattern: /^AW-\d{6,15}$/i,
    hint: "Required for YouTube and Display remarketing. Google Ads → Admin → Data manager → Google tag.",
  },
  {
    key: "googleAdsConversionLabel",
    label: "Conversion Label",
    icon: Megaphone,
    placeholder: "AbC-D_efGhIjKlM",
    pattern: /^[A-Za-z0-9_-]{5,40}$/,
    hint: "Optional. The label half of a Google Ads conversion action, used to report leads back to Ads.",
  },
] as const;

export default function TrackingStep({
  formData,
  updateField,
  isLight,
  onSave,
  isSaving,
}: StepProps) {
  const inputClass = `w-full px-4 py-3 rounded-lg border text-sm focus:outline-none focus:ring-2 ${
    isLight
      ? "bg-white border-gray-300 text-gray-900 focus:ring-blue-500"
      : "bg-gray-800 border-gray-700 text-white focus:ring-emerald-500"
  }`;

  const labelClass = `block text-sm font-medium mb-1.5 ${
    isLight ? "text-gray-700" : "text-gray-300"
  }`;

  const tracking = formData.agentProfile?.tracking || {};
  const enabled = tracking.enabled !== false;

  const handleSave = () => {
    onSave({
      agentProfile: {
        tracking: {
          metaPixelId: (tracking.metaPixelId || "").trim(),
          ga4MeasurementId: (tracking.ga4MeasurementId || "").trim(),
          googleAdsId: (tracking.googleAdsId || "").trim(),
          googleAdsConversionLabel: (tracking.googleAdsConversionLabel || "").trim(),
          enabled,
        },
      },
    });
  };

  return (
    <div
      className={`rounded-xl border p-6 ${
        isLight ? "bg-white border-gray-200" : "bg-gray-900 border-gray-800"
      }`}
    >
      <h2
        className={`text-xl font-bold mb-1 ${
          isLight ? "text-gray-900" : "text-white"
        }`}
      >
        Tracking &amp; Retargeting
      </h2>
      <p
        className={`text-sm mb-6 ${
          isLight ? "text-gray-600" : "text-gray-400"
        }`}
      >
        Connect your own ad accounts so visitors to your listings, city pages and
        articles build audiences you can advertise back to. Leave a field blank to
        inherit the platform default.
      </p>

      <label
        className={`flex items-start gap-3 mb-6 p-4 rounded-lg border cursor-pointer ${
          isLight ? "bg-gray-50 border-gray-200" : "bg-gray-800/50 border-gray-700"
        }`}
      >
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => updateField("agentProfile.tracking.enabled", e.target.checked)}
          className="mt-0.5 w-4 h-4"
        />
        <span>
          <span
            className={`block text-sm font-medium ${
              isLight ? "text-gray-900" : "text-white"
            }`}
          >
            Tracking enabled
          </span>
          <span
            className={`block text-xs mt-0.5 ${
              isLight ? "text-gray-600" : "text-gray-400"
            }`}
          >
            Unchecked renders no tags at all — not even the platform defaults.
          </span>
        </span>
      </label>

      <div className={`space-y-5 ${enabled ? "" : "opacity-50 pointer-events-none"}`}>
        {FIELDS.map(({ key, label, icon: Icon, placeholder, pattern, hint }) => {
          const value = tracking[key] || "";
          const invalid = value.trim() !== "" && !pattern.test(value.trim());
          return (
            <div key={key}>
              <label className={labelClass}>
                <span className="flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  {label}
                </span>
              </label>
              <input
                type="text"
                value={value}
                onChange={(e) => updateField(`agentProfile.tracking.${key}`, e.target.value)}
                placeholder={placeholder}
                className={`${inputClass} ${invalid ? "border-red-500 focus:ring-red-500" : ""}`}
              />
              <p
                className={`text-xs mt-1.5 ${
                  invalid
                    ? "text-red-500"
                    : isLight
                      ? "text-gray-500"
                      : "text-gray-500"
                }`}
              >
                {invalid ? `Doesn't look like a valid ${label} — it will be ignored.` : hint}
              </p>
            </div>
          );
        })}
      </div>

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
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save &amp; Continue
        </button>
      </div>
    </div>
  );
}
