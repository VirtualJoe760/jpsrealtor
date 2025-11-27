// src/app/dashboard/settings/page.tsx
"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { User, Lock, Heart, Upload, Loader2 } from "lucide-react";
import { useTheme } from "@/app/contexts/ThemeContext";
import SpaticalBackground from "@/app/components/backgrounds/SpaticalBackground";
import { uploadToCloudinary } from "@/app/utils/cloudinaryUpload";

export default function SettingsPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  // Security state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  // Profile state
  const [profile, setProfile] = useState({
    name: "",
    phone: "",
    birthday: "",
    profileDescription: "",
    realEstateGoals: "",
    currentAddress: "",
    homeownerStatus: "",
    image: "",
  });

  // Partner linking state
  const [partnerEmail, setPartnerEmail] = useState("");
  const [linkedPartner, setLinkedPartner] = useState<any>(null);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"profile" | "security" | "partner">("profile");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated") {
      fetchUserData();
    }
  }, [status, router]);

  const fetchUserData = async () => {
    setIsLoading(true);
    try {
      // Fetch 2FA status
      const authResponse = await fetch("/api/auth/user");
      if (authResponse.ok) {
        const authData = await authResponse.json();
        setTwoFactorEnabled(authData.twoFactorEnabled || false);
      }

      // Fetch profile data
      const profileResponse = await fetch("/api/user/profile");
      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        setProfile({
          name: profileData.profile.name || "",
          phone: profileData.profile.phone || "",
          birthday: profileData.profile.birthday ? (new Date(profileData.profile.birthday).toISOString().split('T')[0] || "") : "",
          profileDescription: profileData.profile.profileDescription || "",
          realEstateGoals: profileData.profile.realEstateGoals || "",
          currentAddress: profileData.profile.currentAddress || "",
          homeownerStatus: profileData.profile.homeownerStatus || "",
          image: profileData.profile.image || "",
        });
        setLinkedPartner(profileData.profile.significantOther || null);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileSave = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: "success", text: "Profile updated successfully!" });
        // Update session if name changed
        if (profile.name !== session?.user?.name) {
          await update({ name: profile.name });
        }
      } else {
        setMessage({ type: "error", text: data.error || "Failed to update profile" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "An unexpected error occurred" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle2FA = async () => {
    setIsLoading(true);
    setMessage(null);

    try {
      const endpoint = twoFactorEnabled ? "/api/auth/2fa/disable" : "/api/auth/2fa/enable";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ twoFactorEmail: session?.user?.email }),
      });

      const data = await response.json();

      if (response.ok) {
        setTwoFactorEnabled(!twoFactorEnabled);
        setMessage({
          type: "success",
          text: twoFactorEnabled
            ? "Two-factor authentication disabled"
            : "Two-factor authentication enabled",
        });
      } else {
        setMessage({ type: "error", text: data.error || "Failed to update 2FA" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "An unexpected error occurred" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLinkPartner = async () => {
    if (!partnerEmail.trim()) return;

    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/user/link-partner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partnerEmail }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: "success", text: "Partner linked successfully!" });
        setLinkedPartner(data.partner);
        setPartnerEmail("");
      } else {
        setMessage({ type: "error", text: data.error || "Failed to link partner" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "An unexpected error occurred" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnlinkPartner = async () => {
    if (!confirm("Are you sure you want to unlink your partner account?")) return;

    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/user/link-partner", {
        method: "DELETE",
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: "success", text: "Partner unlinked successfully" });
        setLinkedPartner(null);
      } else {
        setMessage({ type: "error", text: data.error || "Failed to unlink partner" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "An unexpected error occurred" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setMessage({ type: "error", text: "Please select a valid image file." });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: "error", text: "Image size must be less than 5MB." });
      return;
    }

    setIsUploadingImage(true);
    setMessage(null);

    try {
      // Upload to Cloudinary
      const uploadedUrls = await uploadToCloudinary([file], "profile-photos");

      if (uploadedUrls.length > 0) {
        const imageUrl = uploadedUrls[0];

        // Update profile with new image URL
        const response = await fetch("/api/user/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: imageUrl }),
        });

        if (response.ok) {
          setProfile({ ...profile, image: imageUrl });
          setMessage({ type: "success", text: "Profile photo updated successfully!" });
          // Update session to reflect new image
          await update({ image: imageUrl });
        } else {
          setMessage({ type: "error", text: "Failed to save profile photo." });
        }
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      setMessage({ type: "error", text: "Failed to upload image. Please try again." });
    } finally {
      setIsUploadingImage(false);
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <SpaticalBackground showGradient={true}>
        <div className="min-h-screen flex items-center justify-center">
          <div className={`text-xl ${isLight ? "text-gray-900" : "text-white"}`}>Loading...</div>
        </div>
      </SpaticalBackground>
    );
  }

  if (!session) {
    return null;
  }

  // Get the display image - prefer uploaded profile image, then session image (Google/Facebook)
  const displayImage = profile.image || session?.user?.image;

  return (
    <SpaticalBackground showGradient={true}>
      <div className="min-h-screen py-12 px-4 pt-24 md:pt-12">
        <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className={`inline-flex items-center transition-colors mb-4 ${
              isLight ? "text-gray-500 hover:text-gray-900" : "text-gray-400 hover:text-white"
            }`}
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
          <h1 className={`text-4xl font-bold mb-2 ${isLight ? "text-gray-900" : "text-white"}`}>Settings</h1>
          <p className={isLight ? "text-gray-600" : "text-gray-400"}>Manage your profile and account preferences</p>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg border ${
              message.type === "success"
                ? isLight
                  ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                  : "bg-emerald-500/10 border-emerald-500/50 text-emerald-400"
                : isLight
                  ? "bg-red-50 border-red-300 text-red-700"
                  : "bg-red-500/10 border-red-500/50 text-red-400"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Tabs */}
        <div className={`flex gap-2 mb-6 border-b ${isLight ? "border-gray-200" : "border-gray-800"}`}>
          <button
            onClick={() => setActiveTab("profile")}
            className={`px-6 py-3 font-medium transition-all ${
              activeTab === "profile"
                ? isLight
                  ? "text-gray-900 border-b-2 border-blue-500"
                  : "text-white border-b-2 border-emerald-500"
                : isLight
                  ? "text-gray-500 hover:text-gray-900"
                  : "text-gray-400 hover:text-white"
            }`}
          >
            <User className="w-5 h-5 inline mr-2" />
            Profile
          </button>
          <button
            onClick={() => setActiveTab("security")}
            className={`px-6 py-3 font-medium transition-all ${
              activeTab === "security"
                ? isLight
                  ? "text-gray-900 border-b-2 border-blue-500"
                  : "text-white border-b-2 border-emerald-500"
                : isLight
                  ? "text-gray-500 hover:text-gray-900"
                  : "text-gray-400 hover:text-white"
            }`}
          >
            <Lock className="w-5 h-5 inline mr-2" />
            Security
          </button>
          <button
            onClick={() => setActiveTab("partner")}
            className={`px-6 py-3 font-medium transition-all ${
              activeTab === "partner"
                ? isLight
                  ? "text-gray-900 border-b-2 border-blue-500"
                  : "text-white border-b-2 border-emerald-500"
                : isLight
                  ? "text-gray-500 hover:text-gray-900"
                  : "text-gray-400 hover:text-white"
            }`}
          >
            <Heart className="w-5 h-5 inline mr-2" />
            Partner Linking
          </button>
        </div>

        {/* Profile Tab */}
        {activeTab === "profile" && (
          <div className={`backdrop-blur-sm rounded-2xl shadow-xl p-6 space-y-6 ${
            isLight
              ? "bg-white/80 border border-gray-200"
              : "bg-gray-900/50 border border-gray-800"
          }`}
          style={isLight ? {
            backdropFilter: "blur(10px) saturate(150%)",
            WebkitBackdropFilter: "blur(10px) saturate(150%)",
          } : undefined}
          >
            {/* Profile Photo */}
            <div>
              <label className={`block text-sm font-medium mb-3 ${isLight ? "text-gray-700" : "text-gray-300"}`}>
                Profile Photo
              </label>
              <div className="flex items-center gap-4">
                <div className={`relative w-24 h-24 rounded-full border-2 flex items-center justify-center overflow-hidden ${
                  isLight ? "bg-gray-100 border-gray-300" : "bg-gray-800 border-gray-700"
                }`}>
                  {isUploadingImage && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                      <Loader2 className="w-8 h-8 text-white animate-spin" />
                    </div>
                  )}
                  {displayImage ? (
                    <img src={displayImage} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User className={`w-12 h-12 ${isLight ? "text-gray-400" : "text-gray-600"}`} />
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <label className={`cursor-pointer px-4 py-2 rounded-lg transition-colors border inline-flex items-center ${
                    isUploadingImage ? "opacity-50 cursor-not-allowed" : ""
                  } ${
                    isLight
                      ? "bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300"
                      : "bg-gray-800 hover:bg-gray-700 text-white border-gray-700"
                  }`}>
                    {isUploadingImage ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Photo
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={isUploadingImage}
                    />
                  </label>
                  {displayImage && (
                    <p className={`text-xs ${isLight ? "text-gray-500" : "text-gray-400"}`}>
                      {session?.user?.image && !profile.image ? "Using Google/Facebook photo" : "Custom photo"}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${isLight ? "text-gray-700" : "text-gray-300"}`}>
                  Full Name
                </label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  className={`w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 ${
                    isLight
                      ? "bg-white border border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-blue-500"
                      : "bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 focus:ring-emerald-500"
                  }`}
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isLight ? "text-gray-700" : "text-gray-300"}`}>
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  className={`w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 ${
                    isLight
                      ? "bg-white border border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-blue-500"
                      : "bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 focus:ring-emerald-500"
                  }`}
                  placeholder="(555) 123-4567"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isLight ? "text-gray-700" : "text-gray-300"}`}>
                  Birthday
                </label>
                <input
                  type="date"
                  value={profile.birthday}
                  onChange={(e) => setProfile({ ...profile, birthday: e.target.value })}
                  className={`w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 ${
                    isLight
                      ? "bg-white border border-gray-300 text-gray-900 focus:ring-blue-500"
                      : "bg-gray-800/50 border border-gray-700 text-white focus:ring-emerald-500"
                  }`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isLight ? "text-gray-700" : "text-gray-300"}`}>
                  Homeowner Status
                </label>
                <select
                  value={profile.homeownerStatus}
                  onChange={(e) => setProfile({ ...profile, homeownerStatus: e.target.value })}
                  className={`w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 ${
                    isLight
                      ? "bg-white border border-gray-300 text-gray-900 focus:ring-blue-500"
                      : "bg-gray-800/50 border border-gray-700 text-white focus:ring-emerald-500"
                  }`}
                >
                  <option value="">Select status</option>
                  <option value="own">Own</option>
                  <option value="rent">Rent</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            {/* Current Address */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${isLight ? "text-gray-700" : "text-gray-300"}`}>
                Current Address
              </label>
              <input
                type="text"
                value={profile.currentAddress}
                onChange={(e) => setProfile({ ...profile, currentAddress: e.target.value })}
                className={`w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 ${
                  isLight
                    ? "bg-white border border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-blue-500"
                    : "bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 focus:ring-emerald-500"
                }`}
                placeholder="123 Main St, City, State, ZIP"
              />
            </div>

            {/* Profile Description */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${isLight ? "text-gray-700" : "text-gray-300"}`}>
                About You
              </label>
              <textarea
                value={profile.profileDescription}
                onChange={(e) => setProfile({ ...profile, profileDescription: e.target.value })}
                rows={4}
                className={`w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 ${
                  isLight
                    ? "bg-white border border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-blue-500"
                    : "bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 focus:ring-emerald-500"
                }`}
                placeholder="Tell us about yourself, what you love, your hobbies..."
              />
            </div>

            {/* Real Estate Goals */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${isLight ? "text-gray-700" : "text-gray-300"}`}>
                Real Estate Goals
              </label>
              <textarea
                value={profile.realEstateGoals}
                onChange={(e) => setProfile({ ...profile, realEstateGoals: e.target.value })}
                rows={4}
                className={`w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 ${
                  isLight
                    ? "bg-white border border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-blue-500"
                    : "bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 focus:ring-emerald-500"
                }`}
                placeholder="What are you looking for in real estate? Dream home features, location preferences, investment goals..."
              />
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                onClick={handleProfileSave}
                disabled={isSaving}
                className={`px-6 py-3 font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                  isLight
                    ? "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
                    : "bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white"
                }`}
              >
                {isSaving ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === "security" && (
          <div className={`backdrop-blur-sm rounded-2xl shadow-xl p-6 ${
            isLight
              ? "bg-white/80 border border-gray-200"
              : "bg-gray-900/50 border border-gray-800"
          }`}
          style={isLight ? {
            backdropFilter: "blur(10px) saturate(150%)",
            WebkitBackdropFilter: "blur(10px) saturate(150%)",
          } : undefined}
          >
            <h2 className={`text-2xl font-semibold mb-6 ${isLight ? "text-gray-900" : "text-white"}`}>Security</h2>

            {/* Two-Factor Authentication */}
            <div className={`flex items-center justify-between py-4 border-b ${isLight ? "border-gray-200" : "border-gray-800"}`}>
              <div className="flex-1">
                <h3 className={`text-lg font-medium mb-1 ${isLight ? "text-gray-900" : "text-white"}`}>
                  Two-Factor Authentication
                </h3>
                <p className={`text-sm ${isLight ? "text-gray-600" : "text-gray-400"}`}>
                  Add an extra layer of security with email verification codes
                </p>
              </div>
              <div className="ml-6">
                <button
                  onClick={() => {
                    if (twoFactorEnabled) {
                      if (confirm("Disable two-factor authentication?")) handleToggle2FA();
                    } else {
                      if (confirm("Enable two-factor authentication?")) handleToggle2FA();
                    }
                  }}
                  disabled={isLoading}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    isLight
                      ? `focus:ring-blue-500 focus:ring-offset-white ${twoFactorEnabled ? "bg-blue-500" : "bg-gray-300"}`
                      : `focus:ring-emerald-500 focus:ring-offset-gray-900 ${twoFactorEnabled ? "bg-emerald-600" : "bg-gray-700"}`
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      twoFactorEnabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Status Badge */}
            <div className="mt-4">
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  twoFactorEnabled
                    ? isLight
                      ? "bg-blue-100 border border-blue-300 text-blue-700"
                      : "bg-emerald-500/20 border border-emerald-500/50 text-emerald-300"
                    : isLight
                      ? "bg-gray-100 border border-gray-300 text-gray-600"
                      : "bg-gray-700/50 border border-gray-600 text-gray-400"
                }`}
              >
                {twoFactorEnabled ? "Enabled" : "Disabled"}
              </span>
            </div>
          </div>
        )}

        {/* Partner Linking Tab */}
        {activeTab === "partner" && (
          <div className={`backdrop-blur-sm rounded-2xl shadow-xl p-6 ${
            isLight
              ? "bg-white/80 border border-gray-200"
              : "bg-gray-900/50 border border-gray-800"
          }`}
          style={isLight ? {
            backdropFilter: "blur(10px) saturate(150%)",
            WebkitBackdropFilter: "blur(10px) saturate(150%)",
          } : undefined}
          >
            <h2 className={`text-2xl font-semibold mb-3 ${isLight ? "text-gray-900" : "text-white"}`}>Partner Linking</h2>
            <p className={`mb-6 ${isLight ? "text-gray-600" : "text-gray-400"}`}>
              Link your account with a significant other to track joint real estate goals and preferences
            </p>

            {linkedPartner ? (
              <div className={`rounded-lg p-6 ${
                isLight
                  ? "bg-gray-50 border border-gray-200"
                  : "bg-gray-800/50 border border-gray-700"
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className={`text-lg font-medium mb-1 ${isLight ? "text-gray-900" : "text-white"}`}>Linked Partner</h3>
                    <p className={isLight ? "text-blue-600" : "text-emerald-400"}>{linkedPartner.name || linkedPartner.email}</p>
                    <p className={`text-sm ${isLight ? "text-gray-500" : "text-gray-500"}`}>{linkedPartner.email}</p>
                  </div>
                  <button
                    onClick={handleUnlinkPartner}
                    disabled={isLoading}
                    className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/50 text-red-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Unlink
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isLight ? "text-gray-700" : "text-gray-300"}`}>
                    Partner's Email Address
                  </label>
                  <input
                    type="email"
                    value={partnerEmail}
                    onChange={(e) => setPartnerEmail(e.target.value)}
                    placeholder="partner@example.com"
                    className={`w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 ${
                      isLight
                        ? "bg-white border border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-blue-500"
                        : "bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 focus:ring-emerald-500"
                    }`}
                  />
                </div>
                <button
                  onClick={handleLinkPartner}
                  disabled={isLoading || !partnerEmail.trim()}
                  className={`w-full px-6 py-3 font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                    isLight
                      ? "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
                      : "bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white"
                  }`}
                >
                  {isLoading ? "Linking..." : "Link Partner"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
    </SpaticalBackground>
  );
}
