"use client";

import { useState } from "react";
import { Save, Loader2 } from "lucide-react";

interface StepProps {
  formData: any;
  updateField: (path: string, value: any) => void;
  isLight: boolean;
  onSave: (stepFields: Record<string, any>) => Promise<void>;
  isSaving: boolean;
}

export default function DomainSeoStep({
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

  const ap = formData.agentProfile || {};
  const metaDescription = ap.metaDescription || "";
  const metaKeywords: string[] = ap.metaKeywords || [];

  // Local state for the keywords text input
  const [keywordsText, setKeywordsText] = useState<string>(
    metaKeywords.join(", ")
  );

  const handleKeywordsChange = (value: string) => {
    setKeywordsText(value);
    const arr = value
      .split(",")
      .map((s: string) => s.trim())
      .filter(Boolean);
    updateField("agentProfile.metaKeywords", arr);
  };

  const handleSave = () => {
    onSave({
      agentProfile: {
        subdomain: ap.subdomain,
        customDomain: ap.customDomain,
        metaTitle: ap.metaTitle,
        metaDescription: ap.metaDescription,
        metaKeywords: ap.metaKeywords || [],
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
        Domain &amp; SEO
      </h2>
      <p
        className={`text-sm mb-6 ${
          isLight ? "text-gray-500" : "text-gray-400"
        }`}
      >
        Configure your subdomain, custom domain, and search engine metadata.
      </p>

      <div className="space-y-5">
        {/* Subdomain */}
        <div>
          <label className={labelClass}>Subdomain</label>
          <div className="flex items-center gap-0">
            <input
              type="text"
              value={ap.subdomain || ""}
              onChange={(e) =>
                updateField("agentProfile.subdomain", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
              }
              placeholder="yourname"
              className={`flex-1 px-4 py-3 rounded-l-lg border-y border-l text-sm focus:outline-none focus:ring-2 ${
                isLight
                  ? "bg-white border-gray-300 text-gray-900 focus:ring-blue-500"
                  : "bg-gray-800 border-gray-700 text-white focus:ring-emerald-500"
              }`}
            />
            <span
              className={`px-4 py-3 rounded-r-lg border text-sm font-medium ${
                isLight
                  ? "bg-gray-100 border-gray-300 text-gray-500"
                  : "bg-gray-700 border-gray-700 text-gray-400"
              }`}
            >
              .jpsrealtor.com
            </span>
          </div>
        </div>

        {/* Custom Domain */}
        <div>
          <label className={labelClass}>Custom Domain</label>
          <input
            type="text"
            value={ap.customDomain || ""}
            onChange={(e) =>
              updateField("agentProfile.customDomain", e.target.value)
            }
            placeholder="www.yourdomain.com"
            className={inputClass}
          />
          <p
            className={`text-xs mt-1 ${
              isLight ? "text-gray-400" : "text-gray-500"
            }`}
          >
            Point your domain&apos;s CNAME to your subdomain above.
          </p>
        </div>

        {/* Meta Title */}
        <div>
          <label className={labelClass}>
            Meta Title{" "}
            <span
              className={`font-normal ${
                isLight ? "text-gray-400" : "text-gray-500"
              }`}
            >
              (max 60 characters)
            </span>
          </label>
          <input
            type="text"
            maxLength={60}
            value={ap.metaTitle || ""}
            onChange={(e) =>
              updateField("agentProfile.metaTitle", e.target.value)
            }
            placeholder="Your Name | Real Estate Agent in City, State"
            className={inputClass}
          />
          <p
            className={`text-xs mt-1 text-right ${
              isLight ? "text-gray-400" : "text-gray-500"
            }`}
          >
            {(ap.metaTitle || "").length}/60
          </p>
        </div>

        {/* Meta Description */}
        <div>
          <label className={labelClass}>
            Meta Description{" "}
            <span
              className={`font-normal ${
                isLight ? "text-gray-400" : "text-gray-500"
              }`}
            >
              (max 160 characters)
            </span>
          </label>
          <textarea
            rows={3}
            maxLength={160}
            value={metaDescription}
            onChange={(e) =>
              updateField("agentProfile.metaDescription", e.target.value)
            }
            placeholder="A concise summary of your real estate services for search engines..."
            className={inputClass}
          />
          <p
            className={`text-xs mt-1 text-right ${
              metaDescription.length > 150
                ? "text-amber-500"
                : isLight
                ? "text-gray-400"
                : "text-gray-500"
            }`}
          >
            {metaDescription.length}/160
          </p>
        </div>

        {/* Meta Keywords */}
        <div>
          <label className={labelClass}>
            Meta Keywords{" "}
            <span
              className={`font-normal ${
                isLight ? "text-gray-400" : "text-gray-500"
              }`}
            >
              (comma-separated)
            </span>
          </label>
          <input
            type="text"
            value={keywordsText}
            onChange={(e) => handleKeywordsChange(e.target.value)}
            placeholder="real estate, homes for sale, luxury properties, city name"
            className={inputClass}
          />
        </div>
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
