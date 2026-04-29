"use client";

import { Loader2, Sun, Moon } from "lucide-react";
import ImageUploadField from "../shared/ImageUploadField";

interface StepProps {
  formData: any;
  updateField: (path: string, value: any) => void;
  isLight: boolean;
  onSave: (stepFields: Record<string, any>) => Promise<void>;
  isSaving: boolean;
}

type ThemeMode = "both" | "light" | "dark";

export default function PhotosMediaStep({
  formData,
  updateField,
  isLight,
  onSave,
  isSaving,
}: StepProps) {
  const themeMode: ThemeMode = formData.agentProfile?.themeMode || "both";
  const showLight = themeMode === "both" || themeMode === "light";
  const showDark = themeMode === "both" || themeMode === "dark";

  const inputClass = `w-full px-4 py-3 rounded-lg border text-sm focus:outline-none focus:ring-2 ${
    isLight
      ? "bg-white border-gray-300 text-gray-900 focus:ring-blue-500"
      : "bg-gray-800 border-gray-700 text-white focus:ring-emerald-500"
  }`;

  const labelClass = `block text-sm font-medium mb-1.5 ${
    isLight ? "text-gray-700" : "text-gray-300"
  }`;

  const cardClass = `rounded-xl border p-4 ${
    isLight ? "bg-gray-50 border-gray-200" : "bg-gray-800/40 border-gray-700"
  }`;

  const handleSave = () => {
    onSave({
      image: formData.image,
      agentProfile: {
        headshot: formData.agentProfile?.headshot,
        heroPhoto: formData.agentProfile?.heroPhoto,
        heroPhotoDark: showDark ? (formData.agentProfile?.heroPhotoDark || null) : null,
        videoIntro: formData.agentProfile?.videoIntro,
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
        Photos &amp; Media
      </h2>
      <p
        className={`text-sm mb-6 ${
          isLight ? "text-gray-500" : "text-gray-400"
        }`}
      >
        Upload your photos and media. Images save immediately on upload.
      </p>

      {/* Profile Photo + Headshot (always single, not theme-dependent) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <ImageUploadField
          label="Profile Photo"
          fieldPath="image"
          folder="jpsrealtor/profile-photos"
          value={formData.image}
          isLight={isLight}
          aspectRatio="aspect-square"
          helpText="Square photo for your avatar and cards"
          onUploaded={(url) => updateField("image", url)}
        />

        <ImageUploadField
          label="Transparent Headshot"
          fieldPath="agentProfile.headshot"
          folder="jpsrealtor/headshots"
          value={formData.agentProfile?.headshot}
          isLight={isLight}
          aspectRatio="aspect-square"
          helpText="PNG with transparent background preferred"
          onUploaded={(url) =>
            updateField("agentProfile.headshot", url)
          }
        />
      </div>

      {/* Hero Banner — theme-aware */}
      <div className="mb-6">
        <h3
          className={`text-sm font-semibold mb-3 ${
            isLight ? "text-gray-800" : "text-gray-200"
          }`}
        >
          Hero Banner
        </h3>

        {showLight && showDark ? (
          // Both modes — side-by-side cards
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={cardClass}>
              <div className="flex items-center gap-1.5 mb-2">
                <Sun size={14} className="text-amber-500" />
                <span className={`text-xs font-medium ${isLight ? "text-gray-600" : "text-gray-400"}`}>
                  Light Mode
                </span>
              </div>
              <ImageUploadField
                label=""
                fieldPath="agentProfile.heroPhoto"
                folder="jpsrealtor/hero"
                value={formData.agentProfile?.heroPhoto}
                isLight={isLight}
                aspectRatio="aspect-video"
                helpText="Hero banner for the light theme"
                onUploaded={(url) =>
                  updateField("agentProfile.heroPhoto", url)
                }
              />
            </div>
            <div className={cardClass}>
              <div className="flex items-center gap-1.5 mb-2">
                <Moon size={14} className={isLight ? "text-gray-700" : "text-gray-300"} />
                <span className={`text-xs font-medium ${isLight ? "text-gray-600" : "text-gray-400"}`}>
                  Dark Mode
                </span>
              </div>
              <ImageUploadField
                label=""
                fieldPath="agentProfile.heroPhotoDark"
                folder="jpsrealtor/hero"
                value={formData.agentProfile?.heroPhotoDark}
                isLight={isLight}
                aspectRatio="aspect-video"
                helpText="Hero banner for the dark theme"
                onUploaded={(url) =>
                  updateField("agentProfile.heroPhotoDark", url)
                }
              />
            </div>
          </div>
        ) : (
          // Single mode
          <ImageUploadField
            label=""
            fieldPath={showLight ? "agentProfile.heroPhoto" : "agentProfile.heroPhotoDark"}
            folder="jpsrealtor/hero"
            value={showLight ? formData.agentProfile?.heroPhoto : formData.agentProfile?.heroPhotoDark}
            isLight={isLight}
            aspectRatio="aspect-video"
            helpText={`Wide landscape image for your homepage hero (${showLight ? "light" : "dark"} theme)`}
            onUploaded={(url) =>
              updateField(
                showLight ? "agentProfile.heroPhoto" : "agentProfile.heroPhotoDark",
                url
              )
            }
          />
        )}
      </div>

      {/* Video Intro URL */}
      <div className="mb-6">
        <label className={labelClass}>Video Intro URL</label>
        <input
          type="text"
          value={formData.agentProfile?.videoIntro || ""}
          onChange={(e) =>
            updateField("agentProfile.videoIntro", e.target.value)
          }
          placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
          className={inputClass}
        />
        <p
          className={`text-xs mt-1 ${
            isLight ? "text-gray-500" : "text-gray-400"
          }`}
        >
          Link to your intro video on YouTube or Vimeo
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
