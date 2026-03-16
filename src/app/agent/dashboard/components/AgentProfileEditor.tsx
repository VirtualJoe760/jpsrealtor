"use client";

import { useState } from "react";
import { toast } from "react-toastify";
import { uploadToCloudinary } from "@/app/utils/cloudinaryUpload";
import {
  Building2,
  Globe,
  Camera,
  Instagram,
  Linkedin,
  Twitter,
  Facebook,
  Youtube,
  Loader2,
  Palette,
  Monitor,
  Smartphone,
  Sun,
  Moon,
} from "lucide-react";

interface AgentProfileEditorProps {
  agentProfile: any;
  isLight: boolean;
  onSave: (profile: any) => Promise<void>;
}

export default function AgentProfileEditor({
  agentProfile = {},
  isLight,
  onSave,
}: AgentProfileEditorProps) {
  const [profile, setProfile] = useState({
    headline: agentProfile?.headline || "",
    tagline: agentProfile?.tagline || "",
    headshot: agentProfile?.headshot || "",
    heroPhoto: agentProfile?.heroPhoto || "",
    socialMedia: {
      facebook: agentProfile?.socialMedia?.facebook || "",
      instagram: agentProfile?.socialMedia?.instagram || "",
      linkedin: agentProfile?.socialMedia?.linkedin || "",
      twitter: agentProfile?.socialMedia?.twitter || "",
      youtube: agentProfile?.socialMedia?.youtube || "",
      tiktok: agentProfile?.socialMedia?.tiktok || "",
    },
    customBackgrounds: {
      lightDesktop: agentProfile?.customBackgrounds?.lightDesktop || "",
      lightMobile: agentProfile?.customBackgrounds?.lightMobile || "",
      darkDesktop: agentProfile?.customBackgrounds?.darkDesktop || "",
      darkMobile: agentProfile?.customBackgrounds?.darkMobile || "",
    },
    brandColors: {
      primary: agentProfile?.brandColors?.primary || "#3b82f6",
      secondary: agentProfile?.brandColors?.secondary || "#8b5cf6",
      accent: agentProfile?.brandColors?.accent || "#10b981",
    },
    subdomain: agentProfile?.subdomain || "",
    customDomain: agentProfile?.customDomain || "",
    metaTitle: agentProfile?.metaTitle || "",
    metaDescription: agentProfile?.metaDescription || "",
  });

  const [isUploadingPhoto, setIsUploadingPhoto] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handlePhotoUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    fieldName: string
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    setIsUploadingPhoto(fieldName);
    try {
      const uploadedUrls = await uploadToCloudinary([file], "agent-profile");
      if (uploadedUrls.length > 0) {
        const imageUrl = uploadedUrls[0];

        if (fieldName.startsWith("customBackgrounds.")) {
          const bgKey = fieldName.split(".")[1];
          setProfile({
            ...profile,
            customBackgrounds: {
              ...profile.customBackgrounds,
              [bgKey]: imageUrl,
            },
          });
        } else {
          setProfile({ ...profile, [fieldName]: imageUrl });
        }

        toast.success("Photo uploaded successfully!");
      }
    } catch (error) {
      toast.error("Failed to upload photo");
    } finally {
      setIsUploadingPhoto(null);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({ agentProfile: profile });
      toast.success("Profile updated successfully!");
    } catch (error) {
      toast.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Landing Page Content */}
      <div
        className={`rounded-xl p-6 ${
          isLight
            ? "bg-gradient-to-r from-blue-50/50 to-indigo-50/50 shadow-xl"
            : "bg-gradient-to-r from-slate-900/50 to-slate-800/50"
        }`}
      >
        <h3
          className={`text-xl font-bold mb-4 ${isLight ? "text-gray-900" : "text-white"}`}
        >
          Landing Page Content
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label
              className={`block text-sm font-medium mb-2 ${
                isLight ? "text-gray-700" : "text-gray-300"
              }`}
            >
              Headline
            </label>
            <input
              type="text"
              value={profile.headline}
              onChange={(e) => setProfile({ ...profile, headline: e.target.value })}
              placeholder="e.g., Your Trusted Real Estate Partner"
              className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 ${
                isLight
                  ? "bg-white border border-gray-300 text-gray-900 focus:ring-blue-500"
                  : "bg-slate-700 border border-slate-600 text-white focus:ring-blue-500"
              }`}
            />
          </div>

          <div className="md:col-span-2">
            <label
              className={`block text-sm font-medium mb-2 ${
                isLight ? "text-gray-700" : "text-gray-300"
              }`}
            >
              Tagline
            </label>
            <input
              type="text"
              value={profile.tagline}
              onChange={(e) => setProfile({ ...profile, tagline: e.target.value })}
              placeholder="e.g., Serving Orange County Since 2010"
              className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 ${
                isLight
                  ? "bg-white border border-gray-300 text-gray-900 focus:ring-blue-500"
                  : "bg-slate-700 border border-slate-600 text-white focus:ring-blue-500"
              }`}
            />
          </div>
        </div>
      </div>

      {/* Photos */}
      <div
        className={`rounded-xl p-6 ${
          isLight
            ? "bg-gradient-to-r from-blue-50/50 to-indigo-50/50 shadow-xl"
            : "bg-gradient-to-r from-slate-900/50 to-slate-800/50"
        }`}
      >
        <h3
          className={`text-xl font-bold mb-4 flex items-center gap-2 ${
            isLight ? "text-gray-900" : "text-white"
          }`}
        >
          <Camera className="w-6 h-6" />
          Profile Photos
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Headshot */}
          <div>
            <label
              className={`block text-sm font-medium mb-2 ${
                isLight ? "text-gray-700" : "text-gray-300"
              }`}
            >
              Headshot (Profile Photo)
            </label>
            <div className="relative">
              {profile.headshot && (
                <img
                  src={profile.headshot}
                  alt="Headshot"
                  className="w-full h-48 object-cover rounded-lg mb-2"
                />
              )}
              <label
                className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-all ${
                  isUploadingPhoto === "headshot"
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                } ${
                  isLight
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
              >
                {isUploadingPhoto === "headshot" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
                {isUploadingPhoto === "headshot" ? "Uploading..." : "Upload Headshot"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handlePhotoUpload(e, "headshot")}
                  className="hidden"
                  disabled={isUploadingPhoto !== null}
                />
              </label>
            </div>
          </div>

          {/* Hero Photo */}
          <div>
            <label
              className={`block text-sm font-medium mb-2 ${
                isLight ? "text-gray-700" : "text-gray-300"
              }`}
            >
              Hero Photo (Landing Page Background)
            </label>
            <div className="relative">
              {profile.heroPhoto && (
                <img
                  src={profile.heroPhoto}
                  alt="Hero"
                  className="w-full h-48 object-cover rounded-lg mb-2"
                />
              )}
              <label
                className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-all ${
                  isUploadingPhoto === "heroPhoto"
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                } ${
                  isLight
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
              >
                {isUploadingPhoto === "heroPhoto" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
                {isUploadingPhoto === "heroPhoto" ? "Uploading..." : "Upload Hero Photo"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handlePhotoUpload(e, "heroPhoto")}
                  className="hidden"
                  disabled={isUploadingPhoto !== null}
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Social Media Links */}
      <div
        className={`rounded-xl p-6 ${
          isLight
            ? "bg-gradient-to-r from-blue-50/50 to-indigo-50/50 shadow-xl"
            : "bg-gradient-to-r from-slate-900/50 to-slate-800/50"
        }`}
      >
        <h3
          className={`text-xl font-bold mb-4 flex items-center gap-2 ${
            isLight ? "text-gray-900" : "text-white"
          }`}
        >
          <Globe className="w-6 h-6" />
          Social Media Links
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              className={`block text-sm font-medium mb-2 flex items-center gap-2 ${
                isLight ? "text-gray-700" : "text-gray-300"
              }`}
            >
              <Facebook className="w-4 h-4" />
              Facebook
            </label>
            <input
              type="url"
              value={profile.socialMedia.facebook}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  socialMedia: { ...profile.socialMedia, facebook: e.target.value },
                })
              }
              placeholder="https://facebook.com/yourpage"
              className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 ${
                isLight
                  ? "bg-white border border-gray-300 text-gray-900 focus:ring-blue-500"
                  : "bg-slate-700 border border-slate-600 text-white focus:ring-blue-500"
              }`}
            />
          </div>

          <div>
            <label
              className={`block text-sm font-medium mb-2 flex items-center gap-2 ${
                isLight ? "text-gray-700" : "text-gray-300"
              }`}
            >
              <Instagram className="w-4 h-4" />
              Instagram
            </label>
            <input
              type="url"
              value={profile.socialMedia.instagram}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  socialMedia: { ...profile.socialMedia, instagram: e.target.value },
                })
              }
              placeholder="https://instagram.com/yourprofile"
              className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 ${
                isLight
                  ? "bg-white border border-gray-300 text-gray-900 focus:ring-blue-500"
                  : "bg-slate-700 border border-slate-600 text-white focus:ring-blue-500"
              }`}
            />
          </div>

          <div>
            <label
              className={`block text-sm font-medium mb-2 flex items-center gap-2 ${
                isLight ? "text-gray-700" : "text-gray-300"
              }`}
            >
              <Linkedin className="w-4 h-4" />
              LinkedIn
            </label>
            <input
              type="url"
              value={profile.socialMedia.linkedin}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  socialMedia: { ...profile.socialMedia, linkedin: e.target.value },
                })
              }
              placeholder="https://linkedin.com/in/yourprofile"
              className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 ${
                isLight
                  ? "bg-white border border-gray-300 text-gray-900 focus:ring-blue-500"
                  : "bg-slate-700 border border-slate-600 text-white focus:ring-blue-500"
              }`}
            />
          </div>

          <div>
            <label
              className={`block text-sm font-medium mb-2 flex items-center gap-2 ${
                isLight ? "text-gray-700" : "text-gray-300"
              }`}
            >
              <Youtube className="w-4 h-4" />
              YouTube
            </label>
            <input
              type="url"
              value={profile.socialMedia.youtube}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  socialMedia: { ...profile.socialMedia, youtube: e.target.value },
                })
              }
              placeholder="https://youtube.com/@yourchannel"
              className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 ${
                isLight
                  ? "bg-white border border-gray-300 text-gray-900 focus:ring-blue-500"
                  : "bg-slate-700 border border-slate-600 text-white focus:ring-blue-500"
              }`}
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={`px-6 py-3 rounded-lg font-semibold transition-all disabled:opacity-50 ${
            isLight
              ? "bg-blue-600 hover:bg-blue-700 text-white"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
        >
          {isSaving ? "Saving..." : "Save Profile"}
        </button>
      </div>
    </div>
  );
}
