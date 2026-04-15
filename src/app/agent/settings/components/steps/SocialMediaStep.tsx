"use client";

import { Save, Loader2, Facebook, Instagram, Linkedin, Youtube, Twitter } from "lucide-react";

interface StepProps {
  formData: any;
  updateField: (path: string, value: any) => void;
  isLight: boolean;
  onSave: (stepFields: Record<string, any>) => Promise<void>;
  isSaving: boolean;
}

const PLATFORMS = [
  { key: "facebook", label: "Facebook", icon: Facebook, placeholder: "https://facebook.com/yourpage" },
  { key: "instagram", label: "Instagram", icon: Instagram, placeholder: "https://instagram.com/yourhandle" },
  { key: "linkedin", label: "LinkedIn", icon: Linkedin, placeholder: "https://linkedin.com/in/yourprofile" },
  { key: "youtube", label: "YouTube", icon: Youtube, placeholder: "https://youtube.com/@yourchannel" },
  { key: "twitter", label: "Twitter / X", icon: Twitter, placeholder: "https://x.com/yourhandle" },
  { key: "tiktok", label: "TikTok", icon: null, placeholder: "https://tiktok.com/@yourhandle" },
] as const;

export default function SocialMediaStep({
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

  const socialMedia = formData.agentProfile?.socialMedia || {};

  const handleSave = () => {
    onSave({
      agentProfile: {
        socialMedia: {
          facebook: socialMedia.facebook || "",
          instagram: socialMedia.instagram || "",
          linkedin: socialMedia.linkedin || "",
          youtube: socialMedia.youtube || "",
          twitter: socialMedia.twitter || "",
          tiktok: socialMedia.tiktok || "",
        },
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
        Social Media
      </h2>
      <p
        className={`text-sm mb-6 ${
          isLight ? "text-gray-500" : "text-gray-400"
        }`}
      >
        Link your social profiles so clients can find and follow you.
      </p>

      <div className="space-y-5">
        {PLATFORMS.map(({ key, label, icon: Icon, placeholder }) => (
          <div key={key}>
            <label className={labelClass}>
              <span className="flex items-center gap-2">
                {Icon ? (
                  <Icon className="w-4 h-4" />
                ) : (
                  <span
                    className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                      isLight ? "bg-gray-200 text-gray-600" : "bg-gray-700 text-gray-300"
                    }`}
                  >
                    TT
                  </span>
                )}
                {label}
              </span>
            </label>
            <input
              type="url"
              value={socialMedia[key] || ""}
              onChange={(e) =>
                updateField(`agentProfile.socialMedia.${key}`, e.target.value)
              }
              placeholder={placeholder}
              className={inputClass}
            />
          </div>
        ))}
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
