"use client";

import { useState } from "react";

interface FormField {
  id: string;
  label: string;
  type: string;
  required: boolean;
}

export interface LandingPageConfig {
  standalone: boolean;
  heroType: "photo" | "video";
  youtubeUrl: string;
  videoAutoplay: boolean;
  formEnabled: boolean;
  formHeading: string;
  formFields: FormField[];
  formRecipients: string;
  formButtonText: string;
}

export const DEFAULT_LANDING_PAGE_CONFIG: LandingPageConfig = {
  standalone: false,
  heroType: "photo",
  youtubeUrl: "",
  videoAutoplay: true,
  formEnabled: false,
  formHeading: "Get Started",
  formFields: [
    { id: "name", label: "Full Name", type: "text", required: true },
    { id: "email", label: "Email Address", type: "email", required: true },
    { id: "phone", label: "Phone Number", type: "tel", required: false },
  ],
  formRecipients: "",
  formButtonText: "Submit",
};

interface LandingPageOptionsProps {
  config: LandingPageConfig;
  onChange: (config: LandingPageConfig) => void;
  isLight: boolean;
}

export default function LandingPageOptions({
  config,
  onChange,
  isLight,
}: LandingPageOptionsProps) {
  const update = (partial: Partial<LandingPageConfig>) => {
    onChange({ ...config, ...partial });
  };

  return (
    <div
      className={`space-y-4 p-4 rounded-lg border ${
        isLight ? "bg-blue-50 border-blue-200" : "bg-blue-950/20 border-blue-800"
      }`}
    >
      <p
        className={`text-xs font-semibold uppercase tracking-wide ${
          isLight ? "text-blue-700" : "text-blue-400"
        }`}
      >
        Landing Page Options
      </p>

      {/* Standalone checkbox */}
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={config.standalone}
          onChange={(e) => update({ standalone: e.target.checked })}
          className={`mt-0.5 w-5 h-5 rounded border-2 ${
            isLight ? "border-gray-300 accent-blue-600" : "border-gray-600 accent-emerald-500"
          }`}
        />
        <div>
          <span className={`text-sm font-medium ${isLight ? "text-gray-900" : "text-white"}`}>
            Standalone Page
          </span>
          <p className={`text-xs mt-0.5 ${isLight ? "text-gray-500" : "text-gray-400"}`}>
            Removes sidebar, navigation bars, and brand association. Acts as its own
            independent website — ideal for custom domain landing pages.
          </p>
        </div>
      </label>

      {/* Hero Type */}
      <div>
        <label
          className={`block text-sm font-medium mb-2 ${
            isLight ? "text-gray-700" : "text-gray-300"
          }`}
        >
          Hero Type
        </label>
        <div className="flex gap-2">
          {(["photo", "video"] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => update({ heroType: type })}
              className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all border-2 ${
                config.heroType === type
                  ? isLight
                    ? "border-blue-500 bg-blue-100 text-blue-700"
                    : "border-emerald-500 bg-emerald-950/30 text-emerald-400"
                  : isLight
                    ? "border-gray-200 bg-white text-gray-600 hover:border-gray-400"
                    : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-500"
              }`}
            >
              {type === "photo" ? "Photo Hero" : "Video Hero"}
            </button>
          ))}
        </div>
      </div>

      {/* YouTube URL + Autoplay */}
      {config.heroType === "video" && (
        <div>
          <label
            className={`block text-sm font-medium mb-1 ${
              isLight ? "text-gray-700" : "text-gray-300"
            }`}
          >
            YouTube Video URL
          </label>
          <input
            type="text"
            value={config.youtubeUrl}
            onChange={(e) => update({ youtubeUrl: e.target.value })}
            placeholder="https://www.youtube.com/watch?v=..."
            className={`w-full px-4 py-3 rounded-lg focus:outline-none transition-all ${
              isLight
                ? "bg-white border-2 border-slate-300 text-gray-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20"
                : "bg-gray-800 border-2 border-gray-700 text-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20"
            }`}
          />
          <label className="flex items-center gap-2 mt-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.videoAutoplay}
              onChange={(e) => update({ videoAutoplay: e.target.checked })}
              className={`w-4 h-4 rounded ${isLight ? "accent-blue-600" : "accent-emerald-500"}`}
            />
            <span className={`text-xs ${isLight ? "text-gray-700" : "text-gray-300"}`}>
              Autoplay (muted)
            </span>
          </label>
        </div>
      )}

      {/* Form Builder */}
      <div className={`border-t pt-4 ${isLight ? "border-blue-200" : "border-blue-700"}`}>
        <label className="flex items-start gap-3 cursor-pointer mb-4">
          <input
            type="checkbox"
            checked={config.formEnabled}
            onChange={(e) => update({ formEnabled: e.target.checked })}
            className={`mt-0.5 w-5 h-5 rounded border-2 ${
              isLight ? "border-gray-300 accent-blue-600" : "border-gray-600 accent-emerald-500"
            }`}
          />
          <div>
            <span className={`text-sm font-medium ${isLight ? "text-gray-900" : "text-white"}`}>
              Include Lead Capture Form
            </span>
            <p className={`text-xs mt-0.5 ${isLight ? "text-gray-500" : "text-gray-400"}`}>
              Collects user info, creates an account, and emails form data to recipients.
            </p>
          </div>
        </label>

        {config.formEnabled && (
          <div className="space-y-3">
            {/* Form Heading */}
            <div>
              <label
                className={`block text-xs font-medium mb-1 ${
                  isLight ? "text-gray-700" : "text-gray-300"
                }`}
              >
                Form Heading
              </label>
              <input
                type="text"
                value={config.formHeading}
                onChange={(e) => update({ formHeading: e.target.value })}
                className={`w-full px-3 py-2 rounded-lg text-sm ${
                  isLight
                    ? "bg-white border border-gray-300 text-gray-900"
                    : "bg-gray-800 border border-gray-700 text-white"
                }`}
              />
            </div>

            {/* Form Fields */}
            <div>
              <label
                className={`block text-xs font-medium mb-2 ${
                  isLight ? "text-gray-700" : "text-gray-300"
                }`}
              >
                Form Fields
              </label>
              <div className="space-y-2">
                {config.formFields.map((field, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center gap-2 p-2 rounded-lg ${
                      isLight
                        ? "bg-white border border-gray-200"
                        : "bg-gray-800 border border-gray-700"
                    }`}
                  >
                    <input
                      type="text"
                      value={field.label}
                      onChange={(e) => {
                        const updated = [...config.formFields];
                        updated[idx] = { ...updated[idx], label: e.target.value };
                        update({ formFields: updated });
                      }}
                      className={`flex-1 px-2 py-1 text-xs rounded ${
                        isLight ? "bg-gray-50 text-gray-900" : "bg-gray-900 text-white"
                      }`}
                      placeholder="Field label"
                    />
                    <select
                      value={field.type}
                      onChange={(e) => {
                        const updated = [...config.formFields];
                        updated[idx] = { ...updated[idx], type: e.target.value };
                        update({ formFields: updated });
                      }}
                      className={`px-2 py-1 text-xs rounded ${
                        isLight ? "bg-gray-50 text-gray-900" : "bg-gray-900 text-white"
                      }`}
                    >
                      <option value="text">Text</option>
                      <option value="email">Email</option>
                      <option value="tel">Phone</option>
                      <option value="number">Number</option>
                      <option value="textarea">Long Text</option>
                      <option value="select">Dropdown</option>
                      <option value="checkbox">Checkbox</option>
                    </select>
                    <label className="flex items-center gap-1 text-xs">
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={(e) => {
                          const updated = [...config.formFields];
                          updated[idx] = { ...updated[idx], required: e.target.checked };
                          update({ formFields: updated });
                        }}
                        className="w-3 h-3"
                      />
                      <span className={isLight ? "text-gray-600" : "text-gray-400"}>Req</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        update({ formFields: config.formFields.filter((_, i) => i !== idx) });
                      }}
                      className="text-red-500 hover:text-red-700 text-xs px-1"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() =>
                  update({
                    formFields: [
                      ...config.formFields,
                      { id: `field_${Date.now()}`, label: "", type: "text", required: false },
                    ],
                  })
                }
                className={`mt-2 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                  isLight
                    ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                    : "bg-blue-900/30 text-blue-400 hover:bg-blue-900/50"
                }`}
              >
                + Add Field
              </button>
            </div>

            {/* Submit Button Text */}
            <div>
              <label
                className={`block text-xs font-medium mb-1 ${
                  isLight ? "text-gray-700" : "text-gray-300"
                }`}
              >
                Button Text
              </label>
              <input
                type="text"
                value={config.formButtonText}
                onChange={(e) => update({ formButtonText: e.target.value })}
                className={`w-full px-3 py-2 rounded-lg text-sm ${
                  isLight
                    ? "bg-white border border-gray-300 text-gray-900"
                    : "bg-gray-800 border border-gray-700 text-white"
                }`}
              />
            </div>

            {/* Recipients */}
            <div>
              <label
                className={`block text-xs font-medium mb-1 ${
                  isLight ? "text-gray-700" : "text-gray-300"
                }`}
              >
                Form Recipients
              </label>
              <input
                type="text"
                value={config.formRecipients}
                onChange={(e) => update({ formRecipients: e.target.value })}
                placeholder="lender@email.com, partner@email.com"
                className={`w-full px-3 py-2 rounded-lg text-sm ${
                  isLight
                    ? "bg-white border border-gray-300 text-gray-900"
                    : "bg-gray-800 border border-gray-700 text-white"
                }`}
              />
              <p className={`text-xs mt-1 ${isLight ? "text-gray-500" : "text-gray-400"}`}>
                Comma-separated emails. Your agent email is automatically included.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
