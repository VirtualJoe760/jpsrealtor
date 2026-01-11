"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AgentNav from "@/app/components/AgentNav";
import { useTheme } from "@/app/contexts/ThemeContext";
import { Briefcase, Users, TrendingUp, FileCheck, User as UserIcon, Phone, Building2, CreditCard, Edit2, Camera, Mail } from "lucide-react";
import { toast } from "react-toastify";
import { uploadToCloudinary } from "@/app/utils/cloudinaryUpload";

export default function AgentDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  // Agent profile state
  const [agentProfile, setAgentProfile] = useState({
    name: "",
    email: "",
    phone: "",
    brokerageName: "",
    licenseNumber: "",
    profileDescription: "",
    image: "",
    team: null as { name: string; description?: string } | null,
    isTeamLeader: false,
  });
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Fetch agent profile - MUST be before conditional returns
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch("/api/user/profile");
        if (response.ok) {
          const data = await response.json();
          const user = session?.user as any;

          setAgentProfile({
            name: data.profile.name || user?.name || "",
            email: data.profile.email || user?.email || "",
            phone: data.profile.phone || "",
            brokerageName: data.profile.brokerageName || "",
            licenseNumber: data.profile.licenseNumber || "",
            profileDescription: data.profile.profileDescription || "",
            image: data.profile.image || user?.image || "",
            team: data.profile.team || null,
            isTeamLeader: data.profile.isTeamLeader || false,
          });
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setIsLoadingProfile(false);
      }
    };

    if (status === "authenticated" && session) {
      fetchProfile();
    }
  }, [status, session]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className={`mt-4 ${isLight ? "text-gray-600" : "text-gray-400"}`}>Loading...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    router.push("/auth/signin");
    return null;
  }

  const user = session?.user as any;
  const isAgent = user?.roles?.includes("realEstateAgent");

  if (!isAgent) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className={`text-2xl font-bold mb-2 ${isLight ? "text-gray-900" : "text-white"}`}>
            Access Denied
          </h2>
          <p className={`${isLight ? "text-gray-600" : "text-gray-400"}`}>
            You must be a real estate agent to access this page.
          </p>
        </div>
      </div>
    );
  }

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    setIsUploadingImage(true);
    try {
      const uploadedUrls = await uploadToCloudinary([file], "profile-photos");
      if (uploadedUrls.length > 0) {
        const imageUrl = uploadedUrls[0];
        setAgentProfile({ ...agentProfile, image: imageUrl });

        // Save immediately
        const response = await fetch("/api/user/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: imageUrl }),
        });

        if (response.ok) {
          toast.success("Profile photo updated successfully!");
        } else {
          toast.error("Failed to save profile photo");
        }
      }
    } catch (error) {
      toast.error("Failed to upload image");
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Save agent profile
  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(agentProfile),
      });

      if (response.ok) {
        const data = await response.json();
        // Update local state with response data to ensure team info is preserved
        setAgentProfile({
          ...agentProfile,
          team: data.profile.team || null,
          isTeamLeader: data.profile.isTeamLeader || false,
        });
        toast.success("Profile updated successfully!");
        setIsEditMode(false);
      } else {
        toast.error("Failed to update profile");
      }
    } catch (error) {
      toast.error("Error updating profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    // Re-fetch to reset any unsaved changes
    fetchProfile();
  };

  const fetchProfile = async () => {
    try {
      const response = await fetch("/api/user/profile");
      if (response.ok) {
        const data = await response.json();
        const user = session?.user as any;

        setAgentProfile({
          name: data.profile.name || user?.name || "",
          email: data.profile.email || user?.email || "",
          phone: data.profile.phone || "",
          brokerageName: data.profile.brokerageName || "",
          licenseNumber: data.profile.licenseNumber || "",
          profileDescription: data.profile.profileDescription || "",
          image: data.profile.image || user?.image || "",
          team: data.profile.team || null,
          isTeamLeader: data.profile.isTeamLeader || false,
        });
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  const stats = [
    {
      label: "Active Clients",
      value: "0",
      icon: Briefcase,
      color: isLight ? "text-blue-600" : "text-blue-400",
      bgColor: isLight ? "bg-blue-100" : "bg-blue-900/30",
    },
    {
      label: "Team Members",
      value: user?.isTeamLeader ? "1" : "N/A",
      icon: Users,
      color: isLight ? "text-green-600" : "text-green-400",
      bgColor: isLight ? "bg-green-100" : "bg-green-900/30",
    },
    {
      label: "Pending Applications",
      value: user?.isTeamLeader ? "0" : "N/A",
      icon: FileCheck,
      color: isLight ? "text-purple-600" : "text-purple-400",
      bgColor: isLight ? "bg-purple-100" : "bg-purple-900/30",
    },
    {
      label: "Monthly Performance",
      value: "N/A",
      icon: TrendingUp,
      color: isLight ? "text-orange-600" : "text-orange-400",
      bgColor: isLight ? "bg-orange-100" : "bg-orange-900/30",
    },
  ];

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Agent Navigation */}
        <AgentNav />

        {/* Header */}
        <div className="mb-6">
          <h1 className={`text-2xl sm:text-3xl font-bold mb-2 ${isLight ? "text-gray-900" : "text-white"}`}>
            Agent Dashboard
          </h1>
          <p className={`text-sm sm:text-base ${isLight ? "text-gray-600" : "text-gray-400"}`}>
            Welcome back, {user?.name || user?.email}
          </p>
          {user?.isTeamLeader && (
            <p className={`text-sm mt-1 ${isLight ? "text-blue-600" : "text-blue-400"}`}>
              Team Leader
            </p>
          )}
        </div>

        {/* Agent Profile Card */}
        {!isLoadingProfile && (
          <div
            className={`rounded-xl p-4 sm:p-6 mb-8 shadow-lg ${
              isLight
                ? "bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100"
                : "bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700"
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
              <h2 className={`text-xl sm:text-2xl font-bold ${isLight ? "text-gray-900" : "text-white"}`}>
                Agent Profile
              </h2>
              {!isEditMode ? (
                <button
                  onClick={() => setIsEditMode(true)}
                  className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all text-sm sm:text-base ${
                    isLight
                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  }`}
                >
                  <Edit2 className="w-4 h-4" />
                  Edit Profile
                </button>
              ) : (
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <button
                    onClick={handleCancelEdit}
                    className={`px-4 py-2 rounded-lg font-medium transition-all text-sm sm:text-base ${
                      isLight
                        ? "bg-gray-200 hover:bg-gray-300 text-gray-900"
                        : "bg-slate-700 hover:bg-slate-600 text-white"
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                    className={`px-4 py-2 rounded-lg font-semibold transition-all disabled:opacity-50 text-sm sm:text-base ${
                      isLight
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : "bg-blue-600 hover:bg-blue-700 text-white"
                    }`}
                  >
                    {isSaving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-col md:flex-row gap-6">
              {/* Profile Photo */}
              <div className="flex-shrink-0">
                <div className="relative">
                  <div
                    className={`w-32 h-32 rounded-full overflow-hidden border-4 ${
                      isLight ? "border-white" : "border-slate-700"
                    } shadow-lg`}
                  >
                    {agentProfile.image ? (
                      <img
                        src={agentProfile.image}
                        alt={agentProfile.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div
                        className={`w-full h-full flex items-center justify-center ${
                          isLight ? "bg-blue-100" : "bg-slate-700"
                        }`}
                      >
                        <UserIcon
                          className={`w-16 h-16 ${isLight ? "text-blue-400" : "text-slate-500"}`}
                        />
                      </div>
                    )}
                  </div>
                  <label
                    className={`absolute bottom-0 right-0 p-2 rounded-full cursor-pointer shadow-lg transition-all ${
                      isUploadingImage ? "opacity-50 cursor-not-allowed" : ""
                    } ${
                      isLight
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : "bg-blue-600 hover:bg-blue-700 text-white"
                    }`}
                  >
                    {isUploadingImage ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                      <Camera className="w-5 h-5" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={isUploadingImage}
                    />
                  </label>
                </div>
              </div>

              {/* Profile Information */}
              <div className="flex-1">
                {!isEditMode ? (
                  // Display Mode
                  <div className="space-y-4">
                    <div>
                      <h3 className={`text-2xl font-bold ${isLight ? "text-gray-900" : "text-white"}`}>
                        {agentProfile.name || "Not set"}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Mail className={`w-4 h-4 ${isLight ? "text-gray-500" : "text-gray-400"}`} />
                        <span className={`text-sm ${isLight ? "text-gray-600" : "text-gray-400"}`}>
                          {agentProfile.email}
                        </span>
                      </div>
                    </div>

                    {agentProfile.profileDescription && (
                      <p className={`text-sm ${isLight ? "text-gray-700" : "text-gray-300"} leading-relaxed`}>
                        {agentProfile.profileDescription}
                      </p>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                      <div className={`flex items-center gap-3 p-3 rounded-lg ${
                        isLight ? "bg-white/60" : "bg-slate-800/60"
                      }`}>
                        <Phone className={`w-5 h-5 ${isLight ? "text-blue-600" : "text-blue-400"}`} />
                        <div>
                          <p className={`text-xs ${isLight ? "text-gray-500" : "text-gray-400"}`}>
                            Phone
                          </p>
                          <p className={`font-medium ${isLight ? "text-gray-900" : "text-white"}`}>
                            {agentProfile.phone || "Not set"}
                          </p>
                        </div>
                      </div>

                      <div className={`flex items-center gap-3 p-3 rounded-lg ${
                        isLight ? "bg-white/60" : "bg-slate-800/60"
                      }`}>
                        <Building2 className={`w-5 h-5 ${isLight ? "text-blue-600" : "text-blue-400"}`} />
                        <div>
                          <p className={`text-xs ${isLight ? "text-gray-500" : "text-gray-400"}`}>
                            Brokerage
                          </p>
                          <p className={`font-medium ${isLight ? "text-gray-900" : "text-white"}`}>
                            {agentProfile.brokerageName || "Not set"}
                          </p>
                        </div>
                      </div>

                      <div className={`flex items-center gap-3 p-3 rounded-lg ${
                        isLight ? "bg-white/60" : "bg-slate-800/60"
                      }`}>
                        <CreditCard className={`w-5 h-5 ${isLight ? "text-blue-600" : "text-blue-400"}`} />
                        <div>
                          <p className={`text-xs ${isLight ? "text-gray-500" : "text-gray-400"}`}>
                            License Number
                          </p>
                          <p className={`font-medium ${isLight ? "text-gray-900" : "text-white"}`}>
                            {agentProfile.licenseNumber || "Not set"}
                          </p>
                        </div>
                      </div>

                      <div className={`flex items-center gap-3 p-3 rounded-lg ${
                        isLight ? "bg-white/60" : "bg-slate-800/60"
                      }`}>
                        <Users className={`w-5 h-5 ${isLight ? "text-blue-600" : "text-blue-400"}`} />
                        <div>
                          <p className={`text-xs ${isLight ? "text-gray-500" : "text-gray-400"}`}>
                            Team Affiliation
                          </p>
                          <p className={`font-medium ${isLight ? "text-gray-900" : "text-white"}`}>
                            {agentProfile.team ? (
                              <>
                                {agentProfile.team.name}
                                {agentProfile.isTeamLeader && (
                                  <span className={`ml-2 text-xs px-2 py-0.5 rounded ${
                                    isLight ? "bg-blue-100 text-blue-700" : "bg-blue-900/50 text-blue-300"
                                  }`}>
                                    Leader
                                  </span>
                                )}
                              </>
                            ) : (
                              "No team assigned"
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Edit Mode
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${
                          isLight ? "text-gray-700" : "text-gray-300"
                        }`}>
                          Full Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={agentProfile.name}
                          onChange={(e) =>
                            setAgentProfile({ ...agentProfile, name: e.target.value })
                          }
                          className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 ${
                            isLight
                              ? "bg-white border border-gray-300 text-gray-900 focus:ring-blue-500"
                              : "bg-slate-700 border border-slate-600 text-white focus:ring-blue-500"
                          }`}
                        />
                      </div>

                      <div>
                        <label className={`block text-sm font-medium mb-2 ${
                          isLight ? "text-gray-700" : "text-gray-300"
                        }`}>
                          Phone Number <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="tel"
                          value={agentProfile.phone}
                          onChange={(e) =>
                            setAgentProfile({ ...agentProfile, phone: e.target.value })
                          }
                          className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 ${
                            isLight
                              ? "bg-white border border-gray-300 text-gray-900 focus:ring-blue-500"
                              : "bg-slate-700 border border-slate-600 text-white focus:ring-blue-500"
                          }`}
                        />
                      </div>

                      <div>
                        <label className={`block text-sm font-medium mb-2 ${
                          isLight ? "text-gray-700" : "text-gray-300"
                        }`}>
                          Brokerage Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={agentProfile.brokerageName}
                          onChange={(e) =>
                            setAgentProfile({ ...agentProfile, brokerageName: e.target.value })
                          }
                          className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 ${
                            isLight
                              ? "bg-white border border-gray-300 text-gray-900 focus:ring-blue-500"
                              : "bg-slate-700 border border-slate-600 text-white focus:ring-blue-500"
                          }`}
                        />
                      </div>

                      <div>
                        <label className={`block text-sm font-medium mb-2 ${
                          isLight ? "text-gray-700" : "text-gray-300"
                        }`}>
                          License Number
                        </label>
                        <input
                          type="text"
                          value={agentProfile.licenseNumber}
                          onChange={(e) =>
                            setAgentProfile({ ...agentProfile, licenseNumber: e.target.value })
                          }
                          className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 ${
                            isLight
                              ? "bg-white border border-gray-300 text-gray-900 focus:ring-blue-500"
                              : "bg-slate-700 border border-slate-600 text-white focus:ring-blue-500"
                          }`}
                        />
                      </div>
                    </div>

                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        isLight ? "text-gray-700" : "text-gray-300"
                      }`}>
                        Bio / About
                      </label>
                      <textarea
                        value={agentProfile.profileDescription}
                        onChange={(e) =>
                          setAgentProfile({ ...agentProfile, profileDescription: e.target.value })
                        }
                        rows={3}
                        className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 resize-none ${
                          isLight
                            ? "bg-white border border-gray-300 text-gray-900 focus:ring-blue-500"
                            : "bg-slate-700 border border-slate-600 text-white focus:ring-blue-500"
                        }`}
                        placeholder="Tell us about yourself..."
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className={`rounded-lg p-6 ${
                  isLight ? "bg-white shadow-sm border border-gray-200" : "bg-neutral-900 border border-neutral-800"
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
                <p className={`text-sm font-medium ${isLight ? "text-gray-600" : "text-gray-400"}`}>
                  {stat.label}
                </p>
                <p className={`text-3xl font-bold mt-2 ${isLight ? "text-gray-900" : "text-white"}`}>
                  {stat.value}
                </p>
              </div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div
          className={`rounded-lg p-4 sm:p-6 ${
            isLight ? "bg-white shadow-sm border border-gray-200" : "bg-neutral-900 border border-neutral-800"
          }`}
        >
          <h2 className={`text-lg sm:text-xl font-bold mb-4 ${isLight ? "text-gray-900" : "text-white"}`}>
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <button
              onClick={() => router.push("/agent/clients")}
              className={`p-4 rounded-lg text-left transition-colors ${
                isLight
                  ? "bg-blue-50 hover:bg-blue-100 text-blue-900"
                  : "bg-blue-900/20 hover:bg-blue-900/30 text-blue-400"
              }`}
            >
              <Briefcase className="w-5 h-5 mb-2" />
              <p className="font-semibold">Manage Clients</p>
              <p className={`text-sm mt-1 ${isLight ? "text-blue-700" : "text-blue-300"}`}>
                View and manage your client list
              </p>
            </button>

            {user?.isTeamLeader && (
              <>
                <button
                  onClick={() => router.push("/agent/applications")}
                  className={`p-4 rounded-lg text-left transition-colors ${
                    isLight
                      ? "bg-green-50 hover:bg-green-100 text-green-900"
                      : "bg-green-900/20 hover:bg-green-900/30 text-green-400"
                  }`}
                >
                  <FileCheck className="w-5 h-5 mb-2" />
                  <p className="font-semibold">Review Applications</p>
                  <p className={`text-sm mt-1 ${isLight ? "text-green-700" : "text-green-300"}`}>
                    Manage pending agent applications
                  </p>
                </button>

                <button
                  onClick={() => router.push("/agent/team")}
                  className={`p-4 rounded-lg text-left transition-colors ${
                    isLight
                      ? "bg-purple-50 hover:bg-purple-100 text-purple-900"
                      : "bg-purple-900/20 hover:bg-purple-900/30 text-purple-400"
                  }`}
                >
                  <Users className="w-5 h-5 mb-2" />
                  <p className="font-semibold">Manage Team</p>
                  <p className={`text-sm mt-1 ${isLight ? "text-purple-700" : "text-purple-300"}`}>
                    View and manage your team members
                  </p>
                </button>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
