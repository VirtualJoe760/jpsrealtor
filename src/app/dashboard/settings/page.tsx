// src/app/dashboard/settings/page.tsx
"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { User, Lock, Heart, Upload } from "lucide-react";

export default function SettingsPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();

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

    // TODO: Implement actual image upload to Cloudinary
    // For now, just show a placeholder
    setMessage({ type: "error", text: "Image upload not yet implemented. Coming soon!" });
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-gray-900 to-gray-900">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-900 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-gray-400 hover:text-white transition-colors mb-4"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
          <h1 className="text-4xl font-bold text-white mb-2">Settings</h1>
          <p className="text-gray-400">Manage your profile and account preferences</p>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg border ${
              message.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400"
                : "bg-red-500/10 border-red-500/50 text-red-400"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-800">
          <button
            onClick={() => setActiveTab("profile")}
            className={`px-6 py-3 font-medium transition-all ${
              activeTab === "profile"
                ? "text-white border-b-2 border-emerald-500"
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
                ? "text-white border-b-2 border-emerald-500"
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
                ? "text-white border-b-2 border-emerald-500"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Heart className="w-5 h-5 inline mr-2" />
            Partner Linking
          </button>
        </div>

        {/* Profile Tab */}
        {activeTab === "profile" && (
          <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl shadow-xl p-6 space-y-6">
            {/* Profile Photo */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Profile Photo
              </label>
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 rounded-full bg-gray-800 border-2 border-gray-700 flex items-center justify-center overflow-hidden">
                  {profile.image ? (
                    <img src={profile.image} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-12 h-12 text-gray-600" />
                  )}
                </div>
                <label className="cursor-pointer px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors border border-gray-700">
                  <Upload className="w-4 h-4 inline mr-2" />
                  Upload Photo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="(555) 123-4567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Birthday
                </label>
                <input
                  type="date"
                  value={profile.birthday}
                  onChange={(e) => setProfile({ ...profile, birthday: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Homeowner Status
                </label>
                <select
                  value={profile.homeownerStatus}
                  onChange={(e) => setProfile({ ...profile, homeownerStatus: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Current Address
              </label>
              <input
                type="text"
                value={profile.currentAddress}
                onChange={(e) => setProfile({ ...profile, currentAddress: e.target.value })}
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="123 Main St, City, State, ZIP"
              />
            </div>

            {/* Profile Description */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                About You
              </label>
              <textarea
                value={profile.profileDescription}
                onChange={(e) => setProfile({ ...profile, profileDescription: e.target.value })}
                rows={4}
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Tell us about yourself, what you love, your hobbies..."
              />
            </div>

            {/* Real Estate Goals */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Real Estate Goals
              </label>
              <textarea
                value={profile.realEstateGoals}
                onChange={(e) => setProfile({ ...profile, realEstateGoals: e.target.value })}
                rows={4}
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="What are you looking for in real estate? Dream home features, location preferences, investment goals..."
              />
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                onClick={handleProfileSave}
                disabled={isSaving}
                className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === "security" && (
          <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl shadow-xl p-6">
            <h2 className="text-2xl font-semibold text-white mb-6">Security</h2>

            {/* Two-Factor Authentication */}
            <div className="flex items-center justify-between py-4 border-b border-gray-800">
              <div className="flex-1">
                <h3 className="text-lg font-medium text-white mb-1">
                  Two-Factor Authentication
                </h3>
                <p className="text-sm text-gray-400">
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
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                    twoFactorEnabled ? "bg-emerald-600" : "bg-gray-700"
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
                    ? "bg-emerald-500/20 border border-emerald-500/50 text-emerald-300"
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
          <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl shadow-xl p-6">
            <h2 className="text-2xl font-semibold text-white mb-3">Partner Linking</h2>
            <p className="text-gray-400 mb-6">
              Link your account with a significant other to track joint real estate goals and preferences
            </p>

            {linkedPartner ? (
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-white mb-1">Linked Partner</h3>
                    <p className="text-emerald-400">{linkedPartner.name || linkedPartner.email}</p>
                    <p className="text-sm text-gray-500">{linkedPartner.email}</p>
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
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Partner's Email Address
                  </label>
                  <input
                    type="email"
                    value={partnerEmail}
                    onChange={(e) => setPartnerEmail(e.target.value)}
                    placeholder="partner@example.com"
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <button
                  onClick={handleLinkPartner}
                  disabled={isLoading || !partnerEmail.trim()}
                  className="w-full px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Linking..." : "Link Partner"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
