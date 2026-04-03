"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AgentNav from "@/app/components/AgentNav";
import { useTheme } from "@/app/contexts/ThemeContext";
import { Briefcase, Users, TrendingUp, FileCheck, User as UserIcon, Phone, Building2, CreditCard, Settings, Camera, Mail, Globe, Instagram, Linkedin, Facebook, Youtube, Eye, Star, Plus, Trash2, Edit3, MessageSquare } from "lucide-react";
import { toast } from "react-toastify";
import { uploadToCloudinary } from "@/app/utils/cloudinaryUpload";
import BannerPhotoCropper from "@/app/components/BannerPhotoCropper";

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
    agentProfile: null as any,
  });
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isUploadingHero, setIsUploadingHero] = useState(false);
  const [isUploadingHeadshot, setIsUploadingHeadshot] = useState(false);
  const [isUploadingBrokerLogo, setIsUploadingBrokerLogo] = useState(false);
  const [isUploadingTeamLogo, setIsUploadingTeamLogo] = useState(false);
  const [showBannerCropper, setShowBannerCropper] = useState(false);
  const [bannerImageSrc, setBannerImageSrc] = useState<string | null>(null);

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
            agentProfile: data.profile.agentProfile || null,
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

  // Handle hero/banner photo selection (show cropper)
  const handleHeroPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    // Convert to data URL for cropper
    const reader = new FileReader();
    reader.onload = () => {
      setBannerImageSrc(reader.result as string);
      setShowBannerCropper(true);
    };
    reader.readAsDataURL(file);

    // Reset input
    e.target.value = "";
  };

  // Handle cropped banner photo upload
  const handleCroppedBannerUpload = async (croppedBlob: Blob) => {
    setIsUploadingHero(true);
    setShowBannerCropper(false);

    try {
      // Convert blob to file
      const croppedFile = new File([croppedBlob], "banner.jpg", {
        type: "image/jpeg",
      });

      const uploadedUrls = await uploadToCloudinary([croppedFile], "hero-photos");
      if (uploadedUrls.length > 0) {
        const heroUrl = uploadedUrls[0];
        setAgentProfile({
          ...agentProfile,
          agentProfile: {
            ...agentProfile.agentProfile,
            heroPhoto: heroUrl
          }
        });

        // Save immediately
        const response = await fetch("/api/user/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agentProfile: {
              heroPhoto: heroUrl
            }
          }),
        });

        if (response.ok) {
          toast.success("Banner photo updated successfully!");
        } else {
          toast.error("Failed to save banner photo");
        }
      }
    } catch (error) {
      toast.error("Failed to upload banner image");
    } finally {
      setIsUploadingHero(false);
      setBannerImageSrc(null);
    }
  };

  // Handle cancel cropping
  const handleCancelCrop = () => {
    setShowBannerCropper(false);
    setBannerImageSrc(null);
  };

  // Handle headshot upload (transparent background)
  const handleHeadshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    setIsUploadingHeadshot(true);
    try {
      const uploadedUrls = await uploadToCloudinary([file], "headshots");
      if (uploadedUrls.length > 0) {
        const headshotUrl = uploadedUrls[0];
        setAgentProfile({
          ...agentProfile,
          agentProfile: {
            ...agentProfile.agentProfile,
            headshot: headshotUrl
          }
        });

        const response = await fetch("/api/user/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agentProfile: { headshot: headshotUrl }
          }),
        });

        if (response.ok) {
          toast.success("Headshot updated successfully!");
        } else {
          toast.error("Failed to save headshot");
        }
      }
    } catch (error) {
      toast.error("Failed to upload headshot");
    } finally {
      setIsUploadingHeadshot(false);
    }
  };

  // Handle broker logo upload
  const handleBrokerLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    setIsUploadingBrokerLogo(true);
    try {
      const uploadedUrls = await uploadToCloudinary([file], "logos");
      if (uploadedUrls.length > 0) {
        const logoUrl = uploadedUrls[0];
        setAgentProfile({
          ...agentProfile,
          agentProfile: {
            ...agentProfile.agentProfile,
            brokerLogo: logoUrl
          }
        });

        const response = await fetch("/api/user/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agentProfile: { brokerLogo: logoUrl }
          }),
        });

        if (response.ok) {
          toast.success("Broker logo updated successfully!");
        } else {
          toast.error("Failed to save broker logo");
        }
      }
    } catch (error) {
      toast.error("Failed to upload broker logo");
    } finally {
      setIsUploadingBrokerLogo(false);
    }
  };

  // Handle team logo upload
  const handleTeamLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    setIsUploadingTeamLogo(true);
    try {
      const uploadedUrls = await uploadToCloudinary([file], "logos");
      if (uploadedUrls.length > 0) {
        const logoUrl = uploadedUrls[0];
        setAgentProfile({
          ...agentProfile,
          agentProfile: {
            ...agentProfile.agentProfile,
            teamLogo: logoUrl
          }
        });

        const response = await fetch("/api/user/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agentProfile: { teamLogo: logoUrl }
          }),
        });

        if (response.ok) {
          toast.success("Team logo updated successfully!");
        } else {
          toast.error("Failed to save team logo");
        }
      }
    } catch (error) {
      toast.error("Failed to upload team logo");
    } finally {
      setIsUploadingTeamLogo(false);
    }
  };

  // Handle insights banner upload (separate from hero photo)
  const handleInsightsBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    setIsUploadingHero(true);
    try {
      const uploadedUrls = await uploadToCloudinary([file], "insights-banners");
      if (uploadedUrls.length > 0) {
        const bannerUrl = uploadedUrls[0];
        setAgentProfile({
          ...agentProfile,
          agentProfile: {
            ...agentProfile.agentProfile,
            insightsBannerImage: bannerUrl
          }
        });

        const response = await fetch("/api/user/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agentProfile: { insightsBannerImage: bannerUrl }
          }),
        });

        if (response.ok) {
          toast.success("Insights banner updated successfully!");
        } else {
          toast.error("Failed to save insights banner");
        }
      }
    } catch (error) {
      toast.error("Failed to upload insights banner");
    } finally {
      setIsUploadingHero(false);
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
          agentProfile: data.profile.agentProfile || null,
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
    <div className="fixed inset-0 md:relative md:inset-auto md:min-h-screen flex flex-col overflow-hidden">
      <div className="max-w-7xl mx-auto w-full h-full flex flex-col overflow-hidden pt-16 md:pt-0 md:py-4 md:py-8">
        {/* Agent Navigation */}
        <div className="flex-shrink-0">
          <AgentNav />
        </div>

        {/* Header */}
        <div className="mb-6 flex-shrink-0 px-4 md:px-6">
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

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto pb-20 md:pb-0 px-4 md:px-6">
          {/* Agent Profile Card */}
          {!isLoadingProfile && (
          <div
            className={`rounded-xl p-4 sm:p-6 mb-8 relative ${
              isLight
                ? "bg-gradient-to-r from-blue-50/50 to-indigo-50/50 shadow-lg"
                : "bg-gradient-to-r from-slate-900/50 to-slate-800/50 shadow-lg shadow-blue-500/20"
            }`}
          >
            {/* Action Icons - Absolutely Positioned */}
            <div className="absolute top-4 right-4 z-10 flex gap-2">
              {!isEditMode ? (
                <>
                  <button
                    onClick={() => router.push('/agent/profile')}
                    className={`p-2 rounded-lg transition-all ${
                      isLight
                        ? "hover:bg-gray-100 text-gray-700"
                        : "hover:bg-slate-700 text-gray-300"
                    }`}
                    aria-label="View Profile"
                  >
                    <Eye className="w-6 h-6" />
                  </button>
                  <button
                    onClick={() => setIsEditMode(true)}
                    className={`p-2 rounded-lg transition-all ${
                      isLight
                        ? "hover:bg-gray-100 text-gray-700"
                        : "hover:bg-slate-700 text-gray-300"
                    }`}
                    aria-label="Edit Profile"
                  >
                    <Settings className="w-6 h-6" />
                  </button>
                </>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleCancelEdit}
                    className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
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
                    className={`px-4 py-2 rounded-lg font-semibold transition-all disabled:opacity-50 text-sm ${
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

            {/* Name and Email Above Photo */}
            <div className="mb-3">
              <h3 className={`text-xl sm:text-2xl font-bold ${isLight ? "text-gray-900" : "text-white"}`}>
                {agentProfile.name || "Not set"}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <Mail className={`w-4 h-4 ${isLight ? "text-gray-500" : "text-gray-400"}`} />
                <span className={`text-sm ${isLight ? "text-gray-600" : "text-gray-400"}`}>
                  {agentProfile.email}
                </span>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-3 md:gap-6 items-start">
              {/* Profile Photo */}
              <div className="flex-shrink-0">
                <div className="relative w-24 h-24 sm:w-32 sm:h-32">
                  <div
                    className={`w-full h-full rounded-full overflow-hidden border-4 ${
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
                    className={`absolute bottom-1 right-1 p-2 rounded-full cursor-pointer shadow-lg transition-all ${
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
                  <div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="flex items-center gap-3 p-3">
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

                      <div className="flex items-center gap-3 p-3">
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

                      <div className="flex items-center gap-3 p-3">
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

                      <div className="flex items-center gap-3 p-3">
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

                    {/* Landing Page Content - Multi-tenant fields */}
                    <div className={`pt-4 mt-4 border-t ${isLight ? "border-gray-200" : "border-slate-600"}`}>
                      <h4 className={`text-md font-semibold mb-3 flex items-center gap-2 ${isLight ? "text-gray-900" : "text-white"}`}>
                        <Globe className="w-4 h-4" />
                        Landing Page Content
                      </h4>

                      {/* Banner Photo Upload */}
                      <div className="mb-6">
                        <label className={`block text-sm font-medium mb-2 ${
                          isLight ? "text-gray-700" : "text-gray-300"
                        }`}>
                          Banner Photo
                        </label>
                        <div className="relative w-full h-48 rounded-lg overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-600">
                          {agentProfile.agentProfile?.heroPhoto ? (
                            <img
                              src={agentProfile.agentProfile.heroPhoto}
                              alt="Banner"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className={`w-full h-full flex items-center justify-center ${
                              isLight ? "bg-gray-100" : "bg-slate-700"
                            }`}>
                              <p className={`text-sm ${isLight ? "text-gray-500" : "text-gray-400"}`}>
                                No banner photo uploaded
                              </p>
                            </div>
                          )}
                          <label
                            className={`absolute bottom-3 right-3 px-4 py-2 rounded-lg cursor-pointer shadow-lg transition-all flex items-center gap-2 ${
                              isUploadingHero ? "opacity-50 cursor-not-allowed" : ""
                            } ${
                              isLight
                                ? "bg-blue-600 hover:bg-blue-700 text-white"
                                : "bg-blue-600 hover:bg-blue-700 text-white"
                            }`}
                          >
                            {isUploadingHero ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                <span className="text-sm">Uploading...</span>
                              </>
                            ) : (
                              <>
                                <Camera className="w-4 h-4" />
                                <span className="text-sm">Upload Banner</span>
                              </>
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleHeroPhotoUpload}
                              className="hidden"
                              disabled={isUploadingHero}
                            />
                          </label>
                        </div>
                        <p className={`mt-1 text-xs ${isLight ? "text-gray-500" : "text-gray-400"}`}>
                          Recommended: 1920x600px, max 5MB
                        </p>
                      </div>

                      {/* Insights Banner Upload */}
                      <div className="mb-6">
                        <label className={`block text-sm font-medium mb-2 ${
                          isLight ? "text-gray-700" : "text-gray-300"
                        }`}>
                          Insights Page Banner (For Non-Logged-In Users)
                        </label>
                        <div className="relative w-full h-48 rounded-lg overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-600">
                          {agentProfile.agentProfile?.insightsBannerImage ? (
                            <img
                              src={agentProfile.agentProfile.insightsBannerImage}
                              alt="Insights Banner"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className={`w-full h-full flex items-center justify-center ${
                              isLight ? "bg-gray-100" : "bg-slate-700"
                            }`}>
                              <p className={`text-sm ${isLight ? "text-gray-500" : "text-gray-400"}`}>
                                No insights banner uploaded
                              </p>
                            </div>
                          )}
                          <label
                            className={`absolute bottom-3 right-3 px-4 py-2 rounded-lg cursor-pointer shadow-lg transition-all flex items-center gap-2 ${
                              isUploadingHero ? "opacity-50 cursor-not-allowed" : ""
                            } ${
                              isLight
                                ? "bg-blue-600 hover:bg-blue-700 text-white"
                                : "bg-blue-600 hover:bg-blue-700 text-white"
                            }`}
                          >
                            {isUploadingHero ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                <span className="text-sm">Uploading...</span>
                              </>
                            ) : (
                              <>
                                <Camera className="w-4 h-4" />
                                <span className="text-sm">Upload Banner</span>
                              </>
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleInsightsBannerUpload}
                              className="hidden"
                              disabled={isUploadingHero}
                            />
                          </label>
                        </div>
                        <p className={`mt-1 text-xs ${isLight ? "text-gray-500" : "text-gray-400"}`}>
                          Shown to non-logged-in visitors on /insights page. Recommended: 1920x600px, max 5MB
                        </p>
                      </div>

                      {/* Headshot Upload */}
                      <div className="mb-6">
                        <label className={`block text-sm font-medium mb-2 ${
                          isLight ? "text-gray-700" : "text-gray-300"
                        }`}>
                          Transparent Headshot
                        </label>
                        <div className="relative w-full h-48 rounded-lg overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-600">
                          {agentProfile.agentProfile?.headshot ? (
                            <div className={`w-full h-full flex items-center justify-center ${
                              isLight ? "bg-gray-50" : "bg-slate-800"
                            }`}>
                              <img
                                src={agentProfile.agentProfile.headshot}
                                alt="Headshot"
                                className="h-full object-contain"
                              />
                            </div>
                          ) : (
                            <div className={`w-full h-full flex items-center justify-center ${
                              isLight ? "bg-gray-100" : "bg-slate-700"
                            }`}>
                              <p className={`text-sm ${isLight ? "text-gray-500" : "text-gray-400"}`}>
                                No headshot uploaded
                              </p>
                            </div>
                          )}
                          <label
                            className={`absolute bottom-3 right-3 px-4 py-2 rounded-lg cursor-pointer shadow-lg transition-all flex items-center gap-2 ${
                              isUploadingHeadshot ? "opacity-50 cursor-not-allowed" : ""
                            } ${
                              isLight
                                ? "bg-blue-600 hover:bg-blue-700 text-white"
                                : "bg-blue-600 hover:bg-blue-700 text-white"
                            }`}
                          >
                            {isUploadingHeadshot ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                <span className="text-sm">Uploading...</span>
                              </>
                            ) : (
                              <>
                                <Camera className="w-4 h-4" />
                                <span className="text-sm">Upload Headshot</span>
                              </>
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleHeadshotUpload}
                              className="hidden"
                              disabled={isUploadingHeadshot}
                            />
                          </label>
                        </div>
                        <p className={`mt-1 text-xs ${isLight ? "text-gray-500" : "text-gray-400"}`}>
                          Recommended: PNG with transparent background, 800x800px, max 5MB
                        </p>
                      </div>

                      {/* Hero Headline */}
                      <div className="mb-6">
                        <label className={`block text-sm font-medium mb-2 ${
                          isLight ? "text-gray-700" : "text-gray-300"
                        }`}>
                          Hero Headline (Insights Page)
                        </label>
                        <input
                          type="text"
                          value={agentProfile.agentProfile?.heroHeadline || ""}
                          onChange={(e) =>
                            setAgentProfile({
                              ...agentProfile,
                              agentProfile: {
                                ...agentProfile.agentProfile,
                                heroHeadline: e.target.value
                              }
                            })
                          }
                          className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 ${
                            isLight
                              ? "bg-white border border-gray-300 text-gray-900 focus:ring-blue-500"
                              : "bg-slate-700 border border-slate-600 text-white focus:ring-blue-500"
                          }`}
                          placeholder="Your next property,<br />intelligently matched."
                        />
                        <p className={`mt-1 text-xs ${isLight ? "text-gray-500" : "text-gray-400"}`}>
                          Customize the main headline on your Insights page. Use {"<br />"} for line breaks.
                        </p>
                      </div>

                      {/* Broker Logo Upload */}
                      <div className="mb-6">
                        <label className={`block text-sm font-medium mb-2 ${
                          isLight ? "text-gray-700" : "text-gray-300"
                        }`}>
                          Broker Logo
                        </label>
                        <div className="relative w-full h-32 rounded-lg overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-600">
                          {agentProfile.agentProfile?.brokerLogo ? (
                            <div className={`w-full h-full flex items-center justify-center ${
                              isLight ? "bg-gray-50" : "bg-slate-800"
                            }`}>
                              <img
                                src={agentProfile.agentProfile.brokerLogo}
                                alt="Broker Logo"
                                className="max-h-full max-w-full object-contain p-4"
                              />
                            </div>
                          ) : (
                            <div className={`w-full h-full flex items-center justify-center ${
                              isLight ? "bg-gray-100" : "bg-slate-700"
                            }`}>
                              <p className={`text-sm ${isLight ? "text-gray-500" : "text-gray-400"}`}>
                                No broker logo uploaded
                              </p>
                            </div>
                          )}
                          <label
                            className={`absolute bottom-3 right-3 px-4 py-2 rounded-lg cursor-pointer shadow-lg transition-all flex items-center gap-2 ${
                              isUploadingBrokerLogo ? "opacity-50 cursor-not-allowed" : ""
                            } ${
                              isLight
                                ? "bg-blue-600 hover:bg-blue-700 text-white"
                                : "bg-blue-600 hover:bg-blue-700 text-white"
                            }`}
                          >
                            {isUploadingBrokerLogo ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                <span className="text-sm">Uploading...</span>
                              </>
                            ) : (
                              <>
                                <Camera className="w-4 h-4" />
                                <span className="text-sm">Upload Logo</span>
                              </>
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleBrokerLogoUpload}
                              className="hidden"
                              disabled={isUploadingBrokerLogo}
                            />
                          </label>
                        </div>
                        <p className={`mt-1 text-xs ${isLight ? "text-gray-500" : "text-gray-400"}`}>
                          Recommended: PNG/SVG with transparent background, max 2MB
                        </p>
                      </div>

                      {/* Team Logo Upload */}
                      <div className="mb-6">
                        <label className={`block text-sm font-medium mb-2 ${
                          isLight ? "text-gray-700" : "text-gray-300"
                        }`}>
                          Team Logo
                        </label>
                        <div className="relative w-full h-32 rounded-lg overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-600">
                          {agentProfile.agentProfile?.teamLogo ? (
                            <div className={`w-full h-full flex items-center justify-center ${
                              isLight ? "bg-gray-50" : "bg-slate-800"
                            }`}>
                              <img
                                src={agentProfile.agentProfile.teamLogo}
                                alt="Team Logo"
                                className="max-h-full max-w-full object-contain p-4"
                              />
                            </div>
                          ) : (
                            <div className={`w-full h-full flex items-center justify-center ${
                              isLight ? "bg-gray-100" : "bg-slate-700"
                            }`}>
                              <p className={`text-sm ${isLight ? "text-gray-500" : "text-gray-400"}`}>
                                No team logo uploaded
                              </p>
                            </div>
                          )}
                          <label
                            className={`absolute bottom-3 right-3 px-4 py-2 rounded-lg cursor-pointer shadow-lg transition-all flex items-center gap-2 ${
                              isUploadingTeamLogo ? "opacity-50 cursor-not-allowed" : ""
                            } ${
                              isLight
                                ? "bg-blue-600 hover:bg-blue-700 text-white"
                                : "bg-blue-600 hover:bg-blue-700 text-white"
                            }`}
                          >
                            {isUploadingTeamLogo ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                <span className="text-sm">Uploading...</span>
                              </>
                            ) : (
                              <>
                                <Camera className="w-4 h-4" />
                                <span className="text-sm">Upload Logo</span>
                              </>
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleTeamLogoUpload}
                              className="hidden"
                              disabled={isUploadingTeamLogo}
                            />
                          </label>
                        </div>
                        <p className={`mt-1 text-xs ${isLight ? "text-gray-500" : "text-gray-400"}`}>
                          Recommended: PNG/SVG with transparent background, max 2MB
                        </p>
                      </div>

                      {/* Story Type Selection */}
                      <div className="mb-6">
                        <label className={`block text-sm font-medium mb-3 ${
                          isLight ? "text-gray-700" : "text-gray-300"
                        }`}>
                          Choose Your Story Format
                        </label>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="storyType"
                              value="story"
                              checked={agentProfile.agentProfile?.storyType === "story" || !agentProfile.agentProfile?.storyType}
                              onChange={(e) =>
                                setAgentProfile({
                                  ...agentProfile,
                                  agentProfile: {
                                    ...agentProfile.agentProfile,
                                    storyType: "story"
                                  }
                                })
                              }
                              className="w-4 h-4"
                            />
                            <span className={isLight ? "text-gray-700" : "text-gray-300"}>
                              Written Story
                            </span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="storyType"
                              value="video"
                              checked={agentProfile.agentProfile?.storyType === "video"}
                              onChange={(e) =>
                                setAgentProfile({
                                  ...agentProfile,
                                  agentProfile: {
                                    ...agentProfile.agentProfile,
                                    storyType: "video"
                                  }
                                })
                              }
                              className="w-4 h-4"
                            />
                            <span className={isLight ? "text-gray-700" : "text-gray-300"}>
                              Video Testimony
                            </span>
                          </label>
                        </div>
                      </div>

                      {/* Personal Story (if story type selected) */}
                      {(!agentProfile.agentProfile?.storyType || agentProfile.agentProfile?.storyType === "story") && (
                        <div className="mb-6">
                          <label className={`block text-sm font-medium mb-2 ${
                            isLight ? "text-gray-700" : "text-gray-300"
                          }`}>
                            Your Personal Story
                          </label>
                          <textarea
                            value={agentProfile.agentProfile?.personalStory || ""}
                            onChange={(e) =>
                              setAgentProfile({
                                ...agentProfile,
                                agentProfile: {
                                  ...agentProfile.agentProfile,
                                  personalStory: e.target.value
                                }
                              })
                            }
                            rows={6}
                            placeholder="Tell potential clients about your journey, your passion for real estate, and what makes you unique..."
                            className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 resize-none ${
                              isLight
                                ? "bg-white border border-gray-300 text-gray-900 focus:ring-blue-500"
                                : "bg-slate-700 border border-slate-600 text-white focus:ring-blue-500"
                            }`}
                          />
                          <p className={`mt-1 text-xs ${isLight ? "text-gray-500" : "text-gray-400"}`}>
                            Share your story in a way that connects with your potential clients
                          </p>
                        </div>
                      )}

                      {/* Video Testimony (if video type selected) */}
                      {agentProfile.agentProfile?.storyType === "video" && (
                        <div className="mb-6">
                          <label className={`block text-sm font-medium mb-2 ${
                            isLight ? "text-gray-700" : "text-gray-300"
                          }`}>
                            Video Testimony URL
                          </label>
                          <input
                            type="url"
                            value={agentProfile.agentProfile?.videoTestimony || ""}
                            onChange={(e) =>
                              setAgentProfile({
                                ...agentProfile,
                                agentProfile: {
                                  ...agentProfile.agentProfile,
                                  videoTestimony: e.target.value
                                }
                              })
                            }
                            placeholder="https://example.com/video.mp4"
                            className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 ${
                              isLight
                                ? "bg-white border border-gray-300 text-gray-900 focus:ring-blue-500"
                                : "bg-slate-700 border border-slate-600 text-white focus:ring-blue-500"
                            }`}
                          />
                          <p className={`mt-1 text-xs ${isLight ? "text-gray-500" : "text-gray-400"}`}>
                            Enter the URL of your hosted video testimony (MP4, WebM, etc.)
                          </p>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className={`block text-sm font-medium mb-2 ${
                            isLight ? "text-gray-700" : "text-gray-300"
                          }`}>
                            Headline
                          </label>
                          <input
                            type="text"
                            value={agentProfile.agentProfile?.headline || ""}
                            onChange={(e) =>
                              setAgentProfile({
                                ...agentProfile,
                                agentProfile: {
                                  ...agentProfile.agentProfile,
                                  headline: e.target.value
                                }
                              })
                            }
                            placeholder="Your Trusted Real Estate Partner"
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
                            Tagline
                          </label>
                          <input
                            type="text"
                            value={agentProfile.agentProfile?.tagline || ""}
                            onChange={(e) =>
                              setAgentProfile({
                                ...agentProfile,
                                agentProfile: {
                                  ...agentProfile.agentProfile,
                                  tagline: e.target.value
                                }
                              })
                            }
                            placeholder="Serving Orange County Since 2010"
                            className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 ${
                              isLight
                                ? "bg-white border border-gray-300 text-gray-900 focus:ring-blue-500"
                                : "bg-slate-700 border border-slate-600 text-white focus:ring-blue-500"
                            }`}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Social Media Links */}
                    <div className={`pt-4 mt-4 border-t ${isLight ? "border-gray-200" : "border-slate-600"}`}>
                      <h4 className={`text-md font-semibold mb-3 flex items-center gap-2 ${isLight ? "text-gray-900" : "text-white"}`}>
                        <Globe className="w-4 h-4" />
                        Social Media Links
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className={`block text-sm font-medium mb-2 flex items-center gap-2 ${
                            isLight ? "text-gray-700" : "text-gray-300"
                          }`}>
                            <Facebook className="w-4 h-4" />
                            Facebook
                          </label>
                          <input
                            type="url"
                            value={agentProfile.agentProfile?.socialMedia?.facebook || ""}
                            onChange={(e) =>
                              setAgentProfile({
                                ...agentProfile,
                                agentProfile: {
                                  ...agentProfile.agentProfile,
                                  socialMedia: {
                                    ...agentProfile.agentProfile?.socialMedia,
                                    facebook: e.target.value
                                  }
                                }
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
                          <label className={`block text-sm font-medium mb-2 flex items-center gap-2 ${
                            isLight ? "text-gray-700" : "text-gray-300"
                          }`}>
                            <Instagram className="w-4 h-4" />
                            Instagram
                          </label>
                          <input
                            type="url"
                            value={agentProfile.agentProfile?.socialMedia?.instagram || ""}
                            onChange={(e) =>
                              setAgentProfile({
                                ...agentProfile,
                                agentProfile: {
                                  ...agentProfile.agentProfile,
                                  socialMedia: {
                                    ...agentProfile.agentProfile?.socialMedia,
                                    instagram: e.target.value
                                  }
                                }
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
                          <label className={`block text-sm font-medium mb-2 flex items-center gap-2 ${
                            isLight ? "text-gray-700" : "text-gray-300"
                          }`}>
                            <Linkedin className="w-4 h-4" />
                            LinkedIn
                          </label>
                          <input
                            type="url"
                            value={agentProfile.agentProfile?.socialMedia?.linkedin || ""}
                            onChange={(e) =>
                              setAgentProfile({
                                ...agentProfile,
                                agentProfile: {
                                  ...agentProfile.agentProfile,
                                  socialMedia: {
                                    ...agentProfile.agentProfile?.socialMedia,
                                    linkedin: e.target.value
                                  }
                                }
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
                          <label className={`block text-sm font-medium mb-2 flex items-center gap-2 ${
                            isLight ? "text-gray-700" : "text-gray-300"
                          }`}>
                            <Youtube className="w-4 h-4" />
                            YouTube
                          </label>
                          <input
                            type="url"
                            value={agentProfile.agentProfile?.socialMedia?.youtube || ""}
                            onChange={(e) =>
                              setAgentProfile({
                                ...agentProfile,
                                agentProfile: {
                                  ...agentProfile.agentProfile,
                                  socialMedia: {
                                    ...agentProfile.agentProfile?.socialMedia,
                                    youtube: e.target.value
                                  }
                                }
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

                    {/* Reviews Management */}
                    <div className={`pt-4 mt-4 border-t ${isLight ? "border-gray-200" : "border-slate-600"}`}>
                      <h4 className={`text-md font-semibold mb-3 flex items-center gap-2 ${isLight ? "text-gray-900" : "text-white"}`}>
                        <MessageSquare className="w-4 h-4" />
                        Client Reviews
                      </h4>
                      <p className={`text-sm mb-4 ${isLight ? "text-gray-600" : "text-gray-400"}`}>
                        Manage client testimonials and reviews for your landing page
                      </p>

                      {/* Existing Reviews */}
                      <div className="space-y-3 mb-4">
                        {agentProfile.agentProfile?.reviews?.map((review, index) => (
                          <div
                            key={index}
                            className={`p-4 rounded-lg border ${
                              isLight
                                ? "bg-gray-50 border-gray-200"
                                : "bg-slate-700/50 border-slate-600"
                            }`}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <input
                                  type="text"
                                  value={review.reviewerName}
                                  onChange={(e) => {
                                    const updatedReviews = [...(agentProfile.agentProfile?.reviews || [])];
                                    updatedReviews[index] = { ...review, reviewerName: e.target.value };
                                    setAgentProfile({
                                      ...agentProfile,
                                      agentProfile: {
                                        ...agentProfile.agentProfile,
                                        reviews: updatedReviews
                                      }
                                    });
                                  }}
                                  placeholder="Reviewer Name"
                                  className={`w-full px-3 py-1.5 rounded font-medium mb-2 ${
                                    isLight
                                      ? "bg-white border border-gray-300 text-gray-900"
                                      : "bg-slate-800 border border-slate-600 text-white"
                                  }`}
                                />
                                <div className="flex items-center gap-1 mb-2">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                      key={star}
                                      className={`w-5 h-5 cursor-pointer transition-colors ${
                                        star <= review.rating
                                          ? "fill-yellow-400 text-yellow-400"
                                          : isLight
                                          ? "text-gray-300"
                                          : "text-slate-600"
                                      }`}
                                      onClick={() => {
                                        const updatedReviews = [...(agentProfile.agentProfile?.reviews || [])];
                                        updatedReviews[index] = { ...review, rating: star };
                                        setAgentProfile({
                                          ...agentProfile,
                                          agentProfile: {
                                            ...agentProfile.agentProfile,
                                            reviews: updatedReviews
                                          }
                                        });
                                      }}
                                    />
                                  ))}
                                  <span className={`ml-2 text-sm ${isLight ? "text-gray-600" : "text-gray-400"}`}>
                                    {review.rating}/5
                                  </span>
                                </div>
                                <textarea
                                  value={review.text}
                                  onChange={(e) => {
                                    const updatedReviews = [...(agentProfile.agentProfile?.reviews || [])];
                                    updatedReviews[index] = { ...review, text: e.target.value };
                                    setAgentProfile({
                                      ...agentProfile,
                                      agentProfile: {
                                        ...agentProfile.agentProfile,
                                        reviews: updatedReviews
                                      }
                                    });
                                  }}
                                  placeholder="Review text..."
                                  rows={3}
                                  className={`w-full px-3 py-2 rounded resize-none ${
                                    isLight
                                      ? "bg-white border border-gray-300 text-gray-900"
                                      : "bg-slate-800 border border-slate-600 text-white"
                                  }`}
                                />
                                <input
                                  type="date"
                                  value={review.date}
                                  onChange={(e) => {
                                    const updatedReviews = [...(agentProfile.agentProfile?.reviews || [])];
                                    updatedReviews[index] = { ...review, date: e.target.value };
                                    setAgentProfile({
                                      ...agentProfile,
                                      agentProfile: {
                                        ...agentProfile.agentProfile,
                                        reviews: updatedReviews
                                      }
                                    });
                                  }}
                                  className={`w-full px-3 py-1.5 rounded mt-2 text-sm ${
                                    isLight
                                      ? "bg-white border border-gray-300 text-gray-900"
                                      : "bg-slate-800 border border-slate-600 text-white"
                                  }`}
                                />
                              </div>
                              <button
                                onClick={() => {
                                  const updatedReviews = (agentProfile.agentProfile?.reviews || []).filter((_, i) => i !== index);
                                  setAgentProfile({
                                    ...agentProfile,
                                    agentProfile: {
                                      ...agentProfile.agentProfile,
                                      reviews: updatedReviews
                                    }
                                  });
                                }}
                                className={`ml-3 p-2 rounded-lg transition-colors ${
                                  isLight
                                    ? "text-red-600 hover:bg-red-50"
                                    : "text-red-400 hover:bg-red-900/20"
                                }`}
                                title="Delete review"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}

                        {(!agentProfile.agentProfile?.reviews || agentProfile.agentProfile.reviews.length === 0) && (
                          <div className={`p-6 rounded-lg border border-dashed text-center ${
                            isLight
                              ? "bg-gray-50 border-gray-300 text-gray-500"
                              : "bg-slate-700/30 border-slate-600 text-gray-400"
                          }`}>
                            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No reviews yet. Add your first client review below.</p>
                          </div>
                        )}
                      </div>

                      {/* Add New Review Button */}
                      <button
                        onClick={() => {
                          const newReview = {
                            reviewerName: "",
                            reviewerImage: "",
                            rating: 5,
                            text: "",
                            date: new Date().toISOString().split('T')[0]
                          };
                          const updatedReviews = [...(agentProfile.agentProfile?.reviews || []), newReview];
                          setAgentProfile({
                            ...agentProfile,
                            agentProfile: {
                              ...agentProfile.agentProfile,
                              reviews: updatedReviews
                            }
                          });
                        }}
                        className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed transition-all ${
                          isLight
                            ? "border-gray-300 text-gray-600 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50"
                            : "border-slate-600 text-gray-400 hover:border-blue-500 hover:text-blue-400 hover:bg-blue-900/20"
                        }`}
                      >
                        <Plus className="w-5 h-5" />
                        <span className="font-medium">Add New Review</span>
                      </button>

                      <p className={`mt-2 text-xs ${isLight ? "text-gray-500" : "text-gray-400"}`}>
                        Reviews will be displayed on your landing page to build credibility with potential clients
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

          {/* Setup Progress Card */}
          {!isLoadingProfile && (() => {
            // Calculate setup completion
            const requiredFields = [
              { name: "Name", value: agentProfile.name, required: true },
              { name: "Phone", value: agentProfile.phone, required: true },
              { name: "Brokerage Name", value: agentProfile.brokerageName, required: true },
              { name: "Banner Photo", value: agentProfile.agentProfile?.heroPhoto, required: true },
              { name: "Headshot", value: agentProfile.agentProfile?.headshot, required: true },
              { name: "Broker Logo", value: agentProfile.agentProfile?.brokerLogo, required: true },
              { name: "Headline", value: agentProfile.agentProfile?.headline, required: true },
              { name: "Personal Story or Video", value: agentProfile.agentProfile?.personalStory || agentProfile.agentProfile?.videoTestimony, required: true },
            ];

            const completed = requiredFields.filter(field => field.value).length;
            const total = requiredFields.length;
            const percentage = Math.round((completed / total) * 100);
            const isComplete = percentage === 100;
            const missingFields = requiredFields.filter(field => !field.value);

            if (isComplete) return null; // Hide card when setup is complete

            return (
              <div
                className={`rounded-xl p-6 mb-8 ${
                  isLight
                    ? "bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200"
                    : "bg-gradient-to-r from-blue-900/20 to-indigo-900/20 border-2 border-blue-800"
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className={`text-xl font-bold mb-1 ${isLight ? "text-gray-900" : "text-white"}`}>
                      Complete Your Profile Setup
                    </h3>
                    <p className={`text-sm ${isLight ? "text-gray-600" : "text-gray-400"}`}>
                      {completed} of {total} required fields completed
                    </p>
                  </div>
                  <div className={`text-3xl font-bold ${
                    percentage >= 75 ? "text-green-600" :
                    percentage >= 50 ? "text-yellow-600" :
                    "text-red-600"
                  }`}>
                    {percentage}%
                  </div>
                </div>

                {/* Progress Bar */}
                <div className={`w-full h-3 rounded-full mb-4 ${
                  isLight ? "bg-gray-200" : "bg-gray-700"
                }`}>
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      percentage >= 75 ? "bg-green-600" :
                      percentage >= 50 ? "bg-yellow-600" :
                      "bg-red-600"
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>

                {/* Missing Fields */}
                {missingFields.length > 0 && (
                  <div>
                    <p className={`text-sm font-medium mb-2 ${isLight ? "text-gray-700" : "text-gray-300"}`}>
                      Still needed:
                    </p>
                    <ul className="space-y-1">
                      {missingFields.map((field, index) => (
                        <li
                          key={index}
                          className={`text-sm flex items-center gap-2 ${
                            isLight ? "text-gray-600" : "text-gray-400"
                          }`}
                        >
                          <span className="w-2 h-2 rounded-full bg-red-500"></span>
                          {field.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className={`mt-4 pt-4 border-t ${
                  isLight ? "border-blue-200" : "border-blue-800"
                }`}>
                  <p className={`text-xs ${isLight ? "text-gray-500" : "text-gray-400"}`}>
                    💡 Tip: Complete your profile to attract more clients and appear in search results
                  </p>
                </div>
              </div>
            );
          })()}

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 p-2">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className={`rounded-lg p-6 flex items-center justify-between ${
                    isLight ? "bg-white/30 shadow-lg" : "bg-neutral-900/30 shadow-lg shadow-blue-500/20"
                  }`}
                >
                  <div className="flex flex-col items-start text-left">
                    <p className={`text-sm font-medium mb-1 ${isLight ? "text-gray-600" : "text-gray-400"}`}>
                      {stat.label}
                    </p>
                    <p className={`text-3xl font-bold ${isLight ? "text-gray-900" : "text-white"}`}>
                      {stat.value}
                    </p>
                  </div>
                  <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Banner Photo Cropper Modal */}
      {showBannerCropper && bannerImageSrc && (
        <BannerPhotoCropper
          imageSrc={bannerImageSrc}
          onCropComplete={handleCroppedBannerUpload}
          onCancel={handleCancelCrop}
        />
      )}
    </div>
  );
}
