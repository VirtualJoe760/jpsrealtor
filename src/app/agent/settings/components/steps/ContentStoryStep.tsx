"use client";

import { Save, Loader2 } from "lucide-react";

interface StepProps {
  formData: any;
  updateField: (path: string, value: any) => void;
  isLight: boolean;
  onSave: (stepFields: Record<string, any>) => Promise<void>;
  isSaving: boolean;
}

export default function ContentStoryStep({
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

  const handleSave = () => {
    onSave({
      profileDescription: formData.profileDescription,
      agentProfile: {
        headline: formData.agentProfile?.headline,
        tagline: formData.agentProfile?.tagline,
        personalStory: formData.agentProfile?.personalStory,
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
        Content &amp; Story
      </h2>
      <p
        className={`text-sm mb-6 ${
          isLight ? "text-gray-500" : "text-gray-400"
        }`}
      >
        Craft your headline, bio, and personal story to connect with clients.
      </p>

      <div className="space-y-5">
        {/* Headline */}
        <div>
          <label className={labelClass}>Headline</label>
          <input
            type="text"
            value={formData.agentProfile?.headline || ""}
            onChange={(e) =>
              updateField("agentProfile.headline", e.target.value)
            }
            placeholder="e.g. Trusted Luxury Real Estate Expert in Los Angeles"
            className={inputClass}
          />
        </div>

        {/* Tagline */}
        <div>
          <label className={labelClass}>Tagline</label>
          <input
            type="text"
            value={formData.agentProfile?.tagline || ""}
            onChange={(e) =>
              updateField("agentProfile.tagline", e.target.value)
            }
            placeholder="e.g. Helping families find their dream home since 2010"
            className={inputClass}
          />
        </div>

        {/* Profile Description / Bio */}
        <div>
          <label className={labelClass}>Agent Bio</label>
          <textarea
            rows={6}
            value={formData.profileDescription || ""}
            onChange={(e) => updateField("profileDescription", e.target.value)}
            placeholder="Tell potential clients about yourself, your experience, and what makes you stand out..."
            className={inputClass}
          />
        </div>

        {/* Personal Story */}
        <div>
          <label className={labelClass}>
            Personal Story{" "}
            <span
              className={`font-normal ${
                isLight ? "text-gray-400" : "text-gray-500"
              }`}
            >
              (optional)
            </span>
          </label>
          <textarea
            rows={8}
            value={formData.agentProfile?.personalStory || ""}
            onChange={(e) =>
              updateField("agentProfile.personalStory", e.target.value)
            }
            placeholder="Share your journey into real estate, what drives you, and why you love what you do..."
            className={inputClass}
          />
        </div>

        {/* Video Intro Note */}
        <p
          className={`text-xs ${
            isLight ? "text-gray-400" : "text-gray-500"
          }`}
        >
          Video intro URL can be set in the Photos &amp; Media step.
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
